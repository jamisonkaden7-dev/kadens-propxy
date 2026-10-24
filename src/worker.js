import { claimKey, claimGoogleKeyHash, hashKey, keyExists, hasAccess, hasGoogleKeyAccess, linkGoogleKey, normalizeTarget, resolveDestination } from './core.js';
import { css as modernCss } from './ui.js';

const SESSION_AGE = 7 * 24 * 60 * 60;
const HTML_LIMIT = 2 * 1024 * 1024;
const ASSET_LIMIT = 8 * 1024 * 1024;
const encoder = new TextEncoder();

export default {
  async fetch(request, env) {
    try {
      if (!env.DB || !env.SESSION_SECRET || (!env.GOOGLE_CLIENT_ID && (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET))) {
        return page('Setup incomplete', '<p>Configure the database and Worker secrets before opening this site.</p>', 503);
      }
      const url = new URL(request.url);
      const origin = url.origin;
      const path = url.pathname;
      if (path === '/privacy' && request.method === 'GET') return privacyPage();
      if (path === '/ui.js' && request.method === 'GET') return new Response("document.querySelectorAll('form.search').forEach(form=>form.addEventListener('submit',()=>{const button=form.querySelector('button[type=submit]');if(!button)return;const original=button.textContent;button.textContent='Opening…';setTimeout(()=>{button.textContent=original},8000)}));", { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
      if (path === '/login' && request.method === 'GET') return env.GOOGLE_CLIENT_ID ? keyPage() : startLogin(env, origin);
      if (path === '/access' && request.method === 'POST' && env.GOOGLE_CLIENT_ID) {
        const form = await request.formData();
        const key = String(form.get('key') || '').trim();
        if (!key || key.length > 100) return keyPage('That key is not valid.', 400);
        const hash = await hashKey(key);
        if (!(await keyExists(env.DB, hash))) return keyPage('That key is not valid.', 400);
        const response = redirect(`${origin}/login/google`, 303);
        response.headers.append('Set-Cookie', cookie('__Host-kp_key', await makePendingKey(hash, env.SESSION_SECRET), 600, 'None'));
        response.headers.append('Set-Cookie', cookie('__Host-kp_session', '', 0, 'None'));
        response.headers.set('Cache-Control', 'no-store');
        return response;
      }
      if (path === '/login/google' && request.method === 'GET' && env.GOOGLE_CLIENT_ID) {
        const hash = await readPendingKey(request, env.SESSION_SECRET);
        return hash ? googleLoginPage(env, origin) : redirect(`${origin}/login`, 302);
      }
      if (path === '/login/github' && request.method === 'GET' && env.GITHUB_CLIENT_ID) return startLogin(env, origin);
      if (path === '/oauth/callback' && request.method === 'GET' && env.GITHUB_CLIENT_ID) return finishLogin(request, env, origin);
      if (path === '/oauth/google/callback' && request.method === 'POST' && env.GOOGLE_CLIENT_ID) return finishGoogleLogin(request, env, origin);

      const user = await readSession(request, env.SESSION_SECRET);
      if (path === '/logout' && request.method === 'POST') {
        const exitUrl = env.RELAY_URL ? `${new URL(env.RELAY_URL).origin}/__kaden_exit` : `${origin}/login`;
        const response = redirect(exitUrl, 303);
        response.headers.set('Set-Cookie', cookie('__Host-kp_session', '', 0, 'None'));
        response.headers.append('Set-Cookie', cookie('__Host-kp_link', '', 0, 'None'));
        response.headers.append('Set-Cookie', cookie('__Host-kp_key', '', 0, 'None'));
        return response;
      }
      if (path === '/' && request.method === 'GET') return Response.redirect(`${origin}/app`, 302);
      if (path === '/search' && request.method === 'GET') {
        const query = String(url.searchParams.get('q') || '').trim().slice(0, 200);
        if (!query) return Response.redirect(`${origin}/app`, 303);
        const target = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
        return redirect(`${origin}/browse?url=${encodeURIComponent(target)}`, 303);
      }
      if (path === '/app' && request.method === 'GET') {
        if (!user) return Response.redirect(`${origin}/login`, 302);
        const formToken = await makeFormToken(request, env.SESSION_SECRET);
        const pending = readPending(request);
        if (user.kind === 'google') return (await hasGoogleKeyAccess(env.DB, user.id, user.keyHash)) ? appPage(user, env, formToken, pending) : redirect(`${origin}/login`, 302);
        if (env.GOOGLE_CLIENT_ID) return (await hasAccess(env.DB, user.id)) ? await linkPage(user, env, formToken, origin) : googleLoginPage(env, origin);
        return (await hasAccess(env.DB, user.id)) ? appPage(user, env, formToken, pending) : claimPage(user, formToken);
      }
      if (path === '/claim' && request.method === 'POST') {
        if (!user) return Response.redirect(`${origin}/login`, 303);
        const form = await request.formData();
        if (!(await validFormToken(request, env.SESSION_SECRET, form))) return errorPage('This form could not be verified. Please go back and try again.', 403);
        const key = String(form.get('key') || '').trim();
        if (env.GOOGLE_CLIENT_ID && user.kind !== 'google') return Response.redirect(`${origin}/app`, 303);
        const status = user.kind === 'google' ? 'invalid' : await claimKey(env.DB, key, user.id);
        if (status === 'claimed' || status === 'owned') return Response.redirect(`${origin}/app`, 303);
        const formToken = await makeFormToken(request, env.SESSION_SECRET);
        return claimPage(user, formToken, status === 'taken' ? 'That key has already been claimed by another account.' : 'That key is not valid.', 400);
      }
      if (path === '/browse' && request.method === 'GET') {
        if (!user) {
          const response = redirect(`${origin}/login`, 302);
          const pending = String(url.searchParams.get('url') || '').slice(0, 2048);
          if (pending) response.headers.set('Set-Cookie', cookie('__Host-kp_pending', encodeURIComponent(pending), 900));
          return response;
        }
        if (env.GOOGLE_CLIENT_ID && user.kind !== 'google') return Response.redirect(`${origin}/app`, 302);
        const allowed = user.kind === 'google' ? await hasGoogleKeyAccess(env.DB, user.id, user.keyHash) : await hasAccess(env.DB, user.id);
        if (!allowed) return Response.redirect(`${origin}/app`, 302);
        const target = resolveDestination(url.searchParams.get('url'));
        if (['google.com', 'www.google.com'].includes(target.hostname)) {
          return googleChoicePage(target);
        }
        if (env.RELAY_URL) {
          const relayOrigin = new URL(env.RELAY_URL).origin;
          if (target.origin === origin || target.origin === relayOrigin) return errorPage('This link cannot be opened.', 400);
          const ticket = b64url(crypto.getRandomValues(new Uint8Array(32)));
          const hash = await hashTicket(ticket);
          const table = user.kind === 'google' ? 'google_relay_tickets' : 'relay_tickets';
          const owner = user.kind === 'google' ? 'google_sub' : 'github_user_id';
          await env.DB.prepare(`INSERT INTO ${table} (token_hash, ${owner}, target_url, expires_at) VALUES (?, ?, ?, ?)`)
            .bind(hash, user.id, target.href, Math.floor(Date.now() / 1000) + 90).run();
          const response = redirect(`${relayOrigin}/__kaden_launch?ticket=${ticket}`, 303);
          response.headers.set('Cache-Control', 'no-store');
          response.headers.set('Referrer-Policy', 'no-referrer');
          return response;
        }
        return proxyPage(url.searchParams.get('url'), origin);
      }
      if (path === '/asset' && request.method === 'GET') {
        if (!user || !(user.kind === 'google' ? await hasGoogleKeyAccess(env.DB, user.id, user.keyHash) : await hasAccess(env.DB, user.id))) return new Response('Unauthorized', { status: 401 });
        return proxyAsset(url.searchParams.get('url'), origin);
      }
      if (path === '/form' && request.method === 'GET') {
        if (!user || !(await hasAccess(env.DB, user.id))) return Response.redirect(`${origin}/app`, 302);
        const target = normalizeTarget(url.searchParams.get('url'));
        if (target.origin === origin) return errorPage('This link cannot be opened.', 400);
        for (const [key, value] of url.searchParams) if (key !== 'url') target.searchParams.append(key, value);
        return Response.redirect(`${origin}/browse?url=${encodeURIComponent(target.href)}`, 302);
      }
      return errorPage('Page not found', 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      return errorPage(message, /URL|link|host|website|address|search|private/i.test(message) ? 400 : 502);
    }
  }
};

function redirect(location, status) {
  return new Response(null, { status, headers: { Location: location } });
}

function cookie(name, value, age, sameSite = 'Lax') {
  return `${name}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=${sameSite}`;
}

function getCookie(request, name) {
  const part = (request.headers.get('Cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${name}=`));
  return part ? part.slice(name.length + 1) : null;
}

function readPending(request) {
  try { return decodeURIComponent(getCookie(request, '__Host-kp_pending') || '').slice(0, 2048); }
  catch { return ''; }
}

function b64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hashTicket(ticket) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(ticket));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function fromB64url(value) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function makePendingKey(hash, secret) {
  const payload = b64url(encoder.encode(JSON.stringify({ hash, exp: Math.floor(Date.now() / 1000) + 600 })));
  const signature = b64url(new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(`key:${payload}`))));
  return `${payload}.${signature}`;
}

async function readPendingKey(request, secret) {
  try {
    const token = getCookie(request, '__Host-kp_key');
    if (!token) return null;
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return null;
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(signature), encoder.encode(`key:${payload}`));
    if (!valid) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    return /^[a-f0-9]{64}$/.test(data.hash) && Number.isFinite(data.exp) && data.exp >= Date.now() / 1000 ? data.hash : null;
  } catch { return null; }
}

async function makeFormToken(request, secret) {
  const session = getCookie(request, '__Host-kp_session');
  if (!session) return '';
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(`form:${session}`));
  return b64url(new Uint8Array(signature));
}

