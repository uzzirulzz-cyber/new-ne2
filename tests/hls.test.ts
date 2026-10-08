import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proxyMedia, readResourceToken, resourceToken } from '../src/worker/hls-proxy';

async function key() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

test('resource tokens hide provider credentials and reject tampering', async () => {
  const cryptoKey = await key();
  const source = 'https://provider.example/live/alice/secret/segment.ts';
  const token = await resourceToken(source, cryptoKey);
  assert.ok(!token.includes('secret'));
  assert.equal(await readResourceToken(token, cryptoKey), source);
  assert.equal(await readResourceToken('x' + token, cryptoKey), null);
  assert.equal(await readResourceToken(token, await key()), null);
});

test('master playlists, relative segments, and encryption keys stay behind proxy', async () => {
  const original = globalThis.fetch;
  const cryptoKey = await key();
  globalThis.fetch = async () => new Response('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin"\nchild/index.m3u8\nsegment.ts\n', { headers: { 'Content-Type': 'application/vnd.apple.mpegurl', 'Content-Length': '100' } });
  try {
    const response = await proxyMedia(new Request('https://app.example/api/stream/live/1.m3u8'), new URL('https://provider.example/live/alice/secret/master.m3u8'), 'https://provider.example', cryptoKey);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Length'), null);
    assert.ok(!body.includes('secret'));
    const tokens = [...body.matchAll(/token=([^"\s]+)/g)].map((match) => decodeURIComponent(match[1]));
    assert.equal(tokens.length, 3);
    assert.equal(await readResourceToken(tokens[0], cryptoKey), 'https://provider.example/live/alice/secret/key.bin');
    assert.equal(await readResourceToken(tokens[1], cryptoKey), 'https://provider.example/live/alice/secret/child/index.m3u8');
    assert.equal(await readResourceToken(tokens[2], cryptoKey), 'https://provider.example/live/alice/secret/segment.ts');
  } finally { globalThis.fetch = original; }
});

test('cross-origin redirects are rejected before credentials or traffic can leave provider', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(null, { status: 302, headers: { Location: 'https://other.example/leak' } }); };
  try {
    const response = await proxyMedia(new Request('https://app.example/'), new URL('https://provider.example/movie/1.mp4'), 'https://provider.example', await key());
    assert.equal(response.status, 502);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});

test('Range and 206 metadata survive movie proxy while upstream cookies do not', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    assert.equal(new Headers(init?.headers).get('Range'), 'bytes=0-1');
    return new Response('ab', { status: 206, headers: { 'Content-Type': 'video/mp4', 'Content-Range': 'bytes 0-1/100', 'Set-Cookie': 'private=value', 'Location': 'https://provider.example/secret' } });
  };
  try {
    const response = await proxyMedia(new Request('https://app.example/', { headers: { Range: 'bytes=0-1' } }), new URL('https://provider.example/movie/1.mp4'), 'https://provider.example', await key());
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('Content-Range'), 'bytes 0-1/100');
    assert.equal(response.headers.get('Set-Cookie'), null);
    assert.equal(response.headers.get('Location'), null);
  } finally { globalThis.fetch = original; }
});

test('HTTP success with HTML is rejected as an invalid playlist', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html>Error</html>');
  try { assert.equal((await proxyMedia(new Request('https://app.example/'), new URL('https://provider.example/master.m3u8'), 'https://provider.example', await key())).status, 502); }
  finally { globalThis.fetch = original; }
});

test('concurrent admin sync is rejected before fetching or replacing a catalog', async () => {
  const { default: worker } = await import('../src/worker/index');
  let providerCalls = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async () => { providerCalls++; throw new Error('unexpected provider call'); };
  const db = {
    prepare(sql: string) {
      const statement = {
        bind() { return statement; },
        async first() { return sql.includes('sync_lease') ? { value: '{"owner":"another-job","expires":9999999999999}' } : null; },
        async all() { return { success: true, results: [] }; },
        async run() { return { success: true, results: [] }; },
      };
      return statement;
    },
    async batch() { return []; },
  };
  try {
    const secret = 'a'.repeat(32);
    const response = await worker.fetch(new Request('https://app.example/api/admin/sync', {
      method: 'POST', headers: { Authorization: `Bearer ${secret}` },
    }), { CATALOG_DB: db, ASSETS: { fetch: async () => new Response('asset') }, ADMIN_PASSWORD: secret, PROVIDER_ENCRYPTION_KEY: 'b'.repeat(32) });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'provider_sync_in_progress' });
    assert.equal(providerCalls, 0);
  } finally { globalThis.fetch = original; }
});
