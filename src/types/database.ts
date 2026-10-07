/**
 * Comprehensive Domain Types for IPTV Scalable Database (13,000+ Channels)
 */

export type StreamProtocol = 'HLS' | 'DASH' | 'MPEG-TS' | 'RTMP';
export type StreamResolution = '4K HDR' | '4K UHD' | 'FHD 1080p' | 'HD 720p' | 'SD';
export type StreamHealthStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNVERIFIED';
export type RightsStatus = 'Active' | 'Pending' | 'Verified' | 'Expiring Soon' | 'Expired' | 'Restricted' | 'Suspended';
export type LicenseStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'PENDING';
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'CUSTOMER';

export interface ChannelRecord {
  id: string; // Channel ID
  name: string; // Display channel name
  officialName: string; // Verified official broadcaster name
  country: string; // e.g. 'United States', 'Pakistan', 'United Kingdom'
  countryCode: string; // e.g. 'US', 'PK', 'GB', 'IN', 'AE'
  region: string; // e.g. 'North America', 'South Asia', 'Europe', 'Middle East'
  language: string; // e.g. 'English', 'Urdu', 'Hindi', 'Arabic'
  category: string; // e.g. 'Sports', 'News', 'Movies', 'Entertainment'
  subcategory: string; // e.g. 'Cricket', 'Breaking News', 'Action', 'Drama'
  logo: string; // Verified channel logo URL
  isLogoVerified: boolean; // Must correspond to verified channel
  banner?: string; // High-res channel backdrop
  description: string;
  streamUrl: string; // Primary licensed stream
  backupStreamUrl?: string; // Secondary failover stream
  streamProtocol: StreamProtocol;
  resolution: StreamResolution;
  bitrate: string; // e.g. '18.4 Mbps', '8.2 Mbps'
  audioLanguage: string;
  subtitleLanguages: string[]; // e.g. ['English', 'Spanish']
  epgChannelId: string; // tvg-id
  epgSource: string; // Provider or XMLTV source
  currentProgram?: string;
  nextProgram?: string;
  programStartTime?: string; // ISO-8601
  programEndTime?: string; // ISO-8601
  timeZone: string; // e.g. 'UTC', 'GMT', 'PKT', 'EST'
  hdStatus: '4K' | 'Full HD' | 'HD' | 'SD';
  liveStatus: boolean; // currently on air
  isActive: boolean; // active/inactive administrative status
  geographicAvailability: string[]; // ['Global'] or ISO country codes ['US', 'CA']
  contentRightsStatus: RightsStatus;
  licenseStartDate: string; // ISO-8601
  licenseExpirationDate: string; // ISO-8601
  providerId: string; // References ProviderRecord
  providerName: string;
  lastVerificationTimestamp: string;
  streamHealth: StreamHealthStatus;
  lastSuccessfulPlayback?: string;
  failureCount: number;
  responseTimeMs: number;
  channelNumber: number;
  
  // Real Metrics for Hot Live TV ranking
  viewersCount: number;
  playbackStarts: number;
  watchTimeMinutes: number;
  searchFrequency: number;
  favoritesCount: number;
  isFeatured?: boolean;
}

export interface ProviderRecord {
  id: string;
  name: string;
  apiFeedUrl: string;
  authConfig: {
    type: 'BEARER' | 'API_KEY' | 'BASIC' | 'NONE';
    tokenMasked?: string;
    headerName?: string;
  };
  playlistSourceUrl: string;
  epgSourceUrl: string;
  metadataSourceUrl: string;
  countryCoverage: string[];
  rightsDocumentation: string; // Agreement ref e.g. 'AGR-2026-PB-889'
  licenseStatus: LicenseStatus;
  licenseStartDate: string;
  licenseExpiryDate: string;
  contactInfo: {
    name: string;
    email: string;
    phone: string;
    supportUrl?: string;
  };
  sourcePriority: number; // 1 = Highest
  backupSourceUrl?: string;
  healthStatus: StreamHealthStatus;
  totalChannelsProvided: number;
  activeChannelsCount: number;
}

export interface EPGProgram {
  id: string;
  channelId: string;
  title: string;
  description: string;
  poster?: string;
  startTime: string; // ISO-8601
  endTime: string; // ISO-8601
  durationMinutes: number;
  genre: string;
  country: string;
  language: string;
  rating?: string; // e.g. 'TV-14', 'PG-13'
}

