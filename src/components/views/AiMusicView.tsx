import React, { useState } from 'react';
import {
  Play,
  ListPlus,
  Compass,
  Coffee,
  Dumbbell,
  Heart,
  CloudRain,
  PartyPopper,
  Code,
  Car,
  Moon,
  Zap,
} from 'lucide-react';
import { Song } from '../../types/music';
import { SongRow } from '../common/SongRow';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface AiMusicViewProps {
  allSongs: Song[];
  initialMood?: string;
  onNavigateTab: (tab: string) => void;
}

export const AiMusicView: React.FC<AiMusicViewProps> = ({
  allSongs,
  initialMood = '',
  onNavigateTab,
}) => {
  const { playSong, showToast, triggerRefresh } = useMusicPlayer();
  const [selectedMood, setSelectedMood] = useState(initialMood);
  const [prompt, setPrompt] = useState(
    initialMood ? `Create a playlist matching ${initialMood}` : ''
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    playlist: {
      title: string;
      description: string;
      vibeCommentary?: string;
      songIds: string[];
    };
    songs: Song[];
  } | null>(null);

  const moods = [
    { label: 'Relaxing', icon: Coffee },
    { label: 'Workout', icon: Dumbbell },
    { label: 'Romantic', icon: Heart },
    { label: 'Sad', icon: CloudRain },
    { label: 'Party', icon: PartyPopper },
    { label: 'Focus', icon: Code },
    { label: 'Driving', icon: Car },
    { label: 'Late Night', icon: Moon },
    { label: 'Bhojpuri Beats', icon: Zap },
  ];

  const handleMoodSelect = (moodLabel: string) => {
    setSelectedMood(moodLabel);
    setPrompt(`Create a ${moodLabel} mix with great rhythm`);
  };

  const handleGenerate = async (customPrompt?: string) => {
    const textToRun = customPrompt || prompt;
    if (!textToRun.trim() && !selectedMood) return;

    setIsGenerating(true);
    setGeneratedResult(null);

    try {
      const res = await fetch('/api/ai/generate-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToRun,
          mood: selectedMood,
        }),
      });

      const data = await res.json();
      if (data && data.playlist) {
        setGeneratedResult(data);
      }
    } catch (err) {
      console.warn('Playlist generation error:', err);
      showToast('Could not load custom mix; using local tracks');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayAll = () => {
    if (!generatedResult || generatedResult.songs.length === 0) return;
    playSong(generatedResult.songs[0], generatedResult.songs);
    showToast(`Streaming ${generatedResult.playlist.title}`);
  };

  const handleSavePlaylist = async () => {
    if (!generatedResult) return;
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: generatedResult.playlist.title,
          description: generatedResult.playlist.description,
          songIds: generatedResult.playlist.songIds,
          isAiGenerated: false,
          aiPrompt: prompt,
        }),
      });

      if (res.ok) {
        showToast('Playlist saved to Your Library!');
        triggerRefresh();
        onNavigateTab('library');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving playlist');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Discover Custom Mixes
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Pick your mood or describe the scene you want to soundtrack.
        </p>
      </div>

      {/* Mood Selector Grid */}
      <div className="p-6 rounded-2xl bg-[#181818] space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
          What are you in the mood for?
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {moods.map((m) => {
            const Icon = m.icon;
            const isSelected = selectedMood === m.label;
            return (
              <button
                key={m.label}
                onClick={() => handleMoodSelect(m.label)}
                className={`p-3 rounded-xl border transition-all text-left flex items-center gap-3 ${
                  isSelected
                    ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-md'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs truncate">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Prompt Box */}
      <div className="p-6 rounded-2xl bg-[#181818] space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Describe what you want to hear
        </div>

        <div className="relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`e.g. "Give me energetic Bhojpuri songs for a road trip" or "Relaxing lo-fi acoustic study beats"`}
            className="w-full p-3.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            <span className="text-slate-500">Quick ideas:</span>
            {[
              'Energetic Bhojpuri road trip',
              'Midnight rain lo-fi',
              'Synthwave highway drive',
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(preset);
                  handleGenerate(preset);
                }}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors"
              >
                "{preset}"
              </button>
            ))}
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={isGenerating || (!prompt.trim() && !selectedMood)}
            className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-40"
          >
            {isGenerating ? (
              <span>Curating mix...</span>
            ) : (
              <span>Create Mix</span>
            )}
          </button>
        </div>
      </div>

      {/* Generated Result Container */}
      {generatedResult && (
        <div className="p-6 rounded-2xl bg-[#181818] border border-white/10 space-y-5 animate-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Custom Playlist
              </span>
              <h2 className="text-2xl font-extrabold text-white mt-1">
                {generatedResult.playlist.title}
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                {generatedResult.playlist.description}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayAll}
                className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm flex items-center gap-2 shadow-md active:scale-95 transition-transform"
              >
                <Play className="w-4 h-4 fill-current" />
                Play All
              </button>
              <button
                onClick={handleSavePlaylist}
                className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center gap-2 transition-colors"
              >
                <ListPlus className="w-4 h-4" />
                Save to Library
              </button>
            </div>
          </div>

          {/* Tracklist */}
          <div className="space-y-0.5">
            {generatedResult.songs.map((song, idx) => (
              <SongRow
                key={song.id}
                song={song}
                index={idx}
                allSongs={generatedResult.songs}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
