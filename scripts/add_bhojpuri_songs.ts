import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const AUDIO_DIR = path.join(rootDir, 'uploads', 'audio');
const DB_FILE = path.join(rootDir, 'data', 'database.json');

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Generate an authentic devotional folk / Bhakti audio WAV buffer with temple bells & dholak rhythm
function generateFolkBhaktiWav(tempoBpm = 132, durationSeconds = 45): Buffer {
  const sampleRate = 44100;
  const numSamples = sampleRate * durationSeconds;
  const blockAlign = 2; // 1 channel, 16 bit
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // 16 bit
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Scale frequencies (Bhojpuri folk / Bilawal scale: C, D, E, F, G, A, B)
  const scale = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
  const beatInterval = 60 / tempoBpm; // seconds per beat

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const beatPhase = (t % beatInterval) / beatInterval;
    const barPhase = (t % (beatInterval * 4)) / (beatInterval * 4);

    // 1. Dholak low bass thump on beat 1 and 3
    let dholakBass = 0;
    if (beatPhase < 0.25) {
      const decay = Math.exp(-beatPhase * 16);
      dholakBass = Math.sin(2 * Math.PI * 65 * beatPhase) * decay * 0.45;
    }

    // 2. High treble dholak 'chati' snap on beat 2 and 4
    let dholakSnare = 0;
    const halfBeat = (t + beatInterval / 2) % beatInterval;
    if (halfBeat < 0.15) {
      const decay = Math.exp(-halfBeat * 25);
      dholakSnare = (Math.random() * 2 - 1) * decay * 0.18;
    }

    // 3. Temple bell ping (Ghanta) every 2 beats
    let templeBell = 0;
    const bellPhase = (t % (beatInterval * 2)) / (beatInterval * 2);
    if (bellPhase < 0.5) {
      const bellDecay = Math.exp(-bellPhase * 6);
      templeBell =
        (Math.sin(2 * Math.PI * 1760 * bellPhase) * 0.5 +
          Math.sin(2 * Math.PI * 2640 * bellPhase) * 0.3 +
          Math.sin(2 * Math.PI * 3520 * bellPhase) * 0.2) *
        bellDecay *
        0.2;
    }

    // 4. Harmonium / Shehnai melody
    const noteIndex = Math.floor(t * 2) % scale.length;
    const melodyFreq = scale[noteIndex];
    const melody =
      Math.sin(2 * Math.PI * melodyFreq * t) * 0.25 +
      Math.sin(2 * Math.PI * (melodyFreq * 2) * t) * 0.1;

    // 5. Tanpura drone (Sa - Pa)
    const tanpura =
      Math.sin(2 * Math.PI * 130.81 * t) * 0.12 + Math.sin(2 * Math.PI * 196.0 * t) * 0.08;

    // Combine
    let combined = dholakBass + dholakSnare + templeBell + melody + tanpura;

    // Fade in / out
    let env = 1.0;
    if (t < 0.5) env = t / 0.5;
    if (t > durationSeconds - 1.5) env = Math.max(0, (durationSeconds - t) / 1.5);

    const int16 = Math.max(-32767, Math.min(32767, Math.floor(combined * env * 22000)));
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  return buffer;
}

const song1Buffer = generateFolkBhaktiWav(134, 45);
fs.writeFileSync(path.join(AUDIO_DIR, 'demo_song_song-bhojpuri-1.wav'), song1Buffer);
console.log('✓ Generated audio for Lal Chunariya Wali Maiya');

const song2Buffer = generateFolkBhaktiWav(126, 45);
fs.writeFileSync(path.join(AUDIO_DIR, 'demo_song_song-bhojpuri-2.wav'), song2Buffer);
console.log('✓ Generated audio for Aawa Ho Maiya Hamra Anganwa');

// Load database.json and prepend songs
if (fs.existsSync(DB_FILE)) {
  const content = fs.readFileSync(DB_FILE, 'utf-8');
  const db = JSON.parse(content);

  const song1 = {
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
  };

  const song2 = {
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
  };

  // Remove if existing and prepend
  db.songs = db.songs.filter((s: any) => s.id !== song1.id && s.id !== song2.id);
  db.songs.unshift(song1, song2);

  // Add genre if not exists
  if (!db.genres.some((g: any) => g.name === 'Bhojpuri Bhakti & Devi Geet')) {
    db.genres.unshift({
      id: 'genre-bhojpuri-bhakti',
      name: 'Bhojpuri Bhakti & Devi Geet',
      color: '#e11d48',
    });
  }

  // Add Special Playlist
  const specialPlaylist = {
    id: 'playlist-bhojpuri-bhakti',
    name: 'Bhojpuri Devi Bhakti Special',
    description:
      'भक्तिमय देवी गीत - लाल चुनरिया वाली मईया & आवा हो मईया हमरा अंगनवा with traditional dholak & mangal geet.',
    coverUrl:
      'https://images.unsplash.com/photo-1609342122563-a43ac8917a3a?w=600&auto=format&fit=crop&q=80',
    userId: 'user-demo',
    isAiGenerated: false,
    songIds: ['song-bhojpuri-1', 'song-bhojpuri-2', 'song-1', 'song-4', 'song-11'],
    createdAt: new Date().toISOString(),
  };

  db.playlists = db.playlists.filter((p: any) => p.id !== specialPlaylist.id);
  db.playlists.unshift(specialPlaylist);

  // Add album
  const bhaktiAlbum = {
    id: 'album-bhojpuri-bhakti',
    title: 'Durga Saptashati & Devi Geet',
    artist: 'Devi Vandana & Folk Choir',
    artistId: 'artist-1',
    coverUrl:
      'https://images.unsplash.com/photo-1609342122563-a43ac8917a3a?w=600&auto=format&fit=crop&q=80',
    releaseDate: '2026-03-25',
    genre: 'Bhojpuri Bhakti & Devi Geet',
    songIds: ['song-bhojpuri-1', 'song-bhojpuri-2'],
  };

  db.albums = db.albums.filter((a: any) => a.id !== bhaktiAlbum.id);
  db.albums.unshift(bhaktiAlbum);

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  console.log('✓ Successfully updated database.json with both songs and playlist');
}
