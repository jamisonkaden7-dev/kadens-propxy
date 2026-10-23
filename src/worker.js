import { claimKey, hasAccess, normalizeTarget } from './core.js';

const SESSION_AGE = 7 * 24 * 60 * 60;
const HTML_LIMIT = 2 * 1024 * 1024;
const ASSET_LIMIT = 8 * 1024 * 1024;
const encoder = new TextEncoder();

export default {
  async fetch(request, env) {
    try {
      if (!env.DB || !env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_SECRET) {
        return page('Setup incomplete', '<p>Configure the database and Worker secrets before opening this site.</p>', 503);
      }
      const url = new URL(request.url);
      const origin = url.origin;
      const path = url.pathname;
      if (path === '/login' && request.method === 'GET') return startLogin(env, origin);
      if (path === '/oauth/callback' && request.method === 'GET') return finishLogin(request, env, origin);

      const user = await readSession(request, env.SESSION_SECRET);
      if (path === '/logout' && request.method === 'POST') {
        if (!sameOriginPost(request, origin)) return errorPage('Request blocked', 403);
        const response = redirect(`${origin}/app`, 303);
        response.headers.set('Set-Cookie', cookie('__Host-kp_session', '', 0));
        return response;
      }
      if (path === '/' && request.method === 'GET') return Response.redirect(`${origin}/app`, 302);
      if (path === '/app' && request.method === 'GET') {
        if (!user) return Response.redirect(`${origin}/login`, 302);
        return (await hasAccess(env.DB, user.id)) ? appPage(user, env) : claimPage(user);
      }
      if (path === '/claim' && request.method === 'POST') {
        if (!user) return Response.redirect(`${origin}/login`, 303);
        if (!sameOriginPost(request, origin)) return errorPage('Request blocked', 403);
        const form = await request.formData();
        const key = String(form.get('key') || '').trim();
        const status = await claimKey(env.DB, key, user.id);
        if (status === 'claimed' || status === 'owned') return Response.redirect(`${origin}/app`, 303);
        return claimPage(user, status === 'taken' ? 'That key has already been claimed by another account.' : 'That key is not valid.', 400);
      }
      if (path === '/browse' && request.method === 'GET') {
        if (!user) return Response.redirect(`${origin}/login`, 302);
        if (!(await hasAccess(env.DB, user.id))) return Response.redirect(`${origin}/app`, 302);
        return proxyPage(url.searchParams.get('url'), origin);
      }
      if (path === '/asset' && request.method === 'GET') {
        if (!user || !(await hasAccess(env.DB, user.id))) return new Response('Unauthorized', { status: 401 });
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
      return errorPage(message, message.includes('URL') || message.includes('link') || message.includes('host') ? 400 : 502);
    }
  }
};

function sameOriginPost(request, origin) {
  return request.headers.get('Origin') === origin;
}

function redirect(location, status) {
  return new Response(null, { status, headers: { Location: location } });
}

function cookie(name, value, age) {
  return `${name}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Lax`;
}

function getCookie(request, name) {
  const part = (request.headers.get('Cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${name}=`));
  return part ? part.slice(name.length + 1) : null;
}

function b64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64url(value) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function makeSession(identity, secret) {
  const payload = b64url(encoder.encode(JSON.stringify({ id: identity.id, login: identity.login, exp: Math.floor(Date.now() / 1000) + SESSION_AGE })));
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
    if (!Number.isSafeInteger(data.id) || typeof data.login !== 'string' || !Number.isFinite(data.exp) || data.exp < Date.now() / 1000) return null;
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
  response.headers.append('Set-Cookie', cookie('__Host-kp_session', session, SESSION_AGE));
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
      e.prepend(`<div style="position:sticky;top:0;z-index:2147483647;padding:10px 16px;background:#101a34;color:#fff;font:14px system-ui;border-bottom:1px solid #375079"><a style="color:#65e3d0;text-decoration:none;font-weight:700" href="${origin}/app">← Kadens propxy</a> <span style="margin-left:12px;opacity:.75">${escapeHtml(finalUrl.hostname)}</span></div>`, { html: true });
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
  :root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif}*{box-sizing:border-box}
  body{margin:0;min-height:100vh;color:#edf4ff;background:radial-gradient(circle at 15% 0,#203c79,transparent 35%),#080e20}
  main{width:min(680px,calc(100% - 32px));margin:9vh auto;padding:38px;border:1px solid #375079;border-radius:22px;background:#101a34}
  h1{font-size:clamp(2rem,6vw,3.4rem);letter-spacing:-.055em;margin:0 0 12px}p{color:#b9c9e1;line-height:1.6}
  form{margin-top:25px}label{display:block;font-weight:700;margin:0 0 9px}input{width:100%;padding:15px 16px;border:1px solid #51678b;border-radius:10px;background:#0a1226;color:#fff;font:inherit}
  button,.button{display:inline-block;margin-top:14px;padding:13px 21px;border:0;border-radius:10px;background:#65e3d0;color:#09233a;font:inherit;font-weight:800;text-decoration:none;cursor:pointer}
  button:hover,.button:hover{background:#89f3e3}.muted{font-size:.92rem;color:#8fa4c6}.alert{padding:12px 15px;border-radius:10px;background:#663047;color:#fff}
  .row{display:flex;justify-content:space-between;align-items:center;gap:12px}.logout{margin:0}.logout button{margin:0;background:transparent;color:#b9c9e1;border:1px solid #51678b}
`;

function page(title, content, status = 200) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escapeHtml(title)} · Kadens propxy</title><style>${css}</style></head><body><main>${content}</main></body></html>`, {
    status, headers: proxyHeaders('text/html; charset=utf-8')
  });
}

function errorPage(message, status) {
  return page('Error', `<h1>Could not open page</h1><p>${escapeHtml(message)}</p><a class="button" href="/app">Back to Kadens propxy</a>`, status);
}

function claimPage(user, error = '', status = 200) {
  return page('Claim a key', `<div class="row"><strong>Kadens propxy</strong><form class="logout" action="/logout" method="post"><button type="submit">Sign out</button></form></div><h1>Claim your key</h1><p>Signed in as <strong>${escapeHtml(user.login)}</strong>. Each key can be claimed by one GitHub account. After claiming it, only that account can enter.</p>${error ? `<p class="alert">${escapeHtml(error)}</p>` : ''}<form action="/claim" method="post"><label for="key">Access key</label><input id="key" name="key" type="password" maxlength="100" required autocomplete="off"><button type="submit">Claim key</button></form><p class="muted">A key already claimed by your account continues to work for you.</p>`, status);
}

function appPage(user, env) {
  const home = env.SITE_URL && !env.SITE_URL.includes('YOUR-GITHUB-USERNAME') ? `<a href="${escapeHtml(env.SITE_URL)}">GitHub Pages home</a> · ` : '';
  return page('Browse', `<div class="row"><strong>Kadens propxy</strong><form class="logout" action="/logout" method="post"><button type="submit">Sign out</button></form></div><h1>Where to?</h1><p>Signed in as <strong>${escapeHtml(user.login)}</strong>. Paste an HTTP or HTTPS link to open it through the proxy.</p><form action="/browse" method="get"><label for="url">Website URL</label><input id="url" name="url" type="url" inputmode="url" placeholder="https://example.com" required autofocus><button type="submit">Open website</button></form><p class="muted">${home}Static pages work best. JavaScript, accounts, video streams, and some interactive sites may not work.</p>`);
}
