export const css = `
:root{color-scheme:dark;font-family:Segoe UI Variable,Segoe UI,Arial,sans-serif;font-synthesis:none}
*{box-sizing:border-box}
html{min-height:100%;background:#08090a}
body{margin:0;min-height:100vh;color:#f1f2f2;background:#08090a}
body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.055;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='148' height='148'%3E%3Cg fill='none' stroke='%23b6bec2' stroke-width='1'%3E%3Cpath d='M38 22 45 34H31zM38 38 31 26h14zM112 102 119 114h-14zM112 118 105 106h14z'/%3E%3C/g%3E%3C/svg%3E")}
a{color:inherit}
button,input{font:inherit}
button{cursor:pointer}
a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid #ddd;outline-offset:4px}
.shell{position:relative;min-height:100vh;max-width:1260px;margin:0 auto;padding:0 clamp(22px,4.5vw,68px);display:flex;flex-direction:column}
.top{height:82px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #232629}
.brand{display:inline-flex;align-items:center;gap:11px;color:#f1f2f2;text-decoration:none;font-size:17px;font-weight:650;letter-spacing:-.045em}
.mark{width:26px;height:26px;display:grid;place-items:center}
.mark svg{width:22px;height:22px;fill:none;stroke:#e7e9e9;stroke-width:4;stroke-linejoin:round}
.top-note{color:#686e71;font:10px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.18em;text-transform:uppercase}
main{flex:1;display:flex;align-items:center;justify-content:center;padding:80px 0 116px}
.center{width:min(710px,100%);text-align:left}
.overline{display:flex;align-items:center;gap:10px;color:#8c9395;font:11px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.16em;text-transform:uppercase}
.overline:before{content:"";display:inline-block;width:7px;height:7px;border:1px solid #babebe;border-radius:50%}
h1{font-size:clamp(47px,7.4vw,88px);line-height:1.01;letter-spacing:-.078em;margin:23px 0 20px;font-weight:620}
.subhead{color:#8b9194;font-size:15px;line-height:1.55;margin:0 0 38px;max-width:580px}
.search{display:flex;align-items:center;width:100%;height:68px;border:1px solid #3f4548;border-radius:11px;background:#111315;box-shadow:0 18px 50px #0003;transition:border-color .15s,box-shadow .15s}
.search:hover{border-color:#697174}
.search:focus-within{border-color:#d5d9da;box-shadow:0 0 0 3px #d5d9da12,0 18px 50px #0004}
.search-icon{flex:0 0 auto;width:19px;height:19px;margin-left:21px;color:#8b9396}
.search-icon svg{display:block;width:100%;height:100%;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round}
.search input{flex:1;min-width:0;height:100%;border:0;outline:0;background:transparent;color:#f3f4f4;padding:0 20px;font-size:16px;letter-spacing:-.01em}
.search input::placeholder{color:#697174}
.go{height:48px;min-width:50px;display:grid;place-items:center;margin-right:9px;padding:0 16px;border:0;border-radius:7px;background:#e5e7e8;color:#111315;font-size:20px;font-weight:500;transition:background .15s,transform .15s}
.go:hover{background:#fff;transform:translateY(-1px)}
.helper{display:flex;justify-content:space-between;gap:15px;margin:14px 2px 0;color:#6f777a;font-size:12px;line-height:1.5}
.helper code{font:inherit;color:#a6adaf}
.actions{display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-top:25px}
.chip{border:0;border-bottom:1px solid #6b7376;background:none;color:#abb2b4;font-size:12px;text-decoration:none;padding:0 0 4px}
.chip:hover{color:#fff;border-color:#fff}
.identity{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-top:62px;padding-top:21px;border-top:1px solid #25292b;color:#777f82;font-size:12px;line-height:1.5}
.identity strong{color:#c3c8ca;font-weight:500}
.identity form{flex-shrink:0}
.info{color:#868d90;font-size:12px;line-height:1.6;margin-top:24px}
.info a{color:#dadede}
.alert{border:1px solid #565c5f;border-radius:8px;background:#191b1d;padding:13px 15px;margin:0 0 24px;color:#e1e3e3;font-size:13px;line-height:1.5}
.key-input{width:100%;height:58px;border:1px solid #4a5053;border-radius:8px;background:#111315;color:#f1f2f2;padding:0 17px;font-size:15px;margin-top:12px}
.key-input:focus{border-color:#d5d9da;outline:0}
.key-submit{height:46px;border:0;border-radius:7px;background:#e5e7e8;color:#111315;padding:0 22px;margin-top:14px;font-size:13px;font-weight:650}
.key-submit:hover{background:#fff}
.google-wrap{margin:30px 0 17px;min-height:44px}
.reason{margin:22px 0 0;color:#a1a8aa;font-size:14px;line-height:1.6;max-width:570px}
.error-title{font-size:clamp(42px,6vw,70px)}
.foot{display:none}
@media(max-width:600px){.shell{padding:0 20px}.top{height:68px}.top-note{font-size:9px}main{align-items:flex-start;padding:19vh 0 72px}h1{font-size:clamp(48px,12vw,70px)}.subhead{font-size:14px}.search{height:61px}.search-icon{margin-left:15px}.search input{padding:0 13px;font-size:14px}.go{height:43px;min-width:45px;margin-right:7px;padding:0 12px}.identity{margin-top:45px;align-items:flex-start;flex-direction:column}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;
