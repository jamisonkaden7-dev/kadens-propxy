// Bundled for Cloudflare Quick Edit. Source: src/core.js + src/ui.js + src/features.js + src/worker.js
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
  const shortcuts = new Map([
    ['google', 'https://www.google.com/'],
    ['youtube', 'https://www.youtube.com/']
  ]);
  if (shortcuts.has(raw.toLowerCase())) return normalizeTarget(shortcuts.get(raw.toLowerCase()));
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
  return claimGoogleKeyHash(db, hash, googleSub);
}

async function keyExists(db, hash) {
  if (!/^[a-f0-9]{64}$/.test(hash)) return false;
  return Boolean(await db.prepare('SELECT key_hash FROM access_keys WHERE key_hash = ?').bind(hash).first());
}

async function claimGoogleKeyHash(db, hash, googleSub) {
  if (!/^[a-f0-9]{64}$/.test(hash) || !/^\d{5,30}$/.test(String(googleSub))) return 'invalid';
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

async function hasGoogleKeyAccess(db, googleSub, hash) {
  if (!/^[a-f0-9]{64}$/.test(String(hash))) return false;
  const row = await db.prepare('SELECT 1 AS allowed FROM access_keys WHERE google_sub = ? AND key_hash = ? LIMIT 1').bind(String(googleSub), hash).first();
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
:root{color-scheme:dark;font-family:Arial,Helvetica,sans-serif;font-synthesis:none;--sidebar:#171717;--surface:#212121;--composer:#303030;--text:#ececec;--muted:#a6a6a6}
*{box-sizing:border-box}
html,body{min-height:100%;margin:0}
body{background:var(--surface);color:var(--text)}
a{color:inherit}
button,input{font:inherit}
button{cursor:pointer}
a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid #d8d8d8;outline-offset:3px}
.shell{min-height:100vh;display:flex}
.sidebar{width:260px;flex:none;min-height:100vh;background:var(--sidebar);padding:22px 13px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:10px;padding:4px 12px 28px;color:#f3f3f3;text-decoration:none;font-size:18px;font-weight:650;letter-spacing:-.04em}
.side-nav{display:grid;gap:5px}
.nav-link{display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:9px;color:#ddd;text-decoration:none;font-size:14px;line-height:1.35;transition:background .15s}
.nav-link:hover,.nav-link:focus-visible{background:#282828}
.nav-icon{width:19px;display:inline-grid;place-items:center;color:#d7d7d7;font-size:20px;line-height:1}
.side-bottom{margin-top:auto;border-top:1px solid #2a2a2a;padding-top:13px}
.side-bottom .nav-link{color:#a9a9a9;font-size:13px}
.workspace{flex:1;min-width:0;min-height:100vh;display:flex;flex-direction:column;background:var(--surface)}
.top{height:66px;display:flex;align-items:center;justify-content:space-between;padding:0 33px}
.top-title{color:#e6e6e6;font-size:17px;font-weight:600;letter-spacing:-.025em}
.top-note{color:#9b9b9b;font-size:12px}
main{flex:1;display:flex;align-items:center;justify-content:center;padding:60px 32px 100px}
.center{width:min(735px,100%);text-align:center}
.overline{color:#9e9e9e;font-size:12px;letter-spacing:.01em}
h1{font-size:clamp(31px,3.2vw,39px);line-height:1.2;letter-spacing:-.045em;margin:18px 0 13px;font-weight:600}
.subhead{color:#b7b7b7;font-size:15px;line-height:1.55;margin:0 auto 30px;max-width:560px}
.search{display:flex;align-items:center;width:100%;min-height:67px;border:1px solid #494949;border-radius:26px;background:var(--composer);box-shadow:0 8px 24px #0002;transition:border-color .15s,box-shadow .15s}
.search:hover{border-color:#666}
.search:focus-within{border-color:#8e8e8e;box-shadow:0 0 0 3px #ffffff0a,0 8px 24px #0002}
.search-icon{flex:0 0 auto;width:18px;height:18px;margin-left:23px;color:#aaa}
.search-icon svg{display:block;width:100%;height:100%;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round}
.search input{flex:1;min-width:0;height:64px;border:0;outline:0;background:transparent;color:#f2f2f2;padding:0 22px;font-size:15px;text-align:left}
.search input::placeholder{color:#b1b1b1}
.go{width:36px;height:36px;flex:none;display:grid;place-items:center;margin:0 14px 0 0;padding:0;border:0;border-radius:50%;background:#f0f0f0;color:#202020;font-size:20px;font-weight:650;line-height:1;transition:background .15s,transform .15s}
.go:hover{background:#fff;transform:translateY(-1px)}
.helper{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin:18px 0 0;color:#898989;font-size:12px;line-height:1.5}
.helper span+span:before{content:'·';margin-right:6px}
.actions{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;margin-top:23px}
.chip{border:0;background:none;color:#bdbdbd;font-size:13px;text-decoration:none;padding:7px 2px}
.chip:hover{color:#fff;text-decoration:underline}
.identity{display:flex;align-items:center;justify-content:center;gap:15px;margin-top:32px;color:#909090;font-size:12px;line-height:1.5}
.identity strong{color:#d0d0d0;font-weight:500}
.identity form{display:inline-flex}
.info{color:#a1a1a1;font-size:12px;line-height:1.6;margin-top:22px}
.info a{color:#e6e6e6}
.alert{border:1px solid #6b6b6b;border-radius:12px;background:#303030;padding:12px 16px;margin:0 auto 23px;color:#eee;font-size:13px;line-height:1.5;text-align:left;max-width:600px}
.key-input{width:100%;height:60px;border:1px solid #555;border-radius:20px;background:var(--composer);color:#f1f1f1;padding:0 20px;font-size:15px;margin-top:12px}
.key-input:focus{border-color:#aaa;outline:0}
.key-submit{height:42px;border:0;border-radius:20px;background:#ededed;color:#212121;padding:0 20px;margin-top:16px;font-size:13px;font-weight:650}
.key-submit:hover{background:#fff}
.google-wrap{display:flex;justify-content:center;margin:30px 0 18px;min-height:44px}
.reason{margin:20px auto 0;color:#b6b6b6;font-size:14px;line-height:1.6;max-width:570px}
.error-title{font-size:clamp(31px,3.2vw,39px)}
.sidebar{border-right:1px solid #4b4b4b}
.nav-link{border:1px solid #3e3e3e}
.nav-link:hover{border-color:#929292}
.side-nav .nav-link:first-child{background:#222;border-color:#707070}
.side-bottom{border-top-color:#4b4b4b}
.top{border-bottom:1px solid #3f3f3f}
.top-note{border:1px solid #626262;border-radius:8px;padding:7px 11px}
.overline{display:inline-block;border:1px solid #717171;border-radius:999px;padding:7px 12px;color:#cfcfcf}
.search{border-color:#a0a0a0;box-shadow:0 0 0 1px #ffffff10,0 12px 28px #0003}
.search:hover{border-color:#ddd}
.search:focus-within{border-color:#f4f4f4;box-shadow:0 0 0 3px #ffffff23,0 12px 28px #0003}
@media(max-width:720px){.sidebar{width:72px;padding:20px 9px}.brand{padding:3px 14px 25px}.brand span:last-child,.nav-label,.side-bottom .nav-label{display:none}.nav-link{justify-content:center;padding:11px 0}.nav-icon{width:auto}.top{padding:0 22px}main{padding:50px 22px 100px}}
@media(max-width:480px){.sidebar{width:58px;padding:17px 5px}.brand{padding:3px 11px 25px}.top{height:58px;padding:0 16px}.top-note{display:none}main{align-items:flex-start;padding:21vh 19px 65px}.center{width:100%}h1{font-size:32px}.subhead{font-size:14px}.search{min-height:61px}.search input{height:58px;padding:0 15px;font-size:14px}.go{margin-right:10px}.helper{font-size:11px}.identity{flex-direction:column;gap:3px}}
.search{flex-direction:column;align-items:stretch;min-height:128px;border-radius:24px;padding:11px 15px 12px}
.search input{flex:none;width:100%;height:59px;padding:0 6px}
.composer-bar{display:flex;align-items:center;justify-content:space-between;min-height:39px;padding:0 1px}
.composer-label{display:flex;align-items:center;gap:10px;color:#b7b7b7;font-size:12px}
.go{margin:0}
.key-helper{justify-content:space-between;text-align:left}
.workspace{background:radial-gradient(circle at 82% 15%,#ffffff0b,transparent 34%),radial-gradient(circle at 18% 85%,#ffffff06,transparent 38%),#202020}
.sidebar{background:linear-gradient(145deg,#262626df,#171717eb);backdrop-filter:blur(22px) saturate(125%);-webkit-backdrop-filter:blur(22px) saturate(125%);border-right-color:#ffffff26}
.top{background:linear-gradient(110deg,#ffffff0b,#ffffff03);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom-color:#ffffff25}
.nav-link{background:linear-gradient(135deg,#ffffff0d,#ffffff03);border-color:#ffffff25;box-shadow:inset 0 1px #ffffff10}
.side-nav .nav-link:first-child{background:linear-gradient(135deg,#ffffff1b,#ffffff07);border-color:#ffffff65}
.search{position:relative;overflow:hidden;background:linear-gradient(145deg,#ffffff1d,#ffffff0c 58%,#ffffff15),#292929b8;backdrop-filter:blur(24px) saturate(140%);-webkit-backdrop-filter:blur(24px) saturate(140%);border-color:#ffffff8a;box-shadow:inset 0 1px #ffffff5c,inset 0 -1px #ffffff12,0 18px 48px #0005}
.search:before{content:'';position:absolute;left:8%;right:8%;top:0;height:1px;background:linear-gradient(90deg,transparent,#ffffffa0,transparent);pointer-events:none}
.search:focus-within{border-color:#fff;box-shadow:inset 0 1px #ffffff7a,0 0 0 3px #ffffff18,0 18px 48px #0006}
.go{background:linear-gradient(145deg,#fff,#d5d5d5);box-shadow:inset 0 1px #fff,0 2px 9px #0004}
.top-note,.overline,.alert{background:#ffffff0d;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:inset 0 1px #ffffff1b}
.shell{background:radial-gradient(circle at 70% 20%,#ffffff22,transparent 25%),radial-gradient(circle at 29% 77%,#ffffff16,transparent 32%),linear-gradient(135deg,#151515,#292929 56%,#171717)}
.workspace{position:relative;isolation:isolate;background:transparent}
.workspace:before{content:'';position:absolute;z-index:-1;width:min(42vw,520px);height:min(42vw,520px);top:12%;right:4%;border-radius:50%;background:radial-gradient(circle,#ffffff16,transparent 66%);filter:blur(45px);pointer-events:none;animation:ui-orb 9s ease-in-out infinite alternate}
.sidebar{background:linear-gradient(145deg,#2a2a2ac7,#141414dd);box-shadow:inset -1px 0 #ffffff10,15px 0 45px #0002}
.top{background:linear-gradient(100deg,#ffffff16,#ffffff05 55%,#ffffff0b)}
.search{background:linear-gradient(145deg,#ffffff38,#ffffff10 48%,#ffffff20),#303030ae;border-color:#ffffffab;box-shadow:inset 0 1px #ffffffa6,inset 0 -1px #ffffff20,0 22px 58px #0006;transition:transform .35s cubic-bezier(.2,.8,.2,1),border-color .2s,box-shadow .35s}
.search:after{content:'';position:absolute;left:-20%;top:-90%;width:56%;height:210%;transform:rotate(24deg) translateX(-150%);background:linear-gradient(90deg,transparent,#ffffff12,#ffffff2a,transparent);filter:blur(10px);pointer-events:none;transition:transform .8s ease}
.search:hover{transform:translateY(-2px);border-color:#fff;box-shadow:inset 0 1px #fff,0 25px 65px #0008}.search:hover:after{transform:rotate(24deg) translateX(360%)}
.center{animation:ui-rise .75s cubic-bezier(.16,1,.3,1) both}.nav-link{transition:transform .25s ease,background .25s,border-color .25s}.nav-link:hover{transform:translateX(3px);background:#ffffff20}.go{transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s}.go:hover{transform:translateY(-2px) scale(1.06);box-shadow:0 6px 18px #0006}
@keyframes ui-rise{from{opacity:0;transform:translateY(17px);filter:blur(9px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}@keyframes ui-orb{to{transform:translate(-13%,17%) scale(1.18)}}
@media(max-width:480px){.search{min-height:116px;padding:9px 11px 10px}.search input{height:54px;padding:0 5px}.go{margin:0}.key-helper{justify-content:center;text-align:center}}

/* Frosted surfaces with the soft white edge and depth of the reference. */
.shell{background:radial-gradient(circle at 64% 11%,#a2a2a24a,transparent 27%),radial-gradient(circle at 24% 78%,#77777740,transparent 32%),linear-gradient(135deg,#1a1a1c,#444447 50%,#202022)}
.workspace{background:transparent}
.workspace:before{background:radial-gradient(circle,#ffffff24,transparent 68%);filter:blur(52px)}
.sidebar{background:linear-gradient(145deg,#ffffff24,#ffffff0d 55%,#ffffff16);border-right:1px solid #ffffff4a;box-shadow:inset 1px 0 #ffffff38,inset -1px 0 #ffffff18,12px 0 42px #0003;backdrop-filter:blur(32px) saturate(145%);-webkit-backdrop-filter:blur(32px) saturate(145%)}
.top{background:linear-gradient(110deg,#ffffff27,#ffffff0b 60%,#ffffff19);border-bottom:1px solid #ffffff37;box-shadow:inset 0 1px #ffffff27;backdrop-filter:blur(28px) saturate(140%);-webkit-backdrop-filter:blur(28px) saturate(140%)}
.center{position:relative;width:min(760px,100%);padding:clamp(28px,4vw,48px);border:1px solid #ffffff63;border-radius:38px;background:linear-gradient(145deg,#ffffff30,#ffffff12 42%,#ffffff1f),#7b7b7b22;box-shadow:inset 0 1px #ffffff8a,inset 0 -1px #ffffff20,0 25px 70px #0006;backdrop-filter:blur(35px) saturate(140%);-webkit-backdrop-filter:blur(35px) saturate(140%)}
.center:before{content:'';position:absolute;left:8%;right:8%;top:0;height:1px;background:linear-gradient(90deg,transparent,#ffffffbc,transparent);pointer-events:none}
.nav-link{background:linear-gradient(145deg,#ffffff24,#ffffff0b);border:1px solid #ffffff53;border-radius:16px;box-shadow:inset 0 1px #ffffff4a,0 8px 22px #0002;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.side-nav .nav-link:first-child{background:linear-gradient(145deg,#ffffff34,#ffffff12);border-color:#ffffff87}
.nav-link:hover{background:#ffffff32;border-color:#ffffffa6}
.top-note,.overline,.alert{background:linear-gradient(145deg,#ffffff2c,#ffffff10);border:1px solid #ffffff59;border-radius:14px;box-shadow:inset 0 1px #ffffff50;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.search,.key-input{background:linear-gradient(145deg,#ffffff42,#ffffff12 52%,#ffffff26),#79797930;border:1px solid #ffffff9e;border-radius:29px;box-shadow:inset 0 1px #ffffffbd,inset 0 -1px #ffffff22,0 13px 35px #0004;backdrop-filter:blur(38px) saturate(145%);-webkit-backdrop-filter:blur(38px) saturate(145%)}
.search:hover{border-color:#fff;box-shadow:inset 0 1px #fff,0 16px 43px #0005}
.search:focus-within{border-color:#fff;box-shadow:inset 0 1px #fff,0 0 0 3px #ffffff22,0 16px 43px #0005}
.go,.search button,.key-submit{background:linear-gradient(145deg,#fff,#d2d2d2);box-shadow:inset 0 1px #fff,0 5px 16px #0004}
@media(max-width:720px){.brand{display:none}.center{padding:30px 24px;border-radius:30px}}
@media(max-width:480px){main{padding:19vh 16px 44px}.center{padding:25px 17px;border-radius:27px}.search{border-radius:23px}.sidebar{width:54px;padding:15px 5px}.top{padding:0 16px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;transition-duration:.01ms!important}}

/* Nature wallpaper and translucent, light-catching liquid glass. */
.shell{background:linear-gradient(115deg,#1018204d,#14212b22 50%,#10182048),url('https://jamisonkaden7-dev.github.io/kadens-propxy/nature-lake-glass.jpg') center center/cover fixed;isolation:isolate}
.workspace:before{display:none}
.sidebar{background:linear-gradient(140deg,#e7f2f32b,#bfd0d018 48%,#15263246);border-right-color:#ffffff73;box-shadow:inset 1px 0 #ffffff72,inset -1px 0 #ffffff1f,10px 0 35px #06101930;backdrop-filter:blur(24px) saturate(170%);-webkit-backdrop-filter:blur(24px) saturate(170%)}
.top{background:linear-gradient(110deg,#e6f1f12c,#b2cad019 55%,#14242d32);border-bottom-color:#ffffff67;box-shadow:inset 0 1px #ffffff7a;backdrop-filter:blur(24px) saturate(165%);-webkit-backdrop-filter:blur(24px) saturate(165%)}
.center{background:linear-gradient(140deg,#f3fbfc3e,#d4e5e522 43%,#bdd7e01c 70%,#e6f2ef2b);border-color:#ffffffb8;box-shadow:inset 0 1px #ffffffe3,inset 0 -1px #ffffff2e,inset 1px 0 #ffffff58,0 28px 68px #08131b85;backdrop-filter:blur(14px) saturate(185%) brightness(1.1);-webkit-backdrop-filter:blur(14px) saturate(185%) brightness(1.1)}
.center:before{background:linear-gradient(90deg,transparent,#fff,transparent)}
.nav-link{background:linear-gradient(140deg,#eef8f452,#c4d8d820 54%,#0c1c283d);border-color:#ffffff9a;box-shadow:inset 0 1px #ffffffa8,inset 0 -1px #ffffff20,0 8px 20px #07121a38;backdrop-filter:blur(14px) saturate(175%);-webkit-backdrop-filter:blur(14px) saturate(175%)}
.side-nav .nav-link:first-child{background:linear-gradient(140deg,#ffffff67,#b6cbd62d 55%,#1d3e4a3d);border-color:#ffffffc4}
.search,.key-input{background:linear-gradient(135deg,#ffffff62,#d9eced27 45%,#112c3b3b 78%,#ffffff25);border-color:#ffffffc2;box-shadow:inset 0 1px #fff,inset 0 -1px #ffffff33,0 14px 35px #06121d66;backdrop-filter:blur(13px) saturate(175%);-webkit-backdrop-filter:blur(13px) saturate(175%)}
.search:before{background:linear-gradient(90deg,transparent,#ffffffdf,transparent)}
.top-note,.overline,.alert{background:linear-gradient(145deg,#ffffff43,#ffffff10);border-color:#ffffff8b;color:#f8fcff;backdrop-filter:blur(16px) saturate(155%);-webkit-backdrop-filter:blur(16px) saturate(155%)}
.subhead,.reason{color:#edf3f4}.helper,.info,.identity,.composer-label{color:#e5eff0}.search input::placeholder{color:#e0e9e9}.brand,.top-title{color:#fff;text-shadow:0 1px 8px #0006}
@media(max-width:720px){.shell{background-attachment:scroll;background-position:54% center}}

/* Clearer controls and calmer key entry. */
.side-nav{gap:8px}
.nav-link{min-height:58px;padding:8px 11px;gap:12px;border-radius:18px;color:#fff;font-size:14px;font-weight:600;text-shadow:0 1px 6px #06101970}
.nav-icon{display:grid;place-items:center;flex:none;width:34px;height:34px;border:1px solid #ffffff73;border-radius:11px;background:linear-gradient(145deg,#ffffff50,#ffffff17);box-shadow:inset 0 1px #ffffff9c,0 4px 12px #07131b38;color:#fff}
.nav-icon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.side-bottom{padding-top:16px;border-top-color:#ffffff4d}.side-bottom .nav-link{color:#fff;font-size:14px}
.center h1{font-size:clamp(32px,3.4vw,42px);font-weight:700;letter-spacing:-.045em;margin:12px 0 12px;text-shadow:0 2px 14px #07101960}
.center .overline+h1{margin-top:18px}.subhead{font-size:15.5px;line-height:1.5;margin-bottom:27px;text-shadow:0 1px 9px #07101964}
.search{min-height:112px;padding:10px 14px 11px;border-radius:27px}.search input{height:52px;padding:0 7px;font-size:15.5px}.composer-bar{min-height:38px}
.composer-label{text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:700;color:#f4f9f8}
.go{width:39px;height:39px}.key-helper{display:block;max-width:460px;margin:18px auto 0;text-align:center;font-size:13px;line-height:1.55;color:#f1f6f5}
@media(max-width:720px){.nav-link{padding:8px 5px}.nav-icon{width:32px;height:32px}}
/* Key entry: let the title, field, and note stand on their own. */
.key-screen{width:min(580px,100%);padding:0;border:0;border-radius:0;background:none;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}
.key-screen:before{display:none}
.key-intro{margin-bottom:28px}
.key-screen h1{margin:0 0 10px;font-size:clamp(35px,3.6vw,45px);font-weight:650}
.key-screen .subhead{margin:0 auto;color:#f1f5f4}
.key-search{display:flex;flex-direction:row;align-items:center;min-height:72px;padding:6px 8px 6px 21px;border-radius:20px;background:#2331396e;border-color:#ffffffa8;box-shadow:inset 0 1px #ffffff8c,0 15px 38px #06121d70;backdrop-filter:blur(18px) saturate(145%);-webkit-backdrop-filter:blur(18px) saturate(145%);transform:none}
.key-search:before{display:none}
.key-search:hover{transform:none;border-color:#fff}
.key-search input{flex:1;min-width:0;width:auto;height:58px;padding:0 3px}
.key-search .go{flex:none;width:46px;height:46px;margin:0;border-radius:14px;font-size:23px;font-weight:400}
.key-search .go:hover{transform:translateX(2px)}
.key-screen .key-helper{margin:21px auto 0;font-size:13px;color:#e9f0ef}
@media(max-width:480px){.key-screen{padding:0}.key-intro{margin-bottom:25px}.key-screen h1{font-size:35px}.key-search{min-height:66px;padding:5px 6px 5px 16px;border-radius:18px}.key-search input{height:54px;padding:0 3px}.key-search .go{width:44px;height:44px;margin:0}}

/* Dark workspace layout. All links correspond to real product screens. */
:root{--surface:#202020;--text:#f2f2f2;--muted:#929292}
body{background:#202020}
.shell{min-height:calc(100vh - 36px);margin:18px;border:1px solid #303030;border-radius:23px;overflow:hidden;background:#090909;isolation:auto}
.sidebar{width:253px;min-height:calc(100vh - 38px);padding:26px 17px 18px;background:#111;border-right:1px solid #292929;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}
.brand{display:flex;align-items:center;gap:11px;padding:0 9px 40px;color:#f2f2f2;text-shadow:none;font-size:16px;font-weight:600;letter-spacing:-.025em}
.brand-mark{position:relative;display:grid;place-items:center;flex:none;width:35px;height:35px;border-radius:10px;background:#252525;color:#fff;font-size:21px;font-weight:700;font-style:normal}
.brand-status{position:absolute;right:-2px;bottom:-2px;width:9px;height:9px;border:2px solid #111;border-radius:50%;background:#38b65a}
.brand-copy{display:flex;flex-direction:column;gap:2px;min-width:0}.brand-copy strong{font-size:16px;line-height:1.1}.brand-copy small{color:#737373;font-size:11px;font-weight:400;letter-spacing:0}
.side-group{border-bottom:1px solid #252525;padding-bottom:18px}.side-label{display:block;padding:0 11px 14px;color:#777;font-size:10px;font-weight:650;letter-spacing:.13em}
.side-nav{gap:4px}.nav-link,.side-nav .nav-link:first-child{min-height:40px;gap:12px;padding:8px 11px;border:0;border-radius:9px;background:transparent;box-shadow:none;color:#a8a8a8;font-size:13px;font-weight:500;text-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;transition:background .15s,color .15s}
.nav-link:hover,.side-nav .nav-link:first-child:hover{transform:none;background:#1b1b1b;color:#f4f4f4;border:0}
.nav-link.is-active,.side-nav .nav-link:first-child.is-active{background:#222;color:#fff}
.nav-icon{display:grid;place-items:center;flex:none;width:19px;height:19px;border:0;border-radius:0;background:none;box-shadow:none;color:currentColor}
.nav-icon svg{width:18px;height:18px;stroke-width:1.7}
.side-bottom{margin-top:auto;padding:0;border:0}.side-bottom .nav-link{color:#a8a8a8;font-size:13px}
.side-card{margin:0 3px 25px;padding:16px 14px;border:1px solid #2b2b2b;border-radius:15px;background:#121212}.side-card-tag{display:inline-block;padding:3px 7px;border-radius:5px;background:#18351e;color:#54c772;font-size:10px;font-weight:700;letter-spacing:.04em}.side-card strong{display:block;margin:11px 0 5px;font-size:13px;font-weight:600;color:#e8e8e8}.side-card p{margin:0;color:#808080;font-size:11px;line-height:1.45}
.workspace{min-height:calc(100vh - 38px);background:#090909;isolation:auto}.workspace:before{display:none}
.top{height:74px;padding:0 29px;border-bottom:1px solid #282828;background:#0a0a0a;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}
.top-title{color:#f3f3f3;font-size:20px;font-weight:600;letter-spacing:-.035em;text-shadow:none}
.top-action{display:inline-flex;align-items:center;gap:9px;padding:9px 12px;border:1px solid #292929;border-radius:9px;background:#171717;color:#c6c6c6;text-decoration:none;font-size:12px}.top-action:hover{border-color:#4a4a4a;color:#fff}.status-dot{width:7px;height:7px;border-radius:50%;background:#36b458;box-shadow:0 0 0 3px #36b45816}
main.view{display:block;min-height:calc(100vh - 112px);padding:27px 29px 44px}
.center{position:static;width:min(820px,100%);margin:32px auto;padding:34px;border:1px solid #2b2b2b;border-radius:17px;background:#111;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;text-align:left;animation:none}
.center:before{display:none}.center h1{margin:11px 0 10px;color:#f4f4f4;font-size:34px;font-weight:600;letter-spacing:-.04em;text-shadow:none}.center .overline+h1{margin-top:16px}
.subhead,.center .subhead{max-width:630px;margin:0 0 25px;color:#9a9a9a;font-size:14px;line-height:1.6;text-shadow:none}
.overline{border:0;border-radius:0;background:none;box-shadow:none;color:#7d7d7d;padding:0;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;backdrop-filter:none;-webkit-backdrop-filter:none}
.search,.key-input{min-height:104px;padding:8px 13px;border:1px solid #333;border-radius:12px;background:#171717;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;transition:border-color .15s}.search:before,.search:after{display:none}.search:hover,.search:focus-within{transform:none;border-color:#777;box-shadow:none}.search input{height:50px;color:#f4f4f4;font-size:14px}.search input::placeholder{color:#777}.composer-label{color:#777;font-size:11px;font-weight:500;letter-spacing:0;text-transform:none}.go,.search button,.key-submit{background:#e9e9e9;border-radius:9px;box-shadow:none;color:#111}.go:hover,.search button:hover,.key-submit:hover{background:#fff;transform:none;box-shadow:none}
.helper,.identity,.info{color:#858585}.helper{justify-content:flex-start}.identity{justify-content:flex-start}.actions{justify-content:flex-start}.chip{color:#bdbdbd}.alert{max-width:none;border-color:#67343a;border-radius:9px;background:#281619;box-shadow:none;color:#f0c7cb;backdrop-filter:none;-webkit-backdrop-filter:none}
.key-screen{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(265px,.82fr);gap:20px;align-items:stretch;width:100%;max-width:1120px;margin:0 auto;padding:0;border:0;border-radius:0;background:none;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;text-align:left}
.key-main,.access-panel{border:1px solid #2a2a2a;border-radius:17px;background:#111}.key-main{padding:clamp(30px,4vw,48px)}.access-panel{padding:31px 28px}
.section-kicker{display:block;color:#7d7d7d;font-size:10px;font-weight:700;letter-spacing:.14em}
.key-intro{margin:0 0 34px}.key-screen h1{margin:20px 0 10px;font-size:clamp(35px,3.6vw,49px);font-weight:600}.key-screen .subhead{max-width:460px;margin:0;color:#aaa;font-size:14px}
.key-search{display:flex;flex-direction:row;align-items:center;min-height:63px;padding:5px;border:1px solid #3a3a3a;border-radius:11px;background:#171717;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}.key-search input{flex:1;width:auto;min-width:0;height:51px;padding:0 14px}.key-search .go{flex:none;width:51px;height:51px;margin:0;border-radius:8px;font-size:21px;font-weight:400}.key-screen .key-helper{margin:15px 0 0;color:#858585;font-size:12px;text-align:left}
.access-panel h2{margin:26px 0 25px;color:#efefef;font-size:20px;font-weight:600;letter-spacing:-.025em}.access-step{display:flex;gap:15px;padding:20px 0;border-top:1px solid #2a2a2a}.access-step>span{color:#59bf70;font-size:11px;font-weight:700}.access-step strong{color:#e3e3e3;font-size:13px;font-weight:600}.access-step p{margin:5px 0 0;color:#858585;font-size:12px;line-height:1.5}
.account-screen{max-width:750px}.account-row{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 0;border-top:1px solid #2b2b2b;font-size:13px}.account-row span{color:#888}.account-row strong{color:#e8e8e8;font-weight:550;overflow-wrap:anywhere;text-align:right}.account-actions{display:flex;align-items:center;gap:20px;margin-top:20px}.account-actions .chip{padding:9px 0}.account-actions form{margin:0}
.browse-screen .browse-helper{margin:15px 0 0;color:#858585;font-size:12px}.session-panel h2{margin:26px 0 4px}.session-user{margin:0 0 24px;color:#a6a6a6;font-size:13px;overflow-wrap:anywhere}.session-actions{border-top:1px solid #2b2b2b}.session-actions>a{display:flex;justify-content:space-between;gap:12px;padding:16px 0;border-bottom:1px solid #2b2b2b;color:#dedede;text-decoration:none;font-size:13px}.session-actions>a:hover{color:#fff}.session-actions>a span{color:#7d7d7d}.session-actions form{margin-top:17px}.session-actions .chip{padding:5px 0;color:#aaa}
.feature-page{width:min(1190px,100%);margin:0 auto}.feature-head{margin:9px 0 28px}.feature-head h1{margin:12px 0 8px;color:#f4f4f4;font-size:clamp(32px,4vw,48px);letter-spacing:-.055em;font-weight:600}.feature-head p{margin:0;color:#999;font-size:14px;line-height:1.6}.settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.feature-card{min-width:0;padding:25px;border:1px solid #292929;border-radius:16px;background:#111}.feature-card h2{margin:0 0 18px;font-size:19px;letter-spacing:-.025em;font-weight:600}.setting-row{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 0;border-top:1px solid #292929;color:#ededed}.setting-row strong,.setting-row small{display:block}.setting-row strong{font-size:13px;font-weight:600}.setting-row small{margin-top:5px;color:#858585;font-size:11px;line-height:1.45}.setting-row select{min-width:124px;padding:10px 28px 10px 11px;border:1px solid #383838;border-radius:8px;background:#1b1b1b;color:#ededed;font-size:12px}.setting-row input[type=checkbox]{width:18px;height:18px;accent-color:#dcdcdc}.connection-readout{padding:7px 10px;border-radius:7px;background:#17331f;color:#64c67e;font-size:12px}.connection-readout[data-state=offline]{background:#36211f;color:#ed8a7f}.connection-readout[data-state=testing]{background:#31271b;color:#e5bc79}
.music-search{display:flex;gap:8px;padding:7px;border:1px solid #383838;border-radius:12px;background:#151515}.music-search input{flex:1;min-width:0;padding:8px 15px;border:0;outline:0;background:transparent;color:#f3f3f3;font-size:14px}.music-search button,.game-controls button,.file-button{display:inline-flex;justify-content:center;align-items:center;gap:12px;padding:13px 17px;border:1px solid #3a3a3a;border-radius:8px;background:#e9e9e9;color:#111;font-size:12px;font-weight:600}.music-search button span{font-size:17px}.music-categories{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:16px 0 25px}.music-categories span{color:#777;font-size:11px;margin-right:4px}.music-categories button{padding:7px 11px;border:1px solid #303030;border-radius:7px;background:#171717;color:#bbb;font-size:11px}.music-categories button:hover{color:#fff;border-color:#666}.music-layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(270px,.75fr);gap:18px}.feature-card-head{display:flex;justify-content:space-between;gap:15px;align-items:center}.feature-card-head span{color:#777;font-size:11px}.track{display:grid;grid-template-columns:47px minmax(0,1fr) 38px auto;gap:12px;align-items:center;min-height:69px;padding:11px 0;border-top:1px solid #292929}.track img{width:45px;height:45px;border-radius:7px;object-fit:cover;background:#222}.track strong,.track span{display:block;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.track strong{font-size:13px;font-weight:600}.track span{margin-top:4px;color:#858585;font-size:11px}.track button{width:34px;height:34px;border:1px solid #3a3a3a;border-radius:7px;background:#202020;color:#eee;font-size:12px}.track a{color:#a4a4a4;font-size:11px;text-decoration:none}.track a:hover{color:#fff}.music-empty{padding:35px 0;color:#888;font-size:13px}.music-player{align-self:start;position:sticky;top:27px}.music-player img{width:100%;max-width:235px;aspect-ratio:1;object-fit:cover;border-radius:12px;margin:23px 0}.music-player h2{margin:22px 0 8px}.music-player p{color:#888;font-size:12px}.music-player audio{width:100%;margin-top:18px}.player-actions{display:flex;gap:9px;margin-top:15px}.player-actions button{flex:1;padding:10px;border:1px solid #383838;border-radius:8px;background:#1a1a1a;color:#ddd;font-size:11px}
.game-launcher{display:flex;align-items:center;justify-content:space-between;gap:20px}.game-launcher h2{margin-bottom:8px}.game-launcher p{color:#888;font-size:12px}.game-controls{display:flex;flex-wrap:wrap;gap:9px;margin-top:21px}.game-controls input{position:absolute;width:1px;height:1px;opacity:0}.game-controls button:last-child{background:#191919;color:#ddd}.game-controls button:disabled{opacity:.4;cursor:not-allowed}.game-page iframe{display:block;width:100%;height:min(72vh,780px);margin-top:20px;border:1px solid #393939;border-radius:12px;background:#050505}.game-page iframe[hidden]{display:none}
.go,.key-search .go{font-size:0!important;display:grid;place-items:center}.go:after,.key-search .go:after{content:'';display:block;width:22px;height:22px;background:url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23111111" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M4 12h15m-6-6 6 6-6 6"/%3E%3C/svg%3E') center/contain no-repeat}
html[data-cursor=custom],html[data-cursor=custom] *{cursor:url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="20" height="24" viewBox="0 0 20 24"%3E%3Cpath d="M2 1.5v17l4.3-4 3.1 6.8 2.8-1.3-3.1-6.9h6.5z" fill="%23131315" stroke="%23fff" stroke-width="2.2" stroke-linejoin="round"/%3E%3C/svg%3E') 2 2,default!important}html[data-cursor=custom] a,html[data-cursor=custom] button,html[data-cursor=custom] label,html[data-cursor=custom] select{cursor:pointer!important}html[data-cursor=custom] input,html[data-cursor=custom] textarea,html[data-cursor=custom] [contenteditable=true]{cursor:text!important}
html[data-theme=light]{color-scheme:light;--surface:#f0f1f2;--sidebar:#fff;--text:#1b1c20;--muted:#5c6168}html[data-theme=light] body{background:#e8eaec;color:#1b1c20}html[data-theme=light] .shell{background:#fff;border-color:#d9dcdf}html[data-theme=light] .sidebar{background:#fff;border-color:#dfe1e4}html[data-theme=light] .workspace{background:#f7f8f9}html[data-theme=light] .top{background:#fff;border-color:#e1e3e6}html[data-theme=light] .top-title,html[data-theme=light] .brand,html[data-theme=light] .center h1,html[data-theme=light] .feature-head h1{color:#1a1c20}html[data-theme=light] .brand-mark{background:#1b1d21;color:#fff}html[data-theme=light] .nav-link,html[data-theme=light] .side-bottom .nav-link{color:#5d6269}html[data-theme=light] .nav-link:hover,html[data-theme=light] .nav-link.is-active,html[data-theme=light] .side-nav .nav-link:first-child.is-active{background:#e9ebed;color:#16181b}html[data-theme=light] .side-group,html[data-theme=light] .side-bottom{border-color:#e1e3e5}html[data-theme=light] .side-card,html[data-theme=light] .center,html[data-theme=light] .key-main,html[data-theme=light] .access-panel,html[data-theme=light] .feature-card{background:#fff;border-color:#dfe2e5;color:#1b1c20}html[data-theme=light] .side-card strong,html[data-theme=light] .access-panel h2,html[data-theme=light] .setting-row,html[data-theme=light] .feature-card h2,html[data-theme=light] .track strong{color:#22252a}html[data-theme=light] .subhead,html[data-theme=light] .center .subhead,html[data-theme=light] .feature-head p{color:#646970}html[data-theme=light] .key-search,html[data-theme=light] .music-search,html[data-theme=light] .setting-row select{background:#f5f6f7;border-color:#d4d7da;color:#25282c}html[data-theme=light] .search input,html[data-theme=light] .music-search input{color:#1f2226}html[data-theme=light] .search input::placeholder{color:#8c9197}html[data-theme=light] .go,html[data-theme=light] .music-search button{background:#202328;color:#fff}html[data-theme=light] .go:after{filter:invert(1)}html[data-theme=light] .setting-row,html[data-theme=light] .track,html[data-theme=light] .session-actions,html[data-theme=light] .session-actions>a{border-color:#e3e5e7}html[data-theme=light] .top-action,html[data-theme=light] .music-categories button,html[data-theme=light] .track button,html[data-theme=light] .player-actions button{background:#f3f4f5;border-color:#d9dcdf;color:#4a5057}html[data-theme=light] .game-page iframe{border-color:#d4d7da}html[data-theme=light] .session-actions>a{color:#333}html[data-theme=light] .account-row strong{color:#202328}
@media(max-width:900px){.settings-grid,.music-layout{grid-template-columns:1fr}.music-player{position:static}}
@media(max-width:1000px){.key-screen{grid-template-columns:1fr}.access-panel{display:grid;grid-template-columns:1fr 1fr;column-gap:20px}.access-panel .section-kicker,.access-panel h2{grid-column:1/-1}.access-panel h2{margin:15px 0}}
@media(max-width:720px){.shell{min-height:100vh;margin:0;border:0;border-radius:0}.sidebar{width:64px;min-height:100vh;padding:20px 8px}.brand{display:flex;justify-content:center;padding:0 0 36px}.brand-copy,.side-label,.nav-label,.side-card{display:none}.brand-status{display:block}.side-group{padding-bottom:16px}.nav-link,.side-nav .nav-link:first-child{justify-content:center;padding:9px 0}.nav-icon{width:20px}.workspace{min-height:100vh}.top{padding:0 20px}.top-action{font-size:0;padding:10px}.status-dot{width:8px;height:8px}main.view{min-height:calc(100vh - 74px);padding:20px}.center{padding:25px;margin:12px auto}.key-screen{padding:0;margin:0}.key-main,.access-panel{padding:27px 23px}.access-panel{display:block}}
@media(max-width:480px){.sidebar{width:54px;padding:17px 6px}.brand-mark{width:32px;height:32px}.top{height:62px;padding:0 16px}.top-title{font-size:18px}main.view{min-height:calc(100vh - 62px);padding:14px}.key-main,.access-panel{padding:25px 20px}.key-screen h1{font-size:35px}.key-search{min-height:58px;padding:4px}.key-search input{height:48px;padding:0 10px}.key-search .go{width:48px;height:48px}.center:not(.key-screen){padding:24px 20px}}
`;

const bootCss = `
.boot{position:fixed;inset:0;z-index:100;display:grid;place-items:center;background:radial-gradient(circle at 50% 45%,#38383a,#151516 68%);color:#f6f6f6;opacity:1;transition:opacity .9s cubic-bezier(.4,0,.2,1),filter .9s ease}
.boot.is-exiting{opacity:0;filter:blur(7px);pointer-events:none}
.boot-word{font:700 clamp(46px,8vw,82px)/1 Arial,Helvetica,sans-serif;letter-spacing:-.075em;text-shadow:0 6px 34px #ffffff32;animation:boot-word-in 1.25s cubic-bezier(.16,1,.3,1) both}
@keyframes boot-word-in{from{opacity:0;filter:blur(15px);transform:translateY(18px) scale(.95)}to{opacity:1;filter:blur(0);transform:translateY(0) scale(1)}}
@media(prefers-reduced-motion:reduce){.boot{display:none}.boot-word{animation:none}}
.boot{overflow:hidden;background:#101821}
.boot:before{content:'';position:absolute;inset:-24px;background:linear-gradient(130deg,#0714218c,#0c1b2b65),url('https://jamisonkaden7-dev.github.io/kadens-propxy/nature-lake-glass.jpg') center/cover;filter:blur(12px) saturate(155%) brightness(.82);transform:scale(1.04)}
.boot:after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#ffffff20,transparent 30%)}
.boot-word{position:relative;z-index:1;background:linear-gradient(180deg,#fff,#dcebe9);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 12px 23px #06101ba6)}
.boot{background:#0b0b0b}.boot:before,.boot:after{display:none}.boot-word{background:none;color:#f2f2f2;-webkit-text-fill-color:#f2f2f2;filter:none;text-shadow:none;letter-spacing:-.05em}
`;

const bootHtml = `<div class="boot" role="status" aria-label="ItsRecoil loading"><span class="boot-word">ItsRecoil</span></div>`;

const bootJs = `(()=>{const boot=document.querySelector('.boot');if(!boot)return;let done=false,exiting=false;const finish=()=>{if(done)return;done=true;boot.remove();window.removeEventListener('keydown',onKey)};const fade=()=>{if(done||exiting)return;exiting=true;boot.classList.add('is-exiting');setTimeout(finish,950)};const onKey=e=>{if(e.key==='Enter'||e.key==='Escape')fade()};window.addEventListener('keydown',onKey);setTimeout(fade,2300)})();`;

const featureJs = `(()=>{
  const key='itsrecoil.preferences';
  const presets={
    recoil:{title:'ItsRecoil',icon:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" rx="15" fill="%23121212"/%3E%3Ctext x="32" y="46" text-anchor="middle" fill="white" font-family="Arial" font-size="44" font-weight="700"%3ER%3C/text%3E%3C/svg%3E'},
    canva:{title:'Canva',icon:'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHJvbGU9ImltZyIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjx0aXRsZT5DYW52YSBpY29uPC90aXRsZT48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgyPSIxIiB5Mj0iMSI+PHN0b3Agc3RvcC1jb2xvcj0iIzAwYzRjYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzdkMmFlOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEyIiBmaWxsPSJ1cmwoI2cpIi8+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTEyIDBDNS4zNzMgMCAwIDUuMzczIDAgMTJzNS4zNzMgMTIgMTIgMTIgMTItNS4zNzMgMTItMTJTMTguNjI3IDAgMTIgMHpNNi45NjIgNy42OGMuNzU0IDAgMS4zMzcuNTQ5IDEuNDA1IDEuMi4wNjkuNTgzLS4xNzEgMS4wOTctLjgyMiAxLjQwNi0uMzQzLjE3MS0uNDguMTcyLS41NDkuMDY5LS4wMzQtLjA2OSAwLS4xMzcuMDY5LS4yMDYuNjE3LS41MTQuNjE3LS45MjYuNTQ4LTEuNTA4LS4wMzQtLjM3OC0uMzA4LS42MTgtLjU4My0uNjE4LTEuMiAwLTIuOTE0IDIuNjc0LTIuNjc0IDQuNjI5LjEwMy43NTQuNTQ5IDEuNjQ2IDEuNTA5IDEuNjQ2LjMwOCAwIC42NS0uMTAzLjk2LS4yNC41LS4yNjQuNzk5LS40NyAxLjA5Ny0uOC0uMDczLS44ODUuNzA0LTIuMDQ2IDEuODUxLTIuMDQ2LjUxNSAwIC45MjYuMjA1Ljk2LjU4My4wNjguNTE0LS4zNzcuNTgyLS41MTQuNTgycy0uMzc4LS4wMzQtLjM3OC0uMTdjLS4wMzQtLjEzOC4zMDktLjA3LjI3NS0uMzc4LS4wMzUtLjIwNi0uMjQtLjI3NC0uNDQ2LS4yNzQtLjcyIDAtMS4xMzEuOTk0LTEuMDI5IDEuNjExLjAzNS4yNzUuMTcyLjU0OS40NDcuNTQ5LjIwNSAwIC41MTQtLjMxLjYxNy0uNzU1LjA2OC0uMzA4LjM0My0uNTE0LjU4My0uNTE0LjEwMiAwIC4xNy4wMzQuMjA1LjE3MXYuMTM4Yy0uMDM0LjEzNy0uMTM3LjU0OC0uMTAyLjY1MSAwIC4wNjkuMDM0LjE3MS4xNy4xNzEuMDkyIDAgLjQzNi0uMTguNzc3LS40NTkuMTE3LS41OS4yNTMtMS4yOTguMjUzLTEuMzU3LjAzNC0uMjQuMTM3LS40OC42MTctLjQ4LjEwMyAwIC4xNzEuMDM0LjIwNS4xNzF2LjEzOGwtLjEzNi42MTdjLjQ0NS0uNTgzIDEuMDk3LS45OTQgMS41MDgtLjk5NC4xNzIgMCAuMzA5LjEwMi4zMDkuMjc0IDAgLjEwMyAwIC4yNzQtLjA2OS40NDYtLjEzNy4zNzctLjMwOS45Ni0uNDEyIDEuNDc0IDAgLjEzNy4wMzUuMjc0LjIwNy4yNzQuMTcxIDAgLjY4NS0uMjA2IDEuMDk2LS43NTRsLjAwNy0uMDA0Yy0uMDAyLS4wNjgtLjAwNy0uMTM0LS4wMDctLjIwMiAwLS40MTEuMDM1LS43NTQuMTA0LS45OTQuMDY4LS4yNzQuNDExLS41MTQuNjE3LS41MTQuMTAzIDAgLjIwNS4wNjkuMjA1LjE3MSAwIC4wMzUgMCAuMTAzLS4wMzQuMTM3LS4xMzcuNDQ2LS4yNC44NTctLjI0IDEuMjY5IDAgLjI0LjAzNC41ODIuMTAyLjc4OCAwIC4wMzQuMDM1LjA2OS4wNy4wNjkuMDY4IDAgLjU0OC0uNDQ1Ljg5LTEuMDI4LS4zMDgtLjIwNi0uNDgtLjU0OS0uNDgtLjk2IDAtLjcyLjQ0Ni0xLjA5Ny44NTgtMS4wOTcuMzQzIDAgLjYxNy4yNC42MTcuNzIgMCAuMzA4LS4xMDMuNjUtLjI3NC45NmguMTAyYS43Ny43NyAwIDAgMCAuNTg0LS4yNC4yOTMuMjkzIDAgMCAxIC4xMzQtLjExN2MuMzM1LS40MjUuODMtLjc0IDEuNDEtLjc0LjQ4IDAgLjkyNC4yMDUuOTU5LjU4Mi4wNjguNTE1LS4zNzguNjE4LS41MTUuNjE4bC0uMDAyLS4wMDJjLS4xMzggMC0uMzc3LS4wMzUtLjM3Ny0uMTcyIDAtLjEzNy4zMDktLjA2OC4yNzQtLjM3Ni0uMDM0LS4yMDYtLjI0LS4yNzUtLjQ0Ni0uMjc1LS42ODYgMC0xLjEzLjg5MS0xLjAyOCAxLjYxMS4wMzQuMjc1LjE3MS41ODMuNDQ1LjU4My4yMDYgMCAuNTE1LS4zMDguNjUyLS43NTQuMDY4LS4yNzQuMzQzLS41MTQuNTgzLS41MTQuMTAzIDAgLjE3LjAzNC4yMDUuMTcxIDAgLjA2OSAwIC4yMDYtLjEzNy42NTItLjE3LjMwOC0uMTcxLjQ4LS4xMzcuNjE3LjAzNC4yNzQuMTcxLjQ4LjMwOS41ODMuMDM0LjAzNC4wNjguMTAyLjA2OC4xMDIgMCAuMDY5LS4wMzQuMTM4LS4xMzcuMTM4LS4wMzQgMC0uMDY4IDAtLjEwMy0uMDM1LS41MTQtLjIwNS0uNzItLjU0OC0uNzg5LS44OTEtLjIwNS4yNC0uNDQ1LjM3Ny0uNzIuMzc3LS40NDUgMC0uODktLjQxMS0uOTYtLjkyNmExLjYwOSAxLjYwOSAwIDAgMSAuMDc1LS42NDljLS4yMDMuMTMtLjQyMi4yMDMtLjYyMy4yMDNoLS4xN2MtLjQ0Ny42NTItLjkyNyAxLjA5OC0xLjI3IDEuMzAzYS44OTYuODk2IDAgMCAxLS4zNzcuMTA0Yy0uMDY4IDAtLjE3MS0uMDM1LS4yMDUtLjEwNC0uMDk1LS4xNTItLjE1Ni0uMzkyLS4xOTMtLjY2Ny0uNDgxLjUyNy0xLjE0NS44MDUtMS40NTMuODA1LS4zNDMgMC0uNTQ4LS4yMDYtLjU4Mi0uNTV2LS4zNzZjLjEwMi0uNzU0LjM3Ny0xLjIuMzc3LTEuMzM3YS4wNzQuMDc0IDAgMCAwLS4wNjktLjA3Yy0uMjQgMC0xLjAyOC44MjQtMS4xNjYgMS4zNzNsLS4xMDMuNDQ1Yy0uMDY4LjMwOS0uMzc3LjUxNS0uNTgyLjUxNS0uMTAzIDAtLjE3Mi0uMDM1LS4yMDYtLjE3MnYtLjEzN2wuMDQ2LS4yMzNjLS40MzUuMzEtLjg3LjUwOC0xLjA3NS41MDgtLjMwOCAwLS40OC0uMTcyLS41MTQtLjQxMi0uMjA2LjI3NC0uNDQ1LjQxMi0uNzU0LjQxMi0uMzUyIDAtLjY5Ni0uMjQtLjg2Mi0uNTkzLS4yNDQuMjc1LS41MjMuNTUzLS44NTIuNzY0LS40OC4zMDktMS4wMjguNTQ5LTEuNjguNTQ5LS41ODIgMC0xLjA5Ny0uMzA5LTEuMzcxLS41ODMtLjQxMi0uMzc3LS42NTEtLjk2LS42ODYtMS41MDktLjIwNS0xLjY4LjgyMy0zLjg0IDIuNC00LjguMzc4LS4yMDUuNzU1LS4zNDMgMS4xMzItLjM0M3ptOS43NyAzLjI5MWMtLjEwNCAwLS4xNzIuMTcyLS4xNzIuMzQzIDAgLjI3NC4xMzcuNTgzLjMwOS43NTVhMS43NCAxLjc0IDAgMCAwIC4xMDItLjU4M2MwLS4zNDMtLjEzNy0uNTE1LS4yNC0uNTE1eiIvPjwvc3ZnPg=='},
    canvas:{title:'Canvas',icon:'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHJvbGU9ImltZyIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjx0aXRsZT5DYW52YXM8L3RpdGxlPjxwYXRoIGZpbGw9IiNlMzJjMzYiIGQ9Ik0uNDQwMyAxNS40MTQyYTEzLjcwNjEgMTMuNzA2MSAwIDAgMS0uNDM2Mi0zLjQ0MDMgMTMuNyAxMy43IDAgMCAxIC40MzYyLTMuNDQwMWMxLjcxNDQuMjEwMyAzLjA0MzggMS42Njg2IDMuMDQzOCAzLjQ0IDAgMS43NzEtMS4zMjg3IDMuMjMtMy4wNDM4IDMuNDQwNHptMy45NzI4LTMuNDQwM2MwIC42MDA0LjQ4NjYgMS4wODczIDEuMDg3MiAxLjA4NzMuNjAxIDAgMS4wODgtLjQ4NyAxLjA4OC0xLjA4NzNzLS40ODctMS4wODgtMS4wODgtMS4wODhjLS42MDA2IDAtMS4wODcyLjQ4NzYtMS4wODcyIDEuMDg4ek0yMy41NiA4LjUzMzhjLTEuNzE1MS4yMTAzLTMuMDQ0IDEuNjY4Ni0zLjA0NCAzLjQ0IDAgMS43NzEgMS4zMjg5IDMuMjMgMy4wNDQgMy40NDA0YTEzLjczMTMgMTMuNzMxMyAwIDAgMCAuNDM2LTMuNDQwM2MwLTEuMTg4My0uMTUxOC0yLjM0MTMtLjQzNi0zLjQ0MDF6bS02LjE0OCAzLjQ0YzAgLjYwMDUuNDg2NSAxLjA4NzQgMS4wODc3IDEuMDg3NC42MDAyIDAgMS4wODgtLjQ4NyAxLjA4OC0xLjA4NzNzLS40ODc4LTEuMDg4LTEuMDg4LTEuMDg4Yy0uNjAxMiAwLTEuMDg3Ny40ODc2LTEuMDg3NyAxLjA4OHptLTUuNDM0NyA4LjU0NjVjLTEuNzcwOSAwLTMuMjI5IDEuMzMtMy40NCAzLjA0NGExMy43MzY0IDEzLjczNjQgMCAwIDAgMy40NDEuNDM1N2MxLjE4ODUgMCAyLjM0MDMtLjE1MTUgMy40NC0uNDM1Ny0uMjEwNy0xLjcxNC0xLjY2ODctMy4wNDQtMy40NDEtMy4wNDR6bS4wMDEtMy4xMDQ2Yy0uNjAxMiAwLTEuMDg3OC40ODc2LTEuMDg3OCAxLjA4ODNzLjQ4NjYgMS4wODgyIDEuMDg3OCAxLjA4ODJjLjYgMCAxLjA4Ny0uNDg3NCAxLjA4Ny0xLjA4ODJzLS40ODctMS4wODgzLTEuMDg3LTEuMDg4M3ptMC0xMy45MzZjMS43NzEzIDAgMy4yMjk1LTEuMzI5MiAzLjQzOTktMy4wNDM4QTEzLjczNTMgMTMuNzM1MyAwIDAgMCAxMS45NzgyIDBjLTEuMTg4NyAwLTIuMzQxMi4xNTE5LTMuNDQxLjQzNTkuMjExIDEuNzE0NiAxLjY2OTEgMy4wNDM4IDMuNDQxIDMuMDQzOHptMCAuOTI5MWMtLjYwMTIgMC0xLjA4NzguNDg2Ni0xLjA4NzggMS4wODc2IDAgLjYwMDIuNDg2NiAxLjA4NzYgMS4wODc4IDEuMDg3Ni42IDAgMS4wODctLjQ4NzQgMS4wODctMS4wODc2IDAtLjYwMS0uNDg3LTEuMDg3Ni0xLjA4Ny0xLjA4NzZ6bTYuMDMyIDEzLjU5NjVjLTEuMjUxNCAxLjI1MjMtMS4zNDQgMy4yMjExLS4yODI1IDQuNTgyYTEzLjc2MiAxMy43NjIgMCAwIDAgNC44NjM2LTQuODY1NGMtMS4zNjA4LTEuMDU5Ny0zLjMyOTktLjk2NzMtNC41ODEyLjI4MzR6bS0uNjU2OC0yLjE5NDhjLS40MjUtLjQyNDUtMS4xMTM1LS40MjQ1LTEuNTM5IDAtLjQyNDMuNDI1Mi0uNDI0MyAxLjExMzYgMCAxLjUzODMuNDI1NS40MjUzIDEuMTE0LjQyNTMgMS41MzkgMCAuNDI0LS40MjQ3LjQyNC0xLjExMzEgMC0xLjUzODN6TTUuOTY0OCA1Ljk2MDNjMS4yNTE2LTEuMjUxMyAxLjM0MzctMy4yMjA2LjI4MjUtNC41ODEzYTEzLjc2NzcgMTMuNzY3NyAwIDAgMC00Ljg2NDQgNC44NjQzYzEuMzYxMiAxLjA2MTYgMy4zMzA2Ljk2ODcgNC41ODItLjI4M3ptLjY1NjcuNjU3MmMtLjQyNC40MjQ3LS40MjQgMS4xMTM5IDAgMS41MzgzLjQyNDUuNDI0NiAxLjExNC40MjQ2IDEuNTM4MiAwIC40MjQ4LS40MjQ0LjQyNDgtMS4xMTM2IDAtMS41MzgzLS40MjQzLS40MjQzLTEuMTEzNy0uNDI0My0xLjUzODIgMHptMTUuOTYyNS0uMzg1N2ExMy43NTk3IDEzLjc1OTcgMCAwIDAtNC44NjM3LTQuODY0MmMtMS4wNjE0IDEuMzYwOS0uOTY5IDMuMzMuMjgyMyA0LjU4MTggMS4yNTE3IDEuMjUwNyAzLjIyMDQgMS4zNDM2IDQuNTgxNC4yODI0ek0xNy4zNDYgOC4xNDQzYy40MjM3LS40MjQ4LjQyMzctMS4xMTM1IDAtMS41MzgzLS40MjUtLjQyNDctMS4xMTQ1LS40MjQ3LTEuNTM4OCAwLS40MjQxLjQyNDgtLjQyNDEgMS4xMTM1IDAgMS41MzgzLjQyNDMuNDI0MyAxLjExMzcuNDI0MyAxLjUzODggMHpNMS4zNzcyIDE3LjcwODdhMTMuNzYzIDEzLjc2MyAwIDAgMCA0Ljg2NDcgNC44NjU0YzEuMDYxMy0xLjM2MDguOTY4NS0zLjMyOTctLjI4MzMtNC41ODE4LTEuMjUxMi0xLjI1MS0zLjIyMDQtMS4zNDM2LTQuNTgxNC0uMjgzNnptNS4yMzg1LTEuOTExNWMtLjQyMzguNDI0Ny0uNDIzOCAxLjExMzYgMCAxLjUzODQuNDI1LjQyNDYgMS4xMTQxLjQyNDYgMS41MzgyIDAgLjQyNS0uNDI0OC40MjUtMS4xMTM3IDAtMS41Mzg0LS40MjQxLS40MjQ1LTEuMTEzMS0uNDI0NS0xLjUzODIgMHoiLz48L3N2Zz4='},
    docs:{title:'Google Docs',icon:'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHJvbGU9ImltZyIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjx0aXRsZT5Hb29nbGUgRG9jczwvdGl0bGU+PHBhdGggZmlsbD0iIzQyODVmNCIgZD0iTTE0LjcyNyA2LjcyN0gxNFYwSDQuOTFjLS45MDUgMC0xLjYzNy43MzItMS42MzcgMS42MzZ2MjAuNzI4YzAgLjkwNC43MzIgMS42MzYgMS42MzYgMS42MzZoMTQuMTgyYy45MDQgMCAxLjYzNi0uNzMyIDEuNjM2LTEuNjM2VjYuNzI3aC02em0tLjU0NSAxMC40NTVINy4wOXYtMS4zNjRoNy4wOXYxLjM2NHptMi43MjctMy4yNzNINy4wOTF2LTEuMzY0aDkuODE4djEuMzY0em0wLTMuMjczSDcuMDkxVjkuMjczaDkuODE4djEuMzYzek0xNC43MjcgNmg2bC02LTZ2NnoiLz48L3N2Zz4='}
  };
  let prefs={theme:'dark',cloak:'recoil',testing:false,cursor:true};
  try{prefs={...prefs,...JSON.parse(localStorage.getItem(key)||'{}')}}catch{}
  function save(){localStorage.setItem(key,JSON.stringify(prefs))}
  function apply(){
    document.documentElement.dataset.theme=prefs.theme==='light'?'light':'dark';
    document.documentElement.dataset.cursor=prefs.cursor?'custom':'default';
    const preset=presets[prefs.cloak]||presets.recoil;
    document.title=preset.title;
    let icon=document.querySelector('link[rel="icon"]');
    if(!icon){icon=document.createElement('link');icon.rel='icon';document.head.appendChild(icon)}
    icon.href=preset.icon;
    document.querySelectorAll('#connection-state,#connection-readout').forEach(state=>{state.textContent=prefs.testing?'Testing':navigator.onLine?'Online':'Offline';state.dataset.state=prefs.testing?'testing':navigator.onLine?'online':'offline'})
  }
  apply();window.addEventListener('online',apply);window.addEventListener('offline',apply);
  const theme=document.getElementById('setting-theme');
  if(theme){theme.value=prefs.theme;theme.addEventListener('change',()=>{prefs.theme=theme.value;save();apply()})}
  const cloak=document.getElementById('setting-cloak');
  if(cloak){cloak.value=prefs.cloak;cloak.addEventListener('change',()=>{prefs.cloak=cloak.value;save();apply()})}
  const testing=document.getElementById('setting-testing');
  if(testing){testing.checked=!!prefs.testing;testing.addEventListener('change',()=>{prefs.testing=testing.checked;save();apply()})}
  const cursor=document.getElementById('setting-cursor');
  if(cursor){cursor.checked=!!prefs.cursor;cursor.addEventListener('change',()=>{prefs.cursor=cursor.checked;save();apply()})}

  const musicForm=document.getElementById('music-search');
  if(musicForm){
    const list=document.getElementById('music-results');
    const audio=document.getElementById('music-audio');
    const now=document.getElementById('music-now');
    const art=document.getElementById('music-art');
    const next=document.getElementById('music-next');
    const prev=document.getElementById('music-prev');
    let songs=[],index=-1;
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function play(i){
      if(!songs[i])return;
      index=i;const s=songs[i];
      audio.src=s.previewUrl||'';audio.play().catch(()=>{});
      now.textContent=s.trackName+' — '+s.artistName;
      art.src=s.artworkUrl100||'';art.hidden=!s.artworkUrl100;
      list.querySelectorAll('[data-play]').forEach((button,n)=>button.setAttribute('aria-label',(n===i?'Playing ':'Play ')+songs[n].trackName));
    }
    async function search(query){
      list.innerHTML='<p class="music-empty">Searching…</p>';
      try{
        const res=await fetch('/music-api?q='+encodeURIComponent(query));
        if(!res.ok)throw Error('Search unavailable');
        const data=await res.json();songs=(data.results||[]).filter(s=>s.kind==='song'&&s.previewUrl);
        list.innerHTML=songs.length?songs.map((s,i)=>'<article class="track"><img alt="" loading="lazy" src="'+esc(s.artworkUrl100||'')+'"><div><strong>'+esc(s.trackName)+'</strong><span>'+esc(s.artistName)+' · '+esc(s.collectionName||'')+'</span></div><button type="button" data-play="'+i+'" aria-label="Play '+esc(s.trackName)+'">▶</button><a href="'+esc(s.trackViewUrl||'#')+'" target="_blank" rel="noopener noreferrer" aria-label="Open '+esc(s.trackName)+' on Deezer">Open ↗</a></article>').join(''):'<p class="music-empty">No playable previews found. Try another search.</p>';
      }catch{list.innerHTML='<p class="music-empty">Search is unavailable right now. Please try again.</p>'}
    }
    musicForm.addEventListener('submit',e=>{e.preventDefault();search(musicForm.querySelector('input').value.trim())});
    list.addEventListener('click',e=>{const button=e.target.closest('[data-play]');if(button)play(Number(button.dataset.play))});
    next.addEventListener('click',()=>play(index+1));prev.addEventListener('click',()=>play(index-1));
    audio.addEventListener('ended',()=>play(index+1));
    document.querySelectorAll('[data-music-query]').forEach(b=>b.addEventListener('click',()=>{musicForm.querySelector('input').value=b.dataset.musicQuery;search(b.dataset.musicQuery)}));
  }

  const gameFile=document.getElementById('minecraft-file');
  if(gameFile){
    const frame=document.getElementById('minecraft-frame');
    const launch=document.getElementById('minecraft-launch');
    const message=document.getElementById('minecraft-message');
    const full=document.getElementById('minecraft-fullscreen');
    let gameUrl=null;
    gameFile.addEventListener('change',()=>{const file=gameFile.files?.[0];launch.disabled=!file;message.textContent=file?file.name+' ready to launch.':'Select the supplied Eaglercraft HTML file.'});
    launch.addEventListener('click',async()=>{
      const file=gameFile.files?.[0];if(!file)return;
      launch.disabled=true;message.textContent='Preparing ItsRecoil Minecraft…';
      try{
        const cut=Math.max(0,file.size-200000);
        let tail=await file.slice(cut).text();
        tail=tail.replace('<title>Eaglercraft 26.2 (zeus/master)</title>','<title>ItsRecoil Minecraft</title>')
          .replace('Loading Eaglercraft 26.2 runtime…','Loading ItsRecoil Minecraft…')
          .replace('</head>','<style>#loading_screen{background:#090909!important;color:#f2f2f2!important}#loading_screen img{display:none!important}#boot_status{font-family:Arial,Helvetica,sans-serif!important;color:#eee!important;font-size:18px!important;letter-spacing:-.02em!important}</style></head>');
        const themed=new Blob([file.slice(0,cut),tail],{type:'text/html'});
        if(gameUrl)URL.revokeObjectURL(gameUrl);
        gameUrl=URL.createObjectURL(themed);frame.src=gameUrl;frame.hidden=false;
        message.textContent='ItsRecoil · loading Minecraft';
        frame.addEventListener('load',()=>{message.textContent='Minecraft is ready.'},{once:true});
      }catch{message.textContent='Could not open that HTML file.'}finally{launch.disabled=false}
    });
    full.addEventListener('click',()=>frame.requestFullscreen?.());
    window.addEventListener('pagehide',()=>{if(gameUrl)URL.revokeObjectURL(gameUrl)});
  }
})();`;

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
      if (path === '/ui.js' && request.method === 'GET') return new Response(bootJs + '\n' + featureJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
      if (path === '/music-api' && request.method === 'GET') return musicApi(url);
      if (path === '/music' && request.method === 'GET') return musicPage();
      if (path === '/settings' && request.method === 'GET') return settingsPage();
      if (path === '/minecraft' && request.method === 'GET') return minecraftPage();
      if (path === '/login' && request.method === 'GET') return env.GOOGLE_CLIENT_ID ? keyPage() : startLogin(env, origin);
      if (path === '/access' && request.method === 'POST' && env.GOOGLE_CLIENT_ID) {
        const form = await request.formData();
        const key = String(form.get('key') || '').trim();
        if (!key || key.length > 100) return keyPage('That key is not valid.', 400);
        const hash = await hashKey(key);
        if (!(await keyExists(env.DB, hash))) return keyPage('That key is not valid.', 400);
        const response = redirect(`${origin}/login/google`, 303);
        response.headers.append('Set-Cookie', cookie('__Host-kp_key', await makePendingKey(hash, env.SESSION_SECRET), 600, 'None'));
        response.headers.append('Set-Cookie', cookie('__Host-kp_session', '', 0, 'None'));
        response.headers.set('Cache-Control', 'no-store');
        return response;
      }
      if (path === '/login/google' && request.method === 'GET' && env.GOOGLE_CLIENT_ID) {
        const hash = await readPendingKey(request, env.SESSION_SECRET);
        return hash ? googleLoginPage(env, origin) : redirect(`${origin}/login`, 302);
      }
      if (path === '/login/github' && request.method === 'GET' && env.GITHUB_CLIENT_ID) return startLogin(env, origin);
      if (path === '/oauth/callback' && request.method === 'GET' && env.GITHUB_CLIENT_ID) return finishLogin(request, env, origin);
      if (path === '/oauth/google/callback' && request.method === 'POST' && env.GOOGLE_CLIENT_ID) return finishGoogleLogin(request, env, origin);

      const user = await readSession(request, env.SESSION_SECRET);
      if (path === '/logout' && request.method === 'POST') {
        const exitUrl = env.RELAY_URL ? `${new URL(env.RELAY_URL).origin}/__kaden_exit` : `${origin}/login`;
        const response = redirect(exitUrl, 303);
        response.headers.set('Set-Cookie', cookie('__Host-kp_session', '', 0, 'None'));
        response.headers.append('Set-Cookie', cookie('__Host-kp_link', '', 0, 'None'));
        response.headers.append('Set-Cookie', cookie('__Host-kp_key', '', 0, 'None'));
        return response;
      }
      if (path === '/' && request.method === 'GET') return Response.redirect(`${origin}/app`, 302);
      if (path === '/search' && request.method === 'GET') {
        const query = String(url.searchParams.get('q') || '').trim().slice(0, 200);
        if (!query) return Response.redirect(`${origin}/app`, 303);
        const target = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
        return redirect(`${origin}/browse?url=${encodeURIComponent(target)}`, 303);
      }
      if (path === '/app' && request.method === 'GET') {
        if (!user) return Response.redirect(`${origin}/login`, 302);
        const formToken = await makeFormToken(request, env.SESSION_SECRET);
        const pending = readPending(request);
        if (user.kind === 'google') return (await hasGoogleKeyAccess(env.DB, user.id, user.keyHash)) ? appPage(user, env, formToken, pending) : redirect(`${origin}/login`, 302);
        if (env.GOOGLE_CLIENT_ID) return (await hasAccess(env.DB, user.id)) ? await linkPage(user, env, formToken, origin) : googleLoginPage(env, origin);
        return (await hasAccess(env.DB, user.id)) ? appPage(user, env, formToken, pending) : claimPage(user, formToken);
      }
      if (path === '/account' && request.method === 'GET') {
        if (!user) return Response.redirect(`${origin}/login`, 302);
        return accountPage(user, await makeFormToken(request, env.SESSION_SECRET));
      }
      if (path === '/claim' && request.method === 'POST') {
        if (!user) return Response.redirect(`${origin}/login`, 303);
        const form = await request.formData();
        if (!(await validFormToken(request, env.SESSION_SECRET, form))) return errorPage('This form could not be verified. Please go back and try again.', 403);
        const key = String(form.get('key') || '').trim();
        if (env.GOOGLE_CLIENT_ID && user.kind !== 'google') return Response.redirect(`${origin}/app`, 303);
        const status = user.kind === 'google' ? 'invalid' : await claimKey(env.DB, key, user.id);
        if (status === 'claimed' || status === 'owned') return Response.redirect(`${origin}/app`, 303);
        const formToken = await makeFormToken(request, env.SESSION_SECRET);
        return claimPage(user, formToken, status === 'taken' ? 'That key has already been claimed by another account.' : 'That key is not valid.', 400);
      }
      if (path === '/browse' && request.method === 'GET') {
        if (!user) {
          const response = redirect(`${origin}/login`, 302);
          const pending = String(url.searchParams.get('url') || '').slice(0, 2048);
          if (pending) response.headers.set('Set-Cookie', cookie('__Host-kp_pending', encodeURIComponent(pending), 900));
          return response;
        }
        if (env.GOOGLE_CLIENT_ID && user.kind !== 'google') return Response.redirect(`${origin}/app`, 302);
        const allowed = user.kind === 'google' ? await hasGoogleKeyAccess(env.DB, user.id, user.keyHash) : await hasAccess(env.DB, user.id);
        if (!allowed) return Response.redirect(`${origin}/app`, 302);
        const target = resolveDestination(url.searchParams.get('url'));
        if (['google.com', 'www.google.com'].includes(target.hostname)) {
          return googleChoicePage(target);
        }
        if (env.RELAY_URL) {
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
        if (!user || !(user.kind === 'google' ? await hasGoogleKeyAccess(env.DB, user.id, user.keyHash) : await hasAccess(env.DB, user.id))) return new Response('Unauthorized', { status: 401 });
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

async function makePendingKey(hash, secret) {
  const payload = b64url(encoder.encode(JSON.stringify({ hash, exp: Math.floor(Date.now() / 1000) + 600 })));
  const signature = b64url(new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(`key:${payload}`))));
  return `${payload}.${signature}`;
}

async function readPendingKey(request, secret) {
  try {
    const token = getCookie(request, '__Host-kp_key');
    if (!token) return null;
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return null;
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(signature), encoder.encode(`key:${payload}`));
    if (!valid) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    return /^[a-f0-9]{64}$/.test(data.hash) && Number.isFinite(data.exp) && data.exp >= Date.now() / 1000 ? data.hash : null;
  } catch { return null; }
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
  const payload = b64url(encoder.encode(JSON.stringify({ kind: identity.kind || 'github', id: identity.id, login: identity.login, keyHash: identity.keyHash, exp: Math.floor(Date.now() / 1000) + SESSION_AGE })));
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
    if (data.kind === 'google' && (!/^\d{5,30}$/.test(String(data.id)) || !/^[a-f0-9]{64}$/.test(String(data.keyHash)))) return null;
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
  const pendingHash = await readPendingKey(request, env.SESSION_SECRET);
  if (!pendingHash) return errorPage('Your key session expired. Enter your key again.', 403);
  const form = await request.formData();
  const csrf = String(form.get('g_csrf_token') || '');
  if (!csrf || csrf.length > 200 || csrf !== getCookie(request, 'g_csrf_token')) return errorPage('Google sign-in could not be verified. Try again.', 403);
  let identity;
  try { identity = await verifyGoogleCredential(form.get('credential'), env.GOOGLE_CLIENT_ID); }
  catch (error) { return errorPage(error.message, 403); }
  const status = await claimGoogleKeyHash(env.DB, pendingHash, identity.id);
  if (status !== 'claimed' && status !== 'owned') return keyPage('That key belongs to another account. Sign in with the Google account that first redeemed it.', 403);
  identity.keyHash = pendingHash;
  const session = await makeSession(identity, env.SESSION_SECRET);
  const response = redirect(`${origin}/app`, 303);
  response.headers.append('Set-Cookie', cookie('__Host-kp_link', '', 0, 'None'));
  response.headers.append('Set-Cookie', cookie('__Host-kp_key', '', 0, 'None'));
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
    'Content-Security-Policy': "default-src 'none'; img-src 'self' data: https://jamisonkaden7-dev.github.io https://cdn-images.dzcdn.net; style-src 'self' 'unsafe-inline'; font-src 'self' data:; media-src 'self' blob: https://cdnt-preview.dzcdn.net; connect-src 'self'; form-action 'self'; base-uri 'none'; script-src 'none'; frame-src blob:"
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
      e.prepend(`<div style="position:sticky;top:0;z-index:2147483647;padding:10px 16px;background:#111;color:#fff;font:14px system-ui;border-bottom:1px solid #555"><a style="color:#eee;text-decoration:none;font-weight:700" href="${origin}/app">← ItsRecoil</a> <span style="margin-left:12px;opacity:.75">${escapeHtml(finalUrl.hostname)}</span></div>`, { html: true });
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

function page(title, content, status = 200, googleScript = false, localScript = false, showBoot = false) {
  const active = title === 'Browse' ? 'browse' : title === 'Enter key' || title === 'Claim a key' ? 'key' : title === 'Privacy' ? 'privacy' : title === 'Account' || title === 'Sign in' || title === 'Link Google' ? 'account' : title.toLowerCase();
  const heading = title === 'Enter key' || title === 'Claim a key' ? 'Access' : title === 'Sign in' || title === 'Link Google' ? 'Account' : title;
  const nav = (name, href, label, icon) => `<a class="nav-link${active === name ? ' is-active' : ''}" href="${href}"${active === name ? ' aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true">${icon}</span><span class="nav-label">${label}</span></a>`;
  const browseIcon = '<svg viewBox="0 0 24 24"><path d="M4 10.5 12 4l8 6.5V20H4z"/><path d="M9 20v-6h6v6"/></svg>';
  const keyIcon = '<svg viewBox="0 0 24 24"><circle cx="8" cy="10" r="3.5"/><path d="M11.5 10H21v3h-3v3h-3v-3h-3.5"/></svg>';
  const accountIcon = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-3.5 3.5-5.5 7-5.5s6 2 7 5.5"/></svg>';
  const privacyIcon = '<svg viewBox="0 0 24 24"><path d="M12 3 20 6v6c0 5-3.3 8-8 9-4.7-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>';
  const musicIcon = '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  const gameIcon = '<svg viewBox="0 0 24 24"><path d="M5 8h14l3 9-3 3-4-3H9l-4 3-3-3z"/><path d="M7 13h5m-2.5-2.5v5M17 13h.01M19 15h.01"/></svg>';
  const settingsIcon = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></svg>';
  const shell = `<div class="shell"><aside class="sidebar" aria-label="Main navigation"><a class="brand" href="/app"><span class="brand-mark" aria-hidden="true">R<span class="brand-status"></span></span><span class="brand-copy"><strong>ItsRecoil</strong><small>Private workspace</small></span></a><div class="side-group"><span class="side-label">WORKSPACE</span><nav class="side-nav">${nav('browse', '/app', 'Browse', browseIcon)}${nav('music', '/music', 'Music', musicIcon)}${nav('minecraft', '/minecraft', 'Minecraft', gameIcon)}${nav('key', '/login', 'Access key', keyIcon)}${nav('account', '/account', 'Account', accountIcon)}</nav></div><div class="side-bottom"><div class="side-card"><span class="side-card-tag">ACCESS</span><strong>Invite-only browsing</strong><p>Enter a key, then use the Google account connected to it.</p></div>${nav('settings', '/settings', 'Settings', settingsIcon)}${nav('privacy', '/privacy', 'Privacy', privacyIcon)}</div></aside><div class="workspace"><header class="top"><span class="top-title">${escapeHtml(heading)}</span><a class="top-action" href="/settings"><span class="status-dot" aria-hidden="true"></span><span id="connection-state">Online</span></a></header><main class="view view-${active || 'other'}">${content}</main></div></div>`;
  const headers = new Headers(proxyHeaders('text/html; charset=utf-8'));
  headers.set('Content-Security-Policy', headers.get('Content-Security-Policy').replace("script-src 'none'", "script-src 'self'").replace("form-action 'self'", 'form-action https:'));
  if (googleScript) {
    headers.set('Content-Security-Policy', "default-src 'none'; script-src 'self' https://accounts.google.com/gsi/client https://*.gstatic.com; frame-src https://accounts.google.com; connect-src https://accounts.google.com https://*.gstatic.com; img-src data: https://jamisonkaden7-dev.github.io https://accounts.google.com https://*.googleusercontent.com; style-src 'unsafe-inline' https://accounts.google.com https://*.gstatic.com; form-action 'self' https://accounts.google.com; base-uri 'none'; frame-ancestors 'none'");
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · ItsRecoil</title><style>${modernCss}${showBoot ? bootCss : ''}</style>${googleScript ? '<script src="https://accounts.google.com/gsi/client" async defer></script>' : ''}<script src="/ui.js?v=features2" defer></script></head><body>${showBoot ? bootHtml : ''}${shell}</body></html>`, { status, headers });
}

function googleWidget(env, origin) {
  return `<div class="google-wrap"><div id="g_id_onload" data-client_id="${escapeHtml(env.GOOGLE_CLIENT_ID)}" data-context="signin" data-ux_mode="redirect" data-login_uri="${escapeHtml(origin)}/oauth/google/callback" data-auto_prompt="false"></div><div class="g_id_signin" data-type="standard" data-shape="rectangular" data-theme="outline" data-text="signin_with" data-size="large" data-logo_alignment="left"></div></div>`;
}

function googleLoginPage(env, origin) {
  return page('Sign in', `<section class="center"><div class="overline">ItsRecoil / 02 — account</div><h1>Your account.</h1><p class="subhead">Sign in with the Google account that owns this key. If this key is new, the account you choose will claim it.</p>${googleWidget(env, origin)}<div class="actions"><a class="chip" href="/login">Use a different key</a></div></section>`, 200, true);
}

function keyPage(error = '', status = 200) {
  return page('Enter key', `<section class="center key-screen"><div class="key-main"><span class="section-kicker">GET STARTED</span><div class="key-intro"><h1>Enter your key.</h1><p class="subhead">Then continue with the Google account connected to it.</p></div>${error ? `<div class="alert" role="alert">${escapeHtml(error)}</div>` : ''}<form class="search key-search" action="/access" method="post"><input id="key" name="key" type="password" aria-label="Access key" maxlength="100" required autocomplete="off" placeholder="Paste your access key" autofocus><button class="go" type="submit" aria-label="Continue">→</button></form><p class="helper key-helper">First Google sign-in claims a new key.</p></div><aside class="access-panel"><span class="section-kicker">HOW IT WORKS</span><h2>Access in two steps</h2><div class="access-step"><span>01</span><div><strong>Enter your key</strong><p>Use the invite key you were given.</p></div></div><div class="access-step"><span>02</span><div><strong>Sign in with Google</strong><p>New keys become tied to that account.</p></div></div></aside></section>`, status, false, true);
}

function accountPage(user, formToken) {
  return page('Account', `<section class="center account-screen"><span class="section-kicker">YOUR ACCOUNT</span><h1>Account</h1><p class="subhead">Your browsing session is connected to this sign-in.</p><div class="account-row"><span>Signed in as</span><strong>${escapeHtml(user.login)}</strong></div><div class="account-row"><span>Sign-in method</span><strong>${user.kind === 'google' ? 'Google' : 'GitHub'}</strong></div><div class="account-actions"><a class="chip" href="/app">Back to browse</a>${logoutForm(formToken)}</div></section>`);
}

function privacyPage() {
  return page('Privacy', `<section class="center"><div class="overline">ItsRecoil / Privacy</div><h1 class="error-title">Privacy.</h1><p class="subhead">ItsRecoil uses your Google account ID to keep your redeemed key tied to your account. It stores a hash of the key and that account ID in Cloudflare D1. Your email appears only in a signed browser session cookie and on the account screen.</p><p class="subhead">When you open a link, the service handles the address and page data to relay that public website. It uses short-lived launch tickets and session cookies. The websites you visit may collect information under their own policies. Cloudflare provides hosting and may process request data. ItsRecoil does not sell your account information.</p><div class="actions"><a class="chip" href="/app">← Back to ItsRecoil</a></div></section>`, 200);
}

function settingsPage() {
  return page('Settings', `<section class="feature-page"><div class="feature-head"><span class="section-kicker">PREFERENCES</span><h1>Settings</h1><p>Make this workspace yours. Preferences stay in this browser.</p></div><div class="settings-grid"><section class="feature-card"><h2>Appearance</h2><label class="setting-row" for="setting-theme"><span><strong>Theme</strong><small>Choose the workspace colors.</small></span><select id="setting-theme"><option value="dark">Dark</option><option value="light">Light</option></select></label><label class="setting-row" for="setting-cursor"><span><strong>Custom cursor</strong><small>A small arrow that follows the theme.</small></span><input id="setting-cursor" type="checkbox"></label></section><section class="feature-card"><h2>Browser tab</h2><label class="setting-row" for="setting-cloak"><span><strong>Tab appearance</strong><small>Changes this tab's title and icon.</small></span><select id="setting-cloak"><option value="recoil">ItsRecoil</option><option value="canva">Canva</option><option value="canvas">Canvas</option><option value="docs">Google Docs</option></select></label></section><section class="feature-card"><h2>Connection</h2><div class="setting-row"><span><strong>Current status</strong><small>Based on this browser's network state.</small></span><span class="connection-readout" id="connection-readout">Online</span></div><label class="setting-row" for="setting-testing"><span><strong>Testing indicator</strong><small>Marks your session as testing.</small></span><input id="setting-testing" type="checkbox"></label></section></div></section>`);
}

function musicPage() {
  return page('Music', `<section class="feature-page music-page"><div class="feature-head"><span class="section-kicker">MUSIC</span><h1>Find something to listen to.</h1><p>Search songs and play available previews. Open a track to listen in Deezer.</p></div><form id="music-search" class="music-search"><input name="q" aria-label="Search songs and artists" placeholder="Search songs or artists" required><button type="submit">Search <span aria-hidden="true">→</span></button></form><div class="music-categories"><span>Try</span><button type="button" data-music-query="indie">Indie</button><button type="button" data-music-query="hip hop">Hip hop</button><button type="button" data-music-query="jazz">Jazz</button><button type="button" data-music-query="electronic">Electronic</button></div><div class="music-layout"><section class="feature-card music-list"><div class="feature-card-head"><h2>Tracks</h2><span>Previews via Deezer</span></div><div id="music-results"><p class="music-empty">Search to see tracks.</p></div></section><aside class="feature-card music-player"><span class="section-kicker">NOW PLAYING</span><img id="music-art" alt="" hidden><h2 id="music-now">Choose a song</h2><p>Previews play here when available.</p><audio id="music-audio" controls preload="none"></audio><div class="player-actions"><button type="button" id="music-prev" aria-label="Previous song">← Previous</button><button type="button" id="music-next" aria-label="Next song">Next →</button></div></aside></div></section>`);
}

async function musicApi(url) {
  const query = String(url.searchParams.get('q') || '').trim().slice(0, 100);
  if (!query) return new Response(JSON.stringify({ resultCount: 0, results: [] }), { headers: { 'Content-Type': 'application/json' } });
  try {
    const source = new URL('https://api.deezer.com/search');
    source.searchParams.set('q', query);
    source.searchParams.set('limit', '35');
    const upstream = await fetch(source, { headers: { Accept: 'application/json' } });
    if (!upstream.ok) throw new Error('Music API unavailable');
    const data = await upstream.json();
    if (!Array.isArray(data.data)) throw new Error('Invalid music response');
    const results = data.data.map(track => ({
      kind: 'song', trackName: track.title, artistName: track.artist?.name,
      collectionName: track.album?.title, artworkUrl100: track.album?.cover_medium,
      previewUrl: track.preview, trackViewUrl: track.link
    }));
    return new Response(JSON.stringify({ resultCount: results.length, results }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=120', 'Access-Control-Allow-Origin': '*' } });
  } catch {
    return new Response(JSON.stringify({ error: 'Music search is unavailable' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
}

function minecraftPage() {
  const response = page('Minecraft', `<section class="feature-page game-page"><div class="feature-head"><span class="section-kicker">MINECRAFT</span><h1>Eaglercraft launcher</h1><p>Load the Eaglercraft HTML file you provided. The game runs locally in your browser; the site does not upload the file.</p></div><section class="feature-card game-launcher"><div><h2>Launch Minecraft</h2><p id="minecraft-message">Select the supplied Eaglercraft HTML file.</p><div class="game-controls"><label class="file-button" for="minecraft-file">Choose HTML file</label><input id="minecraft-file" type="file" accept=".html,text/html"><button id="minecraft-launch" type="button" disabled>Launch game →</button><button id="minecraft-fullscreen" type="button">Fullscreen</button></div></div></section><iframe id="minecraft-frame" title="Eaglercraft" allow="fullscreen; gamepad; clipboard-read; clipboard-write" hidden></iframe></section>`);
  response.headers.set('Content-Security-Policy', "default-src 'self' blob: data: https: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https:; style-src 'self' 'unsafe-inline' blob: data: https:; img-src 'self' blob: data: https:; media-src 'self' blob: data: https:; connect-src 'self' blob: data: https: wss:; frame-src blob:; worker-src blob:; form-action 'self'; base-uri 'none'");
  return response;
}

async function linkPage(user, env, formToken, origin) {
  const response = page('Link Google', `<section class="center"><div class="overline">ItsRecoil / account</div><h1>Link Google.</h1><p class="subhead">The key claimed by <strong>${escapeHtml(user.login)}</strong> will be linked to the Google account you choose.</p>${googleWidget(env, origin)}<div class="identity">${logoutForm(formToken)}</div></section>`, 200, true);
  response.headers.append('Set-Cookie', cookie('__Host-kp_link', '1', 600, 'None'));
  response.headers.append('Set-Cookie', cookie('__Host-kp_session', await makeSession(user, env.SESSION_SECRET), SESSION_AGE, 'None'));
  return response;
}

function errorPage(message, status) {
  return page('Could not open page', `<section class="center"><div class="overline">ItsRecoil / error</div><h1 class="error-title">Couldn’t open it.</h1><p class="reason">${escapeHtml(message)}</p><div class="actions"><a class="chip" href="/app">Back to ItsRecoil ↗</a></div></section>`, status);
}

function logoutForm(formToken) {
  return `<form action="/logout" method="post"><input type="hidden" name="form_token" value="${formToken}"><button class="chip" type="submit">Sign out</button></form>`;
}

function claimPage(user, formToken, error = '', status = 200) {
  return page('Claim a key', `<section class="center"><div class="overline">ItsRecoil / access</div><h1>Redeem key.</h1><p class="subhead">A key can be used once and stays with this Google account.</p>${error ? `<div class="alert" role="alert">${escapeHtml(error)}</div>` : ''}<form action="/claim" method="post"><input type="hidden" name="form_token" value="${formToken}"><label class="overline" for="key">Invite key</label><input class="key-input" id="key" name="key" type="password" maxlength="100" required autocomplete="off" placeholder="Paste your key" autofocus><button class="key-submit" type="submit">Redeem ↗</button></form><div class="identity">Signed in as <strong>${escapeHtml(user.login)}</strong></div><div class="actions">${logoutForm(formToken)}</div></section>`, status);
}

function appPage(user, env, formToken, pending = '') {
  const response = page('Browse', `<section class="center key-screen browse-screen"><div class="key-main"><span class="section-kicker">BROWSE THE WEB</span><div class="key-intro"><h1>Where to?</h1><p class="subhead">Enter a website or search for something.</p></div><form class="search key-search browse-search" action="/browse" method="get"><input id="url" name="url" type="text" inputmode="url" aria-label="Website address or search" placeholder="Search or enter an address" value="${escapeHtml(pending)}" required autocomplete="off" spellcheck="false" autofocus><button class="go" type="submit" aria-label="Open">→</button></form><p class="helper browse-helper">Sites open through ItsRecoil when supported.</p></div><aside class="access-panel session-panel"><span class="section-kicker">YOUR SESSION</span><h2>Signed in</h2><p class="session-user">${escapeHtml(user.login)}</p><div class="session-actions"><a href="/account">Manage account <span aria-hidden="true">→</span></a><a href="/privacy">Privacy <span aria-hidden="true">→</span></a>${logoutForm(formToken)}</div></aside></section>`, 200, false, true);
  if (env.RELAY_URL) {
    const relayOrigin = new URL(env.RELAY_URL).origin;
    response.headers.set('Link', `<${relayOrigin}>; rel=preconnect`);
    response.headers.set('Content-Security-Policy', response.headers.get('Content-Security-Policy').replace("connect-src 'self'", `connect-src 'self' ${relayOrigin}`));
  }
  return response;
}

function googleChoicePage(target) {
  const query = target.searchParams.get('q') || '';
  return page('Search', `<section class="center"><div class="overline">ItsRecoil / search</div><h1>Find anything.</h1><p class="subhead">Search the web inside ItsRecoil. Results are provided by DuckDuckGo.</p><form class="search" action="/search" method="get"><input id="q" name="q" type="text" aria-label="Search the web" placeholder="What are you looking for?" value="${escapeHtml(query)}" required autocomplete="off" autofocus><div class="composer-bar"><span class="composer-label">Web search</span><button class="go" type="submit" aria-label="Search">↑</button></div></form><p class="helper"><span>Private search, no extra steps.</span><span>Press Enter to search</span></p></section>`, 200, false, true);
}