async function validFormToken(request, secret, form) {
  const session = getCookie(request, '__Host-kp_session');
  const token = String(form.get('form_token') || '');
  if (!session || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  try {
    return await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(token), encoder.encode(`form:${session}`));
  } catch { return false; }
}

async function makeSession(identity, secret) {
  const payload = b64url(encoder.encode(JSON.stringify({ kind: identity.kind || 'github', id: identity.id, login: identity.login, keyHash: identity.keyHash, exp: Math.floor(Date.now() / 1000) + SESSION_AGE })));
  const signature = b64url(new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload))));
  return `${payload}.${signature}`;
}

async function readSession(request, secret) {
  try {
    const token = getCookie(request, '__Host-kp_session');
    if (!token) return null;
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return null;
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(signature), encoder.encode(payload));
    if (!valid) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    data.kind ||= 'github';
    if (!['github', 'google'].includes(data.kind) || typeof data.login !== 'string' || !Number.isFinite(data.exp) || data.exp < Date.now() / 1000) return null;
    if (data.kind === 'github' && !Number.isSafeInteger(data.id)) return null;
    if (data.kind === 'google' && (!/^\d{5,30}$/.test(String(data.id)) || !/^[a-f0-9]{64}$/.test(String(data.keyHash)))) return null;
    return data;
  } catch { return null; }
}

