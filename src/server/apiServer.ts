/**
 * Production REST API Router & Server Middleware
 * Handles all customer, public streaming, and Super Admin endpoints.
 */

import { db } from './database';
import { ImporterPipeline, RawImportEntry } from './importerPipeline';

export async function handleApiRequest(req: any, res: any): Promise<boolean> {
  const urlObj = new URL(req.url || '', 'http://localhost');
  const pathname = urlObj.pathname;
  const method = req.method;

  // Only handle /api/* routes
  if (!pathname.startsWith('/api/')) {
    return false;
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return true;
  }

  try {
    // 1. GET /api/stats (Real dynamic count calculated from database)
    if (pathname === '/api/stats' && method === 'GET') {
      const stats = db.getStats();
      res.statusCode = 200;
      res.end(JSON.stringify(stats));
      return true;
    }

    // 2. GET /api/channels (Paginated & Filtered channel catalog)
    if (pathname === '/api/channels' && method === 'GET') {
      const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
      const pageSize = parseInt(urlObj.searchParams.get('pageSize') || '48', 10);
      const category = urlObj.searchParams.get('category') || undefined;
      const country = urlObj.searchParams.get('country') || undefined;
      const language = urlObj.searchParams.get('language') || undefined;
      const resolution = urlObj.searchParams.get('resolution') || undefined;
      const streamHealth = urlObj.searchParams.get('streamHealth') || undefined;
      const rightsStatus = urlObj.searchParams.get('rightsStatus') || undefined;
      const search = urlObj.searchParams.get('search') || undefined;
      const onlyFeatured = urlObj.searchParams.get('featured') === 'true';

      const result = db.queryChannels({
        page,
        pageSize,
        category,
        country,
        language,
        resolution,
        streamHealth,
        rightsStatus,
        search,
        onlyFeatured,
      });

      res.statusCode = 200;
      res.end(JSON.stringify(result));
      return true;
    }

    // 3. GET /api/live (Live Now channels with programs)
    if (pathname === '/api/live' && method === 'GET') {
      const channels = Array.from(db.channelsMap.values())
        .filter((c) => c.liveStatus && c.isActive && c.streamHealth === 'ONLINE')
        .slice(0, 50);

      res.statusCode = 200;
      res.end(JSON.stringify({ total: channels.length, channels }));
      return true;
    }

    // 4. GET /api/hot-tv (Ranked using real metrics)
    if (pathname === '/api/hot-tv' && method === 'GET') {
      const limit = parseInt(urlObj.searchParams.get('limit') || '12', 10);
      const hotChannels = db.getHotLiveTV(limit);
      res.statusCode = 200;
      res.end(JSON.stringify({ channels: hotChannels }));
      return true;
    }

    // 5. GET /api/epg (Program Guide)
    if (pathname === '/api/epg' && method === 'GET') {
      const channelId = urlObj.searchParams.get('channelId');
      if (channelId) {
        const programs = db.epgProgramsMap.get(channelId) || [];
        res.statusCode = 200;
        res.end(JSON.stringify({ channelId, programs }));
        return true;
      }
      
      // Return map of top channel schedules
      const guideData: Record<string, any[]> = {};
      db.epgProgramsMap.forEach((programs, id) => {
        guideData[id] = programs;
      });
      res.statusCode = 200;
      res.end(JSON.stringify(guideData));
      return true;
    }

    // 6. GET /api/movies (Licensed VOD movies)
    if (pathname === '/api/movies' && method === 'GET') {
      const movies = Array.from(db.moviesMap.values()).filter(
        (m) => m.rightsStatus === 'Active'
      );
      res.statusCode = 200;
      res.end(JSON.stringify({ total: movies.length, movies }));
      return true;
    }

    // 7. GET /api/series (Web Series)
    if (pathname === '/api/series' && method === 'GET') {
      const series = Array.from(db.webSeriesMap.values()).filter(
        (s) => s.rightsStatus === 'Active'
      );
      res.statusCode = 200;
      res.end(JSON.stringify({ total: series.length, series }));
      return true;
    }

    // 8. GET /api/dramas (Regional Dramas)
    if (pathname === '/api/dramas' && method === 'GET') {
      const dramas = Array.from(db.dramasMap.values()).filter(
        (d) => d.rightsStatus === 'Active'
      );
      res.statusCode = 200;
      res.end(JSON.stringify({ total: dramas.length, dramas }));
      return true;
    }

    // 9. GET /api/music (Music TV & Videos)
    if (pathname === '/api/music' && method === 'GET') {
      const music = Array.from(db.musicMap.values()).filter(
        (m) => m.rightsStatus === 'Active'
      );
      res.statusCode = 200;
      res.end(JSON.stringify({ total: music.length, music }));
      return true;
    }

    // 10. GET /api/sports (Live Sports Events)
    if (pathname === '/api/sports' && method === 'GET') {
      const sports = Array.from(db.sportsMap.values()).filter(
        (s) => s.rightsStatus === 'Active'
      );
      res.statusCode = 200;
      res.end(JSON.stringify({ total: sports.length, sports }));
      return true;
    }

    // 11. GET /api/news (News Bulletins & Feeds)
    if (pathname === '/api/news' && method === 'GET') {
      const news = Array.from(db.newsMap.values());
      res.statusCode = 200;
      res.end(JSON.stringify({ total: news.length, news }));
      return true;
    }

    // 12. GET /api/search (Global multi-entity search)
    if (pathname === '/api/search' && method === 'GET') {
      const q = urlObj.searchParams.get('q') || '';
      const results = db.globalSearch(q);
      res.statusCode = 200;
      res.end(JSON.stringify(results));
      return true;
    }

    // 13. POST /api/channels/playback-event (Track real telemetry)
    if (pathname === '/api/channels/playback-event' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (body.channelId) {
        db.recordPlaybackEvent(body.channelId, body.durationMinutes || 5);
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true }));
        return true;
      }
    }

    // ────────── SUPER ADMIN ENDPOINTS ──────────

    // 14. POST /api/admin/import (Execute multi-stage importer pipeline)
    if (pathname === '/api/admin/import' && method === 'POST') {
      const body = await parseJsonBody(req);
      const entries: RawImportEntry[] = body.entries || [];
      const sourceName = body.sourceName || 'Authorized Feed';
      const sourceType = body.sourceType || 'M3U';
      const providerId = body.providerId || 'prov-playbeat';

      const result = ImporterPipeline.processBatch(entries, sourceName, sourceType, providerId);
      res.statusCode = 200;
      res.end(JSON.stringify(result));
      return true;
    }

    // 15. GET /api/admin/pending (Pending verification review desk)
    if (pathname === '/api/admin/pending' && method === 'GET') {
      res.statusCode = 200;
      res.end(JSON.stringify({
        total: db.pendingVerificationQueue.length,
        items: db.pendingVerificationQueue,
      }));
      return true;
    }

    // 16. POST /api/admin/channels/verify (Approve / Reject pending record)
    if (pathname === '/api/admin/channels/verify' && method === 'POST') {
      const body = await parseJsonBody(req);
      const pendingId = body.pendingId;
      const action = body.action; // 'APPROVE' | 'REJECT'

      if (action === 'APPROVE') {
        const ok = ImporterPipeline.approvePendingRecord(pendingId);
        res.statusCode = 200;
        res.end(JSON.stringify({ success: ok, message: 'Record approved & published to database' }));
        return true;
      } else {
        const ok = ImporterPipeline.rejectPendingRecord(pendingId);
        res.statusCode = 200;
        res.end(JSON.stringify({ success: ok, message: 'Record rejected' }));
        return true;
      }
    }

    // 17. GET /api/admin/providers & POST /api/admin/providers
    if (pathname === '/api/admin/providers') {
      if (method === 'GET') {
        const providers = Array.from(db.providersMap.values());
        res.statusCode = 200;
        res.end(JSON.stringify({ total: providers.length, providers }));
        return true;
      }
      if (method === 'POST') {
        const body = await parseJsonBody(req);
        const newProvider = {
          ...body,
          id: `prov-${Date.now()}`,
          totalChannelsProvided: 0,
          activeChannelsCount: 0,
        };
        db.providersMap.set(newProvider.id, newProvider);
        db.logAudit('ADMIN', 'PROVIDER_CREATED', 'PROVIDER', `Added provider ${newProvider.name}`);
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, provider: newProvider }));
        return true;
      }
    }

    // 18. GET /api/admin/audit-logs
    if (pathname === '/api/admin/audit-logs' && method === 'GET') {
      res.statusCode = 200;
      res.end(JSON.stringify({ logs: db.auditLogs.slice(0, 100) }));
      return true;
    }

    // 19. GET /api/admin/health (Stream health monitoring status)
    if (pathname === '/api/admin/health' && method === 'GET') {
      const channels = Array.from(db.channelsMap.values()).slice(0, 150);
      const online = channels.filter((c) => c.streamHealth === 'ONLINE').length;
      const degraded = channels.filter((c) => c.streamHealth === 'DEGRADED').length;
      const offline = channels.filter((c) => c.streamHealth === 'OFFLINE').length;

      res.statusCode = 200;
      res.end(JSON.stringify({
        overall: offline === 0 ? 'HEALTHY' : 'MONITORING',
        telemetrySample: channels.slice(0, 30),
        breakdown: { online, degraded, offline },
      }));
      return true;
    }

    // 20. POST /api/admin/channels/delete
    if (pathname === '/api/admin/channels/delete' && method === 'POST') {
      const body = await parseJsonBody(req);
      const id = body.channelId;
      if (id && db.channelsMap.has(id)) {
        const ch = db.channelsMap.get(id)!;
        db.channelsMap.delete(id);
        db.channelStreamUrlIndex.delete(ch.streamUrl);
        db.logAudit('ADMIN', 'CHANNEL_DELETED', 'CHANNEL', `Deleted channel ${ch.name} (#${id})`);
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true }));
        return true;
      }
    }

  } catch (err: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message || 'Server Internal Error' }));
    return true;
  }

  return false;
}

function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: any) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (e) {
        resolve({});
      }
    });
  });
}
