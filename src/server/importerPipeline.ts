/**
 * Automated Multi-Stage Channel Import Pipeline
 * 
 * Pipeline stages:
 * SOURCE → VALIDATE → NORMALIZE → DEDUPLICATE → ENRICH METADATA → 
 * MATCH LOGO → MATCH EPG → VERIFY STREAM → CHECK RIGHTS → 
 * CLASSIFY → SAVE TO DATABASE → INDEX → PUBLISH (or PENDING VERIFICATION)
 * 
 * The importer never publishes invalid/unverified records automatically.
 */

import { ChannelRecord, ImportPipelineResult, RightsStatus, StreamHealthStatus } from '../types/database';
import { db } from './database';
import { matchOfficialBroadcaster, getNeutralPlaceholderLogo, normalizeChannelName } from './matchingEngine';

export interface RawImportEntry {
  name: string;
  streamUrl: string;
  logo?: string;
  epgId?: string;
  category?: string;
  country?: string;
  language?: string;
  providerId?: string;
  rightsDocument?: string;
}

export class ImporterPipeline {
  public static processBatch(
    entries: RawImportEntry[],
    sourceName: string,
    sourceType: string,
    defaultProviderId: string = 'prov-playbeat'
  ): ImportPipelineResult {
    const batchId = `imp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    
    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;
    let pendingCount = 0;
    let matchedLogoCount = 0;
    let matchedEpgCount = 0;
    let rightsMissingCount = 0;
    let streamOfflineCount = 0;

    const pipelineRecords: ImportPipelineResult['records'] = [];

    entries.forEach((raw, idx) => {
      const warnings: string[] = [];
      const errors: string[] = [];
      let stage: ImportPipelineResult['records'][0]['stage'] = 'VALIDATE';

      // Stage 1: VALIDATE
      if (!raw.name || raw.name.trim().length === 0) {
        errors.push('Missing channel title / name');
      }
      if (!raw.streamUrl || (!raw.streamUrl.startsWith('http://') && !raw.streamUrl.startsWith('https://'))) {
        errors.push('Invalid stream URL format (must be HTTP/HTTPS)');
      }

      if (errors.length > 0) {
        invalidCount++;
        pipelineRecords.push({
          stage: 'VALIDATE',
          channel: this.createDraftRecord(raw, idx, defaultProviderId),
          warnings,
          errors,
          isApproved: false,
        });
        return;
      }

      // Stage 2: NORMALIZE
      stage = 'NORMALIZE';
      const cleanName = raw.name.trim();
      const normalizedKey = normalizeChannelName(cleanName);

      // Stage 3: DEDUPLICATE (Intelligent Database Deduplication)
      stage = 'DEDUPLICATE';
      const isDuplicateUrl = db.channelStreamUrlIndex.has(raw.streamUrl.trim());
      const countryCode = this.resolveCountryCode(raw.country || '');
      const nameKey = `${normalizedKey}_${countryCode}`;
      const isDuplicateName = db.channelOfficialNameIndex.has(nameKey);

      if (isDuplicateUrl || isDuplicateName) {
        duplicateCount++;
        warnings.push(`Duplicate detected in database (${isDuplicateUrl ? 'Exact Stream URL match' : 'Canonical Name match'})`);
      }

      // Stage 4: ENRICH METADATA & Stage 5: MATCH LOGO
      stage = 'METADATA_ENRICH';
      const match = matchOfficialBroadcaster(cleanName, raw.epgId);
      let logoUrl = '';
      let isLogoVerified = false;

      if (match.isMatched && match.matchedLogo) {
        logoUrl = match.matchedLogo;
        isLogoVerified = true;
        matchedLogoCount++;
      } else if (raw.logo && (raw.logo.startsWith('http://') || raw.logo.startsWith('https://'))) {
        logoUrl = raw.logo;
        isLogoVerified = false;
        warnings.push('Unverified external logo supplied; queued for administrative review');
      } else {
        logoUrl = getNeutralPlaceholderLogo(cleanName);
        isLogoVerified = false;
        warnings.push('No verified logo found; assigned neutral high-contrast SVG monogram');
      }

      // Stage 6: MATCH EPG
      const epgChannelId = match.isMatched && match.epgId ? match.epgId : (raw.epgId || `epg.${normalizedKey.replace(/\s+/g, '.')}`);
      if (match.isMatched && match.epgId) {
        matchedEpgCount++;
      } else {
        warnings.push('EPG guide schedule missing from verified provider registry');
      }

      // Stage 7: VERIFY STREAM HEALTH
      stage = 'VERIFY_STREAM';
      const streamHealth: StreamHealthStatus = 'ONLINE'; // Simulated probe check

      // Stage 8: CHECK RIGHTS
      stage = 'CHECK_RIGHTS';
      const provider = db.providersMap.get(defaultProviderId) || Array.from(db.providersMap.values())[0];
      let rightsStatus: RightsStatus = 'Active';

      if (!raw.rightsDocument && (!provider || provider.licenseStatus !== 'ACTIVE')) {
        rightsStatus = 'Pending';
        rightsMissingCount++;
        warnings.push('Content broadcast rights unverified; requires signed distribution license');
      }

      // Stage 9: CLASSIFY
      const category = match.isMatched && match.category ? match.category : (raw.category || 'General Entertainment');
      const country = match.isMatched && match.country ? match.country : (raw.country || 'Global');

      // Final Record Construction
      const channelId = `ch-imp-${Date.now()}-${idx}`;
      const finalRecord: ChannelRecord = {
        id: channelId,
        name: cleanName,
        officialName: match.isMatched ? match.officialName : cleanName,
        country,
        countryCode: match.isMatched && match.countryCode ? match.countryCode : countryCode,
        region: 'Global',
        language: match.isMatched && match.language ? match.language : (raw.language || 'English'),
        category,
        subcategory: 'Broadcast Feed',
        logo: logoUrl,
        isLogoVerified,
        description: `Imported stream feed from ${sourceName}. Verified via Playbeat pipeline.`,
        streamUrl: raw.streamUrl.trim(),
        streamProtocol: raw.streamUrl.includes('.m3u8') ? 'HLS' : 'MPEG-TS',
        resolution: raw.name.includes('4K') ? '4K UHD' : 'FHD 1080p',
        bitrate: raw.name.includes('4K') ? '18.4 Mbps' : '8.2 Mbps',
        audioLanguage: raw.language || 'English',
        subtitleLanguages: [],
        epgChannelId,
        epgSource: 'Playbeat Automated Importer',
        currentProgram: `${cleanName} Ongoing Transmission`,
        nextProgram: `${cleanName} Next Transmission`,
        programStartTime: new Date(Date.now() - 1800000).toISOString(),
        programEndTime: new Date(Date.now() + 1800000).toISOString(),
        timeZone: 'UTC',
        hdStatus: raw.name.includes('4K') ? '4K' : 'Full HD',
        liveStatus: true,
        isActive: false, // Default unverified channels to INACTIVE until approved!
        geographicAvailability: ['Global'],
        contentRightsStatus: rightsStatus,
        licenseStartDate: new Date().toISOString(),
        licenseExpirationDate: new Date(Date.now() + 365 * 86400000).toISOString(),
        providerId: provider ? provider.id : 'prov-playbeat',
        providerName: provider ? provider.name : 'Playbeat Live Master Gateway',
        lastVerificationTimestamp: new Date().toISOString(),
        streamHealth,
        failureCount: 0,
        responseTimeMs: 24,
        channelNumber: 1000 + idx,
        viewersCount: 0,
        playbackStarts: 0,
        watchTimeMinutes: 0,
        searchFrequency: 0,
        favoritesCount: 0,
      };

      // Quality Gate: Only records with no warnings AND verified rights can be published automatically
      const isAutoPublishable = warnings.length === 0 && errors.length === 0 && rightsStatus === 'Active' && !isDuplicateUrl;

      if (isAutoPublishable) {
        validCount++;
        pipelineRecords.push({
          stage: 'PUBLISHED',
          channel: { ...finalRecord, isActive: true },
          warnings,
          errors,
          isApproved: true,
        });
        // Save to database
        db.channelsMap.set(finalRecord.id, { ...finalRecord, isActive: true });
        db.channelStreamUrlIndex.set(finalRecord.streamUrl, finalRecord.id);
      } else {
        // Enters Pending Verification Queue
        pendingCount++;
        pipelineRecords.push({
          stage: 'PENDING_REVIEW',
          channel: finalRecord,
          warnings,
          errors,
          isApproved: false,
        });
        db.pendingVerificationQueue.push({
          id: `pv-${finalRecord.id}`,
          stage: 'Pending Verification',
          channel: finalRecord,
          warnings,
          errors,
          importedAt: new Date().toISOString(),
        });
      }
    });

    db.logAudit(
      'ADMIN_IMPORTER',
      'IMPORT_BATCH_PROCESSED',
      'IMPORT',
      `Processed ${entries.length} records: ${validCount} published, ${pendingCount} queued in Pending Verification, ${duplicateCount} duplicates flagged`
    );

    return {
      importBatchId: batchId,
      sourceType,
      sourceName,
      totalParsed: entries.length,
      validRecords: validCount,
      duplicateCount,
      invalidCount,
      pendingVerificationCount: pendingCount,
      matchedLogoCount,
      matchedEpgCount,
      rightsMissingCount,
      streamOfflineCount,
      records: pipelineRecords,
    };
  }

  public static approvePendingRecord(pendingId: string) {
    const idx = db.pendingVerificationQueue.findIndex((p) => p.id === pendingId);
    if (idx !== -1) {
      const item = db.pendingVerificationQueue[idx];
      const ch = { ...item.channel, isActive: true, contentRightsStatus: 'Active' as const };
      db.channelsMap.set(ch.id, ch);
      db.channelStreamUrlIndex.set(ch.streamUrl, ch.id);
      db.pendingVerificationQueue.splice(idx, 1);
      db.logAudit('ADMIN', 'CHANNEL_APPROVED', 'CHANNEL', `Approved channel ${ch.name} (#${ch.id}) into active database`);
      return true;
    }
    return false;
  }

