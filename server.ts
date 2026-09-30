import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Directories
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const AUDIO_DIR = path.join(UPLOADS_DIR, 'audio');
const COVERS_DIR = path.join(UPLOADS_DIR, 'covers');
const DB_FILE = path.join(DATA_DIR, 'database.json');

[DATA_DIR, UPLOADS_DIR, AUDIO_DIR, COVERS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve uploaded covers statically
app.use('/uploads/covers', express.static(COVERS_DIR));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === 'audio') {
      cb(null, AUDIO_DIR);
    } else {
      cb(null, COVERS_DIR);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${cleanBase}-${uniqueSuffix}${ext || '.mp3'}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file
  },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'audio') {
      const allowedAudio = /\.(mp3|wav|flac|m4a|aac|ogg|webm)$/i;
      if (file.originalname.match(allowedAudio) || file.mimetype.startsWith('audio/')) {
        return cb(null, true);
      }
      return cb(new Error('Only audio files (MP3, WAV, FLAC, M4A, AAC) are allowed.'));
    }
    if (file.fieldname === 'cover') {
      const allowedImage = /\.(jpg|jpeg|png|webp|gif|avif)$/i;
      if (file.originalname.match(allowedImage) || file.mimetype.startsWith('image/')) {
        return cb(null, true);
      }
      return cb(new Error('Only image files are allowed for album art.'));
    }
    cb(null, true);
  },
});

// Helper to generate a minimal sweet PCM WAV audio buffer for demo songs
function generateDemoWavBuffer(frequency: number, chordType: 'major' | 'minor' | 'ambient' | 'synth', durationSeconds = 30): Buffer {
  const sampleRate = 44100;
  const numSamples = sampleRate * durationSeconds;
  const blockAlign = 2; // 1 channel * 16 bit
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20); // audio format (PCM)
  buffer.writeUInt16LE(1, 22); // num channels (1 - mono)
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Harmonic chord multipliers
  const freqs =
    chordType === 'minor'
      ? [1, 1.2, 1.5, 1.8]
      : chordType === 'synth'
      ? [1, 1.25, 1.5, 2.0]
      : chordType === 'ambient'
      ? [1, 1.333, 1.5, 2.25]
      : [1, 1.25, 1.5, 1.875];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Beat pulse every 0.5s or 1s
    const beatEnv = Math.sin(t * Math.PI * 2 * 1.5) * 0.15;
    // Slow evolving filter sweep
    const lfo = 0.5 + 0.5 * Math.sin(t * 0.8);

    let sampleVal = 0;
    for (let f = 0; f < freqs.length; f++) {
      const baseF = frequency * freqs[f];
      // additive synthesis + subtle detune
      const wave = Math.sin(2 * Math.PI * baseF * t) + 0.3 * Math.sin(2 * Math.PI * (baseF * 1.003) * t);
      sampleVal += wave;
    }
    sampleVal = (sampleVal / freqs.length) * (0.5 + beatEnv * lfo);

    // Fade in and fade out envelope
    let env = 1.0;
    if (t < 1.0) env = t;
    if (t > durationSeconds - 1.5) env = Math.max(0, (durationSeconds - t) / 1.5);

    const int16 = Math.max(-32767, Math.min(32767, Math.floor(sampleVal * env * 24000)));
    buffer.writeInt16LE(int16, 44 + i * 2);
  }
  return buffer;
}

// Ensure demo WAV files exist on disk for immediate playback
function initializeDemoAudioFiles(songs: any[]) {
  songs.forEach((song, idx) => {
    const filename = song.filePath || `demo_song_${song.id}.wav`;
    const fullPath = path.join(AUDIO_DIR, filename);
    if (!fs.existsSync(fullPath)) {
      const baseFreq = 180 + (idx % 8) * 35;
      const type = idx % 4 === 0 ? 'ambient' : idx % 3 === 0 ? 'synth' : idx % 2 === 0 ? 'minor' : 'major';
      const buf = generateDemoWavBuffer(baseFreq, type, 35);
      fs.writeFileSync(fullPath, buf);
    }
    // Set audioUrl to internal streaming endpoint
    song.audioUrl = `/api/stream/${song.id}`;
    song.filePath = filename;
  });
}

// Initial Database Data
const INITIAL_GENRES = [
  { id: 'genre-bhojpuri-bhakti', name: 'Bhojpuri Bhakti & Devi Geet', color: '#e11d48' },
  { id: 'genre-1', name: 'Synthwave & Retro', color: '#8b5cf6' },
  { id: 'genre-2', name: 'Chillhop & Lo-Fi', color: '#06b6d4' },
  { id: 'genre-3', name: 'Deep House & Club', color: '#ec4899' },
  { id: 'genre-4', name: 'Cinematic Ambient', color: '#3b82f6' },
  { id: 'genre-5', name: 'Bhojpuri Fusion Beats', color: '#f59e0b' },
  { id: 'genre-6', name: 'Indie Acoustic', color: '#10b981' },
  { id: 'genre-7', name: 'Neo-Soul & R&B', color: '#d946ef' },
  { id: 'genre-8', name: 'Cyberpunk Bass', color: '#ef4444' },
];

const INITIAL_ARTISTS = [
  {
    id: 'artist-1',
    name: 'Kavya & The Echoes',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    bio: 'Pioneering blend of traditional folk melodies, modern synthesizers, and ethereal acoustic soundscapes.',
    genres: ['Bhojpuri Fusion Beats', 'Indie Acoustic'],
    monthlyListeners: 428000,
    topSongIds: ['song-1', 'song-6', 'song-11'],
  },
  {
    id: 'artist-2',
    name: 'Aetherwave',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    bio: 'Analog synthesizer enthusiast crafting nostalgic nocturnal soundtracks inspired by neon cityscapes.',
    genres: ['Synthwave & Retro', 'Cyberpunk Bass'],
    monthlyListeners: 785000,
    topSongIds: ['song-2', 'song-7', 'song-12'],
  },
  {
    id: 'artist-3',
    name: 'Nico Sol',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
    bio: 'Late night lo-fi producer capturing rain sounds, warm Rhodes chords, and dusty vinyl crackles.',
    genres: ['Chillhop & Lo-Fi', 'Neo-Soul & R&B'],
    monthlyListeners: 920000,
    topSongIds: ['song-3', 'song-8', 'song-13'],
  },
  {
    id: 'artist-4',
    name: 'Mira Varanasi',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    bio: 'Contemporary global bass producer fusing Bhojpuri rhythm cycles with heavy sub frequencies.',
    genres: ['Bhojpuri Fusion Beats', 'Deep House & Club'],
    monthlyListeners: 654000,
    topSongIds: ['song-4', 'song-9', 'song-14'],
  },
  {
    id: 'artist-5',
    name: 'Orbital Horizon',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    bio: 'Composer of widescreen cinematic vistas and deep meditative ambient frequencies.',
    genres: ['Cinematic Ambient'],
    monthlyListeners: 512000,
    topSongIds: ['song-5', 'song-10', 'song-15'],
  },
];

