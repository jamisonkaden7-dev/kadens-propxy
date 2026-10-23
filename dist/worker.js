// Bundled for Cloudflare Quick Edit. Source: src/core.js + src/ui.js + src/worker.js
const coreEncoder = new TextEncoder();

function normalizeTarget(input, base, maxLength = 2048) {
  let raw = String(input || '').trim();
  if (!raw || raw.length > maxLength) throw new Error(`Enter a URL under ${maxLength.toLocaleString('en-US')} characters.`);
  if (!base && !/^[a-z][a-z\d+.-]*:\/\//i.test(raw) && /^[^\s/]+\.[^\s/]+(?:[/?#]|$)/.test(raw)) raw = `https://${raw}`;
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

function resolveDestination(input) {
  const raw = String(input || '').trim();
  if (!raw) throw new Error('Enter a website or search.');
  if (/\s/.test(raw) || (!raw.includes('.') && !raw.includes('://'))) {
    return normalizeTarget(`https://duckduckgo.com/?q=${encodeURIComponent(raw)}`);
  }
  return normalizeTarget(raw);
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

async function claimGoogleKey(db, key, googleSub) {
  if (!key || key.length > 100 || !/^\d{5,30}$/.test(String(googleSub))) return 'invalid';
  const hash = await hashKey(key);
  const update = await db.prepare(
    'UPDATE access_keys SET google_sub = ?, claimed_at = CURRENT_TIMESTAMP WHERE key_hash = ? AND github_user_id IS NULL AND google_sub IS NULL'
  ).bind(String(googleSub), hash).run();
  if (update.meta.changes === 1) return 'claimed';
  const row = await db.prepare('SELECT google_sub FROM access_keys WHERE key_hash = ?').bind(hash).first();
  if (!row) return 'invalid';
  return row.google_sub === String(googleSub) ? 'owned' : 'taken';
}

async function hasGoogleAccess(db, googleSub) {
  const row = await db.prepare('SELECT 1 AS allowed FROM access_keys WHERE google_sub = ? LIMIT 1').bind(String(googleSub)).first();
  return Boolean(row);
}

async function linkGoogleKey(db, githubUserId, googleSub) {
  const update = await db.prepare(
    'UPDATE access_keys SET google_sub = ? WHERE github_user_id = ? AND google_sub IS NULL AND NOT EXISTS (SELECT 1 FROM access_keys WHERE google_sub = ?)'
  ).bind(String(googleSub), Number(githubUserId), String(googleSub)).run();
  if (update.meta.changes === 1) return 'linked';
  const row = await db.prepare('SELECT google_sub FROM access_keys WHERE github_user_id = ? LIMIT 1').bind(Number(githubUserId)).first();
  if (!row) return 'not-owned';
  return row.google_sub === String(googleSub) ? 'linked' : 'already-linked';
}

const modernCss = `
  :root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--bg:#070707;--fg:#f3f3f3;--dim:#a6a6a6;--line:#444}
  *{box-sizing:border-box}html{min-height:100%}body{margin:0;min-height:100vh;background:var(--bg);color:var(--fg);overflow-x:hidden}
  body:before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.28;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='92' height='92' viewBox='0 0 92 92'%3E%3Cg fill='none' stroke='%23989898' stroke-width='.8'%3E%3Cpath d='M46 9 51 18H41zM46 21 41 12h10z'/%3E%3Cpath d='M6 65 11 74H1zM6 77 1 68h10z'/%3E%3Cpath d='M80 56 85 65H75zM80 68 75 59h10z'/%3E%3C/g%3E%3C/svg%3E");mask-image:radial-gradient(ellipse 75% 80% at 50% 46%,#000,transparent)}
  body:after{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse 36% 35% at 50% 46%,#24242499,transparent 85%)}
  a{color:inherit}button,input{font:inherit}button{cursor:pointer}a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid #fff;outline-offset:4px}
  .shell{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column}.top{width:min(1480px,calc(100% - 72px));height:88px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff16}.brand{display:inline-flex;align-items:center;gap:11px;text-decoration:none;font-size:17px;font-weight:800;letter-spacing:-.04em}.mark{width:31px;height:31px;display:grid;place-items:center;border:1px solid #999;border-radius:8px;background:#e8e8e8;color:#111}.mark svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:6;stroke-linejoin:round}.top-note{font:600 10px/1 ui-monospace,monospace;letter-spacing:.23em;color:#a5a5a5}
  main{flex:1;display:grid;place-items:center;padding:50px 24px 75px}.center{width:min(820px,100%);text-align:center}.overline{display:inline-flex;align-items:center;gap:12px;color:#aaa;font:600 11px/1.3 ui-monospace,monospace;letter-spacing:.2em;text-transform:uppercase}.overline:before,.overline:after{content:"";width:18px;height:1px;background:#888}.hero-star{display:block;width:60px;height:60px;margin:0 auto 27px;fill:none;stroke:#ddd;stroke-width:4;filter:drop-shadow(0 0 16px #ffffff33)}h1{margin:18px 0 12px;font-size:clamp(64px,11vw,126px);line-height:.95;letter-spacing:-.085em;font-weight:820}.subhead{margin:0 auto 38px;max-width:630px;color:#b7b7b7;font-size:clamp(15px,2vw,18px);line-height:1.6}.search{display:flex;align-items:center;gap:12px;width:100%;height:74px;padding:8px;border:1px solid #727272;border-radius:18px;background:#171717;box-shadow:0 22px 90px #000b,inset 0 1px #ffffff20;transition:border-color .2s,box-shadow .2s}.search:focus-within{border-color:#f5f5f5;box-shadow:0 0 0 4px #ffffff13,0 22px 90px #000b}.search-icon{padding-left:17px;color:#bdbdbd;font-size:22px}.search input{flex:1;min-width:0;height:100%;border:0;outline:0;background:none;color:#f5f5f5;font-size:16px}.search input::placeholder{color:#8d8d8d}.go{height:56px;min-width:78px;padding:0 19px;border:0;border-radius:11px;background:#f0f0f0;color:#111;font-size:20px;font-weight:800;transition:transform .15s,background .15s}.go:hover{background:#fff;transform:translateY(-1px)}.helper{margin:15px auto 0;color:#868686;font-size:12px}.helper code{color:#bbb;font-size:11px}.actions{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:33px}.chip{display:inline-flex;align-items:center;justify-content:center;min-height:39px;padding:0 15px;border:1px solid #4a4a4a;border-radius:10px;background:#161616;color:#d0d0d0;text-decoration:none;font-size:12px;font-weight:650}.chip:hover{border-color:#999;background:#202020}.identity{margin-top:28px;color:#969696;font-size:12px}.identity strong{color:#e0e0e0;font-weight:700}.alert{margin:0 auto 22px;max-width:650px;padding:14px 18px;border:1px solid #888;border-radius:10px;background:#ffffff0b;color:#eee;text-align:left;font-size:13px}.key-input{width:min(570px,100%);height:60px;border:1px solid #777;border-radius:12px;background:#171717;color:#fff;padding:0 18px;font-size:16px}.key-submit{display:block;margin:13px auto 0;height:48px;border:0;border-radius:10px;background:#eee;color:#111;padding:0 25px;font-weight:750}.google-wrap{display:flex;justify-content:center;min-height:44px;margin:35px 0 12px}.info{margin:21px auto 0;color:#999;font-size:12px;line-height:1.6}.info a{color:#ddd}.foot{width:min(1480px,calc(100% - 72px));margin:auto;display:flex;justify-content:space-between;gap:18px;border-top:1px solid #ffffff16;padding:22px 0 28px;color:#777;font-size:11px}.foot a{text-decoration:none;color:#aaa}.foot form{display:inline}.foot button{border:0;background:none;color:#aaa;font-size:11px;padding:0}.foot button:hover,.foot a:hover{text-decoration:underline}
  .error-title{font-size:clamp(50px,9vw,96px)}.reason{margin:22px auto 0;max-width:600px;color:#c7c7c7;line-height:1.5}
  @media(max-width:700px){.top,.foot{width:calc(100% - 38px)}.top{height:70px}.top-note{font-size:8px;letter-spacing:.1em}.foot{flex-direction:column}.search{height:64px;border-radius:14px}.go{height:48px;min-width:54px;padding:0 12px}.search-icon{padding-left:9px}h1{font-size:clamp(60px,16vw,90px)}.subhead{margin-bottom:28px}}
  @media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

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
      if (path === '/login' && request.method === 'GET') return env.GOOGLE_CLIENT_ID ? googleLoginPage(env, origin) : startLogin(env, origin);
      if (path === '/login/github' && request.method === 'GET' && env.GITHUB_CLIENT_ID) return startLogin(env, origin);
      if (path === '/oauth/callback' && request.method === 'GET' && env.GITHUB_CLIENT_ID) return finishLogin(request, env, origin);
      if (path === '/oauth/google/callback' && request.method === 'POST' && env.GOOGLE_CLIENT_ID) return finishGoogleLogin(request, env, origin);

      const user = await readSession(request, env.SESSION_SECRET);
      if (path === '/logout' && request.method === 'POST') {
        if (!user) return redirect(`${origin}/login`, 303);
        const form = await request.formData();
        if (!(await validFormToken(request, env.SESSION_SECRET, form))) return errorPage('This form could not be verified. Please go back and try again.', 403);
        const response = redirect(`${origin}/app`, 303);
        response.headers.set('Set-Cookie', cookie('__Host-kp_session', '', 0));
        response.headers.append('Set-Cookie', cookie('__Host-kp_link', '', 0, 'None'));
        return response;
      }
      if (path === '/' && request.method === 'GET') return Response.redirect(`${origin}/app`, 302);
      if (path === '/app' && request.method === 'GET') {
        if (!user) return Response.redirect(`${origin}/login`, 302);
        const formToken = await makeFormToken(request, env.SESSION_SECRET);
        const pending = readPending(request);
        if (user.kind === 'google') return (await hasGoogleAccess(env.DB, user.id)) ? appPage(user, env, formToken, pending) : claimPage(user, formToken);
        if (env.GOOGLE_CLIENT_ID) return (await hasAccess(env.DB, user.id)) ? await linkPage(user, env, formToken, origin) : googleLoginPage(env, origin);
        return (await hasAccess(env.DB, user.id)) ? appPage(user, env, formToken, pending) : claimPage(user, formToken);
      }
      if (path === '/claim' && request.method === 'POST') {
        if (!user) return Response.redirect(`${origin}/login`, 303);
        const form = await request.formData();
        if (!(await validFormToken(request, env.SESSION_SECRET, form))) return errorPage('This form could not be verified. Please go back and try again.', 403);
        const key = String(form.get('key') || '').trim();
        if (env.GOOGLE_CLIENT_ID && user.kind !== 'google') return Response.redirect(`${origin}/app`, 303);
        const status = user.kind === 'google' ? await claimGoogleKey(env.DB, key, user.id) : await claimKey(env.DB, key, user.id);
        if (status === 'claimed' || status === 'owned') return Response.redirect(`${origin}/app`, 303);
        const formToken = await makeFormToken(request, env.SESSION_SECRET);
        return claimPage(user, formToken, status === 'taken' ? 'That key has already been claimed by another account.' : 'That key is not valid.', 400);
      }
      if (path === '/browse' && request.method === 'GET') {
        if (!user) {
          const response = Response.redirect(`${origin}/login`, 302);
          const pending = String(url.searchParams.get('url') || '').slice(0, 2048);
          if (pending) response.headers.set('Set-Cookie', cookie('__Host-kp_pending', encodeURIComponent(pending), 900));
          return response;
        }
        if (env.GOOGLE_CLIENT_ID && user.kind !== 'google') return Response.redirect(`${origin}/app`, 302);
        const allowed = user.kind === 'google' ? await hasGoogleAccess(env.DB, user.id) : await hasAccess(env.DB, user.id);
        if (!allowed) return Response.redirect(`${origin}/app`, 302);
        if (env.RELAY_URL) {
          const target = resolveDestination(url.searchParams.get('url'));
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
        if (!user || !(user.kind === 'google' ? await hasGoogleAccess(env.DB, user.id) : await hasAccess(env.DB, user.id))) return new Response('Unauthorized', { status: 401 });
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
  const payload = b64url(encoder.encode(JSON.stringify({ kind: identity.kind || 'github', id: identity.id, login: identity.login, exp: Math.floor(Date.now() / 1000) + SESSION_AGE })));
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
    if (data.kind === 'google' && !/^\d{5,30}$/.test(String(data.id))) return null;
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
  const form = await request.formData();
  const csrf = String(form.get('g_csrf_token') || '');
  if (!csrf || csrf.length > 200 || csrf !== getCookie(request, 'g_csrf_token')) return errorPage('Google sign-in could not be verified. Try again.', 403);
  let identity;
  try { identity = await verifyGoogleCredential(form.get('credential'), env.GOOGLE_CLIENT_ID); }
  catch (error) { return errorPage(error.message, 403); }
  const oldUser = await readSession(request, env.SESSION_SECRET);
  if (getCookie(request, '__Host-kp_link') === '1' && oldUser?.kind === 'github') {
    const linked = await linkGoogleKey(env.DB, oldUser.id, identity.id);
    if (linked !== 'linked') return errorPage('This Google account could not be linked to that claimed key.', 409);
  }
  const session = await makeSession(identity, env.SESSION_SECRET);
  const response = redirect(`${origin}/app`, 303);
  response.headers.append('Set-Cookie', cookie('__Host-kp_link', '', 0, 'None'));
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

function page(title, content, status = 200, googleScript = false) {
  const shell = `<div class="shell"><header class="top"><a class="brand" href="/app"><span class="mark">${star}</span><span>isRecool</span></a><span class="top-note">OPEN WEB / PRIVATE ACCESS</span></header><main>${content}</main><footer class="foot"><span>isRecool · Public websites work best</span><span><a href="/privacy">Privacy</a> &nbsp;·&nbsp; <a href="https://github.com/jamisonkaden7-dev/kadens-propxy">Source</a> &nbsp;·&nbsp; <a href="/app">Home</a></span></footer></div>`;
  const headers = new Headers(proxyHeaders('text/html; charset=utf-8'));
  if (googleScript) {
    headers.set('Content-Security-Policy', "default-src 'none'; script-src https://accounts.google.com/gsi/client https://*.gstatic.com; frame-src https://accounts.google.com; connect-src https://accounts.google.com https://*.gstatic.com; img-src data: https://accounts.google.com https://*.googleusercontent.com; style-src 'unsafe-inline' https://accounts.google.com https://*.gstatic.com; form-action 'self' https://accounts.google.com; base-uri 'none'; frame-ancestors 'none'");
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · isRecool</title><style>${modernCss}</style>${googleScript ? '<script src="https://accounts.google.com/gsi/client" async defer></script>' : ''}</head><body>${shell}</body></html>`, { status, headers });
}

function googleWidget(env, origin) {
  return `<div class="google-wrap"><div id="g_id_onload" data-client_id="${escapeHtml(env.GOOGLE_CLIENT_ID)}" data-context="signin" data-ux_mode="redirect" data-login_uri="${escapeHtml(origin)}/oauth/google/callback" data-auto_prompt="false"></div><div class="g_id_signin" data-type="standard" data-shape="rectangular" data-theme="outline" data-text="signin_with" data-size="large" data-logo_alignment="left"></div></div>`;
}

function googleLoginPage(env, origin) {
  return page('Sign in', `<section class="center">${star.replace('<svg ', '<svg class="hero-star" ')}<div class="overline">Your key, your Google account</div><h1>isRecool.</h1><p class="subhead">Sign in with the Google account that owns your invite key. Your browser will open websites as full pages.</p>${googleWidget(env, origin)}<div class="actions"><a class="chip" href="/login/github">Already claimed a key with GitHub? Link Google ↗</a></div><p class="info">Use Chrome or another standard browser if Google blocks sign-in inside an embedded browser.</p></section>`, 200, true);
}

function privacyPage() {
  return page('Privacy', `<section class="center"><div class="overline">isRecool / Privacy</div><h1 class="error-title">Privacy.</h1><p class="subhead">isRecool uses your Google account ID to keep your redeemed key tied to your account. It stores a hash of the key and that account ID in Cloudflare D1. Your email appears only in a signed browser session cookie and on the account screen.</p><p class="subhead">When you open a link, the service handles the address and page data to relay that public website. It uses short-lived launch tickets and session cookies. The websites you visit may collect information under their own policies. Cloudflare provides hosting and may process request data. isRecool does not sell your account information.</p><p class="subhead">For questions about your data, contact <a href="mailto:jamisonkaden7@gmail.com">jamisonkaden7@gmail.com</a>.</p><div class="actions"><a class="chip" href="/app">← Back to isRecool</a></div></section>`, 200);
}

async function linkPage(user, env, formToken, origin) {
  const response = page('Link Google', `<section class="center">${star.replace('<svg ', '<svg class="hero-star" ')}<div class="overline">Keep your existing key</div><h1>Link Google.</h1><p class="subhead">Your key is claimed by GitHub account <strong>${escapeHtml(user.login)}</strong>. Sign in with the Google account that should own it from now on.</p>${googleWidget(env, origin)}<p class="info">After linking, use this same Google account to open websites.</p><div class="identity">${logoutForm(formToken)}</div></section>`, 200, true);
  response.headers.append('Set-Cookie', cookie('__Host-kp_link', '1', 600, 'None'));
  response.headers.append('Set-Cookie', cookie('__Host-kp_session', await makeSession(user, env.SESSION_SECRET), SESSION_AGE, 'None'));
  return response;
}

function errorPage(message, status) {
  return page('Could not open page', `<section class="center"><div class="overline">isRecool / Error</div><h1 class="error-title">Couldn’t open it.</h1><p class="subhead">Check the address and try again.</p><p class="reason">${escapeHtml(message)}</p><div class="actions"><a class="chip" href="/app">← Back to isRecool</a></div></section>`, status);
}

function logoutForm(formToken) {
  return `<form action="/logout" method="post"><input type="hidden" name="form_token" value="${formToken}"><button class="chip" type="submit">Sign out</button></form>`;
}

function claimPage(user, formToken, error = '', status = 200) {
  return page('Claim a key', `<section class="center">${star.replace('<svg ', '<svg class="hero-star" ')}<div class="overline">One key / One account</div><h1>Claim access.</h1><p class="subhead">Redeem an invite key once. It stays with the account you’re signed in to.</p>${error ? `<div class="alert" role="alert">${escapeHtml(error)}</div>` : ''}<form action="/claim" method="post"><input type="hidden" name="form_token" value="${formToken}"><label class="overline" for="key">Invite key</label><div style="margin-top:15px"><input class="key-input" id="key" name="key" type="password" maxlength="100" required autocomplete="off" placeholder="Paste your key" autofocus></div><button class="key-submit" type="submit">Redeem key ↗</button></form><div class="identity">Signed in as <strong>${escapeHtml(user.login)}</strong></div><div class="actions">${logoutForm(formToken)}</div></section>`, status);
}

function appPage(user, env, formToken, pending = '') {
  return page('Browse', `<section class="center">${star.replace('<svg ', '<svg class="hero-star" ')}<div class="overline">Your gateway is ready</div><h1>isRecool.</h1><p class="subhead">Search or enter a website. It opens in this full browser page.</p><form class="search" action="/browse" method="get" target="_top"><label class="search-icon" for="url" aria-label="Website address">⌕</label><input id="url" name="url" type="text" inputmode="url" placeholder="Search or enter a URL" value="${escapeHtml(pending)}" required autocomplete="off" spellcheck="false" autofocus><button class="go" type="submit" aria-label="Open website">↗</button></form><p class="helper">Try <code>example.com</code>, a full URL, or a search phrase.</p><div class="actions"><a class="chip" href="/browse?url=https%3A%2F%2Fen.wikipedia.org%2F">Wikipedia ↗</a><a class="chip" href="/browse?url=https%3A%2F%2Fgithub.com%2F">GitHub ↗</a><a class="chip" href="/browse?url=https%3A%2F%2Fexample.com%2F">Example ↗</a></div><div class="identity">Key active · Signed in as <strong>${escapeHtml(user.login)}</strong></div><div class="actions">${logoutForm(formToken)}</div></section>`, 200);
}