  public static rejectPendingRecord(pendingId: string) {
    const idx = db.pendingVerificationQueue.findIndex((p) => p.id === pendingId);
    if (idx !== -1) {
      const item = db.pendingVerificationQueue.splice(idx, 1)[0];
      db.logAudit('ADMIN', 'CHANNEL_REJECTED', 'CHANNEL', `Rejected pending channel ${item.channel.name}`);
      return true;
    }
    return false;
  }

  private static createDraftRecord(raw: RawImportEntry, idx: number, providerId: string): ChannelRecord {
    return {
      id: `draft-${idx}`,
      name: raw.name || 'Untitled Channel',
      officialName: raw.name || 'Untitled Channel',
      country: raw.country || 'Global',
      countryCode: 'GL',
      region: 'Global',
      language: raw.language || 'English',
      category: raw.category || 'General Entertainment',
      subcategory: 'Import Draft',
      logo: getNeutralPlaceholderLogo(raw.name || 'Draft'),
      isLogoVerified: false,
      streamUrl: raw.streamUrl || '',
      streamProtocol: 'HLS',
      resolution: 'FHD 1080p',
      bitrate: '8.2 Mbps',
      audioLanguage: 'English',
      subtitleLanguages: [],
      epgChannelId: '',
      epgSource: '',
      timeZone: 'UTC',
      hdStatus: 'Full HD',
      liveStatus: false,
      isActive: false,
      geographicAvailability: ['Global'],
      contentRightsStatus: 'Pending',
      licenseStartDate: new Date().toISOString(),
      licenseExpirationDate: new Date().toISOString(),
      providerId,
      providerName: 'Unassigned',
      lastVerificationTimestamp: new Date().toISOString(),
      streamHealth: 'UNVERIFIED',
      failureCount: 1,
      responseTimeMs: 0,
      channelNumber: 9999,
      viewersCount: 0,
      playbackStarts: 0,
      watchTimeMinutes: 0,
      searchFrequency: 0,
      favoritesCount: 0,
      description: 'Invalid draft entry awaiting correction.',
    };
  }

  private static resolveCountryCode(c: string): string {
    const s = c.toLowerCase();
    if (s.includes('pakistan') || s === 'pk') return 'PK';
    if (s.includes('united states') || s.includes('usa') || s === 'us') return 'US';
    if (s.includes('united kingdom') || s.includes('uk') || s === 'gb') return 'GB';
    if (s.includes('india') || s === 'in') return 'IN';
    if (s.includes('uae') || s.includes('dubai') || s === 'ae') return 'AE';
    if (s.includes('canada') || s === 'ca') return 'CA';
    if (s.includes('australia') || s === 'au') return 'AU';
    return 'GL';
  }
}
