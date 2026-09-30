import React from 'react';
import {
  Home,
  Search,
  Library,
  Heart,
  PlusSquare,
  Disc,
  UploadCloud,
  Compass,
  Radio,
} from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { Playlist } from '../../types/music';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  playlists: Playlist[];
  onOpenCreatePlaylist: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  playlists,
  onOpenCreatePlaylist,
}) => {
  const { currentRole, likedSongIds } = useMusicPlayer();

  const mainNav = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'ai-music', label: 'Discover Mixes', icon: Compass },
    { id: 'library', label: 'Your Library', icon: Library },
  ];

  return (
    <aside className="w-60 bg-[#0A0A0F] border-r border-white/5 flex flex-col h-full flex-shrink-0 select-none pb-24 md:pb-28">
      {/* Brand Header: Songfly */}
      <div
        onClick={() => setActiveTab('home')}
        className="px-6 py-5 cursor-pointer flex items-center gap-3 group"
      >
        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
          {/* Clean Sound Waves Logo */}
          <div className="flex items-center gap-0.5">
            <span className="w-1 h-2.5 bg-black rounded-full" />
            <span className="w-1 h-5 bg-black rounded-full" />
            <span className="w-1 h-3.5 bg-black rounded-full" />
            <span className="w-1 h-2 bg-black rounded-full" />
          </div>
        </div>
        <div>
          <span className="font-extrabold text-white text-xl tracking-tight font-display">
            Songfly
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-3 space-y-1">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive ? 'text-emerald-400' : 'text-slate-400'
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Actions: Create Playlist & Liked Songs */}
      <div className="mt-6 px-3 space-y-1">
        <button
          onClick={onOpenCreatePlaylist}
          className="w-full flex items-center gap-4 px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
        >
          <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center text-white">
            <PlusSquare className="w-4 h-4" />
          </div>
          <span>Create Playlist</span>
        </button>

        <button
          onClick={() => setActiveTab('liked')}
          className={`w-full flex items-center justify-between px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'liked'
              ? 'bg-white/10 text-white'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-600 to-purple-500 flex items-center justify-center text-white">
              <Heart className="w-3.5 h-3.5 fill-current" />
            </div>
            <span>Liked Songs</span>
          </div>
          {likedSongIds.size > 0 && (
            <span className="text-xs text-slate-400 font-mono">
              {likedSongIds.size}
            </span>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="mx-6 my-4 border-t border-white/10" />

      {/* Admin Music Upload Panel Link */}
      <div className="px-3 mb-3">
        <button
          onClick={() => setActiveTab('admin')}
          className={`w-full flex items-center justify-between px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'admin'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            <span>Upload Music</span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase font-mono">
            {currentRole}
          </span>
        </button>
      </div>

      {/* Playlists List */}
      <div className="flex-1 px-4 flex flex-col min-h-0 overflow-hidden">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Playlists
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => setActiveTab('playlist-' + pl.id)}
              className={`w-full text-left py-1 text-xs truncate transition-colors flex items-center gap-2 ${
                activeTab === 'playlist-' + pl.id
                  ? 'text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Disc className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <span className="truncate">{pl.name}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
