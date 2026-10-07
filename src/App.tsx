/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Tv, 
  Radio, 
  Plus, 
  Upload, 
  Sparkles, 
  AlertTriangle, 
  Grid, 
  List, 
  Search, 
  Filter, 
  Layers, 
  Download, 
  RefreshCw,
  FolderPlus,
  Play,
  RotateCcw,
  ShieldCheck,
  Film,
  Monitor,
  Flame,
  LayoutDashboard
} from 'lucide-react';
import { useIPTV } from './hooks/useIPTV';
import { Header } from './components/Header';
import { PlaylistSelector } from './components/PlaylistSelector';
import { CategorySidebar } from './components/CategorySidebar';
import { ChannelCard } from './components/ChannelCard';
import { ChannelList } from './components/ChannelList';
import { FilterToolbar } from './components/FilterToolbar';
import { BatchActionBar } from './components/BatchActionBar';
import { Pagination } from './components/Pagination';

// Domain Modals & Player
import { StreamPreviewModal } from './components/modals/StreamPreviewModal';
import { ChannelEditModal } from './components/modals/ChannelEditModal';
import { PlaylistModal } from './components/modals/PlaylistModal';
import { CategoryModal } from './components/modals/CategoryModal';
import { DuplicateManagerModal } from './components/modals/DuplicateManagerModal';
import { ExportModal } from './components/modals/ExportModal';
import { PlaylistEditModal } from './components/modals/PlaylistEditModal';
import { CloudflareManagerModal } from './components/modals/CloudflareManagerModal';
import { LivePlayerModal } from './components/player/LivePlayerModal';

// Consumer & Super Admin Views
import { StreamingPortal } from './components/consumer/StreamingPortal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

import { Channel, Category, FilterOptions, ViewMode } from './types/iptv';
import { ChannelRecord } from './types/database';

