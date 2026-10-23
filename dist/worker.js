// Bundled for the Cloudflare dashboard editor. Source: src/core.js + src/worker.js
const coreEncoder = new TextEncoder();

function normalizeTarget(input, base) {
  const raw = String(input || '').trim();
  if (!raw || raw.length > 2048) throw new Error('Enter a URL under 2,048 characters.');
  let url;
  try { url = new URL(raw, base); } catch { throw new Error('Enter a valid URL.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS links are supported.');
  if (url.username || url.password) throw new Error('URLs with embedded credentials are not supported.');
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Private hosts cannot be opened.');
  }
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('Only standard web ports are supported.');
  if (isPrivateIp(host)) throw new Error('Private IP addresses cannot be opened.');
  url.hash = '';
  return url;
}

function isPrivateIp(host) {
  if (host.startsWith('[') || host.includes(':')) return true; // Block all IPv6 literals.
  if (!/^\d+(?:\.\d+){3}$/.test(host)) return false;
  const parts = host.split('.').map(Number);
  if (parts.some(n => n > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
}

async function hashKey(key) {
  const bytes = await crypto.subtle.digest('SHA-256', coreEncoder.encode(key.trim()));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
}

async function claimKey(db, key, userId) {
  if (!key || key.length > 100) return 'invalid';
  const hash = await hashKey(key);
  const update = await db.prepare(
    'UPDATE access_keys SET github_user_id = ?, claimed_at = CURRENT_TIMESTAMP WHERE key_hash = ? AND github_user_id IS NULL'
  ).bind(userId, hash).run();
  if (update.meta.changes === 1) return 'claimed';
  const row = await db.prepare('SELECT github_user_id FROM access_keys WHERE key_hash = ?').bind(hash).first();
  if (!row) return 'invalid';
  return Number(row.github_user_id) === Number(userId) ? 'owned' : 'taken';
}

async function hasAccess(db, userId) {
  const row = await db.prepare('SELECT 1 AS allowed FROM access_keys WHERE github_user_id = ? LIMIT 1').bind(userId).first();
  return Boolean(row);
}

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
        if (!user) return redirect(`${origin}/login`, 303);
        const form = await request.formData();
        if (!(await validFormToken(request, env.SESSION_SECRET, form))) return errorPage('This form could not be verified. Please go back and try again.', 403);
        const response = redirect(`${origin}/app`, 303);
        response.headers.set('Set-Cookie', cookie('__Host-kp_session', '', 0));
        return response;
      }
      if (path === '/' && request.method === 'GET') return Response.redirect(`${origin}/app`, 302);
      if (path === '/app' && request.method === 'GET') {
        if (!user) return Response.redirect(`${origin}/login`, 302);
        const formToken = await makeFormToken(request, env.SESSION_SECRET);
        return (await hasAccess(env.DB, user.id)) ? appPage(user, env, formToken) : claimPage(user, formToken);
      }
      if (path === '/claim' && request.method === 'POST') {
        if (!user) return Response.redirect(`${origin}/login`, 303);
        const form = await request.formData();
        if (!(await validFormToken(request, env.SESSION_SECRET, form))) return errorPage('This form could not be verified. Please go back and try again.', 403);
        const key = String(form.get('key') || '').trim();
        const status = await claimKey(env.DB, key, user.id);
        if (status === 'claimed' || status === 'owned') return Response.redirect(`${origin}/app`, 303);
        const formToken = await makeFormToken(request, env.SESSION_SECRET);
        return claimPage(user, formToken, status === 'taken' ? 'That key has already been claimed by another account.' : 'That key is not valid.', 400);
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
`;

function page(title, content, status = 200) {
  const shell = `<div class="frame"><header class="nav"><a class="brand" href="/app"><span class="brand-mark">K</span><span>Kadens <b>propxy</b></span></a><span class="nav-status">PRIVATE BROWSING SPACE</span></header><main>${content}</main><footer class="footer">Kadens propxy · Public pages work best</footer></div>`;
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escapeHtml(title)} · Kadens propxy</title><style>${css}</style></head><body>${shell}</body></html>`, {
    status, headers: proxyHeaders('text/html; charset=utf-8')
  });
}

function errorPage(message, status) {
  return page('Could not open page', `<section class="error-content"><div class="eyebrow">A small detour</div><h1>That link hit<br>a snag.</h1><p>We could not complete that request. Here is what happened:</p><div class="reason">${escapeHtml(message)}</div><br><a class="back-link" href="/app">Back to Kadens propxy <span aria-hidden="true">↗</span></a></section>`, status);
}

function logoutForm(formToken) {
  return `<form class="logout" action="/logout" method="post"><input type="hidden" name="form_token" value="${formToken}"><button type="submit">Sign out</button></form>`;
}

function claimPage(user, formToken, error = '', status = 200) {
  return page('Claim a key', `<div class="layout"><section class="hero"><div class="eyebrow">Your private pass starts here</div><h1>One key.<br><span>Your space.</span></h1><p class="lede">Sign in once, claim your invite, and keep your browsing space tied to your GitHub account.</p><div class="features"><span class="feature"><strong>01</strong> Account-bound access</span><span class="feature"><strong>02</strong> One-time claim</span></div></section><section class="panel"><div class="panel-top"><span>ACCESS / 01 OF 02</span><span class="account">@${escapeHtml(user.login)}</span></div><div class="glyph" aria-hidden="true">✦</div><h2>Unlock your access</h2><p>Enter one of the two invite keys. The first GitHub account to claim a key keeps it.</p>${error ? `<div class="alert" role="alert">${escapeHtml(error)}</div>` : ''}<form action="/claim" method="post"><input type="hidden" name="form_token" value="${formToken}"><label for="key">Invite key</label><input id="key" name="key" type="password" maxlength="100" required autocomplete="off" placeholder="Paste your key here" autofocus><button class="primary" type="submit">Claim access <span aria-hidden="true">↗</span></button></form><div class="panel-foot"><span>Signed in as @${escapeHtml(user.login)}</span>${logoutForm(formToken)}</div></section></div>`, status);
}

function appPage(user, env, formToken) {
  const home = env.SITE_URL && !env.SITE_URL.includes('YOUR-GITHUB-USERNAME') ? `<a class="text-link" href="${escapeHtml(env.SITE_URL)}">View launch page ↗</a>` : 'Your browsing space is ready';
  return page('Browse', `<div class="layout"><section class="hero"><div class="eyebrow">Access unlocked</div><h1>Pick a link.<br><span>Go explore.</span></h1><p class="lede">Paste a public website address and open it in your private browsing space.</p><div class="features"><span class="feature"><strong>✓</strong> Key claimed</span><span class="feature"><strong>↗</strong> Ready to browse</span></div></section><section class="panel"><div class="panel-top"><span>BROWSE / 02 OF 02</span><span class="account">@${escapeHtml(user.login)}</span></div><div class="glyph" aria-hidden="true">↗</div><h2>Where to next?</h2><p>Enter an HTTP or HTTPS link below. Public pages and articles work best.</p><form action="/browse" method="get"><label for="url">Website address</label><input id="url" name="url" type="url" inputmode="url" placeholder="https://example.com" required autofocus><button class="primary" type="submit">Open website <span aria-hidden="true">↗</span></button></form><div class="panel-foot"><span>${home}</span>${logoutForm(formToken)}</div></section></div>`, 200);
}
