import React from 'react';
import { X, Mic2, Music } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

export const LyricsModal: React.FC = () => {
  const { currentSong, openLyrics, setOpenLyrics, currentTime, seek } = useMusicPlayer();

  if (!openLyrics || !currentSong) return null;

  const syncedLyrics = currentSong.syncedLyrics || [];
  const currentSyncedIndex = syncedLyrics.reduce((acc, item, index) => {
    if (currentTime >= item.time) return index;
    return acc;
  }, -1);

  return (
    <div className="fixed inset-y-0 right-0 z-45 w-full sm:w-[420px] bg-[#0A0D14]/95 backdrop-blur-2xl border-l border-white/10 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center">
            <Mic2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Live Lyrics</h3>
            <p className="text-xs text-slate-400 truncate max-w-[240px]">{currentSong.title}</p>
          </div>
        </div>
        <button
          onClick={() => setOpenLyrics(false)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Lyrics Body */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-2">
        {syncedLyrics.length > 0 ? (
          syncedLyrics.map((item, idx) => {
            const isCurrent = idx === currentSyncedIndex;
            return (
              <div
                key={idx}
                onClick={() => seek(item.time)}
                className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  isCurrent
                    ? 'bg-violet-600/20 text-white font-bold text-lg border-l-4 border-violet-400 shadow-md pl-4'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 text-base font-medium'
                }`}
              >
                {item.text}
              </div>
            );
          })
        ) : currentSong.lyrics ? (
          <div className="whitespace-pre-line text-slate-300 text-sm md:text-base leading-relaxed font-normal">
            {currentSong.lyrics}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
            <Music className="w-12 h-12 mb-3 text-slate-600" />
            <p className="text-sm">No lyrics found for this track.</p>
            <p className="text-xs text-slate-600 mt-1">Admin can add synced lyrics in the Admin Studio.</p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-white/10 text-center text-xs text-slate-500">
        Click any line to jump directly to that timestamp
      </div>
    </div>
  );
};
