import test from 'node:test';
import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';
import { claimKey, claimGoogleKey, hashKey, hasAccess, hasGoogleAccess, linkGoogleKey, normalizeTarget, resolveDestination } from '../src/core.js';
import worker from '../src/worker.js';
import relayWorker from '../relay/worker.js';

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
  assert.match(resolveDestination('school project').href, /^https:\/\/duckduckgo\.com\/\?q=/);
  for (const value of ['http://localhost/', 'http://127.0.0.1/', 'http://10.1.2.3/', 'http://192.168.0.1/', 'http://169.254.10.1/', 'http://[::1]/', 'file:///etc/passwd', 'https://user:pass@example.com/']) {
    assert.throws(() => normalizeTarget(value), value);
  }
});

test('Google sign-in, key redemption, and full-page relay launch', async () => {
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
    assert.match(await login.text(), /g_id_signin/);
    const invalid = await worker.fetch(new Request(`${origin}/oauth/google/callback`, { method: 'POST', body: new URLSearchParams({ credential, g_csrf_token: 'wrong' }) }), env);
    assert.equal(invalid.status, 403);
    const callback = await worker.fetch(new Request(`${origin}/oauth/google/callback`, { method: 'POST', headers: { Cookie: 'g_csrf_token=sample' }, body: new URLSearchParams({ credential, g_csrf_token: 'sample' }) }), env);
    assert.equal(callback.status, 303);
    const sessionCookie = callback.headers.getSetCookie().find(value => value.startsWith('__Host-kp_session=')).split(';')[0];
    const before = await worker.fetch(new Request(`${origin}/app`, { headers: { Cookie: sessionCookie } }), env);
    const claimHtml = await before.text();
    assert.match(claimHtml, /Redeem key/);
    const formToken = claimHtml.match(/name="form_token" value="([^"]+)"/)?.[1];
    assert.ok(formToken);
    const claim = await worker.fetch(new Request(`${origin}/claim`, { method: 'POST', headers: { Cookie: sessionCookie }, body: new URLSearchParams({ key: 'example-secret', form_token: formToken }) }), env);
    assert.equal(claim.status, 303);
    const after = await worker.fetch(new Request(`${origin}/app`, { headers: { Cookie: sessionCookie } }), env);
    assert.match(await after.text(), /Search or enter a URL/);
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
    const googleBlocked = await relayWorker.fetch(new Request(`${relayOrigin}/https://www.google.com/sorry/index`, { headers: { Cookie: relayCookie } }), relayEnv, {});
    assert.equal(googleBlocked.status, 403);
    assert.match(await googleBlocked.text(), /Google blocked this relay/);
  } finally { globalThis.fetch = priorFetch; }
});
