import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, createSign, generateKeyPairSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { claimKey, claimGoogleKey, hashKey, hasAccess, hasGoogleAccess, linkGoogleKey, normalizeTarget, resolveDestination } from '../src/core.js';
import worker from '../src/worker.js';
import relayWorker from '../relay/worker.js';
import { stripProxyFromQuery } from '../relay/upstream.js';

test('nested site callbacks stay absolute when the relay origin is removed', () => {
  const relayOrigin = 'https://relay.example.workers.dev';
  const returnTo = `${relayOrigin}/auth/callback?dest=${encodeURIComponent(`${relayOrigin}/https://poki.com/en/g/game`)}`;
  const target = new URL(`https://poki-auth.poki.com/self-service/registration/browser?return_to=${encodeURIComponent(returnTo)}`);
  const request = new Request(`${relayOrigin}/https://poki-auth.poki.com/`, { headers: { Referer: `${relayOrigin}/https://poki.com/en/g/game` } });
  const result = new URL(stripProxyFromQuery(target, relayOrigin, request));
  const callback = new URL(result.searchParams.get('return_to'));
  assert.equal(callback.href, 'https://poki.com/auth/callback?dest=https%3A%2F%2Fpoki.com%2Fen%2Fg%2Fgame');
});

const googleSub = '123456789012345678901';

function fakeDb(hashes) {
  const owners = new Map(hashes.map(hash => [hash, { github_user_id: null, google_sub: null }]));
  const tickets = new Map();
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (sql.startsWith('INSERT INTO') && sql.includes('relay_tickets')) {
                const [hash, owner, target, expires] = args;
                tickets.set(hash, { [sql.includes('google_relay_tickets') ? 'google_sub' : 'github_user_id']: owner, target_url: target, expires_at: expires });
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith('UPDATE access_keys SET github_user_id')) {
                const [owner, hash] = args;
                const row = owners.get(hash);
                if (!row || row.github_user_id !== null) return { meta: { changes: 0 } };
                row.github_user_id = owner;
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith('UPDATE access_keys SET google_sub = ?, claimed_at')) {
                const [owner, hash] = args;
                const row = owners.get(hash);
                if (!row || row.github_user_id !== null || row.google_sub !== null) return { meta: { changes: 0 } };
                row.google_sub = owner;
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith('UPDATE access_keys SET google_sub = ? WHERE github_user_id')) {
                const [sub, githubId] = args;
                const row = [...owners.values()].find(item => item.github_user_id === githubId && item.google_sub === null);
                if (!row || [...owners.values()].some(item => item.google_sub === sub)) return { meta: { changes: 0 } };
                row.google_sub = sub;
                return { meta: { changes: 1 } };
              }
              throw new Error(`Unexpected SQL: ${sql}`);
            },
            async first() {
              if (sql.includes('WHERE key_hash')) return owners.get(args[0]) || null;
              if (sql.includes('WHERE google_sub = ? AND key_hash = ?')) return owners.get(args[1])?.google_sub === String(args[0]) ? { allowed: 1 } : null;
              if (sql.includes('WHERE google_sub')) return [...owners.values()].some(item => item.google_sub === String(args[0])) ? { allowed: 1 } : null;
              if (sql.includes('WHERE github_user_id')) {
                const row = [...owners.values()].find(item => item.github_user_id === Number(args[0]));
                return row ? { allowed: 1, google_sub: row.google_sub } : null;
              }
              throw new Error(`Unexpected SQL: ${sql}`);
            },
            async all() {
              assert.match(sql, /^DELETE FROM .*relay_tickets/);
              const [hash, now] = args;
              const row = tickets.get(hash);
              if (!row || row.expires_at < now) return { results: [] };
              tickets.delete(hash);
              return { results: [row] };
            }
          };
        }
      };
    }
  };
}

test('invite keys bind once to the Google account that redeems them', async () => {
  const db = fakeDb([await hashKey('example-secret')]);
  assert.equal(await claimGoogleKey(db, 'example-secret', googleSub), 'claimed');
  assert.equal(await claimGoogleKey(db, 'example-secret', googleSub), 'owned');
  assert.equal(await claimGoogleKey(db, 'example-secret', '222222222222222222222'), 'taken');
  assert.equal(await hasGoogleAccess(db, googleSub), true);
  assert.equal(await hasGoogleAccess(db, '222222222222222222222'), false);
});

test('an existing GitHub claim can be linked to one Google account', async () => {
  const db = fakeDb([await hashKey('legacy-key')]);
  assert.equal(await claimKey(db, 'legacy-key', 101), 'claimed');
  assert.equal(await linkGoogleKey(db, 101, googleSub), 'linked');
  assert.equal(await hasGoogleAccess(db, googleSub), true);
  assert.equal(await linkGoogleKey(db, 101, '222222222222222222222'), 'already-linked');
  assert.equal(await hasAccess(db, 101), true);
});

