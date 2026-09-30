import React from 'react';
import { ArrowLeft, Play, Calendar } from 'lucide-react';
import { Album, Song } from '../../types/music';
import { SongRow } from '../common/SongRow';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface AlbumDetailViewProps {
  album: Album;
  allSongs: Song[];
  onBack: () => void;
}

export const AlbumDetailView: React.FC<AlbumDetailViewProps> = ({
  album,
  allSongs,
  onBack,
}) => {
  const { playSong } = useMusicPlayer();

  const albumSongs = allSongs.filter(
    (s) => s.albumId === album.id || (s.album && s.album.toLowerCase() === album.title.toLowerCase())
  );

  const handlePlayAlbum = () => {
    if (albumSongs.length > 0) {
      playSong(albumSongs[0], albumSongs);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Album Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-7 pb-4">
        <img
          src={album.coverUrl}
          alt={album.title}
          className="w-48 h-48 sm:w-56 sm:h-56 rounded-lg object-cover shadow-2xl flex-shrink-0"
        />

        <div className="space-y-2 text-center sm:text-left min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Album
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {album.title}
          </h1>
          <p className="text-sm font-semibold text-slate-300">{album.artist}</p>

          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-400 font-medium pt-1">
            <span>{album.releaseDate}</span>
            <span>•</span>
            <span>{albumSongs.length} songs</span>
          </div>
        </div>
      </div>

      {/* Play Controls Row */}
      <div className="flex items-center gap-6 py-2">
        <button
          onClick={handlePlayAlbum}
          disabled={albumSongs.length === 0}
          className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-lg transition-all"
        >
          <Play className="w-6 h-6 fill-current text-black ml-0.5" />
        </button>
      </div>

      {/* Tracklist Table */}
      <div className="space-y-0.5">
        <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/10 mb-2">
          <div className="flex items-center gap-4">
            <span className="w-5 text-center">#</span>
            <span>Title</span>
          </div>
          <span>Time</span>
        </div>

        {albumSongs.map((song, idx) => (
          <SongRow
            key={song.id}
            song={song}
            index={idx}
            allSongs={albumSongs}
            showAlbum={false}
          />
        ))}
      </div>
    </div>
  );
};
