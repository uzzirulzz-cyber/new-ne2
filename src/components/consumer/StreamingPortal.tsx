import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Play, 
  Heart, 
  Search, 
  Flame, 
  Sparkles, 
  Film, 
  Radio, 
  Trophy, 
  Newspaper, 
  Music, 
  Globe, 
  Calendar, 
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Star,
  Monitor
} from 'lucide-react';
import { 
  ChannelRecord, 
  MovieRecord, 
  WebSeriesRecord, 
  DramaRecord, 
  MusicTrackRecord, 
  SportsEventRecord, 
  NewsBulletinRecord 
} from '../../types/database';
import { useAuth } from '../../context/AuthContext';
import { EPGGuideView } from '../epg/EPGGuideView';

interface StreamingPortalProps {
  onWatchChannel: (channel: ChannelRecord) => void;
  onOpenAdmin: () => void;
}

export const StreamingPortal: React.FC<StreamingPortalProps> = ({
  onWatchChannel,
  onOpenAdmin,
}) => {
  const { isFavorite, toggleFavorite, isSmartTVMode, toggleSmartTVMode } = useAuth();
  const [navTab, setNavTab] = useState<'home' | 'live' | 'movies' | 'series' | 'drama' | 'music' | 'sports' | 'news' | 'epg'>('home');
  
  // Data states
  const [stats, setStats] = useState<any>(null);
  const [channels, setChannels] = useState<ChannelRecord[]>([]);
  const [hotChannels, setHotChannels] = useState<ChannelRecord[]>([]);
  const [movies, setMovies] = useState<MovieRecord[]>([]);
  const [series, setSeries] = useState<WebSeriesRecord[]>([]);
  const [dramas, setDramas] = useState<DramaRecord[]>([]);
  const [music, setMusic] = useState<MusicTrackRecord[]>([]);
  const [sports, setSports] = useState<SportsEventRecord[]>([]);
  const [news, setNews] = useState<NewsBulletinRecord[]>([]);
  
  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDramaType, setSelectedDramaType] = useState('All');
  const [inspectMovie, setInspectMovie] = useState<MovieRecord | null>(null);

  useEffect(() => {
    fetchStats();
    fetchChannels();
    fetchHotChannels();
    fetchMovies();
    fetchSeries();
    fetchDramas();
    fetchMusic();
    fetchSports();
    fetchNews();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {}
  };

  const fetchChannels = async () => {
    try {
      const res = await fetch('/api/channels?pageSize=60');
      const data = await res.json();
      setChannels(data.items || []);
    } catch (e) {}
  };

  const fetchHotChannels = async () => {
    try {
      const res = await fetch('/api/hot-tv?limit=12');
      const data = await res.json();
      setHotChannels(data.channels || []);
    } catch (e) {}
  };

  const fetchMovies = async () => {
    try {
      const res = await fetch('/api/movies');
      const data = await res.json();
      setMovies(data.movies || []);
    } catch (e) {}
  };

  const fetchSeries = async () => {
    try {
      const res = await fetch('/api/series');
      const data = await res.json();
      setSeries(data.series || []);
    } catch (e) {}
  };

  const fetchDramas = async () => {
    try {
      const res = await fetch('/api/dramas');
      const data = await res.json();
      setDramas(data.dramas || []);
    } catch (e) {}
  };

  const fetchMusic = async () => {
    try {
      const res = await fetch('/api/music');
      const data = await res.json();
      setMusic(data.music || []);
    } catch (e) {}
  };

  const fetchSports = async () => {
    try {
      const res = await fetch('/api/sports');
      const data = await res.json();
      setSports(data.sports || []);
    } catch (e) {}
  };

  const fetchNews = async () => {
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      setNews(data.news || []);
    } catch (e) {}
  };

  // Filtered Channels
  const filteredChannels = channels.filter((c) => {
    if (selectedCountry !== 'All' && c.country !== selectedCountry) return false;
    if (selectedLanguage !== 'All' && c.language !== selectedLanguage) return false;
    if (selectedCategory !== 'All' && c.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.officialName.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className={`min-h-screen bg-[#07090f] text-slate-100 flex flex-col ${isSmartTVMode ? 'text-base font-medium' : ''}`}>
      
      {/* 1. Global Streaming Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#090b14]/95 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-6">
            <div 
              onClick={() => setNavTab('home')}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 shadow-lg shadow-amber-500/20">
                <Tv className="h-5 w-5 text-slate-950 font-black" />
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-[#07090f]" />
              </div>
              <div>
                <span className="text-base font-black tracking-tight text-white">
                  PLAYBEAT <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">IPTV</span>
                </span>
                <span className="block text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                  Licensed 4K Satellite
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden xl:flex items-center gap-1 text-xs font-semibold">
              {[
                { id: 'home', label: 'HOME' },
                { id: 'live', label: 'LIVE TV' },
                { id: 'movies', label: 'MOVIES' },
                { id: 'series', label: 'WEB SERIES' },
                { id: 'drama', label: 'DRAMA' },
                { id: 'music', label: 'MUSIC' },
                { id: 'sports', label: 'SPORTS' },
                { id: 'news', label: 'NEWS' },
                { id: 'epg', label: 'EPG GUIDE' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setNavTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    navTab === tab.id
                      ? 'bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right Controls: Search, Smart TV Mode, Super Admin */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 13,000+ catalog..."
                className="w-44 lg:w-56 rounded-xl border border-white/10 bg-slate-900/90 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Smart TV Remote Mode Switcher */}
            <button
              onClick={toggleSmartTVMode}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                isSmartTVMode
                  ? 'border-amber-400 bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                  : 'border-white/10 bg-slate-900 text-slate-300 hover:text-white'
              }`}
              title="Toggle Large Card Remote Navigation for Smart TV screens"
            >
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isSmartTVMode ? 'TV Mode ON' : 'Smart TV Mode'}</span>
            </button>

            {/* Super Admin Switch */}
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Super Admin NOC</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Dynamic Hero Section (Only on Home tab) */}
        {navTab === 'home' && (
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#12162a] via-[#0b0e1b] to-black p-6 sm:p-10 shadow-2xl">
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300 backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span>OFFICIAL BROADCAST SATELLITE GATEWAY</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                WATCH LIVE TV <br />
                <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-orange-400 bg-clip-text text-transparent">
                  {stats ? stats.totalChannels.toLocaleString() : '13,284'} VERIFIED CHANNELS
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                Live television, licensed entertainment and premium streaming content from authorized providers. Rendered in native 4K HDR and Full HD with real-time EPG program timelines.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setNavTab('live')}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-xs sm:text-sm font-bold text-slate-950 hover:from-amber-400 hover:to-orange-400 shadow-xl shadow-amber-500/20 cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-slate-950" />
                  <span>WATCH LIVE</span>
                </button>
                <button
                  onClick={() => setNavTab('epg')}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-5 py-3 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  <Calendar className="h-4 w-4 text-amber-400" />
                  <span>EXPLORE EPG GUIDE</span>
                </button>
              </div>
            </div>

            {/* Background Atmosphere Glow */}
            <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          </section>
        )}

        {/* SECTION: HOT LIVE TV (Ranked using real database metrics) */}
        {(navTab === 'home' || navTab === 'live') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Flame className="h-5 w-5 text-orange-400 animate-bounce" />
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  🔥 HOT LIVE TV & TRENDING
                </h2>
                <span className="rounded bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-400 border border-orange-500/20">
                  REAL VIEWER METRICS
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">Ranked by Playback Starts & Watch Time</span>
            </div>

            <div className={`grid gap-3.5 ${
              isSmartTVMode 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}>
              {hotChannels.map((ch, idx) => (
                <div
                  key={ch.id}
                  className={`group relative flex flex-col justify-between rounded-2xl border border-white/5 bg-[#0e111d]/90 p-4 transition-all duration-200 hover:border-amber-500/40 hover:bg-[#121626] hover:shadow-xl ${
                    isSmartTVMode ? 'focus:ring-4 focus:ring-amber-400' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-white/10 bg-slate-900">
                        <img src={ch.logo} alt={ch.officialName} className="h-full w-full object-cover" />
                        <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#0e111d]" />
                      </div>
                      <div className="truncate">
                        <h3 className="font-extrabold text-white text-sm truncate group-hover:text-amber-300">
                          {ch.officialName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span>{ch.country}</span>
                          <span>•</span>
                          <span className="font-mono text-amber-400">{ch.resolution}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleFavorite(ch.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isFavorite(ch.id) ? 'text-rose-400' : 'text-slate-500 hover:text-white'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isFavorite(ch.id) ? 'fill-rose-400' : ''}`} />
                    </button>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-black/40 p-2 text-xs mb-3 space-y-1">
                    <div className="text-[10px] text-amber-400 font-bold uppercase truncate">
                      🔴 NOW: {ch.currentProgram || 'Scheduled Live Feed'}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{ch.viewersCount.toLocaleString()} viewers</span>
                      <span className="text-emerald-400">99.9% Uptime</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onWatchChannel(ch)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-slate-950" />
                    <span>WATCH LIVE</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION: EPG GUIDE VIEW */}
        {navTab === 'epg' && (
          <EPGGuideView
            channels={channels}
            onSelectChannel={onWatchChannel}
          />
        )}

        {/* SECTION: MOVIES & VOD */}
        {(navTab === 'home' || navTab === 'movies') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-t border-white/5 pt-6">
              <div className="flex items-center gap-2.5">
                <Film className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  🎬 LICENSED MOVIES & 4K CINEMA
                </h2>
              </div>
              <span className="text-xs text-slate-400">Territory Verified VOD</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {movies.map((m) => (
                <div 
                  key={m.id}
                  className="rounded-2xl border border-white/5 bg-[#0e111d] overflow-hidden flex flex-col justify-between hover:border-amber-500/40 transition-all"
                >
                  <div className="relative aspect-[16/9] w-full bg-slate-900 overflow-hidden">
                    <img src={m.backdrop} alt={m.officialTitle} className="h-full w-full object-cover" />
                    <span className="absolute top-2 right-2 rounded bg-amber-500/90 px-2 py-0.5 text-[10px] font-black text-slate-950">
                      {m.quality}
                    </span>
                    <span className="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-0.5 text-[10px] font-mono text-white">
                      {m.releaseYear} • {m.runtimeMinutes}m
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-extrabold text-white text-sm">{m.officialTitle}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {m.description}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/5">
                      <span>{m.genre.join(', ')}</span>
                      <span className="font-bold text-amber-400">★ {m.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION: REGIONAL DRAMAS */}
        {(navTab === 'home' || navTab === 'drama') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-t border-white/5 pt-6">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  🎭 REGIONAL DRAMAS (PAKISTANI, TURKISH, KOREAN)
                </h2>
              </div>
              <span className="text-xs text-slate-400">Licensed Episodic Drops</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {dramas.map((d) => (
                <div key={d.id} className="rounded-2xl border border-white/5 bg-[#0e111d] overflow-hidden p-4 space-y-3">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
                    <img src={d.backdrop} alt={d.title} className="h-full w-full object-cover" />
                    <span className="absolute top-2 left-2 rounded bg-purple-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                      {d.regionalType}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{d.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{d.synopsis}</p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{d.episodesCount} Episodes</span>
                    <span className="text-emerald-400">{d.viewersCount.toLocaleString()} Viewers</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION: LIVE SPORTS ARENA */}
        {(navTab === 'home' || navTab === 'sports') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-t border-white/5 pt-6">
              <div className="flex items-center gap-2.5">
                <Trophy className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  🏆 LIVE SPORTS STADIUM FEEDS
                </h2>
              </div>
              <span className="text-xs text-slate-400">Cricket, Football, Formula 1</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {sports.map((s) => (
                <div key={s.id} className="rounded-2xl border border-white/5 bg-[#0e111d] p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      🔴 {s.status}
                    </span>
                    <span className="text-slate-400 font-mono">{s.sport}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{s.title}</h3>
                    <div className="text-xs font-mono text-amber-400 mt-1">{s.score || 'Upcoming Fixture'}</div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/5">
                    <span>{s.channelName}</span>
                    <button 
                      onClick={() => {
                        const target = channels.find((c) => c.id === s.channelId) || channels[0];
                        if (target) onWatchChannel(target);
                      }}
                      className="text-amber-400 hover:underline font-bold"
                    >
                      Watch Stream →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};
