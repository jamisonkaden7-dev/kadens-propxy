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
.mark{width:25px;height:25px;display:grid;place-items:center}
.mark svg{width:23px;height:23px;fill:none;stroke:#f0f0f0;stroke-width:4;stroke-linejoin:round}
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
@media(max-width:720px){.sidebar{width:72px;padding:20px 9px}.brand{padding:3px 14px 25px}.brand span:last-child,.nav-label,.side-bottom .nav-label{display:none}.nav-link{justify-content:center;padding:11px 0}.nav-icon{width:auto}.top{padding:0 22px}main{padding:50px 22px 100px}}
@media(max-width:480px){.sidebar{width:58px;padding:17px 5px}.brand{padding:3px 11px 25px}.top{height:58px;padding:0 16px}.top-note{display:none}main{align-items:flex-start;padding:21vh 19px 65px}.center{width:100%}h1{font-size:32px}.subhead{font-size:14px}.search{min-height:61px}.search input{height:58px;padding:0 15px;font-size:14px}.go{margin-right:10px}.helper{font-size:11px}.identity{flex-direction:column;gap:3px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;
