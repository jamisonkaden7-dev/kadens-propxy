import upstream from './upstream.js';
import { hasAccess, hasGoogleAccess, normalizeTarget } from '../src/core.js';

const RELAY_SESSION_AGE = 6 * 60 * 60;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const COOKIE = '__Host-kp_relay';
const TARGET_COOKIE = '__Host-kp_target';

export default {
  async fetch(request, env, ctx) {
    if (!env.DB || !env.RELAY_SECRET || !env.APP_URL) return response(503, 'ItsRecoil is not configured yet.');
    const url = new URL(request.url);
    if (url.pathname === '/__kaden_launch' && request.method === 'GET') return launch(request, env, url);
    if (url.pathname === '/__kaden_home') return Response.redirect(env.APP_URL, 302);

    if (url.pathname === '/__kaden_exit') {
      return new Response(null, { status: 302, headers: { Location: env.APP_URL, 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`, 'Cache-Control': 'no-store' } });
    }

    const session = await readSession(request, env.RELAY_SECRET);
    if (!session || (env.GOOGLE_REQUIRED === 'true' && session.kind !== 'google')) return Response.redirect(env.APP_URL, 302);
    if (url.pathname === '/') {
      const source = sourceFromReferer(request, url.origin) || sourceFromCookie(request);
      return Response.redirect(source ? `${url.origin}/${source}/${url.search}` : env.APP_URL, 302);
    }

    if (isGoogleFallbackPath(url.pathname)) return googleFallback(env.APP_URL, url);

    // A proxied page is allowed to request a root-relative path only when its
    // Referer identifies the original public target. Relay then repairs it.
    let target = /^\/(?:https?|wss?):\/\//i.test(url.pathname) ? url.pathname.slice(1) + url.search : null;
    if (!target && !['/__proxy_sw.js', '/favicon.ico', '/robots.txt'].includes(url.pathname)) {
      const source = sourceFromReferer(request, url.origin) || sourceFromCookie(request);
      if (!source) return response(400, 'This page lost its website address. Go back to ItsRecoil and open it again.');
      target = source + url.pathname + url.search;
      return Response.redirect(`${url.origin}/${target}`, request.method === 'GET' || request.method === 'HEAD' ? 302 : 307);
    }
    if (target) {
      try {
        const safe = normalizeTarget(target.replace(/^ws/i, 'http'), undefined, 8000);
        if (safe.origin === url.origin || safe.origin === new URL(env.APP_URL).origin) return response(400, 'That link cannot be opened.');
        if (request.method === 'GET' && request.headers.get('Sec-Fetch-Dest') === 'document' &&
            ['www.youtube.com', 'youtube.com'].includes(safe.hostname) && safe.pathname === '/watch' && safe.searchParams.has('v')) {
          return youtubeWatchPage(safe, env.APP_URL);
        }
        if (isGoogleFallbackTarget(safe)) return googleFallback(env.APP_URL, safe);
      } catch { return response(400, 'That link cannot be opened.'); }
    }
    const upstreamResponse = await upstream.fetch(request, { ...env, PASSWORD: undefined }, ctx);
    if (isGoogleFallbackPath(new URL(upstreamResponse.headers.get('Location') || url.href, url.origin).pathname)) return googleFallback(env.APP_URL, new URL(upstreamResponse.headers.get('Location') || url.href, url.origin));
    if (target && request.method === 'GET' && (request.headers.get('Sec-Fetch-Mode') === 'navigate' || request.headers.get('Sec-Fetch-Dest') === 'document') &&
        (upstreamResponse.headers.get('Content-Type') || '').toLowerCase().includes('text/html')) {
      const original = normalizeTarget(target.replace(/^ws/i, 'http'), undefined, 8000);
      const headers = new Headers(upstreamResponse.headers);
      headers.append('Set-Cookie', `${TARGET_COOKIE}=${encodeURIComponent(original.origin)}; Path=/; Max-Age=${RELAY_SESSION_AGE}; HttpOnly; Secure; SameSite=Lax`);
      headers.set('Cache-Control', 'private, no-store');
      return new Response(upstreamResponse.body, { status: upstreamResponse.status, statusText: upstreamResponse.statusText, headers });
    }
    return upstreamResponse;
  }
};

function sourceFromReferer(request, relayOrigin) {
  try {
    const ref = new URL(request.headers.get('Referer') || '');
    if (ref.origin !== relayOrigin || !/^\/(?:https?|wss?):\/\//i.test(ref.pathname)) return null;
    return normalizeTarget(ref.pathname.slice(1).replace(/^ws/i, 'http'), undefined, 8000).origin;
  } catch { return null; }
}

function sourceFromCookie(request) {
  try {
    const value = getCookie(request, TARGET_COOKIE);
    return value ? normalizeTarget(decodeURIComponent(value), undefined, 8000).origin : null;
  } catch { return null; }
}

function isGoogleChallenge(path) {
  return /^\/https?:\/\/(?:www\.)?google\.[^/]+\/sorry(?:\/|$)/i.test(path);
}

function isGoogleFallbackPath(path) {
  return isGoogleChallenge(path) || /^\/https?:\/\/accounts\.google\.com\/(?:results|sorry)(?:\/|$)/i.test(path);
}

function isGoogleFallbackTarget(url) {
  return /^([a-z0-9-]+\.)*google\.[a-z.]+$/i.test(url.hostname) &&
    (url.pathname.startsWith('/sorry') || url.pathname.startsWith('/results') || url.hostname === 'accounts.google.com');
}

function googleFallback(appUrl, requestedUrl) {
  const origin = new URL(appUrl).origin;
  let query = requestedUrl?.searchParams?.get('q') || requestedUrl?.searchParams?.get('search_query') || '';
  if (!query && requestedUrl?.pathname?.startsWith('/https:')) {
    try { const embedded = new URL(requestedUrl.pathname.slice(1) + requestedUrl.search); query = embedded.searchParams.get('q') || embedded.searchParams.get('search_query') || ''; } catch {}
  }
  const location = query ? `${origin}/search?q=${encodeURIComponent(query.slice(0, 200))}` : `${origin}/browse?url=google`;
  return new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}

function youtubeWatchPage(target, appUrl) {
  const id = target.searchParams.get('v') || '';
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return response(400, 'That video link is invalid.');
  const direct = `https://www.youtube.com/watch?v=${id}`;
  const embed = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Video · ItsRecoil</title><style>*{box-sizing:border-box}body{margin:0;background:#090909;color:#f3f3f3;font:14px/1.5 Arial,sans-serif}header{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:15px 24px;border-bottom:1px solid #2a2a2a;background:#111}header strong{font-size:17px}a{color:inherit;text-decoration:none}.back{padding:9px 13px;border:1px solid #393939;border-radius:8px;background:#1a1a1a}main{max-width:1150px;margin:32px auto;padding:0 22px}.kicker{color:#777;font-size:11px;letter-spacing:.1em}h1{font-size:25px;letter-spacing:-.03em;margin:8px 0 18px}.player{width:100%;aspect-ratio:16/9;border:1px solid #333;border-radius:12px;background:#000}.note{display:flex;gap:18px;align-items:center;justify-content:space-between;margin:18px 0;color:#999}.note a{padding:10px 13px;border:1px solid #454545;border-radius:8px;color:#eee;white-space:nowrap}@media(max-width:600px){.note{display:block}.note a{display:inline-block;margin-top:13px}}</style></head><body><header><strong>ItsRecoil · Video</strong><a class="back" href="${appUrl}">← Home</a></header><main><span class="kicker">YOUTUBE</span><h1>Watch video</h1><iframe class="player" src="${embed}" title="YouTube video player" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><div class="note"><span>If the embedded player is unavailable, open the video on YouTube.</span><a href="${direct}" target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a></div></main></body></html>`;
  return new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-src https://www.youtube-nocookie.com; base-uri 'none'" } });
}

async function launch(request, env, url) {
  const ticket = url.searchParams.get('ticket') || '';
  if (!/^[A-Za-z0-9_-]{43}$/.test(ticket)) return response(400, 'This launch link is invalid. Open ItsRecoil and try again.');
  const hash = await digestHex(ticket);
  const now = Math.floor(Date.now() / 1000);
  const result = await env.DB.prepare('DELETE FROM google_relay_tickets WHERE token_hash = ? AND expires_at >= ? RETURNING google_sub, target_url')
    .bind(hash, now).all();
  let row = result.results?.[0];
  let ownerId = row?.google_sub;
  let kind = 'google';
  if (row && !(await hasGoogleAccess(env.DB, ownerId))) row = null;
  if (!row) {
    const legacy = await env.DB.prepare('DELETE FROM relay_tickets WHERE token_hash = ? AND expires_at >= ? RETURNING github_user_id, target_url')
      .bind(hash, now).all();
    row = legacy.results?.[0];
    ownerId = row?.github_user_id;
    kind = 'github';
    if (row && !(await hasAccess(env.DB, ownerId))) row = null;
  }
  if (kind === 'github' && env.GOOGLE_REQUIRED === 'true') row = null;
  if (!row) return response(403, 'This launch link has expired. Open ItsRecoil and try again.');
  let target;
  try { target = normalizeTarget(row.target_url, undefined, 8000); }
  catch { return response(400, 'That link cannot be opened.'); }
  if (target.origin === url.origin || target.origin === new URL(env.APP_URL).origin) return response(400, 'That link cannot be opened.');

  const session = await makeSession(ownerId, env.RELAY_SECRET, now, kind);
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${url.origin}/${target.href}`,
      'Set-Cookie': `${COOKIE}=${session}; Path=/; Max-Age=${RELAY_SESSION_AGE}; HttpOnly; Secure; SameSite=Lax`,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer'
    }
  });
}

function response(status, message) {
  const body = `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>ItsRecoil</title><style>:root{color-scheme:dark;font:14px/1.5 system-ui}body{margin:0;background:#080808;color:#eee}main{max-width:490px;margin:17vh auto;padding:0 24px}small{color:#999}h1{font-size:30px;letter-spacing:-.04em;line-height:1.1;margin:18px 0 12px}p{color:#aaa;margin:0 0 26px}a{color:#eee;text-decoration:none;border-bottom:1px solid #777;padding-bottom:3px}a:hover{border-color:#fff}</style><main><small>ItsRecoil / error</small><h1>Could not open page.</h1><p>${message}</p><a href="/">Back to ItsRecoil ↗</a></main></html>`;
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

function getCookie(request, name = COOKIE) {
  const part = (request.headers.get('Cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${name}=`));
  return part ? part.slice(name.length + 1) : null;
}

function b64url(bytes) {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64url(text) {
  return Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4)), char => char.charCodeAt(0));
}

async function key(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function makeSession(userId, secret, now, kind) {
  const payload = b64url(encoder.encode(JSON.stringify({ kind, id: String(userId), exp: now + RELAY_SESSION_AGE })));
  const signature = b64url(new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(payload))));
  return `${payload}.${signature}`;
}

async function readSession(request, secret) {
  const value = getCookie(request);
  if (!value) return null;
  const [payload, signature, extra] = value.split('.');
  if (extra || !payload || !/^[A-Za-z0-9_-]{43}$/.test(signature || '')) return null;
  try {
    if (!(await crypto.subtle.verify('HMAC', await key(secret), fromB64url(signature), encoder.encode(payload)))) return null;
    const data = JSON.parse(decoder.decode(fromB64url(payload)));
    return data.exp > Math.floor(Date.now() / 1000) && /^\d{5,30}$/.test(data.id) ? data : null;
  } catch { return null; }
}

async function digestHex(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

