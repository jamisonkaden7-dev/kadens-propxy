export const featureJs = `(()=>{
  const key='itsrecoil.preferences';
  const presets={
    recoil:{title:'ItsRecoil',icon:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" rx="15" fill="%23121212"/%3E%3Ctext x="32" y="46" text-anchor="middle" fill="white" font-family="Arial" font-size="44" font-weight="700"%3ER%3C/text%3E%3C/svg%3E'},
    canva:{title:'Canva',icon:'https://www.canva.com/favicon.ico'},
    canvas:{title:'Canvas',icon:'https://canvas.instructure.com/favicon.ico'},
    docs:{title:'Google Docs',icon:'https://ssl.gstatic.com/docs/documents/images/kix-favicon-2023q4.ico'}
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
        list.innerHTML=songs.length?songs.map((s,i)=>'<article class="track"><img alt="" loading="lazy" src="'+esc(s.artworkUrl100||'')+'"><div><strong>'+esc(s.trackName)+'</strong><span>'+esc(s.artistName)+' · '+esc(s.collectionName||'')+'</span></div><button type="button" data-play="'+i+'" aria-label="Play '+esc(s.trackName)+'">▶</button><a href="'+esc(s.trackViewUrl||'#')+'" target="_blank" rel="noopener noreferrer" aria-label="Open '+esc(s.trackName)+' on Apple Music">Open ↗</a></article>').join(''):'<p class="music-empty">No playable previews found. Try another search.</p>';
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

