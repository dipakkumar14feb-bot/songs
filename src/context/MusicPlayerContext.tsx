import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Song, Playlist, User } from '../types/music';

interface MusicPlayerContextType {
  // Audio state
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: Song[];
  queueIndex: number;
  repeatMode: 'off' | 'all' | 'one';
  isShuffle: boolean;
  likedSongIds: Set<string>;

  // Controls
  playSong: (song: Song, newQueue?: Song[]) => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setVolumeLevel: (vol: number) => void;
  toggleMute: () => void;
  toggleLike: (songId: string) => Promise<void>;
  isLiked: (songId: string) => boolean;
  addToQueue: (song: Song) => void;
  clearQueue: () => void;

  // Modals & Panels
  openLyrics: boolean;
  setOpenLyrics: (val: boolean) => void;
  openFullScreen: boolean;
  setOpenFullScreen: (val: boolean) => void;
  openAiAssistant: boolean;
  setOpenAiAssistant: (val: boolean) => void;

  // User & Role
  currentUser: User;
  currentRole: 'ADMIN' | 'USER';
  toggleRole: () => void;

  // Toast
  toast: string | null;
  showToast: (msg: string) => void;

  // Refresh helper
  refreshDataTrigger: number;
  triggerRefresh: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export const MusicPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());

  // Modals
  const [openLyrics, setOpenLyrics] = useState<boolean>(false);
  const [openFullScreen, setOpenFullScreen] = useState<boolean>(false);
  const [openAiAssistant, setOpenAiAssistant] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const [refreshDataTrigger, setRefreshDataTrigger] = useState<number>(0);

  // User & Role
  const [currentRole, setCurrentRole] = useState<'ADMIN' | 'USER'>('ADMIN');
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'user-admin',
    name: 'Alex Rivera (Admin)',
    email: 'admin@vibewave.io',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.warn);
      } else {
        nextTrack();
      }
    };

    const handleError = (e: any) => {
      console.warn('Audio playback notice:', e);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, [repeatMode]);

  // Load initial likes
  useEffect(() => {
    fetch('/api/likes?userId=' + currentUser.id)
      .then((res) => res.json())
      .then((data: string[]) => {
        if (Array.isArray(data)) {
          setLikedSongIds(new Set(data));
        }
      })
      .catch(console.warn);
  }, [currentUser.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const triggerRefresh = () => {
    setRefreshDataTrigger((prev) => prev + 1);
  };

  const toggleRole = () => {
    const nextRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    setCurrentRole(nextRole);
    setCurrentUser({
      id: nextRole === 'ADMIN' ? 'user-admin' : 'user-demo',
      name: nextRole === 'ADMIN' ? 'Alex Rivera (Admin)' : 'Alex Rivera',
      email: nextRole === 'ADMIN' ? 'admin@vibewave.io' : 'alex@vibewave.io',
      role: nextRole,
      avatar:
        nextRole === 'ADMIN'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
    });
    showToast(`Switched to ${nextRole} mode`);
  };

  const playSong = (song: Song, newQueue?: Song[]) => {
    if (!audioRef.current) return;

    if (newQueue && newQueue.length > 0) {
      setQueue(newQueue);
      const idx = newQueue.findIndex((s) => s.id === song.id);
      setQueueIndex(idx >= 0 ? idx : 0);
    } else if (queue.length === 0 || !queue.some((s) => s.id === song.id)) {
      setQueue([song]);
      setQueueIndex(0);
    } else {
      const idx = queue.findIndex((s) => s.id === song.id);
      if (idx >= 0) setQueueIndex(idx);
    }

    setCurrentSong(song);
    setCurrentTime(0);
    setDuration(song.duration || 180);

    audioRef.current.src = song.audioUrl;
    audioRef.current.volume = isMuted ? 0 : volume;

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        // Record listening play count
        fetch(`/api/songs/${song.id}/play`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, progress: 0 }),
        }).catch(console.warn);
      })
      .catch((err) => {
        console.warn('Playback autoplay requirement:', err);
        setIsPlaying(false);
      });
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (!currentSong) {
      // If queue has songs, play first
      if (queue.length > 0) {
        playSong(queue[0]);
      }
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(console.warn);
    }
  };

  const seek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const nextTrack = () => {
    if (queue.length === 0) return;

    let nextIdx = queueIndex + 1;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else if (nextIdx >= queue.length) {
      if (repeatMode === 'all') {
        nextIdx = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }

    const nextSong = queue[nextIdx];
    if (nextSong) {
      setQueueIndex(nextIdx);
      playSong(nextSong, queue);
    }
  };

  const prevTrack = () => {
    if (!audioRef.current || queue.length === 0) return;

    // If played more than 3 seconds, rewind to start
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = repeatMode === 'all' ? queue.length - 1 : 0;
    }

    const prevSong = queue[prevIdx];
    if (prevSong) {
      setQueueIndex(prevIdx);
      playSong(prevSong, queue);
    }
  };

  const toggleShuffle = () => {
    setIsShuffle((prev) => !prev);
    showToast(!isShuffle ? 'Shuffle turned on' : 'Shuffle turned off');
  };

  const toggleRepeat = () => {
    setRepeatMode((prev) => {
      const next = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
      showToast(`Repeat: ${next.toUpperCase()}`);
      return next;
    });
  };

  const setVolumeLevel = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolume(clamped);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : clamped;
    }
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.volume = next ? 0 : volume;
      }
      return next;
    });
  };

  const toggleLike = async (songId: string) => {
    try {
      const res = await fetch('/api/likes/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, userId: currentUser.id }),
      });
      const data = await res.json();
      setLikedSongIds((prev) => {
        const next = new Set(prev);
        if (data.isLiked) {
          next.add(songId);
          showToast('Added to Liked Songs ❤️');
        } else {
          next.delete(songId);
          showToast('Removed from Liked Songs');
        }
        return next;
      });
    } catch (e) {
      console.warn('Like toggle failed:', e);
    }
  };

  const isLiked = (songId: string) => likedSongIds.has(songId);

  const addToQueue = (song: Song) => {
    setQueue((prev) => [...prev, song]);
    showToast(`Added "${song.title}" to Queue`);
  };

  const clearQueue = () => {
    if (currentSong) {
      setQueue([currentSong]);
      setQueueIndex(0);
    } else {
      setQueue([]);
      setQueueIndex(-1);
    }
    showToast('Queue cleared');
  };

  return (
    <MusicPlayerContext.Provider
      value={{
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
        likedSongIds,
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
        addToQueue,
        clearQueue,
        openLyrics,
        setOpenLyrics,
        openFullScreen,
        setOpenFullScreen,
        openAiAssistant,
        setOpenAiAssistant,
        currentUser,
        currentRole,
        toggleRole,
        toast,
        showToast,
        refreshDataTrigger,
        triggerRefresh,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  }
  return context;
};
