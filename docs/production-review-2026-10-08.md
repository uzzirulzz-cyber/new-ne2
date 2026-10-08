# Cloudflare production review — 8 October 2026

Reviewed default-branch source at `livetv` 7d46e51bec0f4a5aafbcac0b0288ff91c363b419 and `new-ne2` 43126bd7de8c575cc70b40886505ead9a5850745. Fixes in this branch are proposals, not confirmation of production behavior. No production settings, secrets, DNS records, subscription plans, or real provider playback were inspected. Calendar availability is not release-readiness evidence.

## Confirmed findings and repairs

| Repository / source evidence | Finding | Repair |
| --- | --- | --- |
| Both `wrangler.toml` files, `livetv` 7d46e51 and `new-ne2` 43126bd | SPA asset routing lacks explicit API priority. Navigation requests can receive index.html instead of API/media responses. | Set `assets.run_worker_first` for `/api/*`; also protect `/callback/*` routing in livetv. |
| `livetv/src/worker/services/geotv-proxy.ts` at 7d46e51 | HLS relative resources resolve against provider root rather than the final playlist URL. Upstream non-2xx can become 200 playlists. Nested manifests and keys are returned as video/mp2t. | Resolve against final URL; validate upstream status and EXT M3U header; rewrite nested manifests; retain binary resource MIME; remove shared caching of credential-bearing resources. |
| `livetv/src/worker/playbeat-proxy.ts` at 7d46e51 | Public refresh/force query triggers upstream sync; segment exceptions can escape the handler. | Require admin authentication for explicit refresh; return safe 502 for segment transport failure. Empty-catalog bootstrap remains unchanged. |
| `livetv/.github/workflows/deploy.yml` at 7d46e51 | Workflow deploys after frontend build without type checks, tests, runtime version pinning, or deployment serialization. Local deploy script assumes unlisted Wrangler dependency. | Add Node 24, types, tests, both Worker dry runs, PR validation without deployment, deployment concurrency group, and Wrangler dependency. |
| `new-ne2/src/worker/index.ts`, `src/components/player/LivePlayerModal.tsx` at 43126bd | Live source is raw TS and player only supplies video src. No HLS adapter for browsers without native support. | Request live m3u8; rewrite manifests, segments and keys using expiring encrypted resource tokens; add hls.js with native HLS fallback and teardown. Require same provider origin for media/redirects. Preserve movie Range metadata and only time out response-header acquisition, not the entire movie body. |
| `new-ne2/vite.config.ts` at 43126bd | Local `/api` requests are proxied to production playbeattv.buzz. | Remove production API proxy; use local Cloudflare Vite Worker. |
| `new-ne2/src/worker/index.ts` at 43126bd | Scheduled/manual sync can overlap; publication deletes all other generations. Health probing opens 10 parallel requests and up to 500 upstream fetches. Health endpoint omits persisted last_error. | Add D1 sync lease, reduce probe batch to 20 with 5 concurrent fetches, expose safe lastError. These repairs do not solve full-catalog quota limits. |
| `new-ne2/.github/workflows` | No workflow files or Actions runs were returned. | Add validation-only workflow; deployment remains through existing Cloudflare build/integration. |

