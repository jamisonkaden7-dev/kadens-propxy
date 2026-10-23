const encoder = new TextEncoder();

export function normalizeTarget(input, base, maxLength = 2048) {
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

export function resolveDestination(input) {
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

export async function hashKey(key) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(key.trim()));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export async function claimKey(db, key, userId) {
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

export async function hasAccess(db, userId) {
  const row = await db.prepare('SELECT 1 AS allowed FROM access_keys WHERE github_user_id = ? LIMIT 1').bind(userId).first();
  return Boolean(row);
}

export async function claimGoogleKey(db, key, googleSub) {
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

export async function hasGoogleAccess(db, googleSub) {
  const row = await db.prepare('SELECT 1 AS allowed FROM access_keys WHERE google_sub = ? LIMIT 1').bind(String(googleSub)).first();
  return Boolean(row);
}

export async function linkGoogleKey(db, githubUserId, googleSub) {
  const update = await db.prepare(
    'UPDATE access_keys SET google_sub = ? WHERE github_user_id = ? AND google_sub IS NULL AND NOT EXISTS (SELECT 1 FROM access_keys WHERE google_sub = ?)'
  ).bind(String(googleSub), Number(githubUserId), String(googleSub)).run();
  if (update.meta.changes === 1) return 'linked';
  const row = await db.prepare('SELECT google_sub FROM access_keys WHERE github_user_id = ? LIMIT 1').bind(Number(githubUserId)).first();
  if (!row) return 'not-owned';
  return row.google_sub === String(googleSub) ? 'linked' : 'already-linked';
}
