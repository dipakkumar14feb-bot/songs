export interface Song {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  genre: string;
  duration: number; // in seconds
  audioUrl: string;
  coverUrl: string;
  lyrics?: string;
  syncedLyrics?: { time: number; text: string }[];
  playCount: number;
  releaseDate?: string;
  fileSize?: number;
  uploadedBy?: string;
  createdAt: string;
}

export interface Artist {
  id: string;
  name: string;
  image: string;
  bio: string;
  genres: string[];
  monthlyListeners: number;
  topSongIds: string[];
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  coverUrl: string;
  releaseDate: string;
  genre: string;
  songIds: string[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  userId: string;
  isAiGenerated?: boolean;
  aiPrompt?: string;
  songIds: string[];
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  avatar: string;
  createdAt: string;
}

export interface ListeningHistoryItem {
  id: string;
  songId: string;
  userId: string;
  progress: number;
  playedAt: string;
}

export interface AiMood {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  color: string;
  gradient: string;
}

export interface AdminAnalytics {
  totalSongs: number;
  totalPlays: number;
  totalUsers: number;
  totalPlaylists: number;
  storageUsedBytes: number;
  playsPerDay: { day: string; plays: number }[];
  topGenres: { genre: string; count: number; percentage: number }[];
  topSongs: (Song & { plays: number })[];
}
