export const featureJs = `(()=>{
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

