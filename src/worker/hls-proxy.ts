const encoder = new TextEncoder();
const decoder = new TextDecoder();
const TOKEN_TTL_MS = 60 * 60 * 1000;

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0));
}

export async function resourceToken(url: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
    encoder.encode(JSON.stringify({ url, expires: Date.now() + TOKEN_TTL_MS })));
  return `${base64Url(iv)}.${base64Url(new Uint8Array(data))}`;
}

export async function readResourceToken(token: string, key: CryptoKey): Promise<string | null> {
  try {
    if (token.length > 8192) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const decoded = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(parts[0]) }, key, fromBase64Url(parts[1]));
    const data = JSON.parse(decoder.decode(decoded));
    return typeof data.url === 'string' && typeof data.expires === 'number' && data.expires > Date.now() ? data.url : null;
  } catch { return null; }
}

export async function proxyMedia(request: Request, source: URL, providerOrigin: string, key: CryptoKey): Promise<Response> {
  let target = source;
  const headers = new Headers();
  const range = request.headers.get('Range');
  if (range) headers.set('Range', range);
  let upstream: Response | undefined;
  for (let hop = 0; hop < 4; hop++) {
    if (target.origin !== providerOrigin || target.username || target.password) {
      return new Response('Provider resource origin is not allowed', { status: 502 });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      upstream = await fetch(target, {
        method: request.method === 'HEAD' ? 'HEAD' : 'GET', headers,
        redirect: 'manual', signal: controller.signal,
      });
    } finally {
      // Bound time to response headers without cutting off a long movie body.
      clearTimeout(timeout);
    }
    if (upstream.status < 300 || upstream.status >= 400 || upstream.status === 304) break;
    const location = upstream.headers.get('Location');
    await upstream.body?.cancel();
    if (!location || hop === 3) return new Response('Provider redirect is unavailable', { status: 502 });
    target = new URL(location, target);
  }
  if (!upstream || !upstream.ok) return new Response('Provider media is unavailable', { status: 502 });
  const responseHeaders = new Headers();
  for (const name of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  const isPlaylist = /mpegurl/i.test(responseHeaders.get('Content-Type') || '') || target.pathname.endsWith('.m3u8');
  if (request.method === 'HEAD' || !isPlaylist) {
    return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: responseHeaders });
  }
  const body = await upstream.text();
  if (!body.trimStart().startsWith('#EXTM3U')) return new Response('Invalid provider playlist', { status: 502 });
  const proxied = async (value: string) => {
    const resource = new URL(value, target);
    if (resource.origin !== providerOrigin || resource.username || resource.password) throw new Error('provider_resource_origin_invalid');
    return `/api/stream/resource?token=${encodeURIComponent(await resourceToken(resource.href, key))}`;
  };
  const lines: string[] = [];
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) { lines.push(line); continue; }
    if (!trimmed.startsWith('#')) { lines.push(await proxied(trimmed)); continue; }
    let rewritten = line;
    for (const match of line.matchAll(/URI="([^"]+)"/g)) {
      rewritten = rewritten.replace(match[0], `URI="${await proxied(match[1])}"`);
    }
    lines.push(rewritten);
  }
  responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
  responseHeaders.delete('Content-Length');
  responseHeaders.delete('Content-Range');
  return new Response(lines.join('\n'), { headers: responseHeaders });
}