`livetv` Actions run [37685439456](https://github.com/uzzirulzz-cyber/livetv/actions/runs/37685439456) succeeded for 7d46e51, including migrations and both deployments. That proves deployment steps passed, not provider reachability or browser playback. No Actions history was returned for new-ne2; Cloudflare Builds could still be its deployment mechanism.

## Commits traced

- [7d46e51](https://github.com/uzzirulzz-cyber/livetv/commit/7d46e51): incremental parser in `src/worker/services/geotv-proxy.ts`. It reduces whole-response buffering but still collects the complete parsed channel array and has a 15,000-channel limit in `services/catalog-store.ts`.
- [f6c7f4b](https://github.com/uzzirulzz-cyber/livetv/commit/f6c7f4b): `services/provider-config.ts`, `services/geotv-proxy.ts`, `wrangler.toml`, README. Maps provider HTTP port 8880 to port 80 on the same host. Reachability on port 80 is an external assumption.
- [24459e79](https://github.com/uzzirulzz-cyber/livetv/commit/24459e79): provider transport classification in `services/geotv-proxy.ts` and `playbeat-proxy.ts`.
- [65965780](https://github.com/uzzirulzz-cyber/livetv/commit/65965780), [2457a815](https://github.com/uzzirulzz-cyber/livetv/commit/2457a815), [ff944b3](https://github.com/uzzirulzz-cyber/livetv/commit/ff944b3): sanitized diagnostics and sync-health reporting in `playbeat-proxy.ts`. Reporting a failure does not repair the upstream route.
- [2315b8a1](https://github.com/uzzirulzz-cyber/new-ne2/commit/2315b8a1): removes old D1 binding from static deployment. [236c0f7c](https://github.com/uzzirulzz-cyber/new-ne2/commit/236c0f7c) subsequently adds `CATALOG_DB` with a different provider database, plus protected settings. Latest deployment is not database-free.
- [b7da7ec7](https://github.com/uzzirulzz-cyber/new-ne2/commit/b7da7ec7): Cloudflare Vite/static build changes in `vite.config.ts`, `wrangler.toml`, package files and portal. [43126bd7](https://github.com/uzzirulzz-cyber/new-ne2/commit/43126bd7): provider admin/copy refinements in Worker and UI.

## Configuration and integration inventory

| Service | Declared bindings / routing | Required external verification |
| --- | --- | --- |
| playbeat-live | Main `src/worker/playbeat-proxy.ts`; ASSETS `dist`; CATALOG_DB and DB both alias `playbeat-catalog` D1 `75e2c1c3-a1cc-4b6d-b8f4-4afb403f3e2b`; BUCKET `star-panel-assets`; six-hour cron. | D1 and R2 belong to deployment account; migration 0001 applied; apex/www routes exist in dashboard. DOMAIN variable does not create DNS or a Worker route; no custom route is declared here. |
| playbeat-broadcast | `wrangler.broadcast.toml`; same D1; CATALOG service binding to playbeat-live; workers.dev enabled. | PLAYBACK_BASE_URL uses `playbeatdigital.workers.dev` account subdomain; verify it matches account. Service binding and shared database must target intended environment. No provider secrets needed on broadcast Worker: provider fetches delegate to catalog Worker. |
| new-ne222 | `src/worker/index.ts`; assets `dist/client`; custom domain playbeattv.buzz; CATALOG_DB `new-ne222-provider`, ID `ca587ec1-56b2-49f9-92cc-3cd167f284e4`; 15-minute cron. | Database exists/access permitted; domain controlled by account. Schema is created at runtime, not managed through migrations. Generated deployment config `dist/new_ne222/wrangler.json` is the Cloudflare Vite output used by Wrangler. |

Worker secrets are separate from a Node `.env` file and GitHub deployment credentials:

- livetv: ADMIN_TOKEN; either GEOTV_HOST/GEOTV_USER/GEOTV_PASS or M3U_PLAYLIST_URL; IPTV_API_KEY or STAR_IPTV_API_KEY for reseller API. Current allowed origin is `http://advance.playbeat.live`, explicitly allowing HTTP. Provider normalization only supports the specific 8880→80 mapping; do not assume it creates a reverse proxy. Actual HTTP encryption remains absent upstream.
- new-ne2: ADMIN_PASSWORD and PROVIDER_ENCRYPTION_KEY, each at least 32 characters. Provider settings are AES-GCM encrypted in D1; backend reads this stored configuration. The optional PROVIDER_* Env fields are internal derived values and do not replace the saved-config setup. Preserve the encryption key across releases.
- GitHub livetv deployment: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID; token needs intended Worker deployment, D1 migration and asset/binding permissions. new-ne2 `.env.example` Cloudflare/R2 fields do not constitute Worker bindings; latest Worker does not use R2.
- livetv `.env.example` omits several Worker requirements; new-ne2 `.env.example` still describes the earlier AI Studio/Cloud Run setup. Use this inventory rather than assuming those examples completely configure production.

## Remaining confirmed release blockers

1. Full catalog ingestion exceeds single-invocation database limits at advertised scale. livetv does one SQL upsert per changed row: 13,000 new channels means at least 13,000 SQL statements. Batches of 100 do not reset invocation limits. new-ne2 groups rows under 90 bindings but still performs roughly 1,445 statements for 13,000 live rows, 23,334 for 140,000 movies, and 13,286 for 93,000 series, plus control/probe/cleanup queries. Cloudflare D1 documents 50 queries per invocation on Free and 1,000 on Paid. Plan/capacity is unknown; paying alone will not make these full imports fit.
2. Large new-ne2 provider lists are downloaded concurrently and materialized as JSON arrays, normalized arrays and insert arrays. Actual memory/CPU failure needs a representative fixture or provider test; architecture is not bounded by catalog size. Scheduled sync repeats full writes every 15 minutes and immediately deletes prior generations, preventing simple generation rollback.
3. livetv updates catalog across multiple batches, so a failure can leave mixed old/new metadata. Empty-catalog public bootstrap can also overlap cron/manual sync. Staging/publish and distributed lease remain needed there.
4. new-ne2 series browsing has no episode lookup/playback route; `/api/series` returns cards without episode stream URLs. Drama/music/sports/news endpoints currently return empty arrays. livetv admin components call endpoints such as `/api/provider/call`, checkout, maintenance and DNS setup that latest Worker explicitly returns as not implemented. Do not label these features functional.
5. Image proxies need a separate hardening pass: livetv allows arbitrary public-looking URLs with an incomplete private-address blacklist and follows redirects; new-ne2 only checks initial provider hostname and follows image redirects. Playback redirect checks added here do not cover images.

## Smallest safe next-release sequence

1. Run npm ci, lint, tests, build and Worker dry runs on these branches; inspect generated new-ne2 config for API routing and D1. Required local code checks pass as described below.
2. Establish an isolated staging Worker/domain/database/bucket configuration and verify deployment account, D1/R2 existence, route ownership, service binding, required secret presence and provider port-80 reachability. Inspect names only; never log secret values. Avoid deploying staging configuration against production D1 IDs.
3. Before large imports, implement resumable ingestion with a cursor/job and bounded writes per invocation, staged generations, a lease, atomic active-generation publish after validation, and retention of previous generation. Use an external parser if a huge unpaged provider JSON response cannot fit Workers. Choose Queues/Workflows/external runner only after verifying available plan and cost; do not silently add paid resources.
4. In staging, exercise a 20-channel fixture, malformed/empty responses, denied refresh, timeout/403, cross-origin redirects, encrypted keys, master+media playlists, MP4 Range, and provider settings persistence. Then test representative large input with recorded memory/CPU/query counts and interruption/resume. No success flag may publish a partial catalog.
5. Browser-test one real authorized live channel and movie in Chrome and Safari, including channel switching, seek, autoplay rejection, reconnect and at least 60 seconds of playback. HTTP probe success is not decoded-media verification. Confirm provider supports m3u8 and any authorized CDN redirect origins before widening allowlists.
6. Preserve current Worker versions and D1 backup; apply only reviewed migrations. For livetv deploy catalog then broadcast, verify both plus API JSON under navigation headers; for new-ne2 validate custom-domain health and catalog. Monitor sync-health and actual playback. Roll back Worker versions and active generation independently if errors rise.

Local validation completed: both projects typecheck and build; livetv five targeted tests; new-ne2 six targeted tests; dry-run bundles for all three Workers. Frontend chunk-size warnings remain. No provider credentials, staging account access, production playback, or full-scale import validation was available.

References: [SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/), [Worker-first asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).
