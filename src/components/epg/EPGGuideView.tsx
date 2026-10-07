import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  Play, 
  Tv, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Info,
  X,
  Layers,
  Heart
} from 'lucide-react';
import { ChannelRecord, EPGProgram } from '../../types/database';
import { useAuth } from '../../context/AuthContext';

interface EPGGuideViewProps {
  channels: ChannelRecord[];
  onSelectChannel: (channel: ChannelRecord) => void;
}

export const EPGGuideView: React.FC<EPGGuideViewProps> = ({
  channels,
  onSelectChannel,
}) => {
  const { isFavorite, toggleFavorite } = useAuth();
  const [guideData, setGuideData] = useState<Record<string, EPGProgram[]>>({});
  const [selectedTimeline, setSelectedTimeline] = useState<'24h' | '7d'>('24h');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectProgram, setInspectProgram] = useState<EPGProgram | null>(null);
  const [inspectChannel, setInspectChannel] = useState<ChannelRecord | null>(null);

  useEffect(() => {
    fetch('/api/epg')
      .then((res) => res.json())
      .then((data) => setGuideData(data))
      .catch((err) => console.error(err));
  }, []);

  const categories = ['All', 'Sports', 'News', 'Movies', 'General Entertainment', 'Documentary', 'Regional'];
  const countries = ['All', 'United Kingdom', 'United States', 'Pakistan', 'India', 'Middle East'];

  // Filter channels for EPG display
  const filteredChannels = channels.filter((ch) => {
    if (selectedCategory !== 'All' && ch.category !== selectedCategory) return false;
    if (selectedCountry !== 'All' && ch.country !== selectedCountry) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return ch.officialName.toLowerCase().includes(q) || ch.name.toLowerCase().includes(q);
    }
    return true;
  }).slice(0, 30); // Display top 30 channels in timeline matrix

  return (
    <div className="flex flex-col space-y-4">
      
      {/* EPG Controls & Timeline Filter */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 rounded-2xl border border-white/5 bg-[#0e111d]/90 p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Electronic Program Guide (EPG)
              </h2>
              <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/30 animate-pulse">
                LIVE TIMELINE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive timeline: Past ← Live Now → Upcoming (24h / 7-Day Guide)
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeline Switcher */}
          <div className="flex items-center rounded-xl border border-white/10 bg-slate-900/80 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setSelectedTimeline('24h')}
              className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                selectedTimeline === '24h' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              24-Hour View
            </button>
            <button
              onClick={() => setSelectedTimeline('7d')}
              className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                selectedTimeline === '7d' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              7-Day View
            </button>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter channels..."
              className="rounded-xl border border-white/10 bg-slate-900 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none w-36 sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* EPG Timeline Matrix */}
      <div className="rounded-3xl border border-white/5 bg-[#0a0d18]/90 overflow-hidden shadow-2xl backdrop-blur-xl">
        
        {/* Timeline Header (Past / Now / Upcoming) */}
        <div className="flex items-center border-b border-white/5 bg-slate-950/80 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <div className="w-56 shrink-0 pl-2">Channel / Broadcaster</div>
          <div className="flex-1 grid grid-cols-3 gap-2 text-center">
            <span className="text-slate-500">PAST (Earlier)</span>
            <span className="text-amber-400 flex items-center justify-center gap-1.5 font-extrabold">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              LIVE NOW
            </span>
            <span className="text-slate-400">UPCOMING (Next)</span>
          </div>
        </div>

        {/* Channel EPG Rows */}
        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
          {filteredChannels.map((ch) => {
            const programs = guideData[ch.id] || [];
            const pastProg = programs.find((p) => p.id.includes('past')) || {
              id: 'fallback-past',
              channelId: ch.id,
              title: `${ch.officialName} Morning Transmission`,
              startTime: '08:00',
              endTime: '09:00',
              durationMinutes: 60,
              genre: ch.category,
              description: 'Archived broadcast available on demand.',
              country: ch.country,
              language: ch.language,
            };
            const liveProg = programs.find((p) => p.id.includes('now')) || {
              id: 'fallback-now',
              channelId: ch.id,
              title: ch.currentProgram || `${ch.officialName} Live Transmission`,
              startTime: '09:00',
              endTime: '10:00',
              durationMinutes: 60,
              genre: ch.category,
              description: `Live native ${ch.resolution} transmission broadcast on ${ch.officialName}.`,
              country: ch.country,
              language: ch.language,
              rating: 'TV-14',
            };
            const nextProg = programs.find((p) => p.id.includes('next')) || {
              id: 'fallback-next',
              channelId: ch.id,
              title: ch.nextProgram || `${ch.officialName} Evening Program`,
              startTime: '10:00',
              endTime: '11:00',
              durationMinutes: 60,
              genre: ch.category,
              description: 'Next scheduled broadcast block.',
              country: ch.country,
              language: ch.language,
            };

            return (
              <div 
                key={ch.id}
                className="flex items-center px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                {/* Channel Header Pill */}
                <div className="w-56 shrink-0 flex items-center gap-3 pr-4">
                  <div 
                    onClick={() => onSelectChannel(ch)}
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-white/10 bg-slate-900 cursor-pointer hover:border-amber-400/50"
                  >
                    <img src={ch.logo} alt={ch.officialName} className="h-full w-full object-cover" />
                  </div>
                  <div className="truncate">
                    <div 
                      onClick={() => onSelectChannel(ch)}
                      className="font-bold text-white text-xs truncate hover:text-amber-300 cursor-pointer"
                    >
                      {ch.officialName}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                      <span>#{ch.channelNumber}</span>
                      <span>•</span>
                      <span className="text-amber-400/90">{ch.resolution}</span>
                    </div>
                  </div>
                </div>

                {/* 3 Program Slots */}
                <div className="flex-1 grid grid-cols-3 gap-2">
                  
                  {/* Past Program */}
                  <div 
                    onClick={() => {
                      setInspectProgram(pastProg);
                      setInspectChannel(ch);
                    }}
                    className="rounded-xl border border-white/5 bg-slate-950/40 p-2 text-xs hover:border-white/15 transition-all cursor-pointer opacity-70 hover:opacity-100"
                  >
                    <div className="text-[10px] text-slate-500 font-mono">Past Broadcast</div>
                    <div className="font-semibold text-slate-300 truncate mt-0.5">{pastProg.title}</div>
                    <div className="text-[10px] text-slate-500 truncate">{pastProg.genre}</div>
                  </div>

                  {/* Live Now Program */}
                  <div 
                    onClick={() => {
                      setInspectProgram(liveProg);
                      setInspectChannel(ch);
                    }}
                    className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-orange-500/10 p-2 text-xs hover:border-amber-400 transition-all cursor-pointer shadow-sm relative group"
                  >
                    <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold">
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        ON AIR
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectChannel(ch);
                        }}
                        className="rounded bg-amber-500 px-1.5 py-0.2 text-[9px] font-extrabold text-slate-950 hover:bg-amber-400"
                      >
                        WATCH
                      </button>
                    </div>
                    <div className="font-bold text-white truncate mt-0.5">{liveProg.title}</div>
                    <div className="text-[10px] text-slate-300 truncate">{liveProg.genre} • {liveProg.rating || 'TV-PG'}</div>
                  </div>

                  {/* Upcoming Program */}
                  <div 
                    onClick={() => {
                      setInspectProgram(nextProg);
                      setInspectChannel(ch);
                    }}
                    className="rounded-xl border border-white/5 bg-slate-950/60 p-2 text-xs hover:border-white/15 transition-all cursor-pointer"
                  >
                    <div className="text-[10px] text-slate-400 font-mono">Up Next</div>
                    <div className="font-semibold text-white truncate mt-0.5">{nextProg.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">{nextProg.genre}</div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Program Inspector Modal */}
      {inspectProgram && inspectChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0e1220] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                  {inspectChannel.officialName} EPG
                </span>
                <h3 className="text-base font-bold text-white mt-1">{inspectProgram.title}</h3>
                <div className="text-xs text-slate-400">
                  {inspectProgram.genre} • {inspectProgram.durationMinutes} min • Rating: {inspectProgram.rating || 'TV-PG'}
                </div>
              </div>
              <button
                onClick={() => setInspectProgram(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-2xl border border-white/5">
              {inspectProgram.description}
            </p>

            <div className="flex items-center justify-between text-xs pt-2">
              <div className="font-mono text-slate-400">
                Language: {inspectProgram.language || 'English'}
              </div>
              <button
                onClick={() => {
                  setInspectProgram(null);
                  onSelectChannel(inspectChannel);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
              >
                <Play className="h-3.5 w-3.5 fill-slate-950" />
                <span>Watch Live Channel</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