async function startLogin(env, origin) {
  const state = b64url(crypto.getRandomValues(new Uint8Array(24)));
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier))));
  const auth = new URL('https://github.com/login/oauth/authorize');
  auth.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  auth.searchParams.set('redirect_uri', `${origin}/oauth/callback`);
  auth.searchParams.set('state', state);
  auth.searchParams.set('code_challenge', challenge);
  auth.searchParams.set('code_challenge_method', 'S256');
  const response = redirect(auth.href, 302);
  response.headers.append('Set-Cookie', cookie('__Host-kp_state', state, 600));
  response.headers.append('Set-Cookie', cookie('__Host-kp_verifier', verifier, 600));
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

async function finishLogin(request, env, origin) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const verifier = getCookie(request, '__Host-kp_verifier');
  if (!state || state !== getCookie(request, '__Host-kp_state') || !verifier || !url.searchParams.get('code')) {
    return errorPage('GitHub sign-in could not be verified. Please try again.', 403);
  }
  const exchange = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code: url.searchParams.get('code'), redirect_uri: `${origin}/oauth/callback`, code_verifier: verifier })
  });
  const tokenData = await exchange.json();
  if (!exchange.ok || !tokenData.access_token) return errorPage('GitHub sign-in failed. Please try again.', 502);
  const profile = await fetch('https://api.github.com/user', {
    headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${tokenData.access_token}`, 'User-Agent': 'Kadens-propxy' }
  });
  const identity = await profile.json();
  if (!profile.ok || !Number.isSafeInteger(identity.id) || typeof identity.login !== 'string') return errorPage('GitHub account could not be verified.', 502);
  const session = await makeSession(identity, env.SESSION_SECRET);
  const response = redirect(`${origin}/app`, 303);
  response.headers.append('Set-Cookie', cookie('__Host-kp_state', '', 0));
  response.headers.append('Set-Cookie', cookie('__Host-kp_verifier', '', 0));
  response.headers.append('Set-Cookie', cookie('__Host-kp_session', session, SESSION_AGE, 'None'));
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

let googleJwks = null;
let googleJwksExpiry = 0;

async function verifyGoogleCredential(token, clientId) {
  if (typeof token !== 'string' || token.length > 8192) throw new Error('Google sign-in token is invalid.');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Google sign-in token is invalid.');
  const header = JSON.parse(new TextDecoder().decode(fromB64url(parts[0])));
  const data = JSON.parse(new TextDecoder().decode(fromB64url(parts[1])));
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Google sign-in token is invalid.');
  if (!googleJwks || Date.now() > googleJwksExpiry || !googleJwks.keys.some(item => item.kid === header.kid)) {
    const result = await fetch('https://www.googleapis.com/oauth2/v3/certs');
    if (!result.ok) throw new Error('Google sign-in could not be verified right now.');
    googleJwks = await result.json();
    const maxAge = Number(result.headers.get('Cache-Control')?.match(/max-age=(\d+)/)?.[1] || 1800);
    googleJwksExpiry = Date.now() + Math.min(maxAge, 3600) * 1000;
  }
  const jwk = googleJwks.keys.find(item => item.kid === header.kid && item.kty === 'RSA' && item.use === 'sig');
  if (!jwk) throw new Error('Google sign-in token is invalid.');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromB64url(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`));
  const now = Math.floor(Date.now() / 1000);
  if (!valid || data.aud !== clientId || !['accounts.google.com', 'https://accounts.google.com'].includes(data.iss) ||
      !Number.isFinite(data.exp) || data.exp <= now || !Number.isFinite(data.iat) || data.iat > now + 60 ||
      !/^\d{5,30}$/.test(String(data.sub)) || data.email_verified !== true || typeof data.email !== 'string') {
    throw new Error('Google sign-in token is invalid.');
  }
  return { kind: 'google', id: String(data.sub), login: data.email };
}

