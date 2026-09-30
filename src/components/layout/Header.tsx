import React from 'react';
import { Search, Compass, ShieldCheck, User } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  activeTab,
  setActiveTab,
}) => {
  const {
    currentUser,
    currentRole,
    toggleRole,
    setOpenAiAssistant,
  } = useMusicPlayer();

  const handleSearchFocus = () => {
    if (activeTab !== 'search') {
      setActiveTab('search');
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0E1015]/90 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 flex items-center justify-between gap-4">
      {/* Search Input Bar */}
      <div className="flex-1 max-w-md relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={handleSearchFocus}
            placeholder="What do you want to play?"
            className="w-full pl-10 pr-4 py-2 rounded-full bg-[#181A22] border border-white/10 text-white placeholder-slate-400 text-xs md:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mood Assistant Trigger */}
        <button
          onClick={() => setOpenAiAssistant(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium border border-white/10 transition-colors"
          title="Ask for track recommendations"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Song Concierge</span>
        </button>

        {/* Role Switcher */}
        <button
          onClick={toggleRole}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            currentRole === 'ADMIN'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
          }`}
          title="Toggle Listener or Admin mode"
        >
          {currentRole === 'ADMIN' ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admin Mode</span>
            </>
          ) : (
            <>
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Listener</span>
            </>
          )}
        </button>

        {/* User Avatar */}
        <div className="flex items-center pl-1">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/40"
          />
        </div>
      </div>
    </header>
  );
};