test('address input accepts domains and searches but rejects private targets', () => {
  assert.equal(normalizeTarget('example.com/a').href, 'https://example.com/a');
  assert.equal(resolveDestination('google').href, 'https://www.google.com/');
  assert.equal(resolveDestination('YouTube').href, 'https://www.youtube.com/');
  assert.match(resolveDestination('school project').href, /^https:\/\/duckduckgo\.com\/\?q=/);
  for (const value of ['http://localhost/', 'http://127.0.0.1/', 'http://10.1.2.3/', 'http://192.168.0.1/', 'http://169.254.10.1/', 'http://[::1]/', 'file:///etc/passwd', 'https://user:pass@example.com/']) {
    assert.throws(() => normalizeTarget(value), value);
  }
});

test('GitHub Pages asks for a key before offering browsing', () => {
  const html = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
  assert.match(html, /<form class="search key-search" action="https:\/\/kadens-propxy\.jamisonkaden7\.workers\.dev\/access" method="post">/);
  assert.match(html, /name="key" type="password"/);
  assert.doesNotMatch(html, /name="url"/);
});

test('music search returns playable Deezer previews and permits the page request', async () => {
  const priorFetch = globalThis.fetch;
  const env = { DB: fakeDb([]), GOOGLE_CLIENT_ID: 'test-client', SESSION_SECRET: 'test-secret' };
  try {
    globalThis.fetch = async input => {
      assert.equal(new URL(input).origin, 'https://api.deezer.com');
      return Response.json({ data: [{ title: 'Sample song', artist: { name: 'Sample artist' }, album: { title: 'Sample album', cover_medium: 'https://cdn-images.dzcdn.net/cover.jpg' }, preview: 'https://cdnt-preview.dzcdn.net/sample.mp3', link: 'https://www.deezer.com/track/1' }] });
    };
    const api = await worker.fetch(new Request('https://app.example/music-api?q=sample'), env);
    assert.equal(api.status, 200);
    const data = await api.json();
    assert.equal(data.results[0].previewUrl, 'https://cdnt-preview.dzcdn.net/sample.mp3');
    const page = await worker.fetch(new Request('https://app.example/music'), env);
    assert.match(page.headers.get('Content-Security-Policy'), /connect-src 'self'/);
    assert.match(page.headers.get('Content-Security-Policy'), /media-src[^;]*cdnt-preview\.dzcdn\.net/);
  } finally { globalThis.fetch = priorFetch; }
});

