import React, { useState, useMemo } from 'react';
import { Search as SearchIcon, Play } from 'lucide-react';
import { Song, Artist, Album, Playlist } from '../../types/music';
import { SongRow } from '../common/SongRow';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface SearchViewProps {
  songs: Song[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectArtist: (artist: Artist) => void;
  onSelectAlbum: (album: Album) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  songs,
  artists,
  albums,
  playlists,
  searchQuery,
  setSearchQuery,
  onSelectArtist,
  onSelectAlbum,
}) => {
  const { playSong } = useMusicPlayer();
  const [filterType, setFilterType] = useState<'all' | 'songs' | 'artists' | 'albums'>('all');

  const q = searchQuery.toLowerCase().trim();

  const filteredSongs = useMemo(() => {
    if (!q) return [];
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.album && s.album.toLowerCase().includes(q)) ||
        s.genre.toLowerCase().includes(q)
    );
  }, [songs, q]);

  const filteredArtists = useMemo(() => {
    if (!q) return [];
    return artists.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.genres.some((g) => g.toLowerCase().includes(q))
    );
  }, [artists, q]);

  const filteredAlbums = useMemo(() => {
    if (!q) return [];
    return albums.filter(
      (alb) =>
        alb.title.toLowerCase().includes(q) ||
        alb.artist.toLowerCase().includes(q) ||
        (alb.genre && alb.genre.toLowerCase().includes(q))
    );
  }, [albums, q]);

  const topResultSong = filteredSongs[0];
  const allGenres = Array.from(new Set(songs.map((s) => s.genre)));

  const genreColors = [
    '#e13300',
    '#1e3264',
    '#e8115b',
    '#148a08',
    '#bc5900',
    '#503750',
    '#8d67ab',
    '#0d73ec',
  ];

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Category Pills if searched */}
      {q && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'songs', label: `Songs (${filteredSongs.length})` },
            { id: 'artists', label: `Artists (${filteredArtists.length})` },
            { id: 'albums', label: `Albums (${filteredAlbums.length})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filterType === f.id
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white hover:bg-white/15'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* If Search Query is Empty -> Show Spotify Browse All Grid */}
      {!q ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white tracking-tight">Browse all</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {allGenres.map((genre, idx) => {
              const bg = genreColors[idx % genreColors.length];
              return (
                <div
                  key={genre}
                  onClick={() => setSearchQuery(genre)}
                  style={{ backgroundColor: bg }}
                  className="p-4 rounded-xl cursor-pointer hover:scale-[1.02] transition-transform h-32 relative overflow-hidden flex flex-col justify-between shadow-md"
                >
                  <span className="font-extrabold text-white text-base leading-snug">
                    {genre}
                  </span>
                  <span className="text-[11px] text-white/80 font-medium">Explore songs →</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Results Section */
        <div className="space-y-6">
          {/* Top Result + Songs */}
          {(filterType === 'all' || filterType === 'songs') && topResultSong && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Result Card */}
              <div className="lg:col-span-1">
                <h3 className="text-lg font-bold text-white mb-3">Top result</h3>
                <div
                  onClick={() => playSong(topResultSong, filteredSongs)}
                  className="p-5 rounded-xl bg-[#181818] hover:bg-[#282828] transition-colors cursor-pointer group flex flex-col justify-between h-[220px]"
                >
                  <div>
                    <img
                      src={topResultSong.coverUrl}
                      alt={topResultSong.title}
                      className="w-24 h-24 rounded-lg object-cover shadow-lg mb-3"
                    />
                    <h4 className="text-xl font-bold text-white truncate">
                      {topResultSong.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{topResultSong.artist}</p>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-black/40 text-slate-300">
                      {topResultSong.genre}
                    </span>
                    <button className="w-11 h-11 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                      <Play className="w-5 h-5 fill-current text-black ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Songs List */}
              <div className="lg:col-span-2">
                <h3 className="text-lg font-bold text-white mb-3">Songs</h3>
                <div className="space-y-0.5">
                  {filteredSongs.slice(0, 4).map((song, idx) => (
                    <SongRow key={song.id} song={song} index={idx} allSongs={filteredSongs} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Artists */}
          {(filterType === 'all' || filterType === 'artists') && filteredArtists.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">Artists</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {filteredArtists.map((artist) => (
                  <div
                    key={artist.id}
                    onClick={() => onSelectArtist(artist)}
                    className="p-4 rounded-xl bg-[#181818] hover:bg-[#282828] transition-colors cursor-pointer text-center group"
                  >
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="w-28 h-28 rounded-full object-cover mx-auto mb-3 shadow-md group-hover:scale-105 transition-transform"
                    />
                    <div className="text-sm font-bold text-white truncate">{artist.name}</div>
                    <div className="text-xs text-slate-400 mt-1">Artist</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Albums */}
          {(filterType === 'all' || filterType === 'albums') && filteredAlbums.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">Albums</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {filteredAlbums.map((album) => (
                  <div
                    key={album.id}
                    onClick={() => onSelectAlbum(album)}
                    className="p-3.5 rounded-xl bg-[#181818] hover:bg-[#282828] transition-colors cursor-pointer group"
                  >
                    <img
                      src={album.coverUrl}
                      alt={album.title}
                      className="w-full aspect-square rounded-lg object-cover mb-2 shadow-md"
                    />
                    <div className="text-sm font-bold text-white truncate">{album.title}</div>
                    <div className="text-xs text-slate-400 truncate">{album.artist}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredSongs.length === 0 && filteredArtists.length === 0 && filteredAlbums.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-base text-slate-400 font-semibold">No results found for "{searchQuery}"</p>
              <p className="text-xs text-slate-500 mt-1">Please make sure words are spelled correctly.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
