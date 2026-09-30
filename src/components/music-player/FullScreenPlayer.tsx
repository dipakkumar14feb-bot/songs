import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  VolumeX,
  Mic2,
  ListMusic,
  Share2,
} from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const FullScreenPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    queue,
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
    openFullScreen,
    setOpenFullScreen,
    showToast,
  } = useMusicPlayer();

  const [activeTab, setActiveTab] = useState<'visualizer' | 'lyrics' | 'queue'>('visualizer');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Audio Visualizer
  useEffect(() => {
    if (!openFullScreen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const render = () => {
      frame++;
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const numBars = 48;
      const barWidth = width / numBars - 2;

      for (let i = 0; i < numBars; i++) {
        let barHeight = 8;
        if (isPlaying) {
          const wave1 = Math.sin(frame * 0.08 + i * 0.25);
          const wave2 = Math.cos(frame * 0.05 + i * 0.4);
          const dynamicFactor = Math.abs(wave1 * wave2);
          barHeight = 12 + dynamicFactor * (height * 0.75);
        }

        const x = i * (barWidth + 2);
        const y = height - barHeight;

        // Clean green gradient
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(1, '#34d399');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [openFullScreen, isPlaying]);

  if (!openFullScreen || !currentSong) return null;

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const liked = isLiked(currentSong.id);
  const syncedLyrics = currentSong.syncedLyrics || [];
  const currentSyncedIndex = syncedLyrics.reduce((acc, item, index) => {
    if (currentTime >= item.time) return index;
    return acc;
  }, -1);

  return (
    <div className="fixed inset-0 z-50 bg-[#121212] flex flex-col justify-between p-6 md:p-12 overflow-hidden animate-in fade-in duration-200">
      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div>
          <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Playing from</div>
          <div className="text-sm font-bold text-white">{currentSong.album || 'Single'}</div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-white/10 p-1 rounded-full">
          <button
            onClick={() => setActiveTab('visualizer')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeTab === 'visualizer' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Visualizer
          </button>
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeTab === 'lyrics' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Lyrics
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeTab === 'queue' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Queue ({queue.length})
          </button>
        </div>

        <button
          onClick={() => setOpenFullScreen(false)}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-4xl mx-auto w-full flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 my-6 min-h-0">
        {/* Cover Art */}
        <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 bg-slate-800">
          <img
            src={currentSong.coverUrl}
            alt={currentSong.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right Info / Visualizer / Lyrics */}
        <div className="flex-1 w-full max-w-xl h-full flex flex-col justify-center min-h-0">
          {activeTab === 'visualizer' && (
            <div className="flex flex-col items-center justify-center gap-6 h-full text-center">
              <div>
                <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                  {currentSong.title}
                </h1>
                <p className="text-lg sm:text-xl text-slate-400 mt-2 font-medium">{currentSong.artist}</p>
              </div>

              <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/5">
                <canvas ref={canvasRef} width={480} height={100} className="w-full h-24" />
              </div>
            </div>
          )}

          {activeTab === 'lyrics' && (
            <div className="h-full max-h-[360px] overflow-y-auto rounded-2xl p-6 bg-white/5 flex flex-col">
              <div className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-4">
                Lyrics
              </div>

              {syncedLyrics.length > 0 ? (
                <div className="space-y-4 my-auto">
                  {syncedLyrics.map((item, idx) => {
                    const isCurrent = idx === currentSyncedIndex;
                    return (
                      <div
                        key={idx}
                        onClick={() => seek(item.time)}
                        className={`cursor-pointer transition-all text-lg md:text-2xl font-bold ${
                          isCurrent ? 'text-white' : 'text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        {item.text}
                      </div>
                    );
                  })}
                </div>
              ) : currentSong.lyrics ? (
                <div className="whitespace-pre-line text-slate-300 text-base leading-relaxed">
                  {currentSong.lyrics}
                </div>
              ) : (
                <div className="m-auto text-center text-slate-500 py-12">
                  <Mic2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No lyrics available.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'queue' && (
            <div className="h-full max-h-[360px] overflow-y-auto rounded-2xl p-6 bg-white/5">
              <div className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-4">
                Up Next ({queue.length} songs)
              </div>
              <div className="space-y-1">
                {queue.map((song, idx) => (
                  <div
                    key={song.id + '-' + idx}
                    onClick={() => playSong(song, queue)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 cursor-pointer"
                  >
                    <span className="text-xs text-slate-500 w-5">{idx + 1}</span>
                    <img src={song.coverUrl} alt={song.title} className="w-10 h-10 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{song.title}</div>
                      <div className="text-xs text-slate-400 truncate">{song.artist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Controls Bar */}
      <footer className="relative z-10 max-w-3xl mx-auto w-full">
        {/* Seekbar */}
        <div className="w-full flex items-center gap-3 text-xs font-mono text-slate-400 mb-4">
          <span className="w-9 text-right">{formatTime(currentTime)}</span>
          <div className="flex-1 relative flex items-center h-4">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #10b981 0%, #10b981 ${progressPercent}%, rgba(71,85,105,0.7) ${progressPercent}%, rgba(71,85,105,0.7) 100%)`,
              }}
            />
          </div>
          <span className="w-9">{formatTime(duration)}</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => toggleLike(currentSong.id)}
              className={`p-2 transition-colors ${
                liked ? 'text-emerald-500' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                showToast('Song link copied to clipboard!');
              }}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={toggleShuffle}
              className={`p-1 ${isShuffle ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button onClick={prevTrack} className="p-1 text-slate-200 hover:text-white">
              <SkipBack className="w-7 h-7 fill-current" />
            </button>

            <button
              onClick={togglePlayPause}
              className="w-16 h-16 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-xl transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-current text-black" />
              ) : (
                <Play className="w-7 h-7 fill-current text-black ml-1" />
              )}
            </button>

            <button onClick={nextTrack} className="p-1 text-slate-200 hover:text-white">
              <SkipForward className="w-7 h-7 fill-current" />
            </button>

            <button
              onClick={toggleRepeat}
              className={`p-1 ${repeatMode !== 'off' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3">
            <button onClick={toggleMute} className="text-slate-400 hover:text-white p-1">
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
              className="w-20 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer"
            />
          </div>
        </div>
      </footer>
    </div>
  );
};
