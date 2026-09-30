import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  Maximize2,
  ListMusic,
  Mic2,
  Trash2,
} from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const BottomPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    queue,
    queueIndex,
    repeatMode,
    isShuffle,
    playSong,
    togglePlayPause,
    seek,
    nextTrack,
    prevTrack,
    toggleShuffle,
    toggleRepeat,
    setVolumeLevel,
    toggleMute,
    toggleLike,
    isLiked,
    clearQueue,
    openLyrics,
    setOpenLyrics,
    setOpenFullScreen,
  } = useMusicPlayer();

  const [showQueuePopover, setShowQueuePopover] = useState(false);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seek(val);
  };

  const liked = currentSong ? isLiked(currentSong.id) : false;

  return (
    <>
      {/* Persistent Bottom Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#121216] border-t border-white/10 px-4 md:px-6 py-2.5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          {/* Left: Track Info & Heart */}
          <div className="flex items-center gap-3 w-1/4 min-w-[140px] md:min-w-[220px]">
            {currentSong ? (
              <>
                <div
                  onClick={() => setOpenFullScreen(true)}
                  className="relative group cursor-pointer w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden shadow-md flex-shrink-0 bg-slate-800"
                >
                  <img
                    src={currentSong.coverUrl}
                    alt={currentSong.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Maximize2 className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="flex flex-col min-w-0">
                  <div
                    onClick={() => setOpenFullScreen(true)}
                    className="text-sm font-semibold text-white truncate hover:underline cursor-pointer"
                  >
                    {currentSong.title}
                  </div>
                  <div className="text-xs text-slate-400 truncate hover:underline cursor-pointer">
                    {currentSong.artist}
                  </div>
                </div>

                <button
                  onClick={() => toggleLike(currentSong.id)}
                  className={`p-1.5 transition-colors ${
                    liked ? 'text-emerald-500' : 'text-slate-400 hover:text-white'
                  }`}
                  title={liked ? 'Remove from Liked' : 'Save to Liked'}
                >
                  <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3 text-slate-500 text-xs">
                <div className="w-11 h-11 rounded-lg bg-white/5 flex items-center justify-center">
                  <Play className="w-4 h-4 text-slate-600" />
                </div>
                <span>Select a song to play</span>
              </div>
            )}
          </div>

          {/* Center: Playback Controls & Progress Bar */}
          <div className="flex flex-col items-center flex-1 max-w-xl">
            <div className="flex items-center gap-4 md:gap-6 mb-1">
              <button
                onClick={toggleShuffle}
                className={`p-1 transition-colors hidden sm:block ${
                  isShuffle ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                onClick={prevTrack}
                disabled={!currentSong}
                className="p-1 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                title="Previous"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>

              <button
                onClick={togglePlayPause}
                disabled={!currentSong && queue.length === 0}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white hover:scale-105 text-black flex items-center justify-center shadow-md transition-transform active:scale-95 disabled:opacity-30"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current text-black" />
                ) : (
                  <Play className="w-4 h-4 fill-current text-black ml-0.5" />
                )}
              </button>

              <button
                onClick={nextTrack}
                disabled={!currentSong}
                className="p-1 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                title="Next"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>

              <button
                onClick={toggleRepeat}
                className={`p-1 transition-colors hidden sm:block ${
                  repeatMode !== 'off' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>
            </div>

            {/* Seekbar and Timestamps */}
            <div className="w-full flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span className="w-9 text-right">{formatTime(currentTime)}</span>
              <div className="relative flex-1 flex items-center h-4 group">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeekChange}
                  disabled={!currentSong}
                  className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer disabled:opacity-30"
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${progressPercent}%, rgba(71,85,105,0.7) ${progressPercent}%, rgba(71,85,105,0.7) 100%)`,
                  }}
                />
              </div>
              <span className="w-9">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Actions, Lyrics, Queue, Volume */}
          <div className="flex items-center justify-end gap-2 md:gap-3 w-1/4 min-w-[120px] md:min-w-[200px]">
            {/* Lyrics Toggle */}
            <button
              onClick={() => setOpenLyrics(!openLyrics)}
              className={`p-2 rounded-lg transition-colors ${
                openLyrics ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
              }`}
              title="Lyrics"
            >
              <Mic2 className="w-4 h-4" />
            </button>

            {/* Queue Toggle with Badge */}
            <div className="relative">
              <button
                onClick={() => setShowQueuePopover(!showQueuePopover)}
                className={`p-2 rounded-lg transition-colors relative ${
                  showQueuePopover ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}
                title="Queue"
              >
                <ListMusic className="w-4 h-4" />
                {queue.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {queue.length}
                  </span>
                )}
              </button>

              {/* Queue Popover */}
              {showQueuePopover && (
                <div className="absolute right-0 bottom-12 w-80 max-h-96 bg-[#18181f] rounded-2xl p-4 shadow-2xl border border-white/10 flex flex-col z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-2">
                    <div className="font-semibold text-white text-sm flex items-center gap-2">
                      <ListMusic className="w-4 h-4 text-emerald-400" />
                      Queue ({queue.length})
                    </div>
                    {queue.length > 1 && (
                      <button
                        onClick={clearQueue}
                        className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto space-y-1.5 flex-1 pr-1">
                    {queue.map((song, idx) => {
                      const isCur = idx === queueIndex;
                      return (
                        <div
                          key={song.id + '-' + idx}
                          onClick={() => playSong(song, queue)}
                          className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${
                            isCur
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'hover:bg-white/5 text-slate-300'
                          }`}
                        >
                          <img
                            src={song.coverUrl}
                            alt={song.title}
                            className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0 text-xs">
                            <div className={`font-medium truncate ${isCur ? 'text-white' : ''}`}>
                              {song.title}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{song.artist}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Volume Control */}
            <div className="hidden sm:flex items-center gap-2">
              <button onClick={toggleMute} className="text-slate-400 hover:text-white p-1">
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
                className="w-16 md:w-20 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer"
              />
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={() => setOpenFullScreen(true)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </>
  );
};
