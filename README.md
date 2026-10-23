# Kadens propxy

A GitHub Pages launch page and a Cloudflare Worker web proxy. The [reference repository](https://github.com/NetworkingNexus/Setting-Up-a-School-Proxy) is an article about school proxies, so this implementation is original code rather than a fork of a working proxy.

## How access works

- A visitor signs in with GitHub. The Worker uses the stable GitHub numeric user ID as the account identity.
- The database contains hashes for exactly the two supplied keys. The original key strings are not in the public source.
- Claiming a key updates its database row only if it has no owner. The same GitHub account can return later. A different account cannot claim or use that key.
- All browsing and asset routes check for a signed session **and** a claimed key.

## Live deployment

- Launch page: <https://jamisonkaden7-dev.github.io/kadens-propxy/>
- Browsing app: <https://kadens-propxy.jamisonkaden7.workers.dev/app>

GitHub Pages hosts the launch page. The browsing app runs at the Worker URL because [GitHub Pages cannot execute server-side code](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site). A static-only site cannot securely enforce one-time keys or fetch arbitrary pages on behalf of visitors.

## Recreate the deployment

You need a GitHub account, a Cloudflare account, and Node.js with npm.

1. Create a public GitHub repository named `kadens-propxy` and put these files in it. In repository **Settings → Pages**, publish from your default branch and the `/docs` folder.
2. Run `npm install` and `npx wrangler login` in this project folder.
3. Run `npx wrangler d1 create kadens-propxy-keys`. Copy its `database_id` into `wrangler.toml`.
4. Run `npx wrangler d1 execute kadens-propxy-keys --remote --file=schema.sql` to create and seed the two key rows. Run this **once before keys are claimed**. It uses `INSERT OR IGNORE`, so rerunning it will not reset claims.
5. Run `npx wrangler deploy`. Note the `https://…workers.dev` URL.
6. In GitHub **Settings → Developer settings → OAuth Apps**, create a new OAuth app. Use the Pages URL as the homepage and `https://YOUR-WORKER-URL/oauth/callback` as its authorization callback. This app only reads the signed-in account's public identity; it does not request repository scopes.
7. Put the public OAuth client ID in `wrangler.toml` as `GITHUB_CLIENT_ID`, and save the private client secret to the Worker with `npx wrangler secret put GITHUB_CLIENT_SECRET`.
8. Generate a random session signing secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`, then save it with `npx wrangler secret put SESSION_SECRET`.
9. Replace the Worker URL in `docs/config.js`. Replace `SITE_URL` in `wrangler.toml` with the exact Pages URL. Commit and push those edits, then run `npx wrangler deploy` again.
10. Open the Pages URL, click **Open proxy**, sign in, claim a key, and paste a URL. Give each key only to its intended recipient.

The Worker URL and OAuth callback must match exactly, including the `https://` scheme. Never put the OAuth client secret, session secret, or the original keys in the public repository.

## Limits

This is a best-effort web proxy for public HTML pages, CSS, images, and small media files. It deliberately blocks scripts, private network targets, and large assets. Sites that require JavaScript, cookies, logins, WebSockets, streaming video, or anti-bot checks may not load. No web proxy can guarantee that **every** URL works, and a school network may block either the Pages URL or the Worker URL.

To revoke a key permanently, delete its row from D1. Clearing `github_user_id` would make that key claimable again, so do that only when intentionally transferring it.

## Local check

Run `npm test` (or `node --test`) to verify key ownership and URL filtering. `npx wrangler dev` runs the Worker locally after local secrets and a D1 database are configured.