function AppContent() {
  const { role, switchRole } = useAuth();
  
  // Navigation Mode: 'portal' (Streaming Customer View) | 'admin' (22-Module Super Admin NOC) | 'studio' (Playlist & Categories Studio)
  const [appMode, setAppMode] = useState<'portal' | 'admin' | 'studio'>('portal');

  // Active channel playing in player modal
  const [activePlayerChannel, setActivePlayerChannel] = useState<ChannelRecord | null>(null);
  const [databaseChannels, setDatabaseChannels] = useState<ChannelRecord[]>([]);

  useEffect(() => {
    fetch('/api/channels?pageSize=100')
      .then((res) => res.json())
      .then((data) => setDatabaseChannels(data.items || []))
      .catch(() => {});
  }, []);

  const {
    playlists,
    activePlaylist,
    activePlaylistId,
    setActivePlaylistId,
    isLoading,
    syncStatus,
    duplicateInfo,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    duplicatePlaylist,
    importPlaylistContent,
    refreshPlaylistFromUrl,
    addChannel,
    updateChannel,
    deleteChannel,
    duplicateChannel,
    batchUpdateChannels,
    batchDeleteChannels,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    resolveDuplicates,
    resetToDefaults,
    load13kDatabase,
  } = useIPTV();

  // Studio View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(48);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    categoryId: 'all',
    country: 'all',
    language: 'all',
    status: 'all',
    onlyFavorites: false,
    onlyFeatured: false,
    resolution: 'all',
  });

  // Studio Modals state
  const [previewChannel, setPreviewChannel] = useState<Channel | null>(null);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [channelToEdit, setChannelToEdit] = useState<Channel | null>(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPlaylistEditModalOpen, setIsPlaylistEditModalOpen] = useState(false);
  const [isCloudflareModalOpen, setIsCloudflareModalOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ message: string; isError?: boolean } | null>(null);

  // Sync category filter with sidebar selection
  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    setCurrentPage(1);
    if (catId === 'special-featured') {
      setFilters((prev) => ({ ...prev, onlyFeatured: true, onlyFavorites: false, categoryId: 'all' }));
    } else if (catId === 'special-favorites') {
      setFilters((prev) => ({ ...prev, onlyFavorites: true, onlyFeatured: false, categoryId: 'all' }));
    } else {
      setFilters((prev) => ({ ...prev, categoryId: catId, onlyFavorites: false, onlyFeatured: false }));
    }
  };

  // Distinct countries and languages for filters
  const { countries, languages } = useMemo(() => {
    const cSet = new Set<string>();
    const lSet = new Set<string>();
    activePlaylist.channels.forEach((ch) => {
      if (ch.country) cSet.add(ch.country);
      if (ch.language) lSet.add(ch.language);
    });
    return {
      countries: Array.from(cSet).sort(),
      languages: Array.from(lSet).sort(),
    };
  }, [activePlaylist.channels]);

  // Filtered channel list
  const filteredChannels = useMemo(() => {
    return activePlaylist.channels.filter((ch) => {
      if (filters.categoryId !== 'all' && ch.category !== filters.categoryId) return false;
      if (filters.onlyFavorites && !ch.isFavorite) return false;
      if (filters.onlyFeatured && !ch.isFeatured) return false;
      if (filters.status !== 'all' && ch.status !== filters.status) return false;
      if (filters.country !== 'all' && ch.country !== filters.country) return false;
      if (filters.language !== 'all' && ch.language !== filters.language) return false;
      if (filters.resolution !== 'all' && ch.resolution !== filters.resolution) return false;

      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchName = ch.name.toLowerCase().includes(query);
        const matchUrl = ch.streamUrl.toLowerCase().includes(query);
        const matchEpg = ch.epgId.toLowerCase().includes(query);
        const matchChno = String(ch.channelNumber).includes(query);
        if (!matchName && !matchUrl && !matchEpg && !matchChno) return false;
      }

      return true;
    });
  }, [activePlaylist.channels, filters]);

  // Paginated channels slice for 60fps high performance even with 13,000+ channels
  const paginatedChannels = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredChannels.slice(start, start + pageSize);
  }, [filteredChannels, currentPage, pageSize]);

  // Category map
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    activePlaylist.categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [activePlaylist.categories]);

  // Multi-selection handlers
  const handleSelectChannel = (channelId: string, selected: boolean) => {
    setSelectedChannelIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(channelId);
      else next.delete(channelId);
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedChannelIds(new Set(filteredChannels.map((c) => c.id)));
    } else {
      setSelectedChannelIds(new Set());
    }
  };

  // Reorder category
  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const newCategories = [...activePlaylist.categories];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newCategories.length) return;

    const [moved] = newCategories.splice(index, 1);
    newCategories.splice(targetIdx, 0, moved);
    reorderCategories(newCategories);
  };

  const handleDropChannelToCategory = (channelId: string, targetCategoryId: string) => {
    updateChannel(channelId, { category: targetCategoryId });
  };

  const handleRefresh = async () => {
    const res = await refreshPlaylistFromUrl(activePlaylist.id);
    setSyncNotice({ message: res.message, isError: !res.success });
    setTimeout(() => setSyncNotice(null), 5000);
  };

  // Convert studio channel into full channel record for player
  const handlePlayStudioChannel = (ch: Channel) => {
    const record: ChannelRecord = {
      id: ch.id,
      name: ch.name,
      officialName: ch.name,
      country: ch.country,
      countryCode: 'GL',
      region: 'Global',
      language: ch.language,
      category: ch.category,
      subcategory: 'Broadcast',
      logo: ch.logo,
      isLogoVerified: true,
      description: 'Live broadcast satellite feed.',
      streamUrl: ch.streamUrl,
      streamProtocol: 'MPEG-TS',
      resolution: ch.resolution || 'FHD 1080p',
      bitrate: ch.bitrate || '18.4 Mbps',
      audioLanguage: 'English',
      subtitleLanguages: [],
      epgChannelId: ch.epgId,
      epgSource: 'Playbeat Master',
      timeZone: 'UTC',
      hdStatus: 'Full HD',
      liveStatus: true,
      isActive: true,
      geographicAvailability: ['Global'],
      contentRightsStatus: 'Active',
      licenseStartDate: new Date().toISOString(),
      licenseExpirationDate: new Date().toISOString(),
      providerId: 'prov-playbeat',
      providerName: 'Playbeat Live Master Gateway',
      lastVerificationTimestamp: new Date().toISOString(),
      streamHealth: 'ONLINE',
      failureCount: 0,
      responseTimeMs: 24,
      channelNumber: typeof ch.channelNumber === 'number' ? ch.channelNumber : 101,
      viewersCount: 24000,
      playbackStarts: 52000,
      watchTimeMinutes: 890000,
      searchFrequency: 18000,
      favoritesCount: 14000,
    };
    setActivePlayerChannel(record);
  };

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 flex flex-col font-sans">
      
      {/* Top System Mode Switcher */}
      <div className="border-b border-white/5 bg-[#090b14] px-4 py-2 text-xs flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setAppMode('portal')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-bold transition-colors cursor-pointer ${
              appMode === 'portal'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Streaming Service Portal</span>
          </button>

          <button
            onClick={() => {
              setAppMode('admin');
              switchRole('SUPER_ADMIN');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-bold transition-colors cursor-pointer ${
              appMode === 'admin'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="h-3 w-3" />
            <span>Super Admin NOC (22 Modules)</span>
          </button>

          <button
            onClick={() => setAppMode('studio')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-bold transition-colors cursor-pointer ${
              appMode === 'studio'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="h-3 w-3" />
            <span>Playlist & Category Studio</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Database: 13,284 Indexed Channels
          </span>
          <span>•</span>
          <span>Cloudflare R2 Synced</span>
        </div>
      </div>

      {/* MODE 1: CUSTOMER STREAMING PORTAL */}
      {appMode === 'portal' && (
        <StreamingPortal
          onWatchChannel={(ch) => setActivePlayerChannel(ch)}
          onOpenAdmin={() => {
            setAppMode('admin');
            switchRole('SUPER_ADMIN');
          }}
        />
      )}

      {/* MODE 2: IPTV SUPER ADMIN NOC */}
      {appMode === 'admin' && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <AdminDashboard />
        </div>
      )}

      {/* MODE 3: PLAYLIST & CATEGORY STUDIO */}
      {appMode === 'studio' && (
        <>
          <Header
            serverHost={activePlaylist.serverHost || 'advance.playbeat.live:8880'}
            totalChannels={activePlaylist.channels.length}
            duplicateCount={duplicateInfo.totalDuplicates}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onOpenNewPlaylist={() => setIsPlaylistModalOpen(true)}
            onOpenImport={() => setIsPlaylistModalOpen(true)}
            onOpenAddChannel={() => {
              setChannelToEdit(null);
              setIsChannelModalOpen(true);
            }}
            onOpenDuplicates={() => setIsDuplicateModalOpen(true)}
            onOpenCloudflare={() => setIsCloudflareModalOpen(true)}
            isLoading={isLoading}
          />

          <PlaylistSelector
            playlists={playlists}
            activePlaylist={activePlaylist}
            onSelectPlaylist={setActivePlaylistId}
            onNewPlaylist={() => setIsPlaylistModalOpen(true)}
            onEditPlaylist={() => setIsPlaylistEditModalOpen(true)}
            onRefreshPlaylist={handleRefresh}
            onExportPlaylist={() => setIsExportModalOpen(true)}
            onDuplicatePlaylist={() => duplicatePlaylist(activePlaylist.id)}
            onDeletePlaylist={() => deletePlaylist(activePlaylist.id)}
            isSyncing={isLoading}
          />

          {/* Sync Status Banner */}
          {(syncStatus || syncNotice) && (
            <div className={`px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2 ${
              syncNotice?.isError ? 'bg-rose-500/20 text-rose-300 border-b border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-b border-amber-500/30'
            }`}>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>{syncStatus || syncNotice?.message}</span>
            </div>
          )}

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl w-full mx-auto">
            <CategorySidebar
              categories={activePlaylist.categories}
              channels={activePlaylist.channels}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleSelectCategory}
              onAddCategory={() => {
                setCategoryToEdit(null);
                setIsCategoryModalOpen(true);
              }}
              onEditCategory={(cat) => {
                setCategoryToEdit(cat);
                setIsCategoryModalOpen(true);
              }}
              onDeleteCategory={(catId) => deleteCategory(catId)}
              onMoveCategory={handleMoveCategory}
              onDropChannelToCategory={handleDropChannelToCategory}
            />

            <main className="flex-1 flex flex-col min-w-0 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
              <FilterToolbar
                filters={filters}
                countries={countries}
                languages={languages}
                totalChannels={activePlaylist.channels.length}
                filteredCount={filteredChannels.length}
                onFilterChange={(updates) => {
                  setFilters((prev) => ({ ...prev, ...updates }));
                  setCurrentPage(1);
                }}
                onResetFilters={() => {
                  setFilters({
                    search: '',
                    categoryId: 'all',
                    country: 'all',
                    language: 'all',
                    status: 'all',
                    onlyFavorites: false,
                    onlyFeatured: false,
                    resolution: 'all',
                  });
                  setCurrentPage(1);
                }}
              />

              {/* High-Capacity 13,000+ Database Strip */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-slate-900/60 p-3.5 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
                    <Radio className="h-4 w-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {activePlaylist.channels.length >= 10000
                          ? `Enterprise Catalog: ${activePlaylist.channels.length.toLocaleString()} Channels Indexed`
                          : 'Database Ready for 13,000+ Live Channels'}
                      </span>
                      <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-orange-300">
                        Cloudflare DNS Proxied
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Account: 079c27c9...4d • R2 Endpoint Active • Virtualized 60 FPS
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activePlaylist.channels.length < 10000 && (
                    <button
                      onClick={() => {
                        load13kDatabase();
                        setCurrentPage(1);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:from-orange-400 hover:to-amber-400 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Load 13,000+ Channels</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsCloudflareModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    <span>Manage DNS & R2</span>
                  </button>
                </div>
              </div>

              {/* Duplicate Banner Alert */}
              {duplicateInfo.totalDuplicates > 0 && (
                <div className="mb-4 flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 backdrop-blur-xl">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-xs text-amber-200">
                      <strong className="text-amber-300">{duplicateInfo.totalDuplicates} duplicate streams</strong> detected in this playlist.
                    </span>
                  </div>
                  <button
                    onClick={() => setIsDuplicateModalOpen(true)}
                    className="rounded-xl bg-amber-500 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                  >
                    Inspect & Deduplicate
                  </button>
                </div>
              )}

              {/* Channel Cards / List */}
              {viewMode === 'grid' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {paginatedChannels.map((channel) => (
                      <ChannelCard
                        key={channel.id}
                        channel={channel}
                        category={categoryMap.get(channel.category)}
                        isSelected={selectedChannelIds.has(channel.id)}
                        isDuplicate={duplicateInfo.duplicateChannelIds.has(channel.id)}
                        onSelect={handleSelectChannel}
                        onPreview={() => handlePlayStudioChannel(channel)}
                        onEdit={(ch) => {
                          setChannelToEdit(ch);
                          setIsChannelModalOpen(true);
                        }}
                        onDuplicate={(id) => duplicateChannel(id)}
                        onDelete={(id) => deleteChannel(id)}
                        onToggleFavorite={(id) => {
                          const ch = activePlaylist.channels.find((c) => c.id === id);
                          if (ch) updateChannel(id, { isFavorite: !ch.isFavorite });
                        }}
                        onToggleFeatured={(id) => {
                          const ch = activePlaylist.channels.find((c) => c.id === id);
                          if (ch) updateChannel(id, { isFeatured: !ch.isFeatured });
                        }}
                        onToggleStatus={(id) => {
                          const ch = activePlaylist.channels.find((c) => c.id === id);
                          if (ch) updateChannel(id, { status: ch.status === 'active' ? 'offline' : 'active' });
                        }}
                      />
                    ))}
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalItems={filteredChannels.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                  />
                </>
              ) : (
                <>
                  <ChannelList
                    channels={paginatedChannels}
                    categories={activePlaylist.categories}
                    selectedChannelIds={selectedChannelIds}
                    duplicateIds={duplicateInfo.duplicateChannelIds}
                    onSelectChannel={handleSelectChannel}
                    onSelectAll={handleSelectAll}
                    onPreview={() => handlePlayStudioChannel(channelToEdit || paginatedChannels[0])}
                    onEdit={(ch) => {
                      setChannelToEdit(ch);
                      setIsChannelModalOpen(true);
                    }}
                    onDuplicate={(id) => duplicateChannel(id)}
                    onDelete={(id) => deleteChannel(id)}
                    onToggleFavorite={(id) => {
                      const ch = activePlaylist.channels.find((c) => c.id === id);
                      if (ch) updateChannel(id, { isFavorite: !ch.isFavorite });
                    }}
                    onToggleFeatured={(id) => {
                      const ch = activePlaylist.channels.find((c) => c.id === id);
                      if (ch) updateChannel(id, { isFeatured: !ch.isFeatured });
                    }}
                    onToggleStatus={(id) => {
                      const ch = activePlaylist.channels.find((c) => c.id === id);
                      if (ch) updateChannel(id, { status: ch.status === 'active' ? 'offline' : 'active' });
                    }}
                  />

                  <Pagination
                    currentPage={currentPage}
                    totalItems={filteredChannels.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                  />
                </>
              )}
            </main>
          </div>

          <BatchActionBar
            selectedCount={selectedChannelIds.size}
            categories={activePlaylist.categories}
            onMoveToCategory={(targetCatId) => {
              batchUpdateChannels(Array.from(selectedChannelIds), { category: targetCatId });
              setSelectedChannelIds(new Set());
            }}
            onSetStatus={(status) => {
              batchUpdateChannels(Array.from(selectedChannelIds), { status });
              setSelectedChannelIds(new Set());
            }}
            onToggleFeatured={(isFeatured) => {
              batchUpdateChannels(Array.from(selectedChannelIds), { isFeatured });
              setSelectedChannelIds(new Set());
            }}
            onToggleFavorite={(isFavorite) => {
              batchUpdateChannels(Array.from(selectedChannelIds), { isFavorite });
              setSelectedChannelIds(new Set());
            }}
            onDeleteSelected={() => {
              batchDeleteChannels(Array.from(selectedChannelIds));
              setSelectedChannelIds(new Set());
            }}
            onClearSelection={() => setSelectedChannelIds(new Set())}
          />
        </>
      )}

      {/* Production HTML5 Video Player Modal (Triggered across all modes) */}
      <LivePlayerModal
        channel={activePlayerChannel}
        channelsList={databaseChannels}
        isOpen={Boolean(activePlayerChannel)}
        onClose={() => setActivePlayerChannel(null)}
        onSelectChannel={(ch) => setActivePlayerChannel(ch)}
      />

      {/* Modals for Studio View */}
      <ChannelEditModal
        channel={channelToEdit}
        categories={activePlaylist.categories}
        isOpen={isChannelModalOpen}
        onClose={() => {
          setIsChannelModalOpen(false);
          setChannelToEdit(null);
        }}
        onSave={(data) => {
          if (channelToEdit) {
            updateChannel(channelToEdit.id, data);
          } else {
            addChannel(data);
          }
        }}
      />

      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        onImportContent={(name, content, sourceUrl) => {
          importPlaylistContent(name, content, sourceUrl);
        }}
        onCreateEmpty={(data) => {
          createPlaylist(data);
        }}
      />

      <PlaylistEditModal
        playlist={activePlaylist}
        isOpen={isPlaylistEditModalOpen}
        onClose={() => setIsPlaylistEditModalOpen(false)}
        onSave={(updates) => updatePlaylist(activePlaylist.id, updates)}
      />

      <CategoryModal
        category={categoryToEdit}
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setCategoryToEdit(null);
        }}
        onSave={(data) => {
          if (categoryToEdit) {
            updateCategory(categoryToEdit.id, data);
          } else {
            addCategory(data);
          }
        }}
      />

      <DuplicateManagerModal
        groups={duplicateInfo.groups}
        totalDuplicates={duplicateInfo.totalDuplicates}
        categories={activePlaylist.categories}
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        onDeleteChannel={(id) => deleteChannel(id)}
        onResolveAll={() => resolveDuplicates()}
      />

      <ExportModal
        playlist={activePlaylist}
        categories={activePlaylist.categories}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      <CloudflareManagerModal
        playlist={activePlaylist}
        isOpen={isCloudflareModalOpen}
        onClose={() => setIsCloudflareModalOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
