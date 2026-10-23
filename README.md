# Kadens propxy

A monochrome GitHub Pages launch page, a GitHub sign-in and key app, and a separate Cloudflare Worker relay for opening public websites.

## Live addresses

- Launch page: <https://jamisonkaden7-dev.github.io/kadens-propxy/>
- Sign-in and key app: <https://kadens-propxy.jamisonkaden7.workers.dev/app>
- Browsing relay: <https://kadens-propxy-relay.jamisonkaden7.workers.dev/> (requires a valid launch from the app)

GitHub Pages serves the static launch page. The two Workers and D1 database provide sign-in, one-time keys, and page fetching. GitHub Pages alone cannot run those server-side features.

## Access and security

1. A visitor signs in with GitHub. The app uses the stable numeric GitHub user ID.
2. D1 holds hashes of exactly two invite keys. A key can be claimed once; the first GitHub account keeps it.
3. After a key owner enters a URL, the app stores a random, 90-second, single-use launch ticket in D1 and redirects to the separate relay Worker.
4. The relay consumes the ticket atomically, confirms that account still owns a key, and sets a signed, host-only, six-hour relay cookie.
5. Proxied site scripts run only on the relay origin. They cannot read the app's GitHub session or claim form.

The raw invite keys, GitHub OAuth secret, and session signing secrets are not in this repository. The relay rejects private IP addresses, localhost, and URLs with embedded credentials before forwarding.

## Loading screen and speed

The launch page shows a short Kaden boot sequence on the first visit in a tab. It is black, white, and grey, uses a dotted Star of David instead of the reference video's Y, and can be skipped with Enter, Escape, or the Skip button. Returning visits in the same tab open immediately. The launch page has no external fonts, images, or JavaScript libraries.

The relay uses path-embedded target URLs, server-side HTML rewriting, and edge caching for public assets. This improves many script-heavy pages compared with the original HTML-only proxy. Network speed, the target server, Cloudflare limits, and anti-bot systems still affect load time; no proxy can guarantee that every site opens instantly.

## Deploy or update

Requires Node.js, Wrangler, a Cloudflare account, and a GitHub account. The deployed Worker names and D1 ID are in `wrangler.toml` and `wrangler.relay.toml`.

1. Publish the `docs/` folder from the repository's default branch with GitHub Pages.
2. Run `wrangler login` and `wrangler d1 execute kadens-propxy-keys --remote --file=schema.sql`. The SQL uses `CREATE IF NOT EXISTS` and `INSERT OR IGNORE`, so it does not reset claimed keys.
3. Deploy the relay with `wrangler deploy --config wrangler.relay.toml`.
4. Generate a new random signing secret and save it with `wrangler secret put RELAY_SECRET --config wrangler.relay.toml`.
5. Deploy the app with `wrangler deploy --config wrangler.toml`. Existing `GITHUB_CLIENT_SECRET` and `SESSION_SECRET` Worker secrets remain in place when updating it.
6. For a fresh installation, create a GitHub OAuth app with callback `https://YOUR-APP-WORKER/oauth/callback`; put its public client ID in `wrangler.toml`, and save its client secret with `wrangler secret put GITHUB_CLIENT_SECRET`. Save a separate random `SESSION_SECRET` with `wrangler secret put SESSION_SECRET`.
7. Set `SITE_URL`, `RELAY_URL`, and `APP_URL` to the actual deployed addresses before deploying.

Run `node --test` to check key ownership, URL filtering, sign-in, single-use relay tickets, and the origin boundary. `node work/build-worker-bundle.mjs` from the parent workspace refreshes `dist/worker.js` for manual Quick Edit of the app Worker. The relay has its own Wrangler configuration and must be deployed separately.

## Relay source and license

`relay/upstream.js` comes from [whitedragon-software/relay](https://github.com/whitedragon-software/relay), source blob `2363654e9660e6b93e27a68ac0aaef02904a8c47`. Its GNU AGPL v3 license is included in `relay/LICENSE`. `relay/worker.js` adds Kaden's account gate and URL checks around that code. The relay source is public here as required by its license.

The upstream relay itself notes that CAPTCHAs and target-site logins generally do not work, POST forms go directly to the target, target sites can block Cloudflare IPs, and WebSocket connections can time out. The proxy is meant for public pages and media, not authenticated sessions on third-party sites.