export interface MovieRecord {
  id: string;
  officialTitle: string;
  originalTitle: string;
  poster: string;
  backdrop: string;
  trailerUrl?: string;
  description: string;
  releaseYear: number;
  runtimeMinutes: number;
  genre: string[];
  country: string;
  language: string;
  audioLanguages: string[];
  subtitleLanguages: string[];
  cast: string[];
  director: string;
  rating: string;
  contentProvider: string;
  rightsStatus: RightsStatus;
  licenseTerritory: string[];
  licenseStart: string;
  licenseExpiry: string;
  streamUrl: string;
  downloadRestriction: boolean;
  drmStatus: 'CLEAR_KEY' | 'WIDEVINE' | 'FAIRPLAY' | 'NONE';
  quality: StreamResolution;
  viewersCount: number;
}

export interface EpisodeRecord {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description: string;
  thumbnail: string;
  durationMinutes: number;
  releaseDate: string;
  audioLanguages: string[];
  subtitles: string[];
  playbackUrl: string;
  rightsStatus: RightsStatus;
}

export interface SeasonRecord {
  seasonNumber: number;
  title: string;
  episodesCount: number;
  episodes: EpisodeRecord[];
}

export interface WebSeriesRecord {
  id: string;
  title: string;
  genre: string[];
  poster: string;
  backdrop: string;
  synopsis: string;
  country: string;
  language: string;
  seasons: SeasonRecord[];
  totalSeasons: number;
  totalEpisodes: number;
  cast: string[];
  rating: string;
  rightsStatus: RightsStatus;
  licenseTerritory: string[];
  licenseExpiry: string;
  viewersCount: number;
}

export interface DramaRecord {
  id: string;
  title: string;
  regionalType: 'Pakistani Drama' | 'Indian Drama' | 'Turkish Drama' | 'Korean Drama' | 'Arabic Drama' | 'International Drama';
  poster: string;
  backdrop: string;
  synopsis: string;
  cast: string[];
  language: string;
  subtitles: string[];
  releaseDate: string;
  rightsStatus: RightsStatus;
  episodesCount: number;
  episodes: EpisodeRecord[];
  viewersCount: number;
  rating: string;
}

export interface MusicTrackRecord {
  id: string;
  title: string;
  artist: string;
  genre: 'Music TV' | 'Pop' | 'Rock' | 'Classical' | 'Electronic' | 'Hip-Hop' | 'Bollywood' | 'Pakistani' | 'Arabic' | 'Turkish' | 'K-Pop' | 'International';
  type: 'CHANNEL' | 'VIDEO';
  thumbnail: string;
  streamUrl: string;
  duration?: string;
  resolution: StreamResolution;
  rightsStatus: RightsStatus;
}

export interface SportsEventRecord {
  id: string;
  title: string;
  sport: 'Football' | 'Cricket' | 'Tennis' | 'Basketball' | 'Motorsport' | 'Golf' | 'Boxing' | 'MMA' | 'Athletics' | 'Other';
  status: 'LIVE' | 'UPCOMING' | 'FINISHED';
  tournament: string;
  teams: [string, string];
  score?: string;
  startTime: string;
  channelId: string;
  channelName: string;
  streamUrl: string;
  rightsStatus: RightsStatus;
  thumbnail: string;
}

export interface NewsBulletinRecord {
  id: string;
  headline: string;
  category: 'World' | 'Pakistan' | 'India' | 'Middle East' | 'Business' | 'Technology' | 'Finance' | 'Weather';
  status: 'LIVE NOW' | 'BREAKING' | 'LATEST';
  channelId: string;
  channelName: string;
  streamUrl: string;
  timestamp: string;
  summary: string;
  thumbnail: string;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  favorites: string[]; // Channel IDs
  watchHistory: {
    contentId: string;
    contentType: 'channel' | 'movie' | 'series' | 'drama';
    title: string;
    watchedAt: string;
  }[];
  devices: {
    id: string;
    name: string;
    type: 'Smart TV' | 'Desktop' | 'Mobile' | 'Tablet';
    lastActive: string;
  }[];
  subscriptionTier: 'ENTERPRISE_VIP' | 'PREMIUM_4K' | 'STANDARD';
  parentalControlPin?: string;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: 'CHANNEL' | 'PROVIDER' | 'RIGHTS' | 'IMPORT' | 'SYSTEM';
  entityId: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export interface ImportPipelineResult {
  importBatchId: string;
  sourceType: string;
  sourceName: string;
  totalParsed: number;
  validRecords: number;
  duplicateCount: number;
  invalidCount: number;
  pendingVerificationCount: number;
  matchedLogoCount: number;
  matchedEpgCount: number;
  rightsMissingCount: number;
  streamOfflineCount: number;
  records: {
    stage: 'VALIDATE' | 'NORMALIZE' | 'DEDUPLICATE' | 'METADATA_ENRICH' | 'VERIFY_STREAM' | 'CHECK_RIGHTS' | 'PENDING_REVIEW' | 'PUBLISHED';
    channel: ChannelRecord;
    warnings: string[];
    errors: string[];
    isApproved: boolean;
  }[];
}