const INITIAL_ALBUMS = [
  {
    id: 'album-1',
    title: 'Ganga Sunset Sessions',
    artist: 'Kavya & The Echoes',
    artistId: 'artist-1',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    releaseDate: '2025-11-12',
    genre: 'Bhojpuri Fusion Beats',
    songIds: ['song-1', 'song-6', 'song-11', 'song-16'],
  },
  {
    id: 'album-2',
    title: 'Neon Odyssey 2084',
    artist: 'Aetherwave',
    artistId: 'artist-2',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    releaseDate: '2026-02-18',
    genre: 'Synthwave & Retro',
    songIds: ['song-2', 'song-7', 'song-12', 'song-17'],
  },
  {
    id: 'album-3',
    title: 'Midnight Coffee & Rain',
    artist: 'Nico Sol',
    artistId: 'artist-3',
    coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
    releaseDate: '2026-01-05',
    genre: 'Chillhop & Lo-Fi',
    songIds: ['song-3', 'song-8', 'song-13', 'song-18'],
  },
  {
    id: 'album-4',
    title: 'Patna Basslines Vol. 1',
    artist: 'Mira Varanasi',
    artistId: 'artist-4',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    releaseDate: '2026-03-01',
    genre: 'Bhojpuri Fusion Beats',
    songIds: ['song-4', 'song-9', 'song-14', 'song-19'],
  },
  {
    id: 'album-5',
    title: 'Cosmic Drift Through Time',
    artist: 'Orbital Horizon',
    artistId: 'artist-5',
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    releaseDate: '2025-10-20',
    genre: 'Cinematic Ambient',
    songIds: ['song-5', 'song-10', 'song-15', 'song-20'],
  },
];