test('key-first Google sign-in, account binding, sign-out, and full-page relay launch', async () => {
  const origin = 'https://kadens-propxy.example.workers.dev';
  const relayOrigin = 'https://kadens-propxy-relay.example.workers.dev';
  const db = fakeDb([await hashKey('example-secret')]);
  const env = { DB: db, GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com', SESSION_SECRET: 'test-session-secret', RELAY_URL: relayOrigin };
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', use: 'sig' };
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: 'https://accounts.google.com', aud: env.GOOGLE_CLIENT_ID, sub: googleSub, email: 'owner@example.com', email_verified: true, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url');
  const signature = createSign('RSA-SHA256').update(`${header}.${payload}`).sign(privateKey).toString('base64url');
  const credential = `${header}.${payload}.${signature}`;
  const priorFetch = globalThis.fetch;
  try {
    globalThis.fetch = async input => {
      if (String(input).includes('/oauth2/v3/certs')) return Response.json({ keys: [jwk] }, { headers: { 'Cache-Control': 'public,max-age=3600' } });
      throw new Error(`Unexpected fetch: ${input}`);
    };
    const login = await worker.fetch(new Request(`${origin}/login`), env);
    assert.equal(login.status, 200);
    assert.match(await login.text(), /Enter your key/);
    assert.match(login.headers.get('Content-Security-Policy'), /script-src 'self'/);
    const signedOutBrowse = await worker.fetch(new Request(`${origin}/browse?url=google`), env);
    assert.equal(signedOutBrowse.status, 302);
    assert.equal(signedOutBrowse.headers.get('location'), `${origin}/login`);
    assert.match(signedOutBrowse.headers.get('set-cookie'), /__Host-kp_pending=google/);
    const badKey = await worker.fetch(new Request(`${origin}/access`, { method: 'POST', body: new URLSearchParams({ key: 'bad-key' }) }), env);
    assert.equal(badKey.status, 400);
    const access = await worker.fetch(new Request(`${origin}/access`, { method: 'POST', body: new URLSearchParams({ key: 'example-secret' }) }), env);
    assert.equal(access.status, 303);
    const keyCookie = access.headers.getSetCookie().find(value => value.startsWith('__Host-kp_key=')).split(';')[0];
    const googleLogin = await worker.fetch(new Request(`${origin}/login/google`, { headers: { Cookie: keyCookie } }), env);
    assert.match(await googleLogin.text(), /g_id_signin/);
    const invalid = await worker.fetch(new Request(`${origin}/oauth/google/callback`, { method: 'POST', headers: { Cookie: keyCookie }, body: new URLSearchParams({ credential, g_csrf_token: 'wrong' }) }), env);
    assert.equal(invalid.status, 403);
    const callback = await worker.fetch(new Request(`${origin}/oauth/google/callback`, { method: 'POST', headers: { Cookie: `${keyCookie}; g_csrf_token=sample` }, body: new URLSearchParams({ credential, g_csrf_token: 'sample' }) }), env);
    assert.equal(callback.status, 303);
    const sessionCookie = callback.headers.getSetCookie().find(value => value.startsWith('__Host-kp_session=')).split(';')[0];
    const oldData = JSON.parse(Buffer.from(sessionCookie.split('=')[1].split('.')[0], 'base64url').toString());
    delete oldData.keyHash;
    const oldPayload = Buffer.from(JSON.stringify(oldData)).toString('base64url');
    const oldSignature = createHmac('sha256', env.SESSION_SECRET).update(oldPayload).digest('base64url');
    const oldSession = await worker.fetch(new Request(`${origin}/browse?url=youtube`, { headers: { Cookie: `__Host-kp_session=${oldPayload}.${oldSignature}` } }), env);
    assert.equal(oldSession.status, 302);
    assert.equal(oldSession.headers.get('location'), `${origin}/login`);
    const after = await worker.fetch(new Request(`${origin}/app`, { headers: { Cookie: sessionCookie } }), env);
    const appHtml = await after.text();
    assert.match(appHtml, /Search or enter an address/);
    assert.match(appHtml, /src="\/ui\.js\?v=features2"/);
    assert.doesNotMatch(appHtml, /class="boot"/);
    assert.match(appHtml, /ItsRecoil/);
    const account = await worker.fetch(new Request(`${origin}/account`, { headers: { Cookie: sessionCookie } }), env);
    assert.equal(account.status, 200);
    assert.match(await account.text(), /owner@example\.com/);
    assert.match(after.headers.get('Content-Security-Policy'), /form-action https:/);
    assert.match(after.headers.get('Content-Security-Policy'), /connect-src 'self' https:\/\/kadens-propxy-relay\.example\.workers\.dev/);
    assert.equal(after.headers.get('Link'), '<https://kadens-propxy-relay.example.workers.dev>; rel=preconnect');
    const signout = await worker.fetch(new Request(`${origin}/logout`, { method: 'POST', headers: { Cookie: sessionCookie }, body: new URLSearchParams({ form_token: 'stale' }) }), env);
    assert.equal(signout.status, 303);
    assert.equal(signout.headers.get('location'), `${relayOrigin}/__kaden_exit`);
    const relayExit = await relayWorker.fetch(new Request(`${relayOrigin}/__kaden_exit`), { DB: db, RELAY_SECRET: 'test-relay-secret', APP_URL: `${origin}/app` }, {});
    assert.equal(relayExit.status, 302);
    assert.match(relayExit.headers.get('set-cookie'), /__Host-kp_relay=;.*Max-Age=0/);
    const secondAccess = await worker.fetch(new Request(`${origin}/access`, { method: 'POST', body: new URLSearchParams({ key: 'example-secret' }) }), env);
    const secondKeyCookie = secondAccess.headers.getSetCookie().find(value => value.startsWith('__Host-kp_key=')).split(';')[0];
    const wrongPayload = Buffer.from(JSON.stringify({ iss: 'https://accounts.google.com', aud: env.GOOGLE_CLIENT_ID, sub: '222222222222222222222', email: 'wrong@example.com', email_verified: true, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url');
    const wrongSignature = createSign('RSA-SHA256').update(`${header}.${wrongPayload}`).sign(privateKey).toString('base64url');
    const denied = await worker.fetch(new Request(`${origin}/oauth/google/callback`, { method: 'POST', headers: { Cookie: `${secondKeyCookie}; g_csrf_token=sample` }, body: new URLSearchParams({ credential: `${header}.${wrongPayload}.${wrongSignature}`, g_csrf_token: 'sample' }) }), env);
    assert.equal(denied.status, 403);
    assert.match(await denied.text(), /belongs to another account/);
    const googleShortcut = await worker.fetch(new Request(`${origin}/browse?url=google`, { headers: { Cookie: sessionCookie } }), env);
    assert.equal(googleShortcut.status, 200);
    assert.equal(googleShortcut.headers.get('location'), null);
    assert.match(await googleShortcut.text(), /Find anything/);
    const googleUrl = await worker.fetch(new Request(`${origin}/browse?url=https%3A%2F%2Fgoogle.com%2Fsearch%3Fq%3Dschool`, { headers: { Cookie: sessionCookie } }), env);
    assert.equal(googleUrl.status, 200);
    assert.match(await googleUrl.text(), /value="school"/);
    const search = await worker.fetch(new Request(`${origin}/search?q=google`, { headers: { Cookie: sessionCookie } }), env);
    assert.equal(search.status, 303);
    assert.equal(new URL(search.headers.get('location')).searchParams.get('url'), 'https://duckduckgo.com/?q=google');
    const youtube = await worker.fetch(new Request(`${origin}/browse?url=youtube`, { headers: { Cookie: sessionCookie } }), env);
    assert.equal(youtube.status, 303);
    assert.match(youtube.headers.get('location'), /^https:\/\/kadens-propxy-relay\.example\.workers\.dev\/__kaden_launch\?ticket=/);
    const browse = await worker.fetch(new Request(`${origin}/browse?url=example.com`, { headers: { Cookie: sessionCookie } }), env);
    assert.equal(browse.status, 303);
    const launchUrl = browse.headers.get('location');
    assert.match(launchUrl, /^https:\/\/kadens-propxy-relay\.example\.workers\.dev\/__kaden_launch\?ticket=/);
    const relayEnv = { DB: db, RELAY_SECRET: 'test-relay-secret', APP_URL: `${origin}/app` };
    const launch = await relayWorker.fetch(new Request(launchUrl), relayEnv, {});
    assert.equal(launch.status, 303);
    assert.equal(launch.headers.get('location'), `${relayOrigin}/https://example.com/`);
    assert.equal((await relayWorker.fetch(new Request(launchUrl), relayEnv, {})).status, 403);
    const relayCookie = launch.headers.get('set-cookie').split(';')[0];
    assert.equal((await relayWorker.fetch(new Request(`${relayOrigin}/https://127.0.0.1/`, { headers: { Cookie: relayCookie } }), relayEnv, {})).status, 400);
    const rootRelative = await relayWorker.fetch(new Request(`${relayOrigin}/results?search_query=test`, {
      headers: { Cookie: `${relayCookie}; __Host-kp_target=${encodeURIComponent('https://duckduckgo.com')}` }
    }), relayEnv, {});
    assert.equal(rootRelative.status, 302);
    assert.equal(rootRelative.headers.get('location'), `${relayOrigin}/https://duckduckgo.com/results?search_query=test`);
    const youtubeHome = await relayWorker.fetch(new Request(`${relayOrigin}/`, {
      headers: { Cookie: `${relayCookie}; __Host-kp_target=${encodeURIComponent('https://www.youtube.com')}` }
    }), relayEnv, {});
    assert.equal(youtubeHome.headers.get('location'), `${relayOrigin}/https://www.youtube.com/`);
    const appHome = await relayWorker.fetch(new Request(`${relayOrigin}/__kaden_home`, { headers: { Cookie: relayCookie } }), relayEnv, {});
    assert.equal(appHome.headers.get('location'), `${origin}/app`);
    const watch = await relayWorker.fetch(new Request(`${relayOrigin}/https://www.youtube.com/watch?v=u3S4hGVFCuw`, {
      headers: { Cookie: relayCookie, 'Sec-Fetch-Dest': 'document' }
    }), relayEnv, {});
    assert.equal(watch.status, 200);
    assert.match(await watch.text(), /youtube-nocookie\.com\/embed\/u3S4hGVFCuw/);
    const youtubePost = await relayWorker.fetch(new Request(`${relayOrigin}/youtubei/v1/guide?prettyPrint=false`, {
      method: 'POST',
      headers: { Cookie: `${relayCookie}; __Host-kp_target=${encodeURIComponent('https://www.youtube.com')}`, 'Content-Type': 'application/json' },
      body: '{}'
    }), relayEnv, {});
    assert.equal(youtubePost.status, 307);
    assert.equal(youtubePost.headers.get('location'), `${relayOrigin}/https://www.youtube.com/youtubei/v1/guide?prettyPrint=false`);
    const googleBlocked = await relayWorker.fetch(new Request(`${relayOrigin}/https://www.google.com/sorry/index`, { headers: { Cookie: relayCookie } }), relayEnv, {});
    assert.equal(googleBlocked.status, 302);
    assert.equal(googleBlocked.headers.get('location'), `${origin}/browse?url=google`);
    const google404 = await relayWorker.fetch(new Request(`${relayOrigin}/https://accounts.google.com/results?search_query=test`, { headers: { Cookie: relayCookie } }), relayEnv, {});
    assert.equal(google404.status, 302);
    assert.equal(google404.headers.get('location'), `${origin}/search?q=test`);
  } finally { globalThis.fetch = priorFetch; }
});

