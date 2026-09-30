import React from 'react';
import { Play, Pause, Heart, ListPlus } from 'lucide-react';
import { Song } from '../../types/music';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface SongRowProps {
  song: Song;
  index: number;
  allSongs?: Song[];
  showAlbum?: boolean;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const SongRow: React.FC<SongRowProps> = ({
  song,
  index,
  allSongs = [],
  showAlbum = true,
}) => {
  const { currentSong, isPlaying, playSong, togglePlayPause, toggleLike, isLiked, addToQueue } =
    useMusicPlayer();

  const isCurrent = currentSong?.id === song.id;
  const liked = isLiked(song.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlayPause();
    } else {
      playSong(song, allSongs.length > 0 ? allSongs : [song]);
    }
  };

  return (
    <div
      onClick={handlePlayClick}
      className={`group flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer transition-colors ${
        isCurrent
          ? 'bg-white/10'
          : 'hover:bg-white/5'
      }`}
    >
      {/* Left: Index / Play Icon + Cover + Title */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-5 text-center text-xs text-slate-400 font-mono flex items-center justify-center flex-shrink-0">
          <span className="group-hover:hidden">
            {isCurrent && isPlaying ? (
              <span className="text-emerald-400 font-bold">▶</span>
            ) : (
              index + 1
            )}
          </span>
          <button
            onClick={handlePlayClick}
            className="hidden group-hover:flex items-center justify-center text-white"
          >
            {isCurrent && isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current text-emerald-400" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current text-white" />
            )}
          </button>
        </div>

        <img
          src={song.coverUrl}
          alt={song.title}
          className="w-10 h-10 rounded object-cover flex-shrink-0"
        />

        <div className="min-w-0 flex-1">
          <div
            className={`text-sm font-medium truncate ${
              isCurrent ? 'text-emerald-400 font-semibold' : 'text-white'
            }`}
          >
            {song.title}
          </div>
          <div className="text-xs text-slate-400 truncate hover:underline">
            {song.artist}
          </div>
        </div>
      </div>

      {/* Middle: Album Name */}
      {showAlbum && (
        <div className="hidden md:block w-1/3 text-xs text-slate-400 truncate px-4 hover:underline">
          {song.album || 'Single'}
        </div>
      )}

      {/* Right: Heart, Queue, Duration */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(song.id);
          }}
          className={`p-1 transition-colors ${
            liked
              ? 'text-emerald-400'
              : 'text-slate-400 hover:text-white opacity-0 group-hover:opacity-100'
          }`}
          title={liked ? 'Unlike' : 'Like'}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            addToQueue(song);
          }}
          className="p-1 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          title="Add to queue"
        >
          <ListPlus className="w-4 h-4" />
        </button>

        <span className="text-xs text-slate-400 font-mono w-10 text-right">
          {formatTime(song.duration)}
        </span>
      </div>
    </div>
  );
};
