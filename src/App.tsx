import React, { useState, useEffect } from 'react';
import { MusicPlayerProvider, useMusicPlayer } from './context/MusicPlayerContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { BottomPlayer } from './components/music-player/BottomPlayer';
import { FullScreenPlayer } from './components/music-player/FullScreenPlayer';
import { LyricsModal } from './components/music-player/LyricsModal';
import { AiAssistantDrawer } from './components/ai/AiAssistantDrawer';
import { HomeView } from './components/views/HomeView';
import { SearchView } from './components/views/SearchView';
import { AiMusicView } from './components/views/AiMusicView';
import { LibraryView } from './components/views/LibraryView';
import { PlaylistDetailView } from './components/views/PlaylistDetailView';
import { ArtistDetailView } from './components/views/ArtistDetailView';
import { AlbumDetailView } from './components/views/AlbumDetailView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { CreatePlaylistModal } from './components/common/CreatePlaylistModal';
import { Song, Artist, Album, Playlist } from './types/music';
import {
  INITIAL_SONGS,
  INITIAL_ARTISTS,
  INITIAL_ALBUMS,
  INITIAL_PLAYLISTS,
} from './data/initialCatalog';
import {
  Compass,
  Home as HomeIcon,
  Search as SearchIcon,
  Library as LibraryIcon,
  UploadCloud,
} from 'lucide-react';

