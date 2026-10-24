export const css = `
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
`;

export const bootCss = `
.boot{position:fixed;inset:0;z-index:100;display:grid;place-items:center;background:radial-gradient(circle at 50% 45%,#38383a,#151516 68%);color:#f6f6f6;animation:boot-out .55s ease 2.75s forwards}
.boot-word{font:700 clamp(46px,8vw,82px)/1 Arial,Helvetica,sans-serif;letter-spacing:-.075em;text-shadow:0 6px 34px #ffffff32;animation:boot-word-in 1.25s cubic-bezier(.16,1,.3,1) both}
@keyframes boot-word-in{from{opacity:0;filter:blur(15px);transform:translateY(18px) scale(.95)}to{opacity:1;filter:blur(0);transform:translateY(0) scale(1)}}
@keyframes boot-out{to{opacity:0;visibility:hidden;pointer-events:none}}
@media(prefers-reduced-motion:reduce){.boot{display:none}.boot-word{animation:none}}
`;

export const bootHtml = `<div class="boot" role="status" aria-label="isRecool loading"><span class="boot-word">isRecool</span></div>`;

export const bootJs = `(()=>{const boot=document.querySelector('.boot');if(!boot)return;let done=false;const finish=()=>{if(done)return;done=true;boot.remove();window.removeEventListener('keydown',onKey)};const onKey=e=>{if(e.key==='Enter'||e.key==='Escape')finish()};window.addEventListener('keydown',onKey);setTimeout(finish,3300)})();`;
