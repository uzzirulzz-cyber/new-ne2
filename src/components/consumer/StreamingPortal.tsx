import React, { useEffect, useState } from 'react';
import { Film, Heart, Monitor, Play, Search, Tv, Radio, Sparkles, ArrowRight, Music2, Clapperboard } from 'lucide-react';
import { ChannelRecord, MovieRecord, WebSeriesRecord } from '../../types/database';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE = 60;

type Tab = 'home' | 'live' | 'movies' | 'series';

interface CatalogStats {
  configured: boolean;
  totalChannels: number;
  totalMovies: number;
  totalSeries: number;
  syncedAt?: string;
}

interface ChannelPage {
  total: number;
  items: ChannelRecord[];
}

interface MoviePage {
  total: number;
  movies: MovieRecord[];
}

interface SeriesPage {
  total: number;
  series: WebSeriesRecord[];
}

interface StreamingPortalProps {
  onWatchChannel: (channel: ChannelRecord) => void;
  onChannelsLoaded: (channels: ChannelRecord[]) => void;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const payload: unknown = await response.json();
    const message = typeof payload === 'object' && payload !== null && 'message' in payload &&
      typeof payload.message === 'string'
      ? payload.message
      : `Catalog request failed with HTTP ${response.status}`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function PaginationControls({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 pt-4">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-sm text-slate-400">Page {page} of {pageCount}</span>
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

export const StreamingPortal: React.FC<StreamingPortalProps> = ({ onWatchChannel, onChannelsLoaded }) => {
  const { isFavorite, toggleFavorite, isSmartTVMode, toggleSmartTVMode } = useAuth();
  const [tab, setTab] = useState<Tab>('home');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [channels, setChannels] = useState<ChannelRecord[]>([]);
  const [movies, setMovies] = useState<MovieRecord[]>([]);
  const [series, setSeries] = useState<WebSeriesRecord[]>([]);
  const [channelTotal, setChannelTotal] = useState(0);
  const [movieTotal, setMovieTotal] = useState(0);
  const [seriesTotal, setSeriesTotal] = useState(0);
  const [channelPage, setChannelPage] = useState(1);
  const [moviePage, setMoviePage] = useState(1);
  const [seriesPage, setSeriesPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<CatalogStats>('/api/stats')
      .then((data) => { if (active) setStats(data); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load catalog status');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(channelPage), pageSize: String(PAGE_SIZE) });
    if (search.trim()) params.set('search', search.trim());
    getJson<ChannelPage>(`/api/channels?${params}`)
      .then((data) => {
        if (!active) return;
        setChannels(data.items);
        onChannelsLoaded(data.items);
        setChannelTotal(data.total);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load live channels');
      });
    return () => { active = false; };
  }, [channelPage, search, onChannelsLoaded]);

  useEffect(() => {
    let active = true;
    getJson<MoviePage>(`/api/movies?page=${moviePage}&pageSize=${PAGE_SIZE}`)
      .then((data) => {
        if (!active) return;
        setMovies(data.movies);
        setMovieTotal(data.total);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load movies');
      });
    return () => { active = false; };
  }, [moviePage]);

  useEffect(() => {
    let active = true;
    getJson<SeriesPage>(`/api/series?page=${seriesPage}&pageSize=${PAGE_SIZE}`)
      .then((data) => {
        if (!active) return;
        setSeries(data.series);
        setSeriesTotal(data.total);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load series');
      });
    return () => { active = false; };
  }, [seriesPage]);

  const playMovie = (movie: MovieRecord) => onWatchChannel({
    id: movie.id,
    name: movie.officialTitle,
    officialName: movie.officialTitle,
    logo: movie.poster,
    category: movie.category,
    streamUrl: movie.streamUrl,
    isActive: true,
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'live', label: 'Live TV' },
    { id: 'movies', label: 'Movies' },
    { id: 'series', label: 'Series' },
  ];

  const channelCards = (
    <div className={`grid gap-3 ${isSmartTVMode ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'}`}>
      {channels.map((channel) => {
        const online = channel.streamHealth === 'ONLINE';
        return (
          <article key={channel.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/30 hover:shadow-[0_18px_44px_rgba(0,0,0,0.45)]">
            <button
              type="button"
              onClick={() => onWatchChannel(channel)}
              className="flex aspect-video w-full items-center justify-center bg-black/40 p-5"
              aria-label={`Play ${channel.name}`}
            >
              {channel.logo
                ? <img src={channel.logo} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                : <Tv className="h-9 w-9 text-slate-600" />}
            </button>
            <div className="flex items-start justify-between gap-2 p-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-white">{channel.name}</h3>
                {channel.category && <p className="truncate text-xs text-slate-400">{channel.category}</p>}
                <p className={`mt-1 text-[10px] ${online ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {online ? 'Online' : channel.streamHealth === 'OFFLINE' ? 'Offline' : 'Not checked'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleFavorite(channel.id)}
                aria-label={isFavorite(channel.id) ? 'Remove favorite' : 'Add favorite'}
                className="shrink-0 rounded-md p-1 text-slate-400 hover:text-rose-400"
              >
                <Heart className={`h-4 w-4 ${isFavorite(channel.id) ? 'fill-rose-400 text-rose-400' : ''}`} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );

  const movieCards = (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {movies.map((movie) => (
        <article key={movie.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/30 hover:shadow-[0_18px_44px_rgba(0,0,0,0.45)]">
          <button type="button" onClick={() => playMovie(movie)} className="group relative aspect-[2/3] w-full bg-black/40">
            {movie.poster
              ? <img src={movie.poster} alt="" loading="lazy" className="h-full w-full object-cover" />
              : <Film className="mx-auto h-full w-9 text-slate-600" />}
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Play className="h-8 w-8 fill-white" />
            </span>
          </button>
          <div className="p-3">
            <h3 className="truncate text-sm font-semibold text-white">{movie.officialTitle}</h3>
            {movie.category && <p className="truncate text-xs text-slate-400">{movie.category}</p>}
            {movie.rating && <p className="mt-1 text-xs text-amber-300">{movie.rating}</p>}
          </div>
        </article>
      ))}
    </div>
  );

  const seriesCards = (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {series.map((show) => (
        <article key={show.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/30 hover:shadow-[0_18px_44px_rgba(0,0,0,0.45)]">
          <div className="aspect-[2/3] bg-black/40">
            {show.poster
              ? <img src={show.poster} alt="" loading="lazy" className="h-full w-full object-cover" />
              : <Film className="mx-auto h-full w-9 text-slate-600" />}
          </div>
          <div className="p-3">
            <h3 className="truncate text-sm font-semibold text-white">{show.title}</h3>
            {show.category && <p className="truncate text-xs text-slate-400">{show.category}</p>}
            {show.rating && <p className="mt-1 text-xs text-amber-300">{show.rating}</p>}
          </div>
        </article>
      ))}
    </div>
  );

  return (
    <main className={`min-h-screen bg-[#07090f] text-slate-100 ${isSmartTVMode ? 'text-base' : ''}`}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090b14]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Tv className="h-5 w-5 text-amber-400" />
            PLAYBEAT <span className="text-amber-400">TV</span>
          </div>
          <nav className="flex items-center gap-1" aria-label="Catalog">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${tab === item.id ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-white/5'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {(tab === 'home' || tab === 'live') && (
              <label className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setChannelPage(1);
                  }}
                  placeholder="Search channels"
                  className="w-36 rounded-lg border border-white/10 bg-slate-900 py-2 pl-8 pr-2 text-xs text-white outline-none focus:border-amber-500 sm:w-48"
                />
              </label>
            )}
            <button
              type="button"
              onClick={toggleSmartTVMode}
              className={`flex items-center gap-1 rounded-lg border px-2 py-2 text-xs ${isSmartTVMode ? 'border-amber-400 text-amber-300' : 'border-white/10 text-slate-300'}`}
              aria-pressed={isSmartTVMode}
            >
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">TV mode</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
        {error && (
          <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {tab === 'home' && (
          <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c101c] shadow-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_24%,rgba(245,158,11,0.25),transparent_36%),radial-gradient(ellipse_at_15%_85%,rgba(38,60,104,0.55),transparent_55%)]" />
            <div className="pointer-events-none absolute right-[-9%] top-[-28%] h-96 w-96 rounded-full border border-amber-400/15" />
            <div className="relative flex min-h-[340px] flex-col justify-center gap-6 px-6 py-10 sm:min-h-[410px] sm:px-12">
              <div className="flex w-fit items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">
                <Sparkles className="h-3.5 w-3.5" /> PlayBeat Entertainment
              </div>
              <div className="max-w-2xl">
                <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-6xl">
                  Entertainment <span className="bg-gradient-to-r from-amber-300 to-orange-500 bg-clip-text text-transparent">without limits.</span>
                </h1>
                <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                  Discover your available live channels, movies and web series in one premium viewing experience. Choose a title and start watching.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setTab('live')} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300">
                  <Radio className="h-4 w-4" /> Explore live TV <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setTab('movies')} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">
                  <Clapperboard className="h-4 w-4" /> Browse movies
                </button>
              </div>
              <div className="flex flex-wrap gap-x-7 gap-y-2 border-t border-white/10 pt-5 text-xs text-slate-300">
                <span><strong className="text-white">{(stats?.totalChannels ?? 0).toLocaleString()}</strong> channels</span>
                <span><strong className="text-white">{(stats?.totalMovies ?? 0).toLocaleString()}</strong> movies</span>
                <span><strong className="text-white">{(stats?.totalSeries ?? 0).toLocaleString()}</strong> series</span>
                <span className="text-slate-500">{stats?.syncedAt ? 'Catalog updated ' + new Date(stats.syncedAt).toLocaleDateString() : 'Catalog sync pending'}</span>
              </div>
            </div>
          </section>
        )}
        {tab === 'home' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Live Channels', icon: Tv, target: 'live' as Tab, description: 'Watch live' },
              { label: 'Movies', icon: Film, target: 'movies' as Tab, description: 'Explore films' },
              { label: 'Web Series', icon: Clapperboard, target: 'series' as Tab, description: 'Discover series' },
              { label: 'Music & More', icon: Music2, target: 'live' as Tab, description: 'Browse available channels' },
            ].map((item) => (
              <button key={item.label} type="button" onClick={() => setTab(item.target)} className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-amber-400/35 hover:bg-white/[0.07]">
                <span className="rounded-xl bg-amber-400/10 p-3 text-amber-300"><item.icon className="h-5 w-5" /></span>
                <span><strong className="block text-sm text-white">{item.label}</strong><small className="text-slate-400">{item.description}</small></span>
              </button>
            ))}
          </div>
        )}

        {(tab === 'home' || tab === 'live') && (
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold tracking-tight text-white">Live TV</h2>
            {channels.length ? channelCards : <p className="text-sm text-slate-400">No live channels are available in the current catalog.</p>}
            <PaginationControls page={channelPage} total={channelTotal} onChange={setChannelPage} />
          </section>
        )}

        {tab === 'movies' && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white">Movies</h2>
            {movies.length ? movieCards : <p className="text-sm text-slate-400">No movies are available in the current catalog.</p>}
            <PaginationControls page={moviePage} total={movieTotal} onChange={setMoviePage} />
          </section>
        )}

        {tab === 'series' && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white">Series</h2>
            {series.length ? seriesCards : <p className="text-sm text-slate-400">No series are available in the current catalog.</p>}
            <PaginationControls page={seriesPage} total={seriesTotal} onChange={setSeriesPage} />
          </section>
        )}
      </div>
    </main>
  );
};
