# isRecool

A monochrome GitHub Pages launch page, Google-bound one-time keys, and a separate Cloudflare Worker relay for opening public websites.

## Live addresses

- Launch page: <https://jamisonkaden7-dev.github.io/kadens-propxy/>
- Sign-in and key app: <https://kadens-propxy.jamisonkaden7.workers.dev/app>
- Browsing relay: <https://kadens-propxy-relay.jamisonkaden7.workers.dev/>

The old deployment names remain in the URLs so existing links keep working. The visible product name is isRecool.

## Account and key flow

1. Sign in with Google. The Worker verifies Google's signed ID token and binds a key to Google's stable `sub` account ID, not the changeable email address.
2. D1 stores hashes of exactly two invite keys. A key can be redeemed only once; signing into the same Google account restores access.
3. A key already claimed by GitHub can be linked by signing into that GitHub account, then choosing the Google account that should own it. Once Google sign-in is enabled, GitHub alone cannot open websites.
4. Enter a complete URL, a bare domain such as `example.com`, or a search phrase. The word `youtube` and YouTube URLs open through the isRecool relay as a full-page navigation. The word `google` and Google URLs open an isRecool search screen because Google blocks this relay. That screen searches with DuckDuckGo and offers an explicit link to open Google directly. Other unknown words search DuckDuckGo. Relayed addresses get a single-use, 90-second launch ticket.
5. The relay checks the ticket and owner, then grants a signed six-hour cookie on its own host. Proxied page scripts cannot read the sign-in app's session.

The raw invite keys and signing secrets are not stored in the public repository. The relay blocks private IPs, localhost, embedded URL credentials, and nonstandard ports before forwarding.

The [privacy page](https://kadens-propxy.jamisonkaden7.workers.dev/privacy) explains how account IDs, sessions, and relayed URLs are handled.

## Google client setup

Create a Google Auth Platform **Web application** client. Add:

- Authorized JavaScript origin: `https://kadens-propxy.jamisonkaden7.workers.dev`
- Authorized redirect URI: `https://kadens-propxy.jamisonkaden7.workers.dev/oauth/google/callback`

The browser uses Google Identity Services in redirect mode. Its ID token is posted to the Worker, which checks Google's JWT signature, client ID, issuer, expiry, verified email flag, and double-submit CSRF token. Only the public client ID is needed in `wrangler.toml` as `GOOGLE_CLIENT_ID`; the client secret is not used. If Google's consent screen is in testing mode, add the two intended Google accounts as test users. Use a standard browser for Google sign-in; embedded browsers may be rejected by Google.

## Deploy or update

Requires Node.js, Wrangler, the existing Cloudflare account, and the Google client ID.

1. On the **existing** D1 database, run `wrangler d1 execute kadens-propxy-keys --remote --file=migration-google.sql` once. This adds the `google_sub` column and preserves existing key claims. Fresh databases do not need this migration.
2. Run `wrangler d1 execute kadens-propxy-keys --remote --file=schema.sql` to ensure all tables and indexes exist. This does not reset claimed keys.
3. Set `GOOGLE_CLIENT_ID` in `wrangler.toml`, then deploy the app with `wrangler deploy --config wrangler.toml`. Its existing `SESSION_SECRET` and GitHub migration credentials remain as Worker secrets.
4. Set `GOOGLE_REQUIRED = "true"` in `wrangler.relay.toml`, then deploy the relay with `wrangler deploy --config wrangler.relay.toml`. This rejects older GitHub-only relay cookies.
5. Publish the `docs/` folder through the existing GitHub Pages deployment.

Run `node --test` to check account binding, legacy claim linking, address parsing, Google token verification, CSRF rejection, and one-use relay launch. `node work/build-worker-bundle.mjs` from the parent workspace refreshes `dist/worker.js` for manual Quick Edit.

## Visual and browser behavior

The loading screen lasts 3.6 seconds, reveals eight short steps, spins the Star of David, and can be skipped with Enter, Escape, or Skip. The page and app use a compact black/white/grey layout with a faint star pattern. Reduced-motion users skip the animation.

The relay rewrites links, scripts, and asset URLs and caches shared public content. It also remembers the active site's origin to repair root-relative navigations when a site's referrer is missing. Google may block Cloudflare relay traffic with an unusual-traffic challenge; isRecool offers its own search screen using DuckDuckGo and a separate direct Google link. YouTube's home and search HTML load through the relay, but video playback or dynamic interactions may still fail. Other sites, particularly video services, logins, CAPTCHAs, and heavily protected apps, can also fail. [Aetheris](https://github.com/mynamescrax/aetheris) uses Scramjet with libcurl/epoxy and states that it needs a VPS; its backend cannot run as a drop-in Cloudflare Worker or GitHub Pages site.

## Relay source and license

`relay/upstream.js` comes from [whitedragon-software/relay](https://github.com/whitedragon-software/relay), source blob `2363654e9660e6b93e27a68ac0aaef02904a8c47`. Its GNU AGPL v3 license is included in `relay/LICENSE`. `relay/worker.js` adds account gating and URL checks around that code.
