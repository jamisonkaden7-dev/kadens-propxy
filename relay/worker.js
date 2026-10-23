import upstream from './upstream.js';
import { hasAccess, hasGoogleAccess, normalizeTarget } from '../src/core.js';

const RELAY_SESSION_AGE = 6 * 60 * 60;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const COOKIE = '__Host-kp_relay';

export default {
  async fetch(request, env, ctx) {
    if (!env.DB || !env.RELAY_SECRET || !env.APP_URL) return response(503, 'isRecool is not configured yet.');
    const url = new URL(request.url);
    if (url.pathname === '/__kaden_launch' && request.method === 'GET') return launch(request, env, url);

    const session = await readSession(request, env.RELAY_SECRET);
    if (!session || (env.GOOGLE_REQUIRED === 'true' && session.kind !== 'google')) return Response.redirect(env.APP_URL, 302);
    if (url.pathname === '/__kaden_exit') {
      const out = Response.redirect(env.APP_URL, 302);
      out.headers.set('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
      return out;
    }
    if (url.pathname === '/') return Response.redirect(env.APP_URL, 302);

    // A proxied page is allowed to request a root-relative path only when its
    // Referer identifies the original public target. Relay then repairs it.
    let target = /^\/(?:https?|wss?):\/\//i.test(url.pathname) ? url.pathname.slice(1) + url.search : null;
    if (!target && !['/__proxy_sw.js', '/favicon.ico', '/robots.txt'].includes(url.pathname)) {
      try {
        const ref = new URL(request.headers.get('Referer') || '');
        if (ref.origin !== url.origin || !/^\/(?:https?|wss?):\/\//i.test(ref.pathname)) return response(404, 'Page not found.');
        target = ref.pathname.slice(1);
      } catch { return response(404, 'Page not found.'); }
    }
    if (target) {
      try {
        const safe = normalizeTarget(target.replace(/^ws/i, 'http'), undefined, 8000);
        if (safe.origin === url.origin || safe.origin === new URL(env.APP_URL).origin) return response(400, 'That link cannot be opened.');
      } catch { return response(400, 'That link cannot be opened.'); }
    }
    return upstream.fetch(request, { ...env, PASSWORD: undefined }, ctx);
  }
};

async function launch(request, env, url) {
  const ticket = url.searchParams.get('ticket') || '';
  if (!/^[A-Za-z0-9_-]{43}$/.test(ticket)) return response(400, 'This launch link is invalid. Open isRecool and try again.');
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
  if (!row) return response(403, 'This launch link has expired. Open isRecool and try again.');
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
  const body = `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>isRecool</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#080808;color:#f1f1f1;font:16px/1.6 system-ui}.card{width:min(520px,calc(100% - 48px));border:1px solid #666;padding:32px}h1{font-size:28px;margin:0 0 12px}a{color:#fff}</style><div class="card"><h1>Could not open page</h1><p>${message}</p><a href="/">Back to isRecool ↗</a></div></html>`;
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

function getCookie(request) {
  const part = (request.headers.get('Cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`));
  return part ? part.slice(COOKIE.length + 1) : null;
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