const INITIAL_SONGS = [
  {
    id: 'song-bhojpuri-1',
    title: 'Lal Chunariya Wali Maiya',
    artist: 'Devi Vandana & Bhojpuri Choir',
    artistId: 'artist-1',
    album: 'Durga Saptashati & Devi Geet',
    albumId: 'album-1',
    genre: 'Bhojpuri Bhakti & Devi Geet',
    duration: 178,
    fileSize: 4800000,
    coverUrl:
      'https://images.unsplash.com/photo-1609342122563-a43ac8917a3a?w=600&auto=format&fit=crop&q=80',
    playCount: 482000,
    releaseDate: '2026-03-25',
    lyrics: `[00:00.00] अरे मईया हो... लाल चुनरिया वाली...\n[00:08.00] आवा ना हमरे दुआर, तोहरे बाट जोहेला परिवार\n[00:16.00] लाल चुनरिया ओढ़ के मईया अईली सिंह सवार हो\n[00:20.00] फूलवा बरसे अंगनवा में गूंजे जय जयकार हो\n[00:24.00] जय मईया, जय मईया, दुलरुवा मईया हमार\n[00:32.00] भोर भईल त मंदिर सजवले, दीया जरवले चार\n[00:40.00] रोली अक्षत फूल चढ़ाई, लेके पूजा के थार\n[00:48.00] दूर दूर से भक्त अईले, मन में लेके आस\n[00:56.00] जेकरा माथे हाथ रख तू, मिट जाला सब त्रास\n[01:03.00] आवा मईया आवा मईया हमरा घर के दुआर\n[01:08.00] लाल चुनरिया वाली मईया तू ही हउ आधार\n[01:36.00] ना मांगी धन, ना मांगी दौलत, ना मांगी राज सिंहासन\n[01:46.00] माई बस अपना कृपा बनईह, पावन रखिह जीवन\n[02:08.00] तोहरा नाम से डर भागे, दुर्गा मईया...\n[02:18.00] लाल चुनरिया ओढ़ के मईया अईली सिंह सवार हो\n[02:24.00] ढोल नगाड़ा बाजे दुवारी, गूंजे जय जयकार हो\n[02:28.00] जय दुर्गे, जय भवानी! सांचे दरबार की जय!`,
    syncedLyrics: [
      { time: 0, text: 'अरे मईया हो... लाल चुनरिया वाली...' },
      { time: 8, text: 'आवा ना हमरे दुआर, तोहरे बाट जोहेला परिवार' },
      { time: 16, text: 'लाल चुनरिया ओढ़ के मईया अईली सिंह सवार हो' },
      { time: 20, text: 'फूलवा बरसे अंगनवा में गूंजे जय जयकार हो' },
      { time: 24, text: 'जय मईया, जय मईया, दुलरुवा मईया हमार' },
      { time: 32, text: 'भोर भईल त मंदिर सजवले, दीया जरवले चार' },
      { time: 40, text: 'रोली अक्षत फूल चढ़ाई, लेके पूजा के थार' },
      { time: 48, text: 'दूर दूर से भक्त अईले, मन में लेके आस' },
      { time: 56, text: 'जेकरा माथे हाथ रख तू, मिट जाला सब त्रास' },
      { time: 63, text: 'आवा मईया आवा मईया हमरा घर के दुआर' },
      { time: 68, text: 'लाल चुनरिया वाली मईया तू ही हउ आधार' },
      { time: 96, text: 'ना मांगी धन, ना मांगी दौलत, ना मांगी राज सिंहासन' },
      { time: 106, text: 'माई बस अपना कृपा बनईह, पावन रखिह जीवन' },
      { time: 128, text: 'तोहरा नाम से डर भागे, दुर्गा मईया...' },
      { time: 138, text: 'लाल चुनरिया ओढ़ के मईया अईली सिंह सवार हो' },
      { time: 144, text: 'ढोल नगाड़ा बाजे दुवारी, गूंजे जय जयकार हो' },
      { time: 148, text: 'जय दुर्गे, जय भवानी! सांचे दरबार की जय!' },
    ],
    audioUrl: '/api/stream/song-bhojpuri-1',
    filePath: 'demo_song_song-bhojpuri-1.wav',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'song-bhojpuri-2',
    title: 'Aawa Ho Maiya Hamra Anganwa',
    artist: 'Sharda & Anganwa Toli',
    artistId: 'artist-1',
    album: 'Durga Saptashati & Devi Geet',
    albumId: 'album-1',
    genre: 'Bhojpuri Bhakti & Devi Geet',
    duration: 183,
    fileSize: 4900000,
    coverUrl:
      'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=600&auto=format&fit=crop&q=80',
    playCount: 510000,
    releaseDate: '2026-03-28',
    lyrics: `[00:00.00] अरे मईया... आवा हो मईया...\n[00:10.00] हमरा अंगनवा में आज मंगल गीत गावा\n[00:20.00] माई अईली अंगनवा फूलवा से सजल दुआर\n[00:30.00] लाल चुनरिया ओढ़ के अईली चमके नयनवा अपार\n[00:39.00] हो मईया हो मईया तोहरे चरण में माथ नवाई\n[00:44.00] धूप फूलवा के थारी सजाई, दीया हजार जराई\n[00:57.00] भोरही से अंगना लीपल, चौका सुंदर बनावला\n[01:02.00] आम के पल्लव गेंदा फूल से दुवारी खूब सजावला\n[01:07.00] माई के आवे के खबर सुनी गांव भईल खुशहाल\n[01:12.00] बुढ़िया दादी मंगल गावे बाजे ढोलक ताल\n[01:17.00] अईली मईया दुलारी सुना अरजिया हमार\n[01:21.00] खाली ना भेजीह आँचरा भर द सुख संसार\n[01:33.00] लाल चुनरिया लहराए माई, माथे चमके टीका\n[01:40.00] करुणा भरल नयनवा तोहर रूप लागे अति नीक\n[02:00.00] माई के चरण पखार सखिया गंगाजल ले आके\n[02:08.00] मंगल गीत सुनाव ता मन, ना मांगी चांदी ना मांगी महल दुवारा\n[02:14.00] माई बस अपना कृपा बनईह, एही बा अरजी हमार\n[02:48.00] हमरा अंगनवा में सुख समृद्धि ले आई, जय मईया रानी!`,
    syncedLyrics: [
      { time: 0, text: 'अरे मईया... आवा हो मईया...' },
      { time: 10, text: 'हमरा अंगनवा में आज मंगल गीत गावा' },
      { time: 20, text: 'माई अईली अंगनवा फूलवा से सजल दुआर' },
      { time: 30, text: 'लाल चुनरिया ओढ़ के अईली चमके नयनवा अपार' },
      { time: 39, text: 'हो मईया हो मईया तोहरे चरण में माथ नवाई' },
      { time: 44, text: 'धूप फूलवा के थारी सजाई, दीया हजार जराई' },
      { time: 57, text: 'भोरही से अंगना लीपल, चौका सुंदर बनावला' },
      { time: 62, text: 'आम के पल्लव गेंदा फूल से दुवारी खूब सजावला' },
      { time: 67, text: 'माई के आवे के खबर सुनी गांव भईल खुशहाल' },
      { time: 72, text: 'बुढ़िया दादी मंगल गावे बाजे ढोलक ताल' },
      { time: 77, text: 'अईली मईया दुलारी सुना अरजिया हमार' },
      { time: 81, text: 'खाली ना भेजीह आँचरा भर द सुख संसार' },
      { time: 93, text: 'लाल चुनरिया लहराए माई, माथे चमके टीका' },
      { time: 100, text: 'करुणा भरल नयनवा तोहर रूप लागे अति नीक' },
      { time: 120, text: 'माई के चरण पखार सखिया गंगाजल ले आके' },
      { time: 128, text: 'मंगल गीत सुनाव ता मन, ना मांगी चांदी ना मांगी महल दुवारा' },
      { time: 134, text: 'माई बस अपना कृपा बनईह, एही बा अरजी हमार' },
      { time: 168, text: 'हमरा अंगनवा में सुख समृद्धि ले आई, जय मईया रानी!' },
    ],
    audioUrl: '/api/stream/song-bhojpuri-2',
    filePath: 'demo_song_song-bhojpuri-2.wav',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'song-1',
    title: 'Rhythms of the River Bank',
    artist: 'Kavya & The Echoes',
    artistId: 'artist-1',
    album: 'Ganga Sunset Sessions',
    albumId: 'album-1',
    genre: 'Bhojpuri Fusion Beats',
    duration: 198,
    fileSize: 4200000,
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    playCount: 142300,
    releaseDate: '2025-11-12',
    lyrics: `[00:04.00] Echoes rolling down the holy water\n[00:10.00] In the quiet breeze of golden twilight\n[00:18.00] Bhojpuri beats in the morning sunlight\n[00:26.00] Dhurpad rhythm meets electric night\n[00:34.00] River whispers, take me home`,
    syncedLyrics: [
      { time: 4, text: 'Echoes rolling down the holy water' },
      { time: 10, text: 'In the quiet breeze of golden twilight' },
      { time: 18, text: 'Bhojpuri beats in the morning sunlight' },
      { time: 26, text: 'Dhurpad rhythm meets electric night' },
      { time: 34, text: 'River whispers, take me home' },
    ],
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'song-2',
    title: 'Cyber Highway 101',
    artist: 'Aetherwave',
    artistId: 'artist-2',
    album: 'Neon Odyssey 2084',
    albumId: 'album-2',
    genre: 'Synthwave & Retro',
    duration: 215,
    fileSize: 5100000,
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    playCount: 289400,
    releaseDate: '2026-02-18',
    lyrics: `[00:05.00] Neon lines cutting through the dark\n[00:12.00] Racing fast leaving behind a spark\n[00:20.00] 120 on the retro dash\n[00:28.00] We will never look back now`,
    syncedLyrics: [
      { time: 5, text: 'Neon lines cutting through the dark' },
      { time: 12, text: 'Racing fast leaving behind a spark' },
      { time: 20, text: '120 on the retro dash' },
      { time: 28, text: 'We will never look back now' },
    ],
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'song-3',
    title: 'Coffee Steam on Windowpane',
    artist: 'Nico Sol',
    artistId: 'artist-3',
    album: 'Midnight Coffee & Rain',
    albumId: 'album-3',
    genre: 'Chillhop & Lo-Fi',
    duration: 184,
    fileSize: 3900000,
    coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
    playCount: 450100,
    releaseDate: '2026-01-05',
    lyrics: `[00:03.00] Drops of rain on the glass outside\n[00:09.00] Nowhere left I need to hide\n[00:16.00] Warm cup in my trembling hands\n[00:23.00] Peace is found where quiet stands`,
    syncedLyrics: [
      { time: 3, text: 'Drops of rain on the glass outside' },
      { time: 9, text: 'Nowhere left I need to hide' },
      { time: 16, text: 'Warm cup in my trembling hands' },
      { time: 23, text: 'Peace is found where quiet stands' },
    ],
    createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: 'song-4',
    title: 'Dholak & 808s',
    artist: 'Mira Varanasi',
    artistId: 'artist-4',
    album: 'Patna Basslines Vol. 1',
    albumId: 'album-4',
    genre: 'Bhojpuri Fusion Beats',
    duration: 204,
    fileSize: 4800000,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    playCount: 512000,
    releaseDate: '2026-03-01',
    lyrics: `[00:06.00] Heavy sub rattle in the trunk\n[00:12.00] Folk energy turn it up\n[00:18.00] East wind blowing fierce and strong\n[00:25.00] Sing with me this timeless song`,
    syncedLyrics: [
      { time: 6, text: 'Heavy sub rattle in the trunk' },
      { time: 12, text: 'Folk energy turn it up' },
      { time: 18, text: 'East wind blowing fierce and strong' },
      { time: 25, text: 'Sing with me this timeless song' },
    ],
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'song-5',
    title: 'Starlight Resonator',
    artist: 'Orbital Horizon',
    artistId: 'artist-5',
    album: 'Cosmic Drift Through Time',
    albumId: 'album-5',
    genre: 'Cinematic Ambient',
    duration: 240,
    fileSize: 6200000,
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    playCount: 198200,
    releaseDate: '2025-10-20',
    lyrics: `[Instrumental Ambient Soundscape]\nDeep resonant sub drones with analog crystalline textures.`,
    syncedLyrics: [
      { time: 0, text: '♫ [Deep Celestial Drones] ♫' },
      { time: 15, text: 'Floating beyond the gravity well' },
      { time: 30, text: 'Solar winds carry our memory' },
    ],
    createdAt: new Date(Date.now() - 50 * 86400000).toISOString(),
  },
  {
    id: 'song-6',
    title: 'Monsoon in Chhapra',
    artist: 'Kavya & The Echoes',
    artistId: 'artist-1',
    album: 'Ganga Sunset Sessions',
    albumId: 'album-1',
    genre: 'Bhojpuri Fusion Beats',
    duration: 210,
    fileSize: 4600000,
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    playCount: 234100,
    releaseDate: '2025-11-12',
    lyrics: `Clouds roll in over the green fields\nFirst drops touching dry earth\nSweet petrichor fills the evening\nLaughter echoing through village lanes`,
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
  },
  {
    id: 'song-7',
    title: 'Electric Velvet Night',
    artist: 'Aetherwave',
    artistId: 'artist-2',
    album: 'Neon Odyssey 2084',
    albumId: 'album-2',
    genre: 'Synthwave & Retro',
    duration: 195,
    fileSize: 4400000,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    playCount: 310500,
    releaseDate: '2026-02-18',
    lyrics: `Velvet sky tinted deep purple\nSynthesizer arpeggios glow\nReflections in chrome mirror glasses\nWatch the highway light show`,
    createdAt: new Date(Date.now() - 22 * 86400000).toISOString(),
  },
  {
    id: 'song-8',
    title: 'Sunday Morning Books & Tea',
    artist: 'Nico Sol',
    artistId: 'artist-3',
    album: 'Midnight Coffee & Rain',
    albumId: 'album-3',
    genre: 'Chillhop & Lo-Fi',
    duration: 172,
    fileSize: 3700000,
    coverUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    playCount: 520400,
    releaseDate: '2026-01-05',
    lyrics: `Sun peeking past old curtains\nPages turning one by one\nNothing to chase this morning\nA quiet day has begun`,
    createdAt: new Date(Date.now() - 35 * 86400000).toISOString(),
  },
  {
    id: 'song-9',
    title: 'Kashi High Voltage',
    artist: 'Mira Varanasi',
    artistId: 'artist-4',
    album: 'Patna Basslines Vol. 1',
    albumId: 'album-4',
    genre: 'Bhojpuri Fusion Beats',
    duration: 228,
    fileSize: 5200000,
    coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
    playCount: 388900,
    releaseDate: '2026-03-01',
    lyrics: `Temple bells in 4/4 sync\nElectric bass makes you think\nTradition and the club unite\nDancing till the morning light`,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'song-10',
    title: 'Nebula Cradle',
    artist: 'Orbital Horizon',
    artistId: 'artist-5',
    album: 'Cosmic Drift Through Time',
    albumId: 'album-5',
    genre: 'Cinematic Ambient',
    duration: 265,
    fileSize: 6800000,
    coverUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&auto=format&fit=crop&q=80',
    playCount: 167300,
    releaseDate: '2025-10-20',
    lyrics: `[Instrumental Drone Meditation]\nA shimmering voyage into celestial birthplaces.`,
    createdAt: new Date(Date.now() - 48 * 86400000).toISOString(),
  },
  {
    id: 'song-11',
    title: 'Bhojpur Roadtrip Anthem',
    artist: 'Kavya & The Echoes',
    artistId: 'artist-1',
    album: 'Ganga Sunset Sessions',
    albumId: 'album-1',
    genre: 'Bhojpuri Fusion Beats',
    duration: 200,
    fileSize: 4500000,
    coverUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&auto=format&fit=crop&q=80',
    playCount: 620000,
    releaseDate: '2025-11-12',
    lyrics: `Windows down, speakers blasting loud\nSinging together in the cheerful crowd\nPassing through mustard flower fields\nJoy is the only treasure that yields`,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'song-12',
    title: 'Tokyo Midnight Run',
    artist: 'Aetherwave',
    artistId: 'artist-2',
    album: 'Neon Odyssey 2084',
    albumId: 'album-2',
    genre: 'Synthwave & Retro',
    duration: 220,
    fileSize: 5000000,
    coverUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop&q=80',
    playCount: 412000,
    releaseDate: '2026-02-18',
    lyrics: `Red tail lights blurring into red ribbons\nSynthesizer bassline thumping deep\nShinjuku alleys sleeping beneath the skyline\nMemories we promised to keep`,
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
  },
  {
    id: 'song-13',
    title: 'Late Night Cat Naps',
    artist: 'Nico Sol',
    artistId: 'artist-3',
    album: 'Midnight Coffee & Rain',
    albumId: 'album-3',
    genre: 'Chillhop & Lo-Fi',
    duration: 165,
    fileSize: 3500000,
    coverUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
    playCount: 680200,
    releaseDate: '2026-01-05',
    lyrics: `Purring rhythms softly sound\nSoftest blanket all around\nStars outside the window gaze\nLost inside a gentle haze`,
    createdAt: new Date(Date.now() - 32 * 86400000).toISOString(),
  },
  {
    id: 'song-14',
    title: 'Bhojpuri Deep Club Groove',
    artist: 'Mira Varanasi',
    artistId: 'artist-4',
    album: 'Patna Basslines Vol. 1',
    albumId: 'album-4',
    genre: 'Deep House & Club',
    duration: 215,
    fileSize: 4900000,
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    playCount: 341000,
    releaseDate: '2026-03-01',
    lyrics: `Move your feet to the steady bassline\nEverything feels so divine\nFrom rural roots to global sound\nWhere harmony is easily found`,
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: 'song-15',
    title: 'Solar Wind Reflections',
    artist: 'Orbital Horizon',
    artistId: 'artist-5',
    album: 'Cosmic Drift Through Time',
    albumId: 'album-5',
    genre: 'Cinematic Ambient',
    duration: 255,
    fileSize: 6400000,
    coverUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&auto=format&fit=crop&q=80',
    playCount: 145000,
    releaseDate: '2025-10-20',
    lyrics: `[Cinematic Soundscapes]\nA slow meditation across northern aurora fields.`,
    createdAt: new Date(Date.now() - 44 * 86400000).toISOString(),
  },
  {
    id: 'song-16',
    title: 'Harvest Festival Lights',
    artist: 'Kavya & The Echoes',
    artistId: 'artist-1',
    album: 'Ganga Sunset Sessions',
    albumId: 'album-1',
    genre: 'Bhojpuri Fusion Beats',
    duration: 188,
    fileSize: 4100000,
    coverUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80',
    playCount: 295000,
    releaseDate: '2025-11-12',
    lyrics: `Golden grain dancing in the breeze\nCelebration beneath banyan trees\nBrass plates shining in the fire\nMusic lifting our spirits higher`,
    createdAt: new Date(Date.now() - 16 * 86400000).toISOString(),
  },
  {
    id: 'song-17',
    title: 'Outrun Sunset Cruise',
    artist: 'Aetherwave',
    artistId: 'artist-2',
    album: 'Neon Odyssey 2084',
    albumId: 'album-2',
    genre: 'Synthwave & Retro',
    duration: 205,
    fileSize: 4700000,
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
    playCount: 489000,
    releaseDate: '2026-02-18',
    lyrics: `Palm silhouettes against an orange sky\nDriving down the coast as years pass by\nCassette tape clicking in the stereo\nLet the analog memories glow`,
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  {
    id: 'song-18',
    title: 'Study Session in Shibuya',
    artist: 'Nico Sol',
    artistId: 'artist-3',
    album: 'Midnight Coffee & Rain',
    albumId: 'album-3',
    genre: 'Chillhop & Lo-Fi',
    duration: 190,
    fileSize: 4200000,
    coverUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop&q=80',
    playCount: 710000,
    releaseDate: '2026-01-05',
    lyrics: `Pencil scribbles on fresh paper\nQuiet focus, gentle vapor\nLow-pass drums steady and slow\nWatching thoughts begin to grow`,
    createdAt: new Date(Date.now() - 29 * 86400000).toISOString(),
  },
  {
    id: 'song-19',
    title: 'Eastern Express Velocity',
    artist: 'Mira Varanasi',
    artistId: 'artist-4',
    album: 'Patna Basslines Vol. 1',
    albumId: 'album-4',
    genre: 'Bhojpuri Fusion Beats',
    duration: 218,
    fileSize: 5000000,
    coverUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
    playCount: 420500,
    releaseDate: '2026-03-01',
    lyrics: `Train tracks clicking rhythmic steel\nThis is how velocity must feel\nChasing dawn across Bihar\nReaching forward near and far`,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'song-20',
    title: 'Aurora Borealis Echo',
    artist: 'Orbital Horizon',
    artistId: 'artist-5',
    album: 'Cosmic Drift Through Time',
    albumId: 'album-5',
    genre: 'Cinematic Ambient',
    duration: 270,
    fileSize: 6900000,
    coverUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=600&auto=format&fit=crop&q=80',
    playCount: 182000,
    releaseDate: '2025-10-20',
    lyrics: `[Pure Ambient Wonder]\nSymphonic northern lights painted across arctic skies.`,
    createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
];

const INITIAL_PLAYLISTS = [
  {
    id: 'playlist-bhojpuri-bhakti',
    name: 'Bhojpuri Devi Bhakti Special',
    description: 'भक्तिमय देवी गीत - लाल चुनरिया वाली मईया & आवा हो मईया हमरा अंगनवा with traditional dholak & mangal geet.',
    coverUrl: 'https://images.unsplash.com/photo-1609342122563-a43ac8917a3a?w=600&auto=format&fit=crop&q=80',
    userId: 'user-demo',
    isAiGenerated: false,
    songIds: ['song-bhojpuri-1', 'song-bhojpuri-2', 'song-1', 'song-4', 'song-11'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'playlist-1',
    name: 'Late Night Focus & Flow',
    description: 'Deep mellow lo-fi beats and ambient textures engineered for deep coding and concentration.',
    coverUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&auto=format&fit=crop&q=80',
    userId: 'user-demo',
    isAiGenerated: false,
    songIds: ['song-3', 'song-8', 'song-13', 'song-18', 'song-5'],
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'playlist-2',
    name: 'Bhojpuri Road Trip Fuel',
    description: 'High energy folk rhythms, modern 808s, and electric fusion for the highway.',
    coverUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&auto=format&fit=crop&q=80',
    userId: 'user-demo',
    isAiGenerated: true,
    aiPrompt: 'Energetic Bhojpuri road trip songs with modern beats',
    songIds: ['song-1', 'song-4', 'song-11', 'song-19', 'song-9', 'song-6'],
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 'playlist-3',
    name: 'Cyberpunk Cyberdrive',
    description: 'Analog synthesizers, neon basslines, and adrenaline synthwave tracks.',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    userId: 'user-demo',
    isAiGenerated: false,
    songIds: ['song-2', 'song-7', 'song-12', 'song-17'],
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'playlist-4',
    name: 'Cosmic Meditation & Sleep',
    description: 'Warm drone frequencies and slow soundscapes to ease the mind into deep rest.',
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    userId: 'user-demo',
    isAiGenerated: false,
    songIds: ['song-5', 'song-10', 'song-15', 'song-20'],
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'playlist-5',
    name: 'Daily Acoustic Warmth',
    description: 'Organic strings, cozy rhythms, and morning relaxation tunes.',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    userId: 'user-demo',
    isAiGenerated: false,
    songIds: ['song-6', 'song-8', 'song-16', 'song-3'],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

const INITIAL_USERS = [
  {
    id: 'admin-1',
    name: 'Aura Studio Admin',
    email: 'admin@vibewave.io',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-demo',
    name: 'Alex Rivera',
    email: 'alex@vibewave.io',
    role: 'USER',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
];

interface DatabaseSchema {
  songs: any[];
  artists: any[];
  albums: any[];
  genres: any[];
  playlists: any[];
  users: any[];
  likes: { userId: string; songId: string; createdAt: string }[];
  listeningHistory: { id: string; userId: string; songId: string; progress: number; playedAt: string }[];
}

let db: DatabaseSchema;

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      initializeDemoAudioFiles(parsed.songs);
      return parsed;
    }
  } catch (err) {
    console.error('Error reading database file, regenerating defaults:', err);
  }

  const defaultDb: DatabaseSchema = {
    songs: INITIAL_SONGS,
    artists: INITIAL_ARTISTS,
    albums: INITIAL_ALBUMS,
    genres: INITIAL_GENRES,
    playlists: INITIAL_PLAYLISTS,
    users: INITIAL_USERS,
    likes: [
      { userId: 'user-demo', songId: 'song-1', createdAt: new Date().toISOString() },
      { userId: 'user-demo', songId: 'song-3', createdAt: new Date().toISOString() },
      { userId: 'user-demo', songId: 'song-11', createdAt: new Date().toISOString() },
      { userId: 'user-demo', songId: 'song-2', createdAt: new Date().toISOString() },
    ],
    listeningHistory: [
      { id: 'h-1', userId: 'user-demo', songId: 'song-1', progress: 140, playedAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'h-2', userId: 'user-demo', songId: 'song-3', progress: 95, playedAt: new Date(Date.now() - 7200000).toISOString() },
      { id: 'h-3', userId: 'user-demo', songId: 'song-11', progress: 198, playedAt: new Date(Date.now() - 14400000).toISOString() },
    ],
  };

  initializeDemoAudioFiles(defaultDb.songs);
  saveDatabase(defaultDb);
  return defaultDb;
}

function saveDatabase(data: DatabaseSchema = db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

db = loadDatabase();

// -------------------------------------------------------------
// Gemini AI Initialization
// -------------------------------------------------------------
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  aiClient = new GoogleGenAI({ apiKey: geminiApiKey });
}

// -------------------------------------------------------------
// Audio Streaming Endpoint with HTTP 206 Partial Content (Range Support)
// -------------------------------------------------------------
app.get('/api/stream/:id', (req: Request, res: Response) => {
  const songId = req.params.id;
  const song = db.songs.find((s) => s.id === songId);

  if (!song) {
    return res.status(404).json({ error: 'Song not found' });
  }

  // Check if file exists on disk
  const filePath = song.filePath
    ? path.join(AUDIO_DIR, song.filePath)
    : path.join(AUDIO_DIR, `demo_song_${songId}.wav`);

  if (!fs.existsSync(filePath)) {
    // Generate fallback sound if somehow missing
    const fallbackBuf = generateDemoWavBuffer(220, 'ambient', 30);
    fs.writeFileSync(filePath, fallbackBuf);
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Determine MIME type
  const ext = path.extname(filePath).toLowerCase();
  let contentType = 'audio/mpeg';
  if (ext === '.wav') contentType = 'audio/wav';
  else if (ext === '.flac') contentType = 'audio/flac';
  else if (ext === '.m4a' || ext === '.aac') contentType = 'audio/mp4';
  else if (ext === '.ogg') contentType = 'audio/ogg';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
      return;
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// -------------------------------------------------------------
// Core Music Endpoints
// -------------------------------------------------------------

// Get all songs (with optional filtering, genre, search)
app.get('/api/songs', (req: Request, res: Response) => {
  const { genre, search, sort } = req.query;
  let result = [...db.songs];

  if (genre && genre !== 'All') {
    result = result.filter((s) => s.genre.toLowerCase() === (genre as string).toLowerCase());
  }

  if (search) {
    const q = (search as string).toLowerCase().trim();
    result = result.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.album && s.album.toLowerCase().includes(q)) ||
        s.genre.toLowerCase().includes(q)
    );
  }

  if (sort === 'popular') {
    result.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
  } else if (sort === 'recent') {
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json(result);
});

// Get single song
app.get('/api/songs/:id', (req: Request, res: Response) => {
  const song = db.songs.find((s) => s.id === req.params.id);
  if (!song) return res.status(404).json({ error: 'Song not found' });
  res.json(song);
});

// Record Play Count and Listening History
app.post('/api/songs/:id/play', (req: Request, res: Response) => {
  const { userId = 'user-demo', progress = 0 } = req.body;
  const song = db.songs.find((s) => s.id === req.params.id);
  if (song) {
    song.playCount = (song.playCount || 0) + 1;

    // update or push listening history
    const existingIndex = db.listeningHistory.findIndex(
      (h) => h.userId === userId && h.songId === song.id
    );
    if (existingIndex >= 0) {
      db.listeningHistory[existingIndex].playedAt = new Date().toISOString();
      db.listeningHistory[existingIndex].progress = progress;
    } else {
      db.listeningHistory.unshift({
        id: 'hist-' + Date.now(),
        userId,
        songId: song.id,
        progress,
        playedAt: new Date().toISOString(),
      });
      if (db.listeningHistory.length > 100) db.listeningHistory.pop();
    }

    saveDatabase();
  }
  res.json({ success: true, playCount: song?.playCount });
});

// Get Artists
app.get('/api/artists', (_req: Request, res: Response) => {
  res.json(db.artists);
});

// Get Albums
app.get('/api/albums', (_req: Request, res: Response) => {
  res.json(db.albums);
});

// Get Genres
app.get('/api/genres', (_req: Request, res: Response) => {
  res.json(db.genres);
});

// Get Playlists
app.get('/api/playlists', (req: Request, res: Response) => {
  const { userId } = req.query;
  let list = db.playlists;
  if (userId) {
    list = list.filter((p) => p.userId === userId || !p.userId);
  }
  res.json(list);
});

// Create Playlist
app.post('/api/playlists', (req: Request, res: Response) => {
  const { name, description, coverUrl, songIds = [], userId = 'user-demo', isAiGenerated = false, aiPrompt } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }

  const newPlaylist = {
    id: 'pl-' + Date.now(),
    name,
    description: description || '',
    coverUrl: coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    userId,
    isAiGenerated,
    aiPrompt,
    songIds,
    createdAt: new Date().toISOString(),
  };

  db.playlists.unshift(newPlaylist);
  saveDatabase();
  res.status(201).json(newPlaylist);
});

// Add/Remove song from playlist
app.post('/api/playlists/:id/toggle-song', (req: Request, res: Response) => {
  const { songId } = req.body;
  const playlist = db.playlists.find((p) => p.id === req.params.id);
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

  const idx = playlist.songIds.indexOf(songId);
  if (idx >= 0) {
    playlist.songIds.splice(idx, 1);
  } else {
    playlist.songIds.push(songId);
  }

  saveDatabase();
  res.json(playlist);
});

// Likes endpoints
app.get('/api/likes', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'user-demo';
  const userLikes = db.likes.filter((l) => l.userId === userId).map((l) => l.songId);
  res.json(userLikes);
});

app.post('/api/likes/toggle', (req: Request, res: Response) => {
  const { songId, userId = 'user-demo' } = req.body;
  const idx = db.likes.findIndex((l) => l.userId === userId && l.songId === songId);
  let isLiked = false;

  if (idx >= 0) {
    db.likes.splice(idx, 1);
    isLiked = false;
  } else {
    db.likes.push({ userId, songId, createdAt: new Date().toISOString() });
    isLiked = true;
  }

  saveDatabase();
  res.json({ isLiked, songId });
});

// Listening History
app.get('/api/history', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'user-demo';
  const userHistory = db.listeningHistory
    .filter((h) => h.userId === userId)
    .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
    .slice(0, 30);

  const populated = userHistory
    .map((h) => {
      const song = db.songs.find((s) => s.id === h.songId);
      return song ? { ...h, song } : null;
    })
    .filter(Boolean);

  res.json(populated);
});

// -------------------------------------------------------------
// Admin & Music Upload Endpoints
// -------------------------------------------------------------

// Single Song Upload
app.post(
  '/api/admin/upload',
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const audioFile = files?.['audio']?.[0];
      const coverFile = files?.['cover']?.[0];

      if (!audioFile) {
        return res.status(400).json({ error: 'Audio file is required' });
      }

      const {
        title = path.basename(audioFile.originalname, path.extname(audioFile.originalname)),
        artist = 'Unknown Artist',
        album = 'Single',
        genre = 'Electronic',
        lyrics = '',
        releaseDate = new Date().toISOString().split('T')[0],
        duration = 180,
      } = req.body;

      const newSongId = 'song-' + Date.now();
      const coverUrl = coverFile
        ? `/uploads/covers/${coverFile.filename}`
        : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';

      const newSong = {
        id: newSongId,
        title,
        artist,
        album,
        genre,
        duration: parseInt(duration, 10) || 180,
        fileSize: audioFile.size,
        coverUrl,
        audioUrl: `/api/stream/${newSongId}`,
        filePath: audioFile.filename,
        lyrics,
        playCount: 0,
        releaseDate,
        createdAt: new Date().toISOString(),
      };

      db.songs.unshift(newSong);

      // Link artist if not exists
      let existingArtist = db.artists.find((a) => a.name.toLowerCase() === artist.toLowerCase());
      if (!existingArtist) {
        existingArtist = {
          id: 'artist-' + Date.now(),
          name: artist,
          image: coverUrl,
          bio: `Talented creator producing ${genre} music.`,
          genres: [genre],
          monthlyListeners: 1000,
          topSongIds: [newSongId],
        };
        db.artists.push(existingArtist);
      } else {
        existingArtist.topSongIds.unshift(newSongId);
      }

      saveDatabase();
      res.status(201).json({ success: true, song: newSong });
    } catch (err: any) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message || 'File upload failed' });
    }
  }
);

