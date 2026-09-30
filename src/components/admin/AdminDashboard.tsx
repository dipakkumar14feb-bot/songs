import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileAudio,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Edit2,
  HardDrive,
  Users,
  Play,
  Music,
  Plus,
  RefreshCw,
  FolderUp,
} from 'lucide-react';
import { Song, AdminAnalytics } from '../../types/music';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface AdminDashboardProps {
  songs: Song[];
  onRefreshSongs: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ songs, onRefreshSongs }) => {
  const { showToast, currentRole } = useMusicPlayer();
  const [activeTab, setActiveTab] = useState<'upload' | 'bulk' | 'songs' | 'analytics'>('upload');
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);

  // Single Upload State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('Chillhop & Lo-Fi');
  const [lyrics, setLyrics] = useState('');
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Bulk Upload State
  const [bulkFiles, setBulkFiles] = useState<{ file: File; title: string; progress: number; status: 'pending' | 'uploading' | 'done' | 'error' }[]>([]);
  const [bulkGenre, setBulkGenre] = useState('Chillhop & Lo-Fi');
  const [bulkArtist, setBulkArtist] = useState('Songfly Studio');
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  // Song Edit State
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  const loadAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [songs.length]);

  const handleAudioFileChange = (file: File) => {
    setAudioFile(file);
    if (!title) {
      const clean = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(clean);
    }
  };

  const handleCoverFileChange = (file: File) => {
    setCoverFile(file);
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  };

  const handleSingleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) {
      showToast('Please select an audio file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    const formData = new FormData();
    formData.append('audio', audioFile);
    if (coverFile) formData.append('cover', coverFile);
    formData.append('title', title || audioFile.name);
    formData.append('artist', artist || 'Independent Artist');
    formData.append('album', album || 'Single');
    formData.append('genre', genre);
    formData.append('lyrics', lyrics);
    formData.append('releaseDate', releaseDate);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (!prev) return 20;
        if (prev >= 90) return prev;
        return prev + 15;
      });
    }, 200);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);
      setUploadProgress(100);

      if (res.ok) {
        showToast('✓ Song uploaded successfully!');
        setAudioFile(null);
        setCoverFile(null);
        setCoverPreview(null);
        setTitle('');
        setArtist('');
        setAlbum('');
        setLyrics('');
        onRefreshSongs();
        setTimeout(() => setUploadProgress(null), 1500);
      } else {
        showToast('Upload error');
      }
    } catch (err: any) {
      clearInterval(interval);
      showToast(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleBulkFilesSelect = (files: FileList | null) => {
    if (!files) return;
    const newItems = Array.from(files).map((f) => ({
      file: f,
      title: f.name.replace(/\.[^/.]+$/, '').replace(/^[0-9]+[_\s.-]*/, '').replace(/[_-]/g, ' '),
      progress: 0,
      status: 'pending' as const,
    }));
    setBulkFiles(newItems);
  };

  const handleBulkUploadSubmit = async () => {
    if (bulkFiles.length === 0) return;
    setIsBulkUploading(true);

    const formData = new FormData();
    bulkFiles.forEach((item) => {
      formData.append('audioFiles', item.file);
    });
    formData.append('defaultGenre', bulkGenre);
    formData.append('defaultArtist', bulkArtist);

    setBulkFiles((prev) => prev.map((f) => ({ ...f, status: 'uploading', progress: 50 })));

    try {
      const res = await fetch('/api/admin/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setBulkFiles((prev) => prev.map((f) => ({ ...f, status: 'done', progress: 100 })));
        showToast(`✓ Published ${bulkFiles.length} songs!`);
        onRefreshSongs();
        setTimeout(() => setBulkFiles([]), 2000);
      } else {
        showToast('Bulk upload failed.');
      }
    } catch (e: any) {
      showToast('Error during bulk upload.');
    } finally {
      setIsBulkUploading(false);
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!confirm('Are you sure you want to delete this track?')) return;
    try {
      const res = await fetch(`/api/admin/songs/${songId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Song deleted.');
        onRefreshSongs();
      }
    } catch (e) {
      showToast('Failed to delete song.');
    }
  };

  const handleUpdateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSong) return;

    try {
      const res = await fetch(`/api/admin/songs/${editingSong.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingSong.title,
          artist: editingSong.artist,
          album: editingSong.album,
          genre: editingSong.genre,
          lyrics: editingSong.lyrics,
        }),
      });

      if (res.ok) {
        showToast('Song details updated.');
        setEditingSong(null);
        onRefreshSongs();
      }
    } catch (e) {
      showToast('Failed to update.');
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Music Upload & Admin</h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload songs, manage track metadata, and monitor storage.
          </p>
        </div>

        {/* Tab Switchers */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'upload' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Upload Song
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'bulk' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bulk Upload
          </button>
          <button
            onClick={() => setActiveTab('songs')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'songs' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Track Library ({songs.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'analytics' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Stats
          </button>
        </div>
      </div>

      {/* Upload Song View */}
      {activeTab === 'upload' && (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#181818] max-w-2xl mx-auto space-y-6">
          <h3 className="text-xl font-bold text-white">Upload New Song</h3>

          <form onSubmit={handleSingleUpload} className="space-y-4">
            {/* Audio Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleAudioFileChange(e.dataTransfer.files[0]);
              }}
              className="border-2 border-dashed border-white/10 hover:border-emerald-500/50 rounded-xl p-6 text-center cursor-pointer bg-white/5 transition-colors"
            >
              <input
                type="file"
                id="audio-upload-input"
                accept="audio/*,.mp3,.wav,.flac,.m4a,.aac"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleAudioFileChange(e.target.files[0]);
                }}
                className="hidden"
              />
              <label htmlFor="audio-upload-input" className="cursor-pointer">
                <FileAudio className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                {audioFile ? (
                  <div className="text-sm font-semibold text-emerald-400">
                    {audioFile.name} ({(audioFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-semibold text-white">
                      Drag & drop audio file or <span className="text-emerald-400 underline">browse</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">MP3, WAV, FLAC, M4A, AAC</div>
                  </>
                )}
              </label>
            </div>

            {/* Cover and details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="text-xs font-semibold text-slate-400 block mb-1">Cover Art</label>
                <div className="aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10 flex flex-col items-center justify-center cursor-pointer">
                  <input
                    type="file"
                    id="cover-upload-input"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleCoverFileChange(e.target.files[0]);
                    }}
                    className="hidden"
                  />
                  <label htmlFor="cover-upload-input" className="cursor-pointer w-full h-full flex flex-col items-center justify-center p-2 text-center">
                    {coverPreview ? (
                      <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <ImageIcon className="w-6 h-6 text-slate-500 mb-1" />
                        <span className="text-xs text-slate-400">Add Cover</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="sm:col-span-2 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Song Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Electric Highway"
                    className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Artist *</label>
                    <input
                      type="text"
                      required
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      placeholder="e.g. Nico Sol"
                      className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Album</label>
                    <input
                      type="text"
                      value={album}
                      onChange={(e) => setAlbum(e.target.value)}
                      placeholder="Single"
                      className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Genre</label>
                    <select
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Bhojpuri Fusion Beats">Bhojpuri Fusion Beats</option>
                      <option value="Synthwave & Retro">Synthwave & Retro</option>
                      <option value="Chillhop & Lo-Fi">Chillhop & Lo-Fi</option>
                      <option value="Deep House & Club">Deep House & Club</option>
                      <option value="Cinematic Ambient">Cinematic Ambient</option>
                      <option value="Indie Acoustic">Indie Acoustic</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Release Date</label>
                    <input
                      type="date"
                      value={releaseDate}
                      onChange={(e) => setReleaseDate(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Lyrics */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Lyrics (Optional)</label>
              <textarea
                rows={3}
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Paste lyrics or leave blank..."
                className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs resize-none focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Upload Progress */}
            {uploadProgress !== null && (
              <div className="space-y-1.5 p-3 rounded-lg bg-black/40 border border-white/10 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Uploading to cloud storage...</span>
                  <span className="font-bold text-emerald-400">{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-40"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Publish Song</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Bulk Upload View */}
      {activeTab === 'bulk' && (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#181818] max-w-2xl mx-auto space-y-6">
          <h3 className="text-xl font-bold text-white">Bulk Audio Upload</h3>

          <div className="border-2 border-dashed border-white/10 hover:border-emerald-500/50 rounded-xl p-8 text-center bg-white/5 transition-colors cursor-pointer">
            <input
              type="file"
              id="bulk-files-input"
              multiple
              accept="audio/*,.mp3,.wav,.flac,.m4a,.aac"
              onChange={(e) => handleBulkFilesSelect(e.target.files)}
              className="hidden"
            />
            <label htmlFor="bulk-files-input" className="cursor-pointer">
              <FolderUp className="w-12 h-12 mx-auto mb-2 text-emerald-400" />
              <div className="text-base font-bold text-white">Select multiple audio files</div>
              <div className="text-xs text-slate-400 mt-1">Select 5 to 25 songs to upload at once</div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Artist</label>
              <input
                type="text"
                value={bulkArtist}
                onChange={(e) => setBulkArtist(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Genre</label>
              <input
                type="text"
                value={bulkGenre}
                onChange={(e) => setBulkGenre(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs"
              />
            </div>
          </div>

          {bulkFiles.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
                <span>Selected ({bulkFiles.length})</span>
                <button onClick={() => setBulkFiles([])} className="text-rose-400 hover:underline">
                  Clear
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {bulkFiles.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between gap-3 text-xs"
                  >
                    <FileAudio className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="font-semibold text-white truncate flex-1">{item.title}</span>
                    <span className="text-[10px] text-slate-500">
                      {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleBulkUploadSubmit}
                disabled={isBulkUploading}
                className="w-full py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-40"
              >
                {isBulkUploading ? 'Uploading...' : `Upload All ${bulkFiles.length} Songs`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tracks Library Table */}
      {activeTab === 'songs' && (
        <div className="p-6 rounded-2xl bg-[#181818] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">All Songs</h3>
            <button
              onClick={() => setActiveTab('upload')}
              className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs"
            >
              + Upload Song
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pl-3">Track</th>
                  <th className="pb-3">Artist</th>
                  <th className="pb-3">Genre</th>
                  <th className="pb-3">Plays</th>
                  <th className="pb-3 text-right pr-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {songs.map((song) => (
                  <tr key={song.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 pl-3 flex items-center gap-3">
                      <img src={song.coverUrl} alt={song.title} className="w-8 h-8 rounded object-cover" />
                      <div>
                        <div className="font-semibold text-white">{song.title}</div>
                        <div className="text-[11px] text-slate-400">{song.album || 'Single'}</div>
                      </div>
                    </td>
                    <td className="py-2.5 text-slate-300">{song.artist}</td>
                    <td className="py-2.5 text-slate-400">{song.genre}</td>
                    <td className="py-2.5 font-mono text-slate-400">{song.playCount?.toLocaleString() || 0}</td>
                    <td className="py-2.5 text-right pr-3 space-x-2">
                      <button
                        onClick={() => setEditingSong(song)}
                        className="p-1 rounded text-slate-400 hover:text-white"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSong(song.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics */}
      {activeTab === 'analytics' && analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#181818]">
            <span className="text-xs text-slate-400">Total Songs</span>
            <div className="text-2xl font-bold text-white mt-1">{analytics.totalSongs}</div>
          </div>
          <div className="p-4 rounded-xl bg-[#181818]">
            <span className="text-xs text-slate-400">Total Plays</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{analytics.totalPlays.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-xl bg-[#181818]">
            <span className="text-xs text-slate-400">Storage Used</span>
            <div className="text-2xl font-bold text-white mt-1">{(analytics.storageUsedBytes / (1024 * 1024)).toFixed(1)} MB</div>
          </div>
          <div className="p-4 rounded-xl bg-[#181818]">
            <span className="text-xs text-slate-400">Playlists</span>
            <div className="text-2xl font-bold text-white mt-1">{analytics.totalPlaylists}</div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSong && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-[#181818] border border-white/10 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Edit Song Details</h3>
            <form onSubmit={handleUpdateSong} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Title</label>
                <input
                  type="text"
                  value={editingSong.title}
                  onChange={(e) => setEditingSong({ ...editingSong, title: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Artist</label>
                  <input
                    type="text"
                    value={editingSong.artist}
                    onChange={(e) => setEditingSong({ ...editingSong, artist: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Album</label>
                  <input
                    type="text"
                    value={editingSong.album || ''}
                    onChange={(e) => setEditingSong({ ...editingSong, album: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSong(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
