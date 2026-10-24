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

export const bootCss = `
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

export const bootHtml = `<div class="boot" role="status" aria-label="ItsRecoil loading"><span class="boot-word">ItsRecoil</span></div>`;

export const bootJs = `(()=>{const boot=document.querySelector('.boot');if(!boot)return;let done=false,exiting=false;const finish=()=>{if(done)return;done=true;boot.remove();window.removeEventListener('keydown',onKey)};const fade=()=>{if(done||exiting)return;exiting=true;boot.classList.add('is-exiting');setTimeout(finish,950)};const onKey=e=>{if(e.key==='Enter'||e.key==='Escape')fade()};window.addEventListener('keydown',onKey);setTimeout(fade,2300)})();`;