// Bulk Audio Upload
app.post('/api/admin/bulk-upload', upload.array('audioFiles', 25), (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No audio files uploaded' });
    }

    const { defaultGenre = 'Lo-Fi', defaultArtist = 'Various Artists' } = req.body;

    const uploadedSongs = files.map((file, idx) => {
      const ext = path.extname(file.originalname);
      const cleanTitle = path
        .basename(file.originalname, ext)
        .replace(/^[0-9]+[_\s.-]*/, '')
        .replace(/[_-]/g, ' ')
        .trim();

      const newSongId = `song-bulk-${Date.now()}-${idx}`;
      return {
        id: newSongId,
        title: cleanTitle || `Track ${idx + 1}`,
        artist: defaultArtist,
        album: 'Bulk Import',
        genre: defaultGenre,
        duration: 195, // standard estimated duration
        fileSize: file.size,
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        audioUrl: `/api/stream/${newSongId}`,
        filePath: file.filename,
        playCount: 0,
        createdAt: new Date().toISOString(),
      };
    });

    db.songs.unshift(...uploadedSongs);
    saveDatabase();

    res.status(201).json({
      success: true,
      count: uploadedSongs.length,
      songs: uploadedSongs,
    });
  } catch (err: any) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ error: err.message || 'Bulk upload failed' });
  }
});

