import React, { useState } from 'react';
import {
  Heart,
  Clock,
  PlusSquare,
  Disc,
  User,
  Play,
  ListMusic,
  Compass,
} from 'lucide-react';
import { Song, Playlist, Artist, Album } from '../../types/music';
import { SongRow } from '../common/SongRow';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface LibraryViewProps {
  allSongs: Song[];
  playlists: Playlist[];
  artists: Artist[];
  albums: Album[];
  initialSubTab?: string;
  onOpenCreatePlaylist: () => void;
  onNavigateTab: (tab: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  allSongs,
  playlists,
  artists,
  albums,
  initialSubTab = 'playlists',
  onOpenCreatePlaylist,
  onNavigateTab,
}) => {
  const { likedSongIds, playSong } = useMusicPlayer();
  const [subTab, setSubTab] = useState<'playlists' | 'liked' | 'history' | 'artists' | 'albums'>(
    initialSubTab as any
  );

  const likedSongs = allSongs.filter((s) => likedSongIds.has(s.id));
  const recentHistory = allSongs.slice(0, 10);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Library</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('ai-music')}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            Discover Mixes
          </button>
          <button
            onClick={onOpenCreatePlaylist}
            className="px-4 py-2 rounded-full bg-white hover:bg-slate-200 text-black font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <PlusSquare className="w-3.5 h-3.5" />
            Create Playlist
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'playlists', label: `Playlists (${playlists.length})`, icon: ListMusic },
          { id: 'liked', label: `Liked Songs (${likedSongs.length})`, icon: Heart },
          { id: 'history', label: 'Recently Played', icon: Clock },
          { id: 'artists', label: `Artists (${artists.length})`, icon: User },
          { id: 'albums', label: `Albums (${albums.length})`, icon: Disc },
        ].map((tab) => {
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content based on subTab */}
      {subTab === 'playlists' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => onNavigateTab('playlist-' + pl.id)}
              className="p-3.5 rounded-xl bg-[#181818] hover:bg-[#282828] cursor-pointer group transition-colors flex flex-col justify-between"
            >
              <div className="relative aspect-square w-full rounded-lg overflow-hidden mb-3 bg-slate-800 shadow-md">
                <img
                  src={pl.coverUrl}
                  alt={pl.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white truncate group-hover:underline">
                  {pl.name}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Playlist • {pl.songIds.length} songs
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'liked' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {likedSongs.length} liked tracks
            </span>
            {likedSongs.length > 0 && (
              <button
                onClick={() => playSong(likedSongs[0], likedSongs)}
                className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg transition-transform active:scale-95"
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </button>
            )}
          </div>

          {likedSongs.length > 0 ? (
            <div className="space-y-0.5 rounded-xl bg-[#121216]/60 p-2 border border-white/5">
              {likedSongs.map((song, idx) => (
                <SongRow key={song.id} song={song} index={idx} allSongs={likedSongs} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500">
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
              <p className="text-sm text-slate-400 font-semibold">Songs you like will appear here</p>
              <p className="text-xs text-slate-500 mt-1">Save songs by tapping the heart icon.</p>
            </div>
          )}
        </div>
      )}

      {subTab === 'history' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-400">Recently played</div>
          <div className="space-y-0.5 rounded-xl bg-[#121216]/60 p-2 border border-white/5">
            {recentHistory.map((song, idx) => (
              <SongRow key={song.id} song={song} index={idx} allSongs={recentHistory} />
            ))}
          </div>
        </div>
      )}

      {subTab === 'artists' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {artists.map((artist) => (
            <div
              key={artist.id}
              onClick={() => onNavigateTab('artist-' + artist.id)}
              className="p-4 rounded-xl bg-[#181818] hover:bg-[#282828] text-center cursor-pointer transition-colors group"
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
      )}

      {subTab === 'albums' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {albums.map((album) => (
            <div
              key={album.id}
              onClick={() => onNavigateTab('album-' + album.id)}
              className="p-3.5 rounded-xl bg-[#181818] hover:bg-[#282828] cursor-pointer transition-colors group"
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
      )}
    </div>
  );
};