async function finishGoogleLogin(request, env, origin) {
  const pendingHash = await readPendingKey(request, env.SESSION_SECRET);
  if (!pendingHash) return errorPage('Your key session expired. Enter your key again.', 403);
  const form = await request.formData();
  const csrf = String(form.get('g_csrf_token') || '');
  if (!csrf || csrf.length > 200 || csrf !== getCookie(request, 'g_csrf_token')) return errorPage('Google sign-in could not be verified. Try again.', 403);
  let identity;
  try { identity = await verifyGoogleCredential(form.get('credential'), env.GOOGLE_CLIENT_ID); }
  catch (error) { return errorPage(error.message, 403); }
  const status = await claimGoogleKeyHash(env.DB, pendingHash, identity.id);
  if (status !== 'claimed' && status !== 'owned') return keyPage('That key belongs to another account. Sign in with the Google account that first redeemed it.', 403);
  identity.keyHash = pendingHash;
  const session = await makeSession(identity, env.SESSION_SECRET);
  const response = redirect(`${origin}/app`, 303);
  response.headers.append('Set-Cookie', cookie('__Host-kp_link', '', 0, 'None'));
  response.headers.append('Set-Cookie', cookie('__Host-kp_key', '', 0, 'None'));
  response.headers.append('Set-Cookie', cookie('__Host-kp_session', session, SESSION_AGE, 'None'));
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

async function fetchUpstream(target, proxyOrigin) {
  let current = target;
  for (let i = 0; i < 6; i++) {
    if (current.origin === proxyOrigin) throw new Error('This link cannot be opened.');
    const response = await fetch(current.href, {
      redirect: 'manual',
      headers: { 'Accept': 'text/html,application/xhtml+xml,text/css,image/*,*/*;q=0.8', 'User-Agent': 'Mozilla/5.0 (compatible; KadensPropxy/1.0)' }
    });
    if (response.status >= 300 && response.status < 400 && response.headers.has('Location')) {
      current = normalizeTarget(response.headers.get('Location'), current.href);
      continue;
    }
    return { response, finalUrl: current };
  }
  throw new Error('This page redirected too many times.');
}

async function readLimited(response, limit) {
  if (Number(response.headers.get('Content-Length')) > limit) throw new Error('This page is too large for the proxy.');
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) throw new Error('This page is too large for the proxy.');
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

function routeUrl(raw, base, origin, route) {
  if (!raw || raw.trim().startsWith('#')) return raw;
  try {
    const target = normalizeTarget(raw, base);
    if (target.origin === origin) return null;
    return `${origin}/${route}?url=${encodeURIComponent(target.href)}`;
  } catch { return null; }
}

function rewriteCss(css, base, origin) {
  return css
    .replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi, (full, quote, raw) => {
      if (raw.startsWith('data:') || raw.startsWith('#')) return full;
      const next = routeUrl(raw, base, origin, 'asset');
      return next ? `url("${next}")` : 'url("")';
    })
    .replace(/@import\s+(['"])([^'"\s]+)\1/gi, (full, quote, raw) => {
      const next = routeUrl(raw, base, origin, 'asset');
      return next ? `@import "${next}"` : '';
    });
}

function proxyHeaders(type) {
  return {
    'Content-Type': type,
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; media-src 'self'; form-action 'self'; base-uri 'none'; script-src 'none'; frame-src 'none'"
  };
}

async function proxyPage(raw, origin) {
  const target = normalizeTarget(raw);
  if (target.origin === origin) return errorPage('This link cannot be opened.', 400);
  const { response, finalUrl } = await fetchUpstream(target, origin);
  const type = (response.headers.get('Content-Type') || '').toLowerCase();
  if (!type.includes('text/html') && !type.includes('application/xhtml+xml')) {
    return errorPage('This link is not an HTML page. Direct files are not supported here.', 415);
  }
  const body = new TextDecoder().decode(await readLimited(response, HTML_LIMIT));
  const source = new Response(body, { status: response.status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  const rewriter = new HTMLRewriter()
    .on('body', { element(e) {
      e.prepend(`<div style="position:sticky;top:0;z-index:2147483647;padding:10px 16px;background:#111;color:#fff;font:14px system-ui;border-bottom:1px solid #555"><a style="color:#eee;text-decoration:none;font-weight:700" href="${origin}/app">← isRecool</a> <span style="margin-left:12px;opacity:.75">${escapeHtml(finalUrl.hostname)}</span></div>`, { html: true });
    } })
    .on('script,iframe,object,embed,base', { element(e) { e.remove(); } })
    .on('meta[http-equiv]', { element(e) { e.remove(); } })
    .on('a[href]', { element(e) { const next = routeUrl(e.getAttribute('href'), finalUrl.href, origin, 'browse'); if (next) e.setAttribute('href', next); else if (next === null) e.removeAttribute('href'); e.removeAttribute('target'); } })
    .on('form', { element(e) { const action = routeUrl(e.getAttribute('action') || finalUrl.href, finalUrl.href, origin, 'form'); if (action) e.setAttribute('action', action); else e.removeAttribute('action'); e.setAttribute('method', 'get'); e.removeAttribute('target'); } })
    .on('link[href]', { element(e) { const next = routeUrl(e.getAttribute('href'), finalUrl.href, origin, 'asset'); if (next) e.setAttribute('href', next); else e.remove(); } })
    .on('[src]', { element(e) { const next = routeUrl(e.getAttribute('src'), finalUrl.href, origin, 'asset'); if (next) e.setAttribute('src', next); else e.removeAttribute('src'); } })
    .on('*', { element(e) {
      for (const [name] of e.attributes) if (name.toLowerCase().startsWith('on') || ['formaction', 'formmethod', 'formtarget'].includes(name.toLowerCase())) e.removeAttribute(name);
      if (e.hasAttribute('srcset')) e.removeAttribute('srcset');
      if (e.hasAttribute('style')) e.setAttribute('style', rewriteCss(e.getAttribute('style'), finalUrl.href, origin));
    } });
  const rewritten = rewriter.transform(source);
  const headers = new Headers(proxyHeaders('text/html; charset=utf-8'));
  headers.set('X-Proxied-URL', finalUrl.href);
  return new Response(rewritten.body, { status: response.status, headers });
}

async function proxyAsset(raw, origin) {
  const target = normalizeTarget(raw);
  if (target.origin === origin) return new Response('Invalid asset', { status: 400 });
  const { response, finalUrl } = await fetchUpstream(target, origin);
  const type = (response.headers.get('Content-Type') || '').split(';')[0].toLowerCase();
  const allowed = type.startsWith('image/') || type.startsWith('font/') || type.startsWith('audio/') ||
    type.startsWith('video/') || ['text/css', 'application/font-woff', 'application/font-woff2'].includes(type);
  if (!allowed || type === 'image/svg+xml') return new Response('Asset type blocked', { status: 415 });
  const body = await readLimited(response, ASSET_LIMIT);
  const headers = new Headers(proxyHeaders(type));
  if (type === 'text/css') return new Response(rewriteCss(new TextDecoder().decode(body), finalUrl.href, origin), { status: response.status, headers });
  return new Response(body, { status: response.status, headers });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const css = `
  :root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--ink:#f5f5ff;--muted:#aeb5d1;--line:#323751;--mint:#7ff0d3;--violet:#a78bfa}
  *{box-sizing:border-box}html{min-height:100%}body{margin:0;min-height:100vh;overflow-x:hidden;color:var(--ink);background:radial-gradient(ellipse 42% 48% at 6% 10%,#3a2f7866,transparent 72%),radial-gradient(ellipse 42% 50% at 98% 90%,#166c7166,transparent 70%),#090b18}
  body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.22;background-image:linear-gradient(#8890bd22 1px,transparent 1px),linear-gradient(90deg,#8890bd22 1px,transparent 1px);background-size:64px 64px;mask-image:linear-gradient(to bottom,black,transparent 88%)}
  a{color:inherit}button,input{font:inherit}button{cursor:pointer}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid var(--mint);outline-offset:4px}
  .frame{position:relative;width:min(1180px,calc(100% - 48px));margin:auto}.nav{height:94px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff20}.brand{display:inline-flex;align-items:center;gap:12px;text-decoration:none;font-size:19px;font-weight:800;letter-spacing:-.04em}.brand-mark{width:38px;height:38px;border:1px solid #c8baff80;border-radius:11px;display:grid;place-items:center;background:linear-gradient(145deg,#9e83ff,#5fdaeb);color:#101326;font-size:22px;font-weight:900;box-shadow:0 8px 30px #805dff55}.brand b{color:var(--mint)}.nav-status{display:inline-flex;gap:9px;align-items:center;color:#c8d0e8;font-size:11px;font-weight:800;letter-spacing:.19em}.nav-status:before,.eyebrow:before{content:"";width:7px;height:7px;flex:none;border-radius:50%;background:var(--mint);box-shadow:0 0 16px var(--mint)}
  main{min-height:calc(100vh - 160px)}.layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,475px);gap:clamp(42px,9vw,130px);align-items:center;padding:clamp(65px,10vh,125px) 0 90px}.eyebrow{display:flex;align-items:center;gap:12px;color:#c4b4ff;font-size:11px;font-weight:800;letter-spacing:.23em;text-transform:uppercase}.hero h1,.error-content h1{font-size:clamp(54px,6.7vw,94px);line-height:.99;letter-spacing:-.075em;margin:24px 0 25px;font-weight:850}.hero h1 span{background:linear-gradient(100deg,#cbbcff 5%,#7ff0d3 88%);color:transparent;background-clip:text}.lede{max-width:530px;color:var(--muted);font-size:18px;line-height:1.72}.features{display:flex;flex-wrap:wrap;gap:12px;margin-top:38px}.feature{border:1px solid #47465d;background:#ffffff08;border-radius:999px;padding:10px 14px;color:#d1d4e7;font-size:12px;font-weight:650}.feature strong{color:var(--mint);font-weight:800;margin-right:7px}
  .panel{padding:30px;border:1px solid #ffffff30;border-radius:28px;background:linear-gradient(145deg,#1b1d35ee,#111525f5 72%);box-shadow:0 32px 100px #0008,inset 0 1px #ffffff1a;position:relative;overflow:hidden}.panel:before{content:"";position:absolute;width:240px;height:240px;right:-120px;top:-135px;background:#866bff55;filter:blur(78px);pointer-events:none}.panel>*{position:relative}.panel-top{display:flex;align-items:center;justify-content:space-between;gap:12px;color:#bfc4dd;font-size:12px;font-weight:800;letter-spacing:.13em}.account{max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px solid #69617e;background:#ffffff09;border-radius:999px;padding:8px 12px;color:#eee9ff;letter-spacing:0;font-weight:700}.glyph{width:54px;height:54px;display:grid;place-items:center;margin:42px 0 22px;border:1px solid #b4a3ff70;border-radius:18px;background:linear-gradient(145deg,#7861c9,#3a6576);color:white;font-size:28px;box-shadow:0 14px 34px #8d72ff33}.panel h2{font-size:30px;letter-spacing:-.055em;line-height:1.1;margin:0 0 10px}.panel p{color:var(--muted);line-height:1.6;margin:0 0 25px;font-size:14px}.panel label{display:block;color:#e7e9f8;font-size:13px;font-weight:750;margin-bottom:10px}.panel input:not([type=hidden]){width:100%;height:55px;padding:0 17px;border:1px solid #62657f;border-radius:13px;background:#0c1021;color:white;box-shadow:inset 0 1px 4px #0005}.panel input::placeholder{color:#7e849e}.primary{display:flex;justify-content:space-between;align-items:center;width:100%;min-height:55px;margin-top:14px;padding:0 18px;border:0;border-radius:13px;background:linear-gradient(105deg,#96f3d4,#82d9ef);color:#0c2331;font-weight:850;box-shadow:0 12px 30px #56dcc42a;transition:transform .2s,filter .2s}.primary:hover{transform:translateY(-2px);filter:brightness(1.05)}.primary span{font-size:21px}.panel-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:30px;padding-top:22px;border-top:1px solid #ffffff1c;color:#969dbb;font-size:12px}.logout{margin:0}.logout button{border:0;background:none;padding:7px 0;color:#c8b4ff;font-size:12px;font-weight:750}.logout button:hover{text-decoration:underline}.alert{padding:12px 14px;margin-bottom:20px;border:1px solid #e587a266;border-radius:11px;background:#79334b55;color:#ffd8e0;font-size:13px;line-height:1.5}.text-link{color:var(--mint);text-decoration:none}.text-link:hover{text-decoration:underline}
  .error-content{max-width:800px;padding:clamp(72px,12vh,135px) 0}.error-content h1{font-size:clamp(50px,7vw,88px)}.error-content p{max-width:560px;color:var(--muted);font-size:18px;line-height:1.7}.error-content .reason{display:inline-block;margin:18px 0 12px;padding:13px 17px;border:1px solid #ffffff2b;border-radius:12px;background:#ffffff0b;color:#f0eaff;font-size:14px}.back-link{display:inline-flex;align-items:center;gap:12px;margin-top:28px;padding:15px 21px;border-radius:12px;background:var(--mint);color:#0c2331;text-decoration:none;font-weight:850}.back-link:hover{filter:brightness(1.1)}.footer{padding:0 0 32px;color:#79809d;font-size:12px}
  @media(max-width:800px){.frame{width:min(620px,calc(100% - 36px))}.nav{height:75px}.nav-status{font-size:9px;letter-spacing:.1em}.layout{grid-template-columns:1fr;gap:38px;padding:60px 0 70px}.hero h1{font-size:clamp(54px,12vw,75px)}.lede{font-size:16px}.features{margin-top:26px}.panel{padding:25px}.glyph{margin-top:28px}.error-content{padding:80px 0}}
  @media(max-width:430px){.nav-status{display:none}.hero h1{font-size:53px}.panel-top{font-size:10px}.account{max-width:140px}.panel-foot{align-items:flex-start}.footer{line-height:1.5}}
  :root{--ink:#f7f7f7;--muted:#aaa;--line:#4d4d4d;--mint:#f5f5f5;--violet:#ccc}
  body{background:radial-gradient(ellipse 45% 50% at 2% 5%,#29292966,transparent 75%),#080808}
  body:before{opacity:.14;background-image:linear-gradient(#bcbcbc22 1px,transparent 1px),linear-gradient(90deg,#bcbcbc22 1px,transparent 1px)}
  .brand-mark{border-color:#eee;background:#ececec;color:#080808;box-shadow:none}
  .brand-mark svg{width:27px;height:27px;fill:none;stroke:currentColor;stroke-width:6;stroke-linejoin:round}
  .brand b,.nav-status,.eyebrow,.feature strong,.text-link,.logout button{color:#e4e4e4}
  .nav-status:before,.eyebrow:before{background:#fff;box-shadow:0 0 13px #aaa}
  .hero h1 span{background:linear-gradient(100deg,#fff,#9c9c9c);background-clip:text;color:transparent}
  .feature{border-color:#6b6b6b;background:#ffffff08;color:#ddd}
  .panel{border-color:#777;background:linear-gradient(145deg,#1c1c1c,#101010 72%);box-shadow:0 32px 100px #000a,inset 0 1px #ffffff1a}
  .panel:before{background:#d8d8d833}
  .panel-top,.account,.panel label{color:#e8e8e8}
  .account{border-color:#777;background:#ffffff0d}
  .glyph{border-color:#ddd;background:linear-gradient(145deg,#777,#333);box-shadow:0 14px 34px #ffffff12}
  .panel input:not([type=hidden]){border-color:#777;background:#0a0a0a}
  .panel input::placeholder,.panel-foot,.footer{color:#aaa}
  .primary,.back-link{background:#f1f1f1;color:#0a0a0a;box-shadow:0 12px 30px #ffffff15}
  .alert{border-color:#aaa;background:#ffffff12;color:#eee}
  .error-content .reason{border-color:#777;background:#ffffff0b;color:#eee}
`;

const star = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8 88 72H12Z M50 92 12 28h76Z"/></svg>';
const searchIcon = '<span class="search-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.7" cy="10.7" r="6.8"/><path d="m16 16 5 5"/></svg></span>';

function page(title, content, status = 200, googleScript = false, localScript = false) {
  const shell = `<div class="shell"><header class="top"><a class="brand" href="/app"><span class="mark">${star}</span><span>isRecool</span></a><span class="top-note">PRIVATE WEB</span></header><main>${content}</main></div>`;
  const headers = new Headers(proxyHeaders('text/html; charset=utf-8'));
  if (localScript) headers.set('Content-Security-Policy', headers.get('Content-Security-Policy').replace("script-src 'none'", "script-src 'self'").replace("form-action 'self'", 'form-action https:'));
  if (googleScript) {
    headers.set('Content-Security-Policy', "default-src 'none'; script-src https://accounts.google.com/gsi/client https://*.gstatic.com; frame-src https://accounts.google.com; connect-src https://accounts.google.com https://*.gstatic.com; img-src data: https://accounts.google.com https://*.googleusercontent.com; style-src 'unsafe-inline' https://accounts.google.com https://*.gstatic.com; form-action 'self' https://accounts.google.com; base-uri 'none'; frame-ancestors 'none'");
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · isRecool</title><style>${modernCss}</style>${googleScript ? '<script src="https://accounts.google.com/gsi/client" async defer></script>' : ''}${localScript ? '<script src="/ui.js" defer></script>' : ''}</head><body>${shell}</body></html>`, { status, headers });
}

function googleWidget(env, origin) {
  return `<div class="google-wrap"><div id="g_id_onload" data-client_id="${escapeHtml(env.GOOGLE_CLIENT_ID)}" data-context="signin" data-ux_mode="redirect" data-login_uri="${escapeHtml(origin)}/oauth/google/callback" data-auto_prompt="false"></div><div class="g_id_signin" data-type="standard" data-shape="rectangular" data-theme="outline" data-text="signin_with" data-size="large" data-logo_alignment="left"></div></div>`;
}

function googleLoginPage(env, origin) {
  return page('Sign in', `<section class="center"><div class="overline">isRecool / 02 — account</div><h1>Your account.</h1><p class="subhead">Sign in with the Google account that owns this key. If this key is new, the account you choose will claim it.</p>${googleWidget(env, origin)}<div class="actions"><a class="chip" href="/login">Use a different key</a></div></section>`, 200, true);
}

function keyPage(error = '', status = 200) {
  return page('Enter key', `<section class="center"><div class="overline">isRecool / 01 — access</div><h1>Enter your key.</h1><p class="subhead">Your key is checked before Google sign-in. A new key belongs to the first Google account that signs in with it.</p>${error ? `<div class="alert" role="alert">${escapeHtml(error)}</div>` : ''}<form action="/access" method="post"><label class="overline" for="key">Access key</label><input class="key-input" id="key" name="key" type="password" maxlength="100" required autocomplete="off" placeholder="Paste your key" autofocus><button class="key-submit" type="submit">Continue →</button></form></section>`, status);
}

function privacyPage() {
  return page('Privacy', `<section class="center"><div class="overline">isRecool / Privacy</div><h1 class="error-title">Privacy.</h1><p class="subhead">isRecool uses your Google account ID to keep your redeemed key tied to your account. It stores a hash of the key and that account ID in Cloudflare D1. Your email appears only in a signed browser session cookie and on the account screen.</p><p class="subhead">When you open a link, the service handles the address and page data to relay that public website. It uses short-lived launch tickets and session cookies. The websites you visit may collect information under their own policies. Cloudflare provides hosting and may process request data. isRecool does not sell your account information.</p><p class="subhead">For questions about your data, contact <a href="mailto:jamisonkaden7@gmail.com">jamisonkaden7@gmail.com</a>.</p><div class="actions"><a class="chip" href="/app">← Back to isRecool</a></div></section>`, 200);
}

async function linkPage(user, env, formToken, origin) {
  const response = page('Link Google', `<section class="center"><div class="overline">isRecool / account</div><h1>Link Google.</h1><p class="subhead">The key claimed by <strong>${escapeHtml(user.login)}</strong> will be linked to the Google account you choose.</p>${googleWidget(env, origin)}<div class="identity">${logoutForm(formToken)}</div></section>`, 200, true);
  response.headers.append('Set-Cookie', cookie('__Host-kp_link', '1', 600, 'None'));
  response.headers.append('Set-Cookie', cookie('__Host-kp_session', await makeSession(user, env.SESSION_SECRET), SESSION_AGE, 'None'));
  return response;
}

function errorPage(message, status) {
  return page('Could not open page', `<section class="center"><div class="overline">isRecool / error</div><h1 class="error-title">Couldn’t open it.</h1><p class="reason">${escapeHtml(message)}</p><div class="actions"><a class="chip" href="/app">Back to isRecool ↗</a></div></section>`, status);
}

function logoutForm(formToken) {
  return `<form action="/logout" method="post"><input type="hidden" name="form_token" value="${formToken}"><button class="chip" type="submit">Sign out</button></form>`;
}

function claimPage(user, formToken, error = '', status = 200) {
  return page('Claim a key', `<section class="center"><div class="overline">isRecool / access</div><h1>Redeem key.</h1><p class="subhead">A key can be used once and stays with this Google account.</p>${error ? `<div class="alert" role="alert">${escapeHtml(error)}</div>` : ''}<form action="/claim" method="post"><input type="hidden" name="form_token" value="${formToken}"><label class="overline" for="key">Invite key</label><input class="key-input" id="key" name="key" type="password" maxlength="100" required autocomplete="off" placeholder="Paste your key" autofocus><button class="key-submit" type="submit">Redeem ↗</button></form><div class="identity">Signed in as <strong>${escapeHtml(user.login)}</strong></div><div class="actions">${logoutForm(formToken)}</div></section>`, status);
}

function appPage(user, env, formToken, pending = '') {
  const response = page('Browse', `<section class="center"><div class="overline">isRecool / browse</div><h1>Where to?</h1><p class="subhead">Enter a website or search for something.</p><form class="search" action="/browse" method="get">${searchIcon}<input id="url" name="url" type="text" inputmode="url" aria-label="Website address or search" placeholder="Search or enter an address" value="${escapeHtml(pending)}" required autocomplete="off" spellcheck="false" autofocus><button class="go" type="submit" aria-label="Open">↗</button></form><p class="helper"><span>Sites open through isRecool when supported.</span><span>Press Enter to open</span></p><div class="identity"><span>Signed in as <strong>${escapeHtml(user.login)}</strong></span>${logoutForm(formToken)}</div></section>`, 200, false, true);
  if (env.RELAY_URL) {
    const relayOrigin = new URL(env.RELAY_URL).origin;
    response.headers.set('Link', `<${relayOrigin}>; rel=preconnect`);
    response.headers.set('Content-Security-Policy', `${response.headers.get('Content-Security-Policy')}; connect-src ${relayOrigin}`);
  }
  return response;
}

function googleChoicePage(target) {
  const query = target.searchParams.get('q') || '';
  return page('Search', `<section class="center"><div class="overline">isRecool / search</div><h1>Find anything.</h1><p class="subhead">Search the web inside isRecool. Results are provided by DuckDuckGo.</p><form class="search" action="/search" method="get">${searchIcon}<input id="q" name="q" type="text" aria-label="Search the web" placeholder="What are you looking for?" value="${escapeHtml(query)}" required autocomplete="off" autofocus><button class="go" type="submit" aria-label="Search">↗</button></form><p class="helper"><span>Private search, no extra steps.</span><span>Press Enter to search</span></p></section>`, 200, false, true);
}