// Update song metadata
app.put('/api/admin/songs/:id', (req: Request, res: Response) => {
  const song = db.songs.find((s) => s.id === req.params.id);
  if (!song) return res.status(404).json({ error: 'Song not found' });

  const { title, artist, album, genre, lyrics, releaseDate } = req.body;
  if (title) song.title = title;
  if (artist) song.artist = artist;
  if (album) song.album = album;
  if (genre) song.genre = genre;
  if (lyrics !== undefined) song.lyrics = lyrics;
  if (releaseDate) song.releaseDate = releaseDate;

  saveDatabase();
  res.json({ success: true, song });
});

// Delete song
app.delete('/api/admin/songs/:id', (req: Request, res: Response) => {
  const songIndex = db.songs.findIndex((s) => s.id === req.params.id);
  if (songIndex === -1) return res.status(404).json({ error: 'Song not found' });

  const removedSong = db.songs[songIndex];

  // Try removing file from disk if not a demo
  if (removedSong.filePath && !removedSong.filePath.startsWith('demo_')) {
    try {
      const fullPath = path.join(AUDIO_DIR, removedSong.filePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (e) {
      console.warn('Could not delete audio file on disk:', e);
    }
  }

  db.songs.splice(songIndex, 1);

  // Remove from playlists
  db.playlists.forEach((p) => {
    p.songIds = p.songIds.filter((id: string) => id !== req.params.id);
  });

  saveDatabase();
  res.json({ success: true, id: req.params.id });
});

// Admin Analytics
app.get('/api/admin/analytics', (_req: Request, res: Response) => {
  const totalSongs = db.songs.length;
  const totalPlays = db.songs.reduce((acc, s) => acc + (s.playCount || 0), 0);
  const totalUsers = db.users.length;
  const totalPlaylists = db.playlists.length;
  const storageUsedBytes = db.songs.reduce((acc, s) => acc + (s.fileSize || 3500000), 0);

  // Genre distribution
  const genreCounts: { [k: string]: number } = {};
  db.songs.forEach((s) => {
    genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
  });

  const topGenres = Object.entries(genreCounts).map(([genre, count]) => ({
    genre,
    count,
    percentage: Math.round((count / Math.max(1, totalSongs)) * 100),
  }));

  // Plays per day simulation based on real data
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const playsPerDay = days.map((day, idx) => ({
    day,
    plays: Math.round((totalPlays / 30) * (0.8 + (idx % 4) * 0.25)),
  }));

  const topSongs = [...db.songs].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 5);

  res.json({
    totalSongs,
    totalPlays,
    totalUsers,
    totalPlaylists,
    storageUsedBytes,
    topGenres,
    playsPerDay,
    topSongs,
  });
});

// -------------------------------------------------------------
// Gemini AI Music Discovery & Playlist Generator
// -------------------------------------------------------------
app.post('/api/ai/generate-playlist', async (req: Request, res: Response) => {
  const { prompt, mood } = req.body;

  if (!prompt && !mood) {
    return res.status(400).json({ error: 'Prompt or mood is required' });
  }

  const userQuery = prompt || `Create a ${mood} playlist with rich vibes`;

  // Song catalog for AI context
  const catalogSummary = db.songs.map((s) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    genre: s.genre,
    album: s.album,
  }));

  let aiPlaylist = {
    title: `${mood || 'AI'} Vibe Mix`,
    description: `A curated collection matching: "${userQuery}"`,
    songIds: [] as string[],
    vibeCommentary: 'Carefully curated from your cloud music library.',
  };

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are an expert music curator and DJ for the Sonora AI music streaming platform.
The user wants a playlist based on this request: "${userQuery}".

CRITICAL RULE:
You MUST ONLY select songs from the provided catalog below. NEVER invent non-existent song IDs or external songs.
Select between 4 and 10 of the best matching songs.

CATALOG:
${JSON.stringify(catalogSummary, null, 2)}

Respond with STRICT JSON format without markdown code blocks:
{
  "title": "Creative Playlist Title with Emoji",
  "description": "Engaging description explaining the musical journey",
  "vibeCommentary": "Short DJ note on why these tracks flow together",
  "songIds": ["song-1", "song-4", ...]
}`,
              },
            ],
          },
        ],
      });

      const responseText = response.text?.trim() || '';
      const cleanJson = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Validate that returned song IDs actually exist in DB
      const validSongIds = (parsed.songIds || []).filter((id: string) =>
        db.songs.some((s) => s.id === id)
      );

      if (validSongIds.length > 0) {
        aiPlaylist = {
          title: parsed.title || aiPlaylist.title,
          description: parsed.description || aiPlaylist.description,
          vibeCommentary: parsed.vibeCommentary || aiPlaylist.vibeCommentary,
          songIds: validSongIds,
        };
      }
    } catch (aiErr) {
      console.warn('Gemini AI playlist generation fallback used:', aiErr);
    }
  }

  // Fallback matching if AI was unavailable or returned empty
  if (aiPlaylist.songIds.length === 0) {
    const q = (userQuery || '').toLowerCase();
    const matches = db.songs.filter(
      (s) =>
        q.includes(s.genre.toLowerCase()) ||
        q.includes(s.artist.toLowerCase()) ||
        s.title.toLowerCase().includes(q)
    );

    if (matches.length >= 3) {
      aiPlaylist.songIds = matches.map((s) => s.id);
    } else {
      // Pick top songs and shuffle
      aiPlaylist.songIds = [...db.songs]
        .sort(() => 0.5 - Math.random())
        .slice(0, 6)
        .map((s) => s.id);
    }
  }

  // Find song details for response
  const matchingSongs = aiPlaylist.songIds
    .map((id) => db.songs.find((s) => s.id === id))
    .filter(Boolean);

  res.json({
    playlist: aiPlaylist,
    songs: matchingSongs,
  });
});

// Interactive AI Music Assistant Endpoint
app.post('/api/ai/assistant', async (req: Request, res: Response) => {
  const { message, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const catalogSummary = db.songs.map((s) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    genre: s.genre,
    playCount: s.playCount,
  }));

  let assistantReply = "I'm your Sonora AI Assistant! I can help you find tracks, create custom mood playlists, or play music from your library.";
  let suggestedAction: any = null;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are the AI Music Assistant built directly into Sonora AI streaming platform.
You have access to the user's music library and player controls.
The user says: "${message}"

LIBRARY SONGS:
${JSON.stringify(catalogSummary, null, 2)}

Provide a friendly, knowledgeable, concise response (1-3 sentences) and determine if an action should be triggered:
Possible actions:
- { "type": "PLAY_SONG", "songId": "song-id", "songTitle": "title" }
- { "type": "CREATE_PLAYLIST", "name": "Title", "songIds": ["id1", "id2"] }
- { "type": "NAVIGATE", "view": "library" | "admin" | "search" | "ai" }
- null if just answering or chatting

Respond in strict JSON:
{
  "reply": "friendly natural response",
  "action": actionObjectOrNull
}`,
              },
            ],
          },
        ],
      });

      const responseText = response.text?.trim() || '';
      const cleanJson = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      assistantReply = parsed.reply || assistantReply;
      suggestedAction = parsed.action || null;
    } catch (err) {
      console.warn('Gemini Assistant fallback:', err);
      // Smart local parsing
      const low = message.toLowerCase();
      const match = db.songs.find((s) => low.includes(s.title.toLowerCase()) || low.includes(s.artist.toLowerCase()));
      if (match) {
        assistantReply = `I found "${match.title}" by ${match.artist}. Let's play it right now!`;
        suggestedAction = { type: 'PLAY_SONG', songId: match.id, songTitle: match.title };
      } else if (low.includes('bhojpuri')) {
        const bhojpuriSongs = db.songs.filter((s) => s.genre.toLowerCase().includes('bhojpuri'));
        assistantReply = `Here are high-energy Bhojpuri tracks from your library!`;
        suggestedAction = {
          type: 'CREATE_PLAYLIST',
          name: 'Bhojpuri Energy Mix',
          songIds: bhojpuriSongs.map((s) => s.id),
        };
      }
    }
  }

  res.json({
    reply: assistantReply,
    action: suggestedAction,
  });
});

// -------------------------------------------------------------
// Auth Mock / Session Endpoints
// -------------------------------------------------------------
app.get('/api/auth/me', (req: Request, res: Response) => {
  const role = req.headers['x-user-role'] === 'ADMIN' ? 'ADMIN' : 'USER';
  const user = db.users.find((u) => u.role === role) || db.users[1];
  res.json(user);
});

// -------------------------------------------------------------
// Dev & Production Frontend Serving
// -------------------------------------------------------------
export { app };
export default app;

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // SPA fallback in development so all routes load index.html with Vite transformations
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } else {
          next();
        }
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      app.use(express.static(__dirname));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
      });
    }
  }

  // Only bind port when not running as a Vercel serverless function
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Songfly Server is running on port ${PORT}`);
    });
  }
}

startServer();
