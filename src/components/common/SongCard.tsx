import React from 'react';
import { Play, Pause } from 'lucide-react';
import { Song } from '../../types/music';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface SongCardProps {
  song: Song;
  allSongs?: Song[];
}

export const SongCard: React.FC<SongCardProps> = ({ song, allSongs = [] }) => {
  const { currentSong, isPlaying, playSong, togglePlayPause } = useMusicPlayer();

  const isCurrent = currentSong?.id === song.id;

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
      className="group relative p-3.5 rounded-xl bg-[#181818]/80 hover:bg-[#282828] transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      {/* Artwork with floating Spotify green play button */}
      <div className="relative aspect-square w-full rounded-lg overflow-hidden mb-3 bg-slate-800 shadow-md">
        <img
          src={song.coverUrl}
          alt={song.title}
          className="w-full h-full object-cover"
        />

        {/* Floating Green Play button on hover (Spotify style) */}
        <button
          onClick={handlePlayClick}
          className={`absolute bottom-2 right-2 w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-xl shadow-black/50 transition-all duration-200 ${
            isCurrent && isPlaying
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95'
          }`}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-5 h-5 fill-current text-black" />
          ) : (
            <Play className="w-5 h-5 fill-current text-black ml-0.5" />
          )}
        </button>
      </div>

      {/* Info */}
      <div className="flex flex-col min-w-0">
        <h4
          className={`text-sm font-semibold truncate ${
            isCurrent ? 'text-emerald-400' : 'text-white'
          }`}
        >
          {song.title}
        </h4>
        <p className="text-xs text-slate-400 truncate mt-1">{song.artist}</p>
      </div>
    </div>
  );
};
