import test from 'node:test';
import assert from 'node:assert/strict';
import { claimKey, hashKey, hasAccess, normalizeTarget } from '../src/core.js';
import worker from '../src/worker.js';
import relayWorker from '../relay/worker.js';

function fakeDb(hashes) {
  const owners = new Map(hashes.map(hash => [hash, null]));
  const tickets = new Map();
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (sql.startsWith('INSERT INTO relay_tickets')) {
                const [hash, owner, target, expires] = args;
                tickets.set(hash, { github_user_id: owner, target_url: target, expires_at: expires });
                return { meta: { changes: 1 } };
              }
              assert.match(sql, /^UPDATE/);
              const [owner, hash] = args;
              if (!owners.has(hash) || owners.get(hash) !== null) return { meta: { changes: 0 } };
              owners.set(hash, owner);
              return { meta: { changes: 1 } };
            },
            async first() {
              if (sql.includes('WHERE key_hash')) return owners.has(args[0]) ? { github_user_id: owners.get(args[0]) } : null;
              return [...owners.values()].includes(args[0]) ? { allowed: 1 } : null;
            },
            async all() {
              assert.match(sql, /^DELETE FROM relay_tickets/);
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

test('a key binds to its first GitHub account and cannot move to another', async () => {
  const db = fakeDb([await hashKey('example-secret')]);
  assert.equal(await claimKey(db, 'example-secret', 101), 'claimed');
  assert.equal(await claimKey(db, 'example-secret', 101), 'owned');
  assert.equal(await claimKey(db, 'example-secret', 202), 'taken');
  assert.equal(await hasAccess(db, 101), true);
  assert.equal(await hasAccess(db, 202), false);
  assert.equal(await claimKey(db, 'unknown', 202), 'invalid');
});

test('URL validation permits public web links and blocks private targets', () => {
  assert.equal(normalizeTarget('https://example.com/a').href, 'https://example.com/a');
  for (const value of ['http://localhost/', 'http://127.0.0.1/', 'http://10.1.2.3/', 'http://192.168.0.1/', 'http://169.254.10.1/', 'http://[::1]/', 'file:///etc/passwd', 'https://user:pass@example.com/']) {
    assert.throws(() => normalizeTarget(value), value);
  }
});

test('GitHub sign-in sets a session and the claimed key unlocks browsing', async () => {
  const origin = 'https://kadens-propxy.example.workers.dev';
  const db = fakeDb([await hashKey('example-secret')]);
  const relayOrigin = 'https://kadens-propxy-relay.example.workers.dev';
  const env = { DB: db, GITHUB_CLIENT_ID: 'client', GITHUB_CLIENT_SECRET: 'secret', SESSION_SECRET: 'a-long-test-only-session-secret', RELAY_URL: relayOrigin };
  const priorFetch = globalThis.fetch;
  try {
    globalThis.fetch = async input => {
      const url = String(input);
      if (url.includes('/login/oauth/access_token')) return Response.json({ access_token: 'sample-token' });
      if (url.includes('/user')) return Response.json({ id: 101, login: 'sample-user' });
      throw new Error(`Unexpected fetch: ${url}`);
    };
    const login = await worker.fetch(new Request(`${origin}/login`), env);
    assert.equal(login.status, 302);
    const loginCookies = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    const state = new URL(login.headers.get('location')).searchParams.get('state');
    const callback = await worker.fetch(new Request(`${origin}/oauth/callback?code=sample&state=${state}`, { headers: { Cookie: loginCookies } }), env);
    assert.equal(callback.status, 303);
    const sessionCookie = callback.headers.getSetCookie().find(value => value.startsWith('__Host-kp_session=')).split(';')[0];

    const before = await worker.fetch(new Request(`${origin}/app`, { headers: { Cookie: sessionCookie } }), env);
    const claimPage = await before.text();
    assert.match(claimPage, /Unlock your access/);
    const formToken = claimPage.match(/name="form_token" value="([^"]+)"/)?.[1];
    assert.ok(formToken);
    const blocked = await worker.fetch(new Request(`${origin}/claim`, {
      method: 'POST',
      headers: { Cookie: sessionCookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'key=example-secret'
    }), env);
    assert.equal(blocked.status, 403);
    const invalid = await worker.fetch(new Request(`${origin}/claim`, {
      method: 'POST',
      headers: { Cookie: sessionCookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ key: 'wrong-key', form_token: formToken })
    }), env);
    assert.equal(invalid.status, 400);
    assert.match(await invalid.text(), /That key is not valid/);
    const claim = await worker.fetch(new Request(`${origin}/claim`, {
      method: 'POST',
      headers: { Cookie: sessionCookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ key: 'example-secret', form_token: formToken })
    }), env);
    assert.equal(claim.status, 303);
    const after = await worker.fetch(new Request(`${origin}/app`, { headers: { Cookie: sessionCookie } }), env);
    const appHtml = await after.text();
    assert.match(appHtml, /Where to next\?/);
    assert.match(appHtml, /name="form_token"/);
    assert.match(appHtml, /<svg viewBox="0 0 100 100"/);
    const browse = await worker.fetch(new Request(`${origin}/browse?url=https%3A%2F%2Fexample.com%2F`, { headers: { Cookie: sessionCookie } }), env);
    assert.equal(browse.status, 303);
    assert.equal(browse.headers.get('cache-control'), 'no-store');
    const launchUrl = browse.headers.get('location');
    assert.match(launchUrl, /^https:\/\/kadens-propxy-relay\.example\.workers\.dev\/__kaden_launch\?ticket=/);
    const relayEnv = { DB: db, RELAY_SECRET: 'a-long-test-only-relay-secret', APP_URL: `${origin}/app` };
    const launch = await relayWorker.fetch(new Request(launchUrl), relayEnv, {});
    assert.equal(launch.status, 303);
    assert.equal(launch.headers.get('location'), `${relayOrigin}/https://example.com/`);
    const relayCookie = launch.headers.get('set-cookie').split(';')[0];
    assert.match(relayCookie, /^__Host-kp_relay=/);
    const replay = await relayWorker.fetch(new Request(launchUrl), relayEnv, {});
    assert.equal(replay.status, 403);
    const privateTarget = await relayWorker.fetch(new Request(`${relayOrigin}/https://127.0.0.1/`, { headers: { Cookie: relayCookie } }), relayEnv, {});
    assert.equal(privateTarget.status, 400);
    const anonymous = await relayWorker.fetch(new Request(`${relayOrigin}/https://example.com/`), relayEnv, {});
    assert.equal(anonymous.status, 302);
    const logout = await worker.fetch(new Request(`${origin}/logout`, {
      method: 'POST',
      headers: { Cookie: sessionCookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ form_token: formToken })
    }), env);
    assert.equal(logout.status, 303);
    assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  } finally {
    globalThis.fetch = priorFetch;
  }
});
