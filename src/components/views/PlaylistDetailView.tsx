import React from 'react';
import { Play, Shuffle, Clock, Music, ArrowLeft, Heart } from 'lucide-react';
import { Playlist, Song } from '../../types/music';
import { SongRow } from '../common/SongRow';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface PlaylistDetailViewProps {
  playlist: Playlist;
  allSongs: Song[];
  onBack: () => void;
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hours > 0) {
    return `${hours} hr ${remainingMins} min`;
  }
  return `${mins} min`;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
  playlist,
  allSongs,
  onBack,
}) => {
  const { playSong } = useMusicPlayer();

  const playlistSongs = playlist.songIds
    .map((id) => allSongs.find((s) => s.id === id))
    .filter(Boolean) as Song[];

  const totalDuration = playlistSongs.reduce((acc, s) => acc + (s.duration || 0), 0);

  const handlePlayAll = (shuffle = false) => {
    if (playlistSongs.length === 0) return;
    const listToPlay = shuffle
      ? [...playlistSongs].sort(() => 0.5 - Math.random())
      : playlistSongs;
    playSong(listToPlay[0], listToPlay);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Playlist Hero Banner (Spotify Style) */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-7 pb-4">
        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-lg overflow-hidden shadow-2xl flex-shrink-0 bg-slate-800">
          <img
            src={playlist.coverUrl}
            alt={playlist.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-2 text-center sm:text-left min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Playlist
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            {playlist.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl line-clamp-2">
            {playlist.description || 'Curated playlist on Songfly.'}
          </p>

          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-400 font-medium pt-1">
            <span className="font-bold text-white">Songfly</span>
            <span>•</span>
            <span>{playlistSongs.length} songs</span>
            <span>•</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>
        </div>
      </div>

      {/* Play Controls Row (Big Green Play Button) */}
      <div className="flex items-center gap-6 py-2">
        <button
          onClick={() => handlePlayAll(false)}
          disabled={playlistSongs.length === 0}
          className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-lg transition-all disabled:opacity-40"
          title="Play"
        >
          <Play className="w-6 h-6 fill-current text-black ml-0.5" />
        </button>

        <button
          onClick={() => handlePlayAll(true)}
          disabled={playlistSongs.length === 0}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          title="Shuffle"
        >
          <Shuffle className="w-6 h-6" />
        </button>
      </div>

      {/* Tracklist Table */}
      <div className="space-y-0.5">
        <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/10 mb-2">
          <div className="flex items-center gap-4">
            <span className="w-5 text-center">#</span>
            <span>Title</span>
          </div>
          <div className="hidden md:block">Album</div>
          <span>Time</span>
        </div>

        {playlistSongs.length > 0 ? (
          playlistSongs.map((song, idx) => (
            <SongRow
              key={song.id}
              song={song}
              index={idx}
              allSongs={playlistSongs}
            />
          ))
        ) : (
          <div className="text-center py-16 text-slate-500">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">This playlist is empty.</p>
          </div>
        )}
      </div>
    </div>
  );
};
