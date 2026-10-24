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
`;

const bootCss = `
.boot{position:fixed;inset:0;z-index:100;display:grid;place-items:center;background:radial-gradient(circle at 50% 45%,#38383a,#151516 68%);color:#f6f6f6;animation:boot-out .55s ease 2.75s forwards}
.boot-word{font:700 clamp(46px,8vw,82px)/1 Arial,Helvetica,sans-serif;letter-spacing:-.075em;text-shadow:0 6px 34px #ffffff32;animation:boot-word-in 1.25s cubic-bezier(.16,1,.3,1) both}
@keyframes boot-word-in{from{opacity:0;filter:blur(15px);transform:translateY(18px) scale(.95)}to{opacity:1;filter:blur(0);transform:translateY(0) scale(1)}}
@keyframes boot-out{to{opacity:0;visibility:hidden;pointer-events:none}}
@media(prefers-reduced-motion:reduce){.boot{display:none}.boot-word{animation:none}}
.boot{overflow:hidden;background:#101821}
.boot:before{content:'';position:absolute;inset:-24px;background:linear-gradient(130deg,#0714218c,#0c1b2b65),url('https://jamisonkaden7-dev.github.io/kadens-propxy/nature-lake-glass.jpg') center/cover;filter:blur(12px) saturate(155%) brightness(.82);transform:scale(1.04)}
.boot:after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#ffffff20,transparent 30%)}
.boot-word{position:relative;z-index:1;background:linear-gradient(180deg,#fff,#dcebe9);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 12px 23px #06101ba6)}
`;

const bootHtml = `<div class="boot" role="status" aria-label="isRecool loading"><span class="boot-word">isRecool</span></div>`;

const bootJs = `(()=>{const boot=document.querySelector('.boot');if(!boot)return;let done=false;const finish=()=>{if(done)return;done=true;boot.remove();window.removeEventListener('keydown',onKey)};const onKey=e=>{if(e.key==='Enter'||e.key==='Escape')finish()};window.addEventListener('keydown',onKey);setTimeout(finish,3300)})();`;

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
      if (path === '/ui.js' && request.method === 'GET') return new Response(bootJs + "\n" + "document.querySelectorAll('form.search').forEach(form=>form.addEventListener('submit',()=>{const button=form.querySelector('button[type=submit]');if(!button)return;const original=button.textContent;button.textContent='Opening…';setTimeout(()=>{button.textContent=original},8000)}));", { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
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
    'Content-Security-Policy': "default-src 'none'; img-src 'self' data: https://jamisonkaden7-dev.github.io; style-src 'self' 'unsafe-inline'; font-src 'self' data:; media-src 'self'; form-action 'self'; base-uri 'none'; script-src 'none'; frame-src 'none'"
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

function page(title, content, status = 200, googleScript = false, localScript = false, showBoot = false) {
  const shell = `<div class="shell"><aside class="sidebar" aria-label="Main navigation"><a class="brand" href="/app"><span>isRecool</span></a><nav class="side-nav"><a class="nav-link" href="/app"><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span><span class="nav-label">New browse</span></a><a class="nav-link" href="/login"><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-3.5 3.5-5.5 7-5.5s6 2 7 5.5"/></svg></span><span class="nav-label">Account</span></a></nav><div class="side-bottom"><a class="nav-link" href="/privacy"><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></span><span class="nav-label">Privacy</span></a></div></aside><div class="workspace"><header class="top"><span class="top-title">isRecool</span><span class="top-note">Private browser</span></header><main>${content}</main></div></div>`;
  const headers = new Headers(proxyHeaders('text/html; charset=utf-8'));
  if (localScript) headers.set('Content-Security-Policy', headers.get('Content-Security-Policy').replace("script-src 'none'", "script-src 'self'").replace("form-action 'self'", 'form-action https:'));
  if (googleScript) {
    headers.set('Content-Security-Policy', "default-src 'none'; script-src https://accounts.google.com/gsi/client https://*.gstatic.com; frame-src https://accounts.google.com; connect-src https://accounts.google.com https://*.gstatic.com; img-src data: https://jamisonkaden7-dev.github.io https://accounts.google.com https://*.googleusercontent.com; style-src 'unsafe-inline' https://accounts.google.com https://*.gstatic.com; form-action 'self' https://accounts.google.com; base-uri 'none'; frame-ancestors 'none'");
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · isRecool</title><style>${modernCss}${showBoot ? bootCss : ''}</style>${googleScript ? '<script src="https://accounts.google.com/gsi/client" async defer></script>' : ''}${localScript ? '<script src="/ui.js?v=boot3" defer></script>' : ''}</head><body>${showBoot ? bootHtml : ''}${shell}</body></html>`, { status, headers });
}

function googleWidget(env, origin) {
  return `<div class="google-wrap"><div id="g_id_onload" data-client_id="${escapeHtml(env.GOOGLE_CLIENT_ID)}" data-context="signin" data-ux_mode="redirect" data-login_uri="${escapeHtml(origin)}/oauth/google/callback" data-auto_prompt="false"></div><div class="g_id_signin" data-type="standard" data-shape="rectangular" data-theme="outline" data-text="signin_with" data-size="large" data-logo_alignment="left"></div></div>`;
}

function googleLoginPage(env, origin) {
  return page('Sign in', `<section class="center"><div class="overline">isRecool / 02 — account</div><h1>Your account.</h1><p class="subhead">Sign in with the Google account that owns this key. If this key is new, the account you choose will claim it.</p>${googleWidget(env, origin)}<div class="actions"><a class="chip" href="/login">Use a different key</a></div></section>`, 200, true);
}

function keyPage(error = '', status = 200) {
  return page('Enter key', `<section class="center"><h1>Enter your key.</h1><p class="subhead">Then continue with the Google account connected to it.</p>${error ? `<div class="alert" role="alert">${escapeHtml(error)}</div>` : ''}<form class="search" action="/access" method="post"><input id="key" name="key" type="password" aria-label="Access key" maxlength="100" required autocomplete="off" placeholder="Paste your access key" autofocus><div class="composer-bar"><span class="composer-label">Access key</span><button class="go" type="submit" aria-label="Continue">↑</button></div></form><p class="helper key-helper">First Google sign-in claims a new key.</p></section>`, status, false, true, true);
}

function privacyPage() {
  return page('Privacy', `<section class="center"><div class="overline">isRecool / Privacy</div><h1 class="error-title">Privacy.</h1><p class="subhead">isRecool uses your Google account ID to keep your redeemed key tied to your account. It stores a hash of the key and that account ID in Cloudflare D1. Your email appears only in a signed browser session cookie and on the account screen.</p><p class="subhead">When you open a link, the service handles the address and page data to relay that public website. It uses short-lived launch tickets and session cookies. The websites you visit may collect information under their own policies. Cloudflare provides hosting and may process request data. isRecool does not sell your account information.</p><p class="subhead">For questions about your data, contact <a href="mailto:jamisonkaden7@gmail.com">jamisonkaden7@gmail.com</a>.</p><div class="actions"><a class="chip" href="/app">← Back to isRecool</a></div></section>`, 200);
}

async function linkPage(user, env, formToken, origin) {
  const response = page('Link Google', `<section class="center"><div class="overline">isRecool / account</div><h1>Link Google.</h1><p class="subhead">The key claimed by <strong>${escapeHtml(user.login)}</strong> will be linked to the Google account you choose.</p>${googleWidget(env, origin)}<div class="identity">${logoutForm(formToken)}</div></section>`, 200, true);
  response.headers.append('Set-Cookie', cookie('__Host-kp_link', '1', 600, 'None'));
  response.headers.append('Set-Cookie', cookie('__Host-kp_session', await makeSession(user, env.SESSION_SECRET), SESSION_AGE, 'None'));
  return response;
}

function errorPage(message, status) {
  return page('Could not open page', `<section class="center"><div class="overline">isRecool / error</div><h1 class="error-title">Couldn’t open it.</h1><p class="reason">${escapeHtml(message)}</p><div class="actions"><a class="chip" href="/app">Back to isRecool ↗</a></div></section>`, status);
}

function logoutForm(formToken) {
  return `<form action="/logout" method="post"><input type="hidden" name="form_token" value="${formToken}"><button class="chip" type="submit">Sign out</button></form>`;
}

function claimPage(user, formToken, error = '', status = 200) {
  return page('Claim a key', `<section class="center"><div class="overline">isRecool / access</div><h1>Redeem key.</h1><p class="subhead">A key can be used once and stays with this Google account.</p>${error ? `<div class="alert" role="alert">${escapeHtml(error)}</div>` : ''}<form action="/claim" method="post"><input type="hidden" name="form_token" value="${formToken}"><label class="overline" for="key">Invite key</label><input class="key-input" id="key" name="key" type="password" maxlength="100" required autocomplete="off" placeholder="Paste your key" autofocus><button class="key-submit" type="submit">Redeem ↗</button></form><div class="identity">Signed in as <strong>${escapeHtml(user.login)}</strong></div><div class="actions">${logoutForm(formToken)}</div></section>`, status);
}

function appPage(user, env, formToken, pending = '') {
  const response = page('Browse', `<section class="center"><div class="overline">isRecool / browse</div><h1>Where to?</h1><p class="subhead">Enter a website or search for something.</p><form class="search" action="/browse" method="get"><input id="url" name="url" type="text" inputmode="url" aria-label="Website address or search" placeholder="Search or enter an address" value="${escapeHtml(pending)}" required autocomplete="off" spellcheck="false" autofocus><div class="composer-bar"><span class="composer-label">Website or search</span><button class="go" type="submit" aria-label="Open">↑</button></div></form><p class="helper"><span>Sites open through isRecool when supported.</span><span>Press Enter to open</span></p><div class="identity"><span>Signed in as <strong>${escapeHtml(user.login)}</strong></span>${logoutForm(formToken)}</div></section>`, 200, false, true, true);
  if (env.RELAY_URL) {
    const relayOrigin = new URL(env.RELAY_URL).origin;
    response.headers.set('Link', `<${relayOrigin}>; rel=preconnect`);
    response.headers.set('Content-Security-Policy', `${response.headers.get('Content-Security-Policy')}; connect-src ${relayOrigin}`);
  }
  return response;
}

function googleChoicePage(target) {
  const query = target.searchParams.get('q') || '';
  return page('Search', `<section class="center"><div class="overline">isRecool / search</div><h1>Find anything.</h1><p class="subhead">Search the web inside isRecool. Results are provided by DuckDuckGo.</p><form class="search" action="/search" method="get"><input id="q" name="q" type="text" aria-label="Search the web" placeholder="What are you looking for?" value="${escapeHtml(query)}" required autocomplete="off" autofocus><div class="composer-bar"><span class="composer-label">Web search</span><button class="go" type="submit" aria-label="Search">↑</button></div></form><p class="helper"><span>Private search, no extra steps.</span><span>Press Enter to search</span></p></section>`, 200, false, true);
}
