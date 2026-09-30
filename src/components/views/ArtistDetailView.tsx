import React from 'react';
import { ArrowLeft, Play, Users, CheckCircle2 } from 'lucide-react';
import { Artist, Song, Album } from '../../types/music';
import { SongRow } from '../common/SongRow';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface ArtistDetailViewProps {
  artist: Artist;
  allSongs: Song[];
  albums: Album[];
  onBack: () => void;
  onSelectAlbum: (album: Album) => void;
}

export const ArtistDetailView: React.FC<ArtistDetailViewProps> = ({
  artist,
  allSongs,
  albums,
  onBack,
  onSelectAlbum,
}) => {
  const { playSong } = useMusicPlayer();

  const artistSongs = allSongs.filter(
    (s) => s.artistId === artist.id || s.artist.toLowerCase() === artist.name.toLowerCase()
  );

  const artistAlbums = albums.filter(
    (alb) => alb.artistId === artist.id || alb.artist.toLowerCase() === artist.name.toLowerCase()
  );

  const handlePlayTopSongs = () => {
    if (artistSongs.length > 0) {
      playSong(artistSongs[0], artistSongs);
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

      {/* Artist Hero Header */}
      <div className="relative rounded-2xl overflow-hidden p-6 sm:p-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 bg-gradient-to-b from-slate-800 to-[#121216] shadow-xl">
        <img
          src={artist.image}
          alt={artist.name}
          className="w-40 h-40 sm:w-48 sm:h-48 rounded-full object-cover shadow-2xl"
        />

        <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-1 text-xs font-bold text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Verified Artist</span>
          </div>

          <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tight">
            {artist.name}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            {artist.bio}
          </p>

          <div className="text-xs text-slate-400 font-medium pt-1">
            {artist.monthlyListeners.toLocaleString()} monthly listeners
          </div>
        </div>
      </div>

      {/* Play Controls Row */}
      <div className="flex items-center gap-6 py-2">
        <button
          onClick={handlePlayTopSongs}
          disabled={artistSongs.length === 0}
          className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-lg transition-all"
        >
          <Play className="w-6 h-6 fill-current text-black ml-0.5" />
        </button>
      </div>

      {/* Popular Tracks */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-white tracking-tight">Popular</h2>
        <div className="space-y-0.5">
          {artistSongs.map((song, idx) => (
            <SongRow key={song.id} song={song} index={idx} allSongs={artistSongs} />
          ))}
        </div>
      </div>

      {/* Albums */}
      {artistAlbums.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white tracking-tight">Discography</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {artistAlbums.map((album) => (
              <div
                key={album.id}
                onClick={() => onSelectAlbum(album)}
                className="p-3.5 rounded-xl bg-[#181818] hover:bg-[#282828] cursor-pointer transition-colors group"
              >
                <img
                  src={album.coverUrl}
                  alt={album.title}
                  className="w-full aspect-square rounded-lg object-cover mb-2 shadow-md"
                />
                <h4 className="text-sm font-bold text-white truncate">{album.title}</h4>
                <p className="text-xs text-slate-400 truncate mt-0.5">{album.releaseDate}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
