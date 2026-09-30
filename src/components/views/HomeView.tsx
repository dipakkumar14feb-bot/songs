import React from 'react';
import { Play, ArrowRight, Radio, Compass, Disc } from 'lucide-react';
import { Song, Playlist } from '../../types/music';
import { SongCard } from '../common/SongCard';
import { SongRow } from '../common/SongRow';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface HomeViewProps {
  songs: Song[];
  playlists: Playlist[];
  onNavigateTab: (tab: string) => void;
  onSelectMood: (mood: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  songs,
  playlists,
  onNavigateTab,
  onSelectMood,
}) => {
  const { playSong } = useMusicPlayer();

  // Dynamic greeting based on current hour
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // 6 quick access cards
  const quickAccessSongs = songs.slice(0, 6);

  // Recommendations / Trending
  const popularSongs = [...songs].sort((a, b) => b.playCount - a.playCount).slice(0, 6);
  const newReleases = [...songs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const moodPills = [
    { label: 'Chill & Relax', mood: 'Relaxing', bg: 'from-blue-700 to-indigo-900' },
    { label: 'Workout Energy', mood: 'Workout', bg: 'from-red-700 to-rose-900' },
    { label: 'Late Night Beats', mood: 'Late Night', bg: 'from-purple-800 to-indigo-950' },
    { label: 'Focus & Study', mood: 'Focus', bg: 'from-emerald-700 to-teal-900' },
  ];

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-200">
      {/* Greeting Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {greeting}
        </h1>
      </div>

      {/* Spotify-style Quick 6 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quickAccessSongs.map((song) => (
          <div
            key={song.id}
            onClick={() => playSong(song, songs)}
            className="group flex items-center justify-between rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer pr-3 overflow-hidden shadow-sm"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <img
                src={song.coverUrl}
                alt={song.title}
                className="w-16 h-16 object-cover flex-shrink-0"
              />
              <span className="text-sm font-bold text-white truncate">
                {song.title}
              </span>
            </div>

            {/* Hover green play button */}
            <button className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-105 active:scale-95 flex-shrink-0">
              <Play className="w-5 h-5 fill-current text-black ml-0.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Featured Bhojpuri Devi Bhakti Banner */}
      <section className="relative rounded-2xl overflow-hidden p-6 sm:p-8 bg-gradient-to-r from-red-950 via-rose-900/60 to-amber-950/80 border border-red-500/20 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl text-center sm:text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Special Release • Bhojpuri Devi Bhakti
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            लाल चुनरिया वाली मईया & आवा हो मईया
          </h2>
          <p className="text-xs sm:text-sm text-slate-200">
            Devotional folk rhythms, traditional dholak beats, and complete synchronized Hindi lyrics.
          </p>
          <div className="flex items-center justify-center sm:justify-start gap-3 pt-2">
            <button
              onClick={() => {
                const s1 = songs.find((s) => s.id === 'song-bhojpuri-1') || songs[0];
                if (s1) playSong(s1, songs);
              }}
              className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <Play className="w-4 h-4 fill-current text-black" />
              Play Now
            </button>
            <button
              onClick={() => onNavigateTab('playlist-playlist-bhojpuri-bhakti')}
              className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm transition-colors"
            >
              View Special Playlist
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <img
            src="https://images.unsplash.com/photo-1609342122563-a43ac8917a3a?w=600&auto=format&fit=crop&q=80"
            alt="Devi Geet"
            className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl object-cover shadow-xl border border-white/10"
          />
        </div>
      </section>

      {/* Mood Mixes Row */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight">Browse Mixes & Vibes</h2>
          <button
            onClick={() => onNavigateTab('ai-music')}
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1"
          >
            Show all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {moodPills.map((m, idx) => (
            <div
              key={idx}
              onClick={() => {
                onSelectMood(m.mood);
                onNavigateTab('ai-music');
              }}
              className={`p-4 rounded-xl bg-gradient-to-br ${m.bg} cursor-pointer hover:scale-[1.02] transition-transform flex flex-col justify-between h-24 shadow-md`}
            >
              <span className="text-sm font-bold text-white">{m.label}</span>
              <span className="text-[11px] text-white/70">Play vibe →</span>
            </div>
          ))}
        </div>
      </section>

      {/* Made For You / Popular */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Made For You</h2>
            <p className="text-xs text-slate-400">Based on your recent listening habits</p>
          </div>
          <button
            onClick={() => onNavigateTab('search')}
            className="text-xs font-semibold text-slate-400 hover:text-white"
          >
            Show all
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {popularSongs.map((song) => (
            <SongCard key={song.id} song={song} allSongs={songs} />
          ))}
        </div>
      </section>

      {/* Popular Tracks Table View */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white tracking-tight">Popular Tracks</h2>
        <div className="rounded-xl bg-[#121216]/60 p-2 border border-white/5 space-y-0.5">
          {songs.slice(0, 5).map((song, idx) => (
            <SongRow key={song.id} song={song} index={idx} allSongs={songs} />
          ))}
        </div>
      </section>

      {/* New Releases */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white tracking-tight">New Releases</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {newReleases.map((song) => (
            <SongCard key={song.id} song={song} allSongs={songs} />
          ))}
        </div>
      </section>
    </div>
  );
};