function AppContent() {
  const { toast, setOpenAiAssistant, refreshDataTrigger, triggerRefresh } = useMusicPlayer();

  const [activeTab, setActiveTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState<boolean>(false);

  // Data states with immediate fallback data so it never 404s or shows blank
  const [songs, setSongs] = useState<Song[]>(INITIAL_SONGS);
  const [artists, setArtists] = useState<Artist[]>(INITIAL_ARTISTS);
  const [albums, setAlbums] = useState<Album[]>(INITIAL_ALBUMS);
  const [playlists, setPlaylists] = useState<Playlist[]>(INITIAL_PLAYLISTS);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch initial music catalog from backend
  const loadCatalog = async () => {
    try {
      const [resSongs, resArtists, resAlbums, resPlaylists] = await Promise.all([
        fetch('/api/songs').catch(() => null),
        fetch('/api/artists').catch(() => null),
        fetch('/api/albums').catch(() => null),
        fetch('/api/playlists').catch(() => null),
      ]);

      if (resSongs && resSongs.ok) {
        const data = await resSongs.json().catch(() => null);
        if (Array.isArray(data) && data.length > 0) setSongs(data);
      }
      if (resArtists && resArtists.ok) {
        const data = await resArtists.json().catch(() => null);
        if (Array.isArray(data) && data.length > 0) setArtists(data);
      }
      if (resAlbums && resAlbums.ok) {
        const data = await resAlbums.json().catch(() => null);
        if (Array.isArray(data) && data.length > 0) setAlbums(data);
      }
      if (resPlaylists && resPlaylists.ok) {
        const data = await resPlaylists.json().catch(() => null);
        if (Array.isArray(data) && data.length > 0) setPlaylists(data);
      }
    } catch (e) {
      console.warn('Catalog load note (using local cache):', e);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [refreshDataTrigger]);

  const handleSelectArtist = (artist: Artist) => {
    setSelectedArtist(artist);
    setActiveTab('artist-' + artist.id);
  };

  const handleSelectAlbum = (album: Album) => {
    setSelectedAlbum(album);
    setActiveTab('album-' + album.id);
  };

  // Find active playlist
  let activePlaylist: Playlist | null = null;
  if (activeTab.startsWith('playlist-')) {
    const plId = activeTab.replace('playlist-', '');
    activePlaylist = playlists.find((p) => p.id === plId) || null;
  }

  // Find active artist
  let currentArtist = selectedArtist;
  if (activeTab.startsWith('artist-')) {
    const artId = activeTab.replace('artist-', '');
    currentArtist = artists.find((a) => a.id === artId) || selectedArtist;
  }

  // Find active album
  let currentAlbum = selectedAlbum;
  if (activeTab.startsWith('album-')) {
    const albId = activeTab.replace('album-', '');
    currentAlbum = albums.find((a) => a.id === albId) || selectedAlbum;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121212] text-slate-100">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#282828] text-white text-xs font-semibold border border-white/10 shadow-2xl flex items-center gap-2 animate-in fade-in duration-150">
          <span>{toast}</span>
        </div>
      )}

      {/* Left Sidebar (Desktop) */}
      <div className="hidden md:flex flex-col h-full">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          playlists={playlists}
          onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
        />
      </div>

      {/* Main Center Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-32">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Loading music library...</p>
            </div>
          ) : (
            <>
              {activeTab === 'home' && (
                <HomeView
                  songs={songs}
                  playlists={playlists}
                  onNavigateTab={setActiveTab}
                  onSelectMood={setSelectedMood}
                />
              )}

              {activeTab === 'search' && (
                <SearchView
                  songs={songs}
                  artists={artists}
                  albums={albums}
                  playlists={playlists}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onSelectArtist={handleSelectArtist}
                  onSelectAlbum={handleSelectAlbum}
                />
              )}

              {activeTab === 'ai-music' && (
                <AiMusicView
                  allSongs={songs}
                  initialMood={selectedMood}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'library' && (
                <LibraryView
                  allSongs={songs}
                  playlists={playlists}
                  artists={artists}
                  albums={albums}
                  initialSubTab="playlists"
                  onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'liked' && (
                <LibraryView
                  allSongs={songs}
                  playlists={playlists}
                  artists={artists}
                  albums={albums}
                  initialSubTab="liked"
                  onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'history' && (
                <LibraryView
                  allSongs={songs}
                  playlists={playlists}
                  artists={artists}
                  albums={albums}
                  initialSubTab="history"
                  onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'admin' && (
                <AdminDashboard songs={songs} onRefreshSongs={triggerRefresh} />
              )}

              {activePlaylist && (
                <PlaylistDetailView
                  playlist={activePlaylist}
                  allSongs={songs}
                  onBack={() => setActiveTab('library')}
                />
              )}

              {currentArtist && activeTab.startsWith('artist-') && (
                <ArtistDetailView
                  artist={currentArtist}
                  allSongs={songs}
                  albums={albums}
                  onBack={() => setActiveTab('search')}
                  onSelectAlbum={handleSelectAlbum}
                />
              )}

              {currentAlbum && activeTab.startsWith('album-') && (
                <AlbumDetailView
                  album={currentAlbum}
                  allSongs={songs}
                  onBack={() => setActiveTab('search')}
                />
              )}
            </>
          )}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <div className="md:hidden fixed bottom-18 left-0 right-0 z-30 bg-[#121216] border-t border-white/5 py-2 px-6 flex items-center justify-around text-[10px]">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'home' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <HomeIcon className="w-4 h-4" />
            <span>Home</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'search' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <SearchIcon className="w-4 h-4" />
            <span>Search</span>
          </button>
          <button
            onClick={() => setActiveTab('ai-music')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'ai-music' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Mixes</span>
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'library' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <LibraryIcon className="w-4 h-4" />
            <span>Library</span>
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'admin' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload</span>
          </button>
        </div>

        {/* Persistent Bottom Music Player */}
        <BottomPlayer />

        {/* Full-Screen Music Player Modal */}
        <FullScreenPlayer />

        {/* Lyrics Modal */}
        <LyricsModal />

        {/* Concierge Drawer */}
        <AiAssistantDrawer allSongs={songs} onNavigateTab={setActiveTab} />

        {/* Create Playlist Modal */}
        <CreatePlaylistModal
          isOpen={isCreatePlaylistOpen}
          onClose={() => setIsCreatePlaylistOpen(false)}
          onPlaylistCreated={triggerRefresh}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <MusicPlayerProvider>
      <AppContent />
    </MusicPlayerProvider>
  );
}
