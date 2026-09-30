import React, { useState } from 'react';
import {
  Compass,
  X,
  Send,
  Play,
  ListPlus,
  Coffee,
  Car,
  Flame,
  Headphones,
  Music,
  User as UserIcon,
} from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { Song } from '../../types/music';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  action?: {
    type: 'PLAY_SONG' | 'CREATE_PLAYLIST' | 'NAVIGATE';
    songId?: string;
    songTitle?: string;
    name?: string;
    songIds?: string[];
    view?: string;
  };
  timestamp: string;
}

export const AiAssistantDrawer: React.FC<{
  allSongs: Song[];
  onNavigateTab: (tab: string) => void;
}> = ({ allSongs, onNavigateTab }) => {
  const { openAiAssistant, setOpenAiAssistant, playSong, showToast, triggerRefresh } = useMusicPlayer();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      sender: 'assistant',
      text: "Hi! Looking for something specific? Ask me to play any song, artist, or recommend tracks based on your mood.",
      timestamp: 'Just now',
    },
  ]);

  if (!openAiAssistant) return null;

  const quickPrompts = [
    { label: 'Relaxing sounds', icon: Coffee, text: 'Play something relaxing' },
    { label: 'Bhojpuri roadtrip', icon: Car, text: 'Give me energetic Bhojpuri songs for a road trip' },
    { label: 'Late night synth', icon: Flame, text: 'Play late night synthwave tracks' },
    { label: 'Study & Lo-Fi', icon: Headphones, text: 'Play calm lo-fi study music' },
  ];

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: 'u-' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });
      const data = await res.json();

      const assistantMsg: Message = {
        id: 'a-' + Date.now(),
        sender: 'assistant',
        text: data.reply || "Here's what I found from your library.",
        action: data.action,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.action?.type === 'PLAY_SONG' && data.action.songId) {
        const found = allSongs.find((s) => s.id === data.action.songId);
        if (found) {
          playSong(found, allSongs);
        }
      }
    } catch (err) {
      console.warn(err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'a-' + Date.now(),
          sender: 'assistant',
          text: "I found some great tracks matching your vibe in the library!",
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (action: any) => {
    if (action.type === 'PLAY_SONG' && action.songId) {
      const song = allSongs.find((s) => s.id === action.songId);
      if (song) {
        playSong(song, allSongs);
        showToast(`Now playing: ${song.title}`);
      }
    } else if (action.type === 'CREATE_PLAYLIST' && action.songIds) {
      try {
        const res = await fetch('/api/playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: action.name || 'Custom Mix',
            description: 'Created by Songfly Concierge',
            songIds: action.songIds,
          }),
        });
        if (res.ok) {
          showToast(`Created playlist "${action.name || 'Mix'}"!`);
          triggerRefresh();
          onNavigateTab('library');
        }
      } catch (e) {
        console.warn(e);
      }
    } else if (action.type === 'NAVIGATE' && action.view) {
      onNavigateTab(action.view);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-[#121216] border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Songfly Concierge</h3>
            <p className="text-xs text-slate-400">Song discovery & playback helper</p>
          </div>
        </div>

        <button
          onClick={() => setOpenAiAssistant(false)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2.5 bg-black/30 border-b border-white/5 overflow-x-auto flex items-center gap-2 no-scrollbar">
        {quickPrompts.map((qp, idx) => {
          const Icon = qp.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSend(qp.text)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white border border-white/5 transition-colors flex-shrink-0"
            >
              <Icon className="w-3 h-3 text-emerald-400" />
              <span>{qp.label}</span>
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const isConcierge = m.sender === 'assistant';
          return (
            <div
              key={m.id}
              className={`flex gap-2.5 ${isConcierge ? 'justify-start' : 'justify-end'}`}
            >
              {isConcierge && (
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Music className="w-3.5 h-3.5" />
                </div>
              )}

              <div className="max-w-[85%] space-y-1.5">
                <div
                  className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isConcierge
                      ? 'bg-[#18181f] text-slate-200 border border-white/5 rounded-tl-sm'
                      : 'bg-emerald-500 text-black font-medium rounded-tr-sm'
                  }`}
                >
                  <p>{m.text}</p>
                </div>

                {/* Attached Action */}
                {m.action && (
                  <div className="p-2.5 bg-white/5 rounded-xl space-y-1.5">
                    {m.action.type === 'PLAY_SONG' && (
                      <button
                        onClick={() => handleExecuteAction(m.action)}
                        className="w-full py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current text-black" />
                        Play "{m.action.songTitle || 'Track'}"
                      </button>
                    )}
                    {m.action.type === 'CREATE_PLAYLIST' && (
                      <button
                        onClick={() => handleExecuteAction(m.action)}
                        className="w-full py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ListPlus className="w-3 h-3" />
                        Save Playlist
                      </button>
                    )}
                  </div>
                )}

                <div className={`text-[10px] text-slate-500 ${isConcierge ? 'text-left' : 'text-right'}`}>
                  {m.timestamp}
                </div>
              </div>

              {!isConcierge && (
                <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Music className="w-3.5 h-3.5" />
            </div>
            <div className="p-3 rounded-2xl bg-[#18181f] text-xs text-slate-400">
              Finding matching tracks...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 bg-black/40">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for songs, vibes, or artists..."
            className="w-full pl-3 pr-10 py-2.5 rounded-full bg-[#18181f] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-1.5 p-1.5 rounded-full bg-emerald-500 text-black disabled:opacity-30 hover:bg-emerald-400 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
