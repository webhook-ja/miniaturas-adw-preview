const $=s=>document.querySelector(s);const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const st={ses:null,prods:[],stock:{},pendDelta:{},ownerStall:null,undo:null,syncing:false,fallos:0,bo:null,qMem:null,ownerAt:0};
function busyBtn(el,on){if(!el)return;if(on){if(!el.dataset.label)el.dataset.label=el.textContent;el.classList.add('busy');el.disabled=true;el.setAttribute('aria-busy','true')}
 else{el.classList.remove('busy');el.disabled=false;el.removeAttribute('aria-busy');if(el.dataset.label!=null){el.textContent=el.dataset.label;delete el.dataset.label}}}
async function withBusy(el,fn){busyBtn(el,1);try{return await fn()}finally{busyBtn(el,0)}}
const thr=()=>+(localStorage.getItem('umbral')??3);
const uuid=()=>crypto.randomUUID?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
let ac;function pop(up){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;
 o.type='square';o.frequency.setValueAtTime(up?300:900,t);o.frequency.exponentialRampToValueAtTime(up?900:180,t+.09);
 g.gain.setValueAtTime(.25,t);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+.13)}catch(e){}}
let pines=null,ownerGen=0;
function borrarPines(){pines=null;if(adm&&admTab==='puestos')admPaint()}
function clearAdm(){adm=null;const m=document.getElementById('adm');if(m)m.innerHTML=''}
function show(v){borrarPines();if(v==='login')clearAdm();document.querySelectorAll('.view').forEach(x=>x.hidden=x.id!=='v-'+v);$('#logout').hidden=v==='login'}
const saveSes=s=>{st.ses=s;QueueDB.set('ses',s)};
/* ---- PIN ---- */
let pin='';const renderPin=()=>$('#pin-dots').textContent='●'.repeat(pin.length)+'○'.repeat(Math.max(0,6-pin.length));
st.demoPins={};
function paintLoginPin(){const el=$('#login-pin');if(!el)return;const who=$('#who').value;
 if(who==='dueno'){el.hidden=false;el.textContent='PIN dueño · 999999';return}
 const pin=st.demoPins&&st.demoPins[who];if(pin){el.hidden=false;el.textContent='PIN · '+pin;return}
 el.hidden=true;el.textContent=''}
function mergePuestoNames(map){if(!map||typeof map!=='object')return;st.puestoNames=Object.assign(st.puestoNames||{},map)}
function puLabel(id){const k=String(id??'');if(adm&&adm.puestos){const p=adm.puestos.find(x=>String(x.id)===k);if(p&&p.nombre)return p.nombre}
 if(st.puestoNames&&st.puestoNames[k])return st.puestoNames[k];return k}
async function loadPuestos(){let ps=await QueueDB.get('puestos');try{const r=await API.puestos();if(r.ok){ps=r.puestos;QueueDB.set('puestos',ps);st.demoPins=r.demo_pins||{};mergePuestoNames(r.puestos_nombres)}}catch(e){}
 $('#who').innerHTML=(ps||[]).map(p=>`<option value="${p}">${esc(puLabel(p))}</option>`).join('')+'<option value="dueno">DUEÑO</option>';
 paintLoginPin()}
$('#who').onchange=paintLoginPin;
$('#be').textContent=API.backend==='mock'?'MOCK · DATOS DE EJEMPLO':'Apps Script';
['1','2','3','4','5','6','7','8','9','⌫','0','OK'].forEach(k=>{const b=document.createElement('button');b.textContent=k;b.dataset.k=k;if(k==='OK')b.className='green';
 b.onclick=()=>{if(k==='⌫')pin=pin.slice(0,-1);else if(k==='OK')doLogin();else if(pin.length<8)pin+=k;renderPin()};$('#pad').append(b)});
const ERR={PIN_FORMATO:'El PIN tiene 6 cifras',PIN_INCORRECTO:'PIN incorrecto',DEMASIADOS_INTENTOS:'Demasiados intentos: espera 15 min',VENDEDOR_INACTIVO:'Vendedor dado de baja'};
async function doLogin(){const okb=[...$('#pad').querySelectorAll('button')].find(b=>b.dataset.k==='OK');
 await withBusy(okb,async()=>{$('#login-msg').textContent='';const who=$('#who').value;try{const r=await API.login(pin,who);pin='';renderPin();
 if(!r.ok)return $('#login-msg').textContent=ERR[r.error]||r.error;
 saveSes(r.rol==='dueno'?{rol:'dueno',token_dueno:r.token_dueno}:{rol:'vendedor',token:r.token,puesto:r.vendedor.puesto,nombre:r.vendedor.nombre});start()}
 catch(e){$('#login-msg').textContent='Sin conexión: el primer acceso necesita red'}})}
function paintBarSum(data){const el=$('#bar-sum');if(!el)return;
 if(!st.ses||st.ses.rol!=='dueno'){el.hidden=true;el.textContent='';el.removeAttribute('title');return}
 el.hidden=false;
 if(!data){el.textContent='Hoy …';return}
 const t=data.totales||{},uds=t.unidades??t.vendidas??0,eur=t.importe!=null?t.importe:(t.neto!=null?t.neto:'—');
 const por=data.por_vendedor||[];
 const bits=por.filter(x=>(x.unidades||x.vendidas)>0).slice(0,5).map(x=>{
  const n=x.nombre||x.vendedor||'?';const short=String(n).length>10?String(n).slice(0,9)+'…':n;return short+' '+(x.unidades??x.vendidas??0)});
 const line=`Hoy ${uds}u · ${eur}€`+(bits.length?' · '+bits.join(' · '):'');
 el.textContent=line;el.title=por.map(x=>`${x.nombre||x.vendedor||'?'} · ${puLabel(x.puesto||x.puesto_activo||'')} · ${x.unidades??x.vendidas??0}u · ${x.importe??'—'}€`).join('\n')||line}
function start(){if(st.ses.rol==='vendedor'){$('#stall-name').textContent=st.ses.nombre+' · '+st.ses.puesto;show('stall');paintBarSum(null);loadStall();sync()}else{show('owner');paintBarSum(null);Promise.all([loadOwner(),loadControl()])}}
$('#logout').onclick=()=>{borrarPines();st.qMem=null;st.pendDelta={};saveSes(null);$('#undo').hidden=true;paintBarSum(null);show('login')};
function tokenMalo(r){if(['TOKEN_INVALIDO','TOKEN_CADUCADO','VENDEDOR_INACTIVO'].includes(r.error)){/* la cola NO se borra */saveSes(null);show('login');$('#login-msg').textContent='Sesión caducada: vuelve a meter el PIN (las ventas pendientes se conservan)';return true}}
/* ---- Cola en memoria: evita IndexedDB en cada tap ---- */
async function qAll(){if(st.qMem)return st.qMem;st.qMem=await QueueDB.all();return st.qMem}
async function qAdd(e){if(!st.qMem)st.qMem=await QueueDB.all();if(!st.qMem.some(x=>x.id===e.id))st.qMem.push(e);await QueueDB.add(e);return e}
async function qRemove(ids){const set=new Set(ids||[]);if(st.qMem)st.qMem=st.qMem.filter(e=>!set.has(e.id));if(ids&&ids.length)await QueueDB.remove(ids)}
function rebuildPendDelta(){const m={};if(!st.ses){st.pendDelta=m;return m}
 (st.qMem||[]).filter(e=>e._puesto===st.ses.puesto).forEach(e=>{m[e.producto]=(m[e.producto]||0)+e.cantidad});st.pendDelta=m;return m}
function qtyOf(pid){return(st.stock[pid]||0)+(st.pendDelta[pid]||0)}
function paintTileQty(pid){const tile=document.querySelector(`#grid .tile[data-id="${pid}"]`);if(!tile)return;
 const s=qtyOf(pid),el=tile.querySelector('.st');if(el)el.textContent=String(s);
 tile.classList.toggle('low',s<=thr());tile.classList.toggle('zero',s<=0);tile.dataset.s=String(s)}
function paintAllTileQtys(){document.querySelectorAll('#grid .tile[data-id]').forEach(t=>paintTileQty(t.dataset.id))}
/* ---- Puesto (stock local + cola offline) ---- */
const setStock=arr=>{st.stock=Object.fromEntries((arr||[]).map(s=>[s.producto,s.quedan]));if(st.ses)QueueDB.set('stock_'+st.ses.puesto,st.stock)};
async function refreshCatalogQuiet(){if(!st.ses||st.ses.rol!=='vendedor'||!navigator.onLine)return;
 try{const r=await API.catalogo(st.ses.token);if(!r.ok){tokenMalo(r);return}
  st.prods=r.productos;QueueDB.set('prods',r.productos);setStock(r.stock);rebuildPendDelta();
  if($('#grid').querySelector('.tile'))paintAllTileQtys();else renderGrid()}catch(_){}}
async function loadStall(){const P=st.ses.puesto;await qAll();rebuildPendDelta();
 const cachedProds=await QueueDB.get('prods'),cachedStock=await QueueDB.get('stock_'+P);
 if(cachedProds&&cachedProds.length)st.prods=cachedProds;
 if(cachedStock&&typeof cachedStock==='object')st.stock=cachedStock;
 if(st.prods.length&&Object.keys(st.stock).length){renderGrid();updPend()}
 else{$('#grid').innerHTML='<p class="msg">Cargando catálogo…</p>'}
 try{if(!navigator.onLine)throw Object.assign(new Error('offline'),{red:true});
  const r=await API.catalogo(st.ses.token);if(r.ok){st.prods=r.productos;QueueDB.set('prods',r.productos);setStock(r.stock);rebuildPendDelta();renderGrid()}
  else tokenMalo(r)}catch(e){
  if(!st.prods.length||!Object.keys(st.stock).length)$('#grid').innerHTML='<p class="msg">Sin catálogo en caché. Conéctate una vez para poder vender sin red.</p>'}
 updPend();if(navigator.onLine)sync()}
function renderGrid(){if(!st.ses||st.ses.rol!=='vendedor')return;rebuildPendDelta();const g=$('#grid'),keep=new Map();
 [...g.querySelectorAll('.tile[data-id]')].forEach(t=>keep.set(t.dataset.id,t));
 const want=st.prods.filter(p=>p.id in st.stock);const seen=new Set();
 want.forEach(p=>{seen.add(p.id);let b=keep.get(p.id);const s=qtyOf(p.id);
  if(!b){b=document.createElement('div');b.dataset.id=p.id;b.style.setProperty('--c',p.color_icono);const img=API.driveImg(p.foto_url);
   b.innerHTML=`${img?`<img class="ic" alt="" loading="lazy" decoding="async" width="56" height="56" src="${img}">`:`<span class="ic" style="--ic:${p.color_icono}"></span>`}<div class="nm"></div><div class="st"></div><div class="tile-acts"><button type="button" class="tile-minus" aria-label="Vender uno">−</button><button type="button" class="tile-plus" aria-label="Sumar uno">+</button></div>`;
   b.querySelector('.nm').textContent=p.nombre;const im=b.querySelector('img');if(im)im.onerror=()=>{const sp=document.createElement('span');sp.className='ic';sp.style.setProperty('--ic',p.color_icono);im.replaceWith(sp)};
   b.querySelector('.tile-minus').onclick=e=>{e.stopPropagation();sell(p)};
   b.querySelector('.tile-plus').onclick=e=>{e.stopPropagation();restock(p)};
   b.addEventListener('click',()=>sell(p));g.append(b)}
  b.className='tile'+(s<=thr()?' low':'')+(s<=0?' zero':'');b.dataset.s=String(s);const stEl=b.querySelector('.st');if(stEl)stEl.textContent=String(s);
  /* refresh handlers product ref */b._prod=p});
 keep.forEach((t,id)=>{if(!seen.has(id))t.remove()})}
const evento=(p,c)=>({id:uuid(),fecha_hora:API.ahoraMadrid(),producto:p,cantidad:c,_puesto:st.ses.puesto,_ts:Date.now()});
function sell(p){const s=qtyOf(p.id);if(s<=0){pop(true);return}
 pop();const e=evento(p.id,-1);st.pendDelta[p.id]=(st.pendDelta[p.id]||0)-1;paintTileQty(p.id);setUndo(e,p);updPend();
 qAdd(e).then(()=>sync())}
async function lastSaleOf(producto){const all=await qAll();
 const mine=all.filter(e=>e._puesto===st.ses.puesto&&e.producto===producto).sort((a,b)=>b._ts-a._ts);
 const undone=new Set(mine.filter(e=>e.cantidad===1&&e.ref).map(e=>e.ref));
 for(const e of mine){if(e.cantidad===-1&&!undone.has(e.id))return e}
 if(st.undo&&st.undo.producto===producto&&!undone.has(st.undo.id))return st.undo;return null}
async function askRestockJustify(nombre){
 for(;;){const fp=form('Sumar 1 · '+nombre,[
  {l:'¿Es una devolución o un error?',n:'tipo',op:[['devolucion','Devolución'],['error','Me equivoqué']]},
  {l:'Detalle del error / devolución',n:'detalle',t:'text',v:''}
 ],'Continuar');
  queueMicrotask(()=>{
   $('#dlg-m').textContent='Obligatorio antes de sumar stock.';
   const okb=$('#dlg-ok'),inp=$('#dlg-c input[name="detalle"]');
   if(!okb||!inp)return;const gate=()=>{okb.disabled=inp.value.trim().length<3};
   gate();inp.addEventListener('input',gate);inp.focus();
  });
  const v=await fp;if(!v)return null;
  const tipo=v.tipo==='devolucion'?'devolucion':'error',detalle=String(v.detalle||'').trim();
  if(detalle.length<3){alert('Escribe el detalle (mín. 3 caracteres).');continue}
  return{justificacion_tipo:tipo,justificacion:detalle.slice(0,200)}}}
async function restock(p){const j=await askRestockJustify(p.nombre);if(!j)return;
 pop(true);const sale=await lastSaleOf(p.id);const e={...(sale?{...evento(p.id,1),ref:sale.id}:evento(p.id,1)),...j};
 st.pendDelta[p.id]=(st.pendDelta[p.id]||0)+1;paintTileQty(p.id);
 if(sale&&st.undo&&st.undo.id===sale.id){st.undo=null;$('#undo').hidden=true}
 updPend();qAdd(e).then(()=>sync())}
function setUndo(e,p){st.undo=e;$('#undo-txt').textContent='−1 '+p.nombre;$('#undo').hidden=false;clearTimeout(st.ut);st.ut=setTimeout(()=>{$('#undo').hidden=true;st.undo=null},15000)}
$('#undo-btn').onclick=async()=>{const v=st.undo;if(!v)return;const prod=st.prods.find(x=>x.id===v.producto)||{nombre:v.producto};
 const j=await askRestockJustify(prod.nombre);if(!j)return;st.undo=null;$('#undo').hidden=true;pop(true);
 const e={...evento(v.producto,1),ref:v.id,...j};st.pendDelta[v.producto]=(st.pendDelta[v.producto]||0)+1;paintTileQty(v.producto);updPend();qAdd(e).then(()=>sync())};
/* ---- Sincronización: lotes ≤200, idempotente, backoff exponencial 2 s → 5 min ---- */
function backoff(){st.fallos++;const ms=Math.min(2000*2**(st.fallos-1),300000);clearTimeout(st.bo);st.bo=setTimeout(sync,ms);return ms}
async function sync(){if(st.syncing||!navigator.onLine||!st.ses||st.ses.rol!=='vendedor')return;st.syncing=true;try{
 let q=(await qAll()).filter(e=>e._puesto===st.ses.puesto).sort((a,b)=>a._ts-b._ts);
 while(q.length){const lote=q.slice(0,200).map(({_puesto,_ts,...v})=>v);const r=await API.ventasLote(st.ses.token,lote);
  if(!r.ok){if(tokenMalo(r))return;throw new Error(r.error)}
  const ack=[...r.aceptadas,...r.duplicadas];await qRemove(ack);
  if(r.rechazadas?.length){const rej=JSON.parse(localStorage.getItem('rechazadas')||'[]');
   const ids=r.rechazadas.map(x=>x.id);rej.push(...r.rechazadas.map(x=>({...x,...q.find(e=>e.id===x.id)})));localStorage.setItem('rechazadas',JSON.stringify(rej));await qRemove(ids);ack.push(...ids);
   $('#rech').hidden=false;$('#rech').textContent='⚠ '+rej.length+' ventas rechazadas por el servidor: '+r.rechazadas.map(x=>x.motivo).join(', ')}
  if(r.marcadas?.length){$('#rech').hidden=false;$('#rech').textContent='ℹ '+r.marcadas.length+' ventas guardadas de productos desactivados ('+r.marcadas.map(x=>x.motivo).join(', ')+')'}
  setStock(r.stock);rebuildPendDelta();paintAllTileQtys();q=q.filter(e=>!ack.includes(e.id));if(!ack.length)break}
 st.fallos=0;clearTimeout(st.bo)
}catch(e){backoff()}finally{st.syncing=false;updPend()}}
function pendMineCount(){if(!st.qMem)return 0;if(st.ses&&st.ses.rol==='vendedor')return st.qMem.filter(e=>e._puesto===st.ses.puesto).length;return st.qMem.length}
async function purgeOrphanQueue(active){const set=new Set(active||[]);const all=await qAll();const orphans=all.filter(e=>e._puesto&&!set.has(e._puesto));if(orphans.length)await qRemove(orphans.map(e=>e.id));return orphans.length}
function updPend(){const n=pendMineCount();$('#pend').textContent=n?'⏳'+n:'✓';$('#net').textContent=navigator.onLine?'ONLINE':'OFFLINE';$('#net').className='pill '+(navigator.onLine?'on':'off');
 const b=$('#off-banner');if(b)b.hidden=navigator.onLine||!(st.ses&&st.ses.rol==='vendedor')}
addEventListener('online',()=>{st.fallos=0;clearTimeout(st.bo);updPend();
 if(st.ses&&st.ses.rol==='vendedor')refreshCatalogQuiet().finally(()=>sync());else sync()});
addEventListener('offline',updPend);setInterval(()=>{if(st.ses&&st.ses.rol==='vendedor'&&pendMineCount())sync()},30000);
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){borrarPines();return}
 sync();
 if(st.ses&&st.ses.rol==='dueno'){
  if(Date.now()-st.ownerAt<20000){if(admTab==='puestos'&&pines===null)ensurePines().then(()=>adm&&admTab==='puestos'&&admPaint());return}
  Promise.all([loadOwner(),loadControl()])}
});
/* ---- Dueño ---- */
(function(){const nav=$('#owner-nav'),panels=$('#owner-panels');if(!nav||!panels)return;
 const parkAdm=slot=>{const admEl=$('#adm');if(!admEl||!slot||admEl.parentElement===slot)return;slot.appendChild(admEl)};
 const showPanel=id=>{nav.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('sel',b.dataset.panel===id));
  panels.querySelectorAll('.owner-panel').forEach(p=>{p.hidden=p.dataset.panel!==id});
  const btn=nav.querySelector(`.nav-btn[data-panel="${id}"]`);const tab=btn&&btn.dataset.adm;
  const panel=panels.querySelector(`.owner-panel[data-panel="${id}"]`);const slot=panel&&panel.querySelector('.adm-slot');
  if(slot)parkAdm(slot);
  if(tab){admTab=tab;if(st.ses&&st.ses.rol==='dueno'){if(adm)admPaint();else admLoad();
   if(tab==='puestos')ensurePines().then(()=>adm&&admTab==='puestos'&&admPaint())}}};
 nav.onclick=e=>{const b=e.target.closest('.nav-btn');if(!b)return;showPanel(b.dataset.panel)};
 st.showOwnerPanel=showPanel})();
$('#thr').value=thr();$('#thr').onchange=e=>{localStorage.setItem('umbral',e.target.value);paintAllTileQtys();paintOwnerStockWarn()};
function paintStallTabs(puestos,sel){
 const t=$('#stall-tabs');t.innerHTML='';
 const addTab=(id,label)=>{const b=document.createElement('button');b.type='button';b.className='blk'+(sel===id?' sel':'');b.textContent=label;
  b.onclick=()=>{if(st.ownerStall===id)return;st.ownerStall=id;paintStallTabs(puestos,id);$('#stock-list').innerHTML='<p class="msg">Cargando…</p>';loadOwner(true)};t.append(b)};
 addTab('*','Todos');puestos.forEach(p=>addTab(p,puLabel(p)));
}
async function ensurePines(){if(pines!==null)return pines;if(!st.ses||st.ses.rol!=='dueno')return null;
 const r=await API.pinesVer(st.ses.token_dueno).catch(()=>({ok:false}));if(!r.ok){if(tokenMalo(r))return null;return null}
 pines=r.pines||[];return pines}


const stockPend={},stockTimers={},stockSaving={};
function stockKey(puesto,producto){return puesto+'|'+producto}
function paintStockRow(row,nombre,activo,ini,vend){const quedan=Math.max(0,ini-vend);row.dataset.ini=String(ini);row.dataset.vend=String(vend);row.dataset.quedan=String(quedan);if(nombre)row.dataset.nombre=nombre;
 const num=row.querySelector('.n');if(num){num.textContent=String(ini);num.classList.toggle('low',quedan<=thr());num.classList.toggle('zero',quedan<=0)}
 row.classList.toggle('low',quedan<=thr());row.classList.toggle('zero',quedan<=0);
 const nm=row.querySelector('.nm');if(nm){const base=nombre||row.dataset.nombre||'';const pu=row.dataset.puesto;const head=(st.ownerStall==='*'&&pu?puLabel(pu)+' · ':'')+base;
  nm.textContent=head+(activo===0?' (inactivo)':'')+' · vendidas '+vend+' · quedan '+quedan}}
function paintOwnerStockWarn(){document.querySelectorAll('#stock-list .line').forEach(row=>{
 const quedan=Math.max(0,+(row.dataset.ini||0)-(+(row.dataset.vend||0)));const num=row.querySelector('.n');
 if(num){num.classList.toggle('low',quedan<=thr());num.classList.toggle('zero',quedan<=0)}
 row.classList.toggle('low',quedan<=thr());row.classList.toggle('zero',quedan<=0)})}
async function flushStock(key){const p=stockPend[key];if(!p||stockSaving[key])return;stockSaving[key]=1;delete stockPend[key];clearTimeout(stockTimers[key]);delete stockTimers[key];clearTimeout(stockSlow[key]);delete stockSlow[key];
 try{const r=await API.stockGuardar(st.ses.token_dueno,p.puesto,[{producto:p.producto,cantidad_inicial:p.n}]);
  if(!r.ok){alert(r.error||'No se pudo guardar stock');await loadOwner(true);return}
  if(p.row&&p.row.isConnected&&(st.ownerStall==='*'||st.ownerStall===p.puesto)){paintStockRow(p.row,p.nombre,p.activo,p.n,+(p.row.dataset.vend||0));p.row.classList.remove('stock-pend')}}
 catch(e){alert('Sin conexión al guardar stock');await loadOwner(true)}
 finally{delete stockSaving[key];if(stockPend[key])flushStock(key);else if(p.row)p.row.classList.remove('stock-pend')}}
async function flushAllStock(){Object.keys(stockTimers).forEach(k=>{clearTimeout(stockTimers[k]);delete stockTimers[k]});Object.keys(stockSlow).forEach(k=>{clearTimeout(stockSlow[k]);delete stockSlow[k]});
 const keys=new Set([...Object.keys(stockPend),...Object.keys(stockSaving)]);await Promise.all([...keys].map(k=>flushStock(k)));
 while(Object.keys(stockSaving).length||Object.keys(stockPend).length)await new Promise(r=>setTimeout(r,40))}
async function loadOwner(skipFlush){if(!st.ses||st.ses.rol!=='dueno')return;if(!skipFlush)await flushAllStock();const T=st.ses.token_dueno;const gen=++ownerGen;if(!adm)await admLoad();
 try{const eP=API.estadoDueno(T),hP=API.ventasHoy(T);const e=await eP;if(gen!==ownerGen)return;if(!e.ok){if(tokenMalo(e))return;throw new Error(e.error)}
 st.ownerAt=Date.now();st.puestosDueno=e.puestos;st.ownerStall=(st.ownerStall==='*'||e.puestos.includes(st.ownerStall))?st.ownerStall:'*';
 mergePuestoNames(e.puestos_nombres);if(adm){adm.stockByPu=e.stock||{};if(adm.puestos)mergePuestoNames(Object.fromEntries(adm.puestos.map(p=>[p.id,p.nombre])))}
 purgeOrphanQueue(e.puestos);updPend();
 paintStallTabs(e.puestos,st.ownerStall);
 const names=Object.fromEntries(e.productos.map(p=>[p[0],{nombre:p[1],activo:p[4]}])),L=$('#stock-list');L.innerHTML='';
 const showPu=st.ownerStall==='*'?e.puestos:[st.ownerStall];
 showPu.forEach(pu=>{(e.stock[pu]||[]).forEach(([producto,ini,vend])=>{const p=names[producto]||{nombre:producto},d=document.createElement('div');d.className='line';d.dataset.puesto=pu;
  d.innerHTML=`<span class="nm"></span><button type="button" class="blk red">−</button><span class="n">${ini}</span><button type="button" class="blk green">+</button>`;
  paintStockRow(d,p.nombre,p.activo,ini,vend);const[m,pl]=d.querySelectorAll('button');
  m.onclick=()=>{const cur=Math.max(0,+d.querySelector('.n').textContent||0);adj(producto,cur-1,d,p)};
  pl.onclick=()=>{const cur=Math.max(0,+d.querySelector('.n').textContent||0);adj(producto,cur+1,d,p)};L.append(d)})});
 if(!L.children.length)L.innerHTML='<p class="msg">Sin stock en este puesto. Usa + en otro puesto o Mover stock.</p>';
 if(adm&&admTab==='figuras')admPaint();
 const h=await hP;if(gen!==ownerGen)return;if(!h.ok)throw new Error(h.error);const tp={};(h.ventas||[]).forEach(([id,fh,ve,pu,pr,c])=>{const k=pu+'|'+pr;tp[k]=(tp[k]||0)-c});
 const nm=k=>(names[k]||{nombre:k}).nombre;
 paintBarSum({totales:h.totales,por_vendedor:h.por_vendedor});
 paintPuestoResumen(e,h,names);paintAvisos(e,h,names);
 $('#sales').innerHTML=`<table><tr><th>Hoy ${h.fecha}</th><th>Uds</th><th>€</th><th>Benef.</th></tr><tr><td>TOTAL</td><td class="n">${h.totales.unidades}</td><td class="n">${h.totales.importe}</td><td class="n">${h.totales.beneficio}</td></tr></table>`+
  '<table><tr><th>Puesto</th><th>Producto</th><th>Uds</th></tr>'+Object.entries(tp).filter(x=>x[1]).map(([k,u])=>{const[pu,pr]=k.split('|');return`<tr><td>${esc(puLabel(pu))}</td><td>${esc(nm(pr))}</td><td class="n">${u}</td></tr>`}).join('')+'</table>'+
  '<table><tr><th>Puesto · vendedor</th><th>Uds</th><th>€</th></tr>'+(h.por_vendedor||[]).map(x=>`<tr><td>${esc(puLabel(x.puesto))} · ${esc(x.vendedor)}</td><td class="n">${x.unidades}</td><td class="n">${x.importe}</td></tr>`).join('')+'</table>';
}catch(e){if(gen!==ownerGen)return;$('#sales').innerHTML='<p class="msg">Sin conexión o error: '+(e&&e.message||e)+'</p>'}}
function paintPuestoResumen(e,h,names){const box=$('#puesto-resumen');if(!box)return;
 const sales={};(h.por_puesto||[]).forEach(x=>{sales[x.puesto]=x});
 if(!h.por_puesto){(h.ventas||[]).forEach(row=>{const pu=row[3],c=+row[5],imp=+row[6];sales[pu]=sales[pu]||{puesto:pu,ventas:0,deshechas:0,unidades:0,importe:0};
  if(c===-1){sales[pu].ventas++;sales[pu].unidades++}else if(c===1){sales[pu].deshechas++;sales[pu].unidades--}sales[pu].importe+=imp})}
 const pus=e.puestos||[];
 if(!pus.length){box.innerHTML='<p class="msg">Sin puestos activos</p>';return}
 box.innerHTML=pus.map(pu=>{const rows=e.stock[pu]||[];let piezas=0,fichas=0;rows.forEach(([pr,ini,vend])=>{const q=Math.max(0,(+ini||0)-(+vend||0));piezas+=q;if(q>0)fichas++});
  const s=sales[pu]||{ventas:0,unidades:0,importe:0};
  return`<div class="res-card"><div class="res-t">${esc(puLabel(pu))}</div><div class="res-g"><span><b>${piezas}</b> piezas</span><span><b>${fichas}</b> fichas</span><span><b>${s.ventas||0}</b> ventas</span><span><b>${Number(s.importe||0).toFixed(0)}</b> €</span></div></div>`}).join('')}
function paintAvisos(e,h,names){const box=$('#avisos-list'),badge=$('#avisos-n');if(!box)return;const items=[];
 const um=thr();(e.puestos||[]).forEach(pu=>{(e.stock[pu]||[]).forEach(([pr,ini,vend])=>{const q=Math.max(0,(+ini||0)-(+vend||0));if(q>um)return;
  const nm=(names&&names[pr]&&names[pr].nombre)||pr;items.push({t:'stock',txt:`Stock bajo · ${puLabel(pu)} · ${nm}: quedan ${q} (≤${um})`})})});
 (h.ventas||[]).forEach(row=>{const c=+row[5];if(c!==1)return;const tipo=row[8]||'',det=row[9]||'';if(!tipo&&!det)return;
  const label=tipo==='devolucion'?'Devolución':(tipo==='error'?'Corrección':'Ajuste +1');
  const nm=(names&&names[row[4]]&&names[row[4]].nombre)||row[4];
  items.push({t:'fix',txt:`${label} · ${puLabel(row[3])} · ${nm}${det?' · '+det:''}`})});
 if(!items.length){box.innerHTML='<p class="hint2" style="margin:0">Sin avisos ahora. (Apertura/cierre de jornada: aún no implementado.)</p>';if(badge){badge.hidden=true;badge.textContent='0'}return}
 box.innerHTML=items.slice(0,40).map(i=>`<div class="aviso ${i.t}">${esc(i.txt)}</div>`).join('');
 if(badge){badge.hidden=false;badge.textContent=String(items.length)}}
const stockSlow={};
function adj(producto,n,row,meta){if(n<0)return;pop(n>+(row.dataset.ini||0));
 const vend=+(row.dataset.vend||0),nombre=(meta&&meta.nombre)||row.dataset.nombre||producto,activo=meta?meta.activo:1;
 const puesto=row.dataset.puesto||(st.ownerStall!=='*'?st.ownerStall:null);if(!puesto||puesto==='*')return;
 paintStockRow(row,nombre,activo,n,vend);
 const num=row.querySelector('.n');if(num){num.classList.remove('flash');void num.offsetWidth;num.classList.add('flash')}
 const key=stockKey(puesto,producto);
 stockPend[key]={producto,n,row,puesto,nombre,activo};clearTimeout(stockTimers[key]);clearTimeout(stockSlow[key]);
 /* Debounce save; only show "saving" spinner if GAS is still slow after 1s — never block the buttons. */
 stockTimers[key]=setTimeout(()=>flushStock(key),550);
 stockSlow[key]=setTimeout(()=>{if(stockPend[key]||stockSaving[key])row.classList.add('stock-pend')},1000)}
$('#refresh').onclick=()=>withBusy($('#refresh'),async()=>{await loadOwner();await loadControl()});
async function loadControl(){if(!st.ses||st.ses.rol!=='dueno')return;const box=$('#control');if(!box)return;box.innerHTML='<p class="msg">Cargando control…</p>';
 try{const r=await API.controlDueno(st.ses.token_dueno);if(!r.ok){if(tokenMalo(r))return;box.innerHTML='<p class="msg">'+esc(r.error||'Error')+'</p>';return}
  const live=r.en_vivo||{},tot=live.totales||{};
  paintBarSum({totales:{unidades:tot.vendidas,importe:tot.importe,vendidas:tot.vendidas},por_vendedor:(live.por_vendedor||[]).map(x=>({nombre:x.nombre||x.vendedor,vendedor:x.vendedor,puesto:x.puesto_activo,unidades:x.vendidas,vendidas:x.vendidas,importe:x.importe}))});
  let h=`<p class="hint2">Hoy ${esc(r.fecha)} · en vivo: ${tot.vendidas||0} vendidas · ${tot.deshechas||0} deshechas</p>`;
  h+='<table><tr><th>Puesto ahora</th><th>Vend.</th><th>Desh.</th><th>Neto</th><th>€</th></tr>'+(live.por_puesto||[]).map(x=>`<tr><td>${esc(x.nombre||x.puesto)}</td><td class="n">${x.vendidas}</td><td class="n">${x.deshechas}</td><td class="n">${x.neto}</td><td class="n">${x.importe}</td></tr>`).join('')+'</table>';
  h+='<table><tr><th>Vendedor ahora</th><th>Activo en</th><th>Vend.</th><th>Desh.</th><th>Neto</th><th>€</th></tr>'+(live.por_vendedor||[]).map(x=>`<tr><td>${esc(x.nombre||x.vendedor)}</td><td>${esc(x.puesto_activo||'—')}</td><td class="n">${x.vendidas}</td><td class="n">${x.deshechas}</td><td class="n">${x.neto}</td><td class="n">${x.importe}</td></tr>`).join('')+'</table>';
  h+='<h3 class="sub">Por vendedor</h3>';
  (r.vendedores||[]).forEach(v=>{
   const hist=(v.historial_puestos||[]).map(p=>`${esc(p.nombre||p.puesto)}×${p.veces||0}`).join(', ')||'—';
   h+=`<div class="line"><span class="nm"><b>${esc(v.nombre)}</b> · activo ${esc(v.puesto_activo||'—')}<br><span class="hint2">Puestos: ${hist}</span><br>Hoy ${v.hoy?.vendidas||0} vend. / ${v.hoy?.deshechas||0} desh. · Total ${v.total?.vendidas||0} / ${v.total?.deshechas||0}</span></div>`;
  });
  box.innerHTML=h}catch(e){box.innerHTML='<p class="msg">Sin conexión al control</p>'}}
/* ---- PIN en memoria (se borra al ocultar pestaña / salir). Va en la fila de Gestión › Puestos. ---- */
async function verPines(){await ensurePines();if(adm&&admTab==='puestos')admPaint();loadPuestos()}
/* ---- Gestión (CRUD dueño, borrado lógico). Datos solo en memoria. ---- */
var adm=null,admTab='figuras';
async function admCall(accion,extra){const r=await API.admin(accion,st.ses.token_dueno,extra).catch(()=>({ok:false,error:'Sin conexión'}));if(!r.ok&&tokenMalo(r))throw 0;return r}
async function admLoad(){const r=await admCall('admin_listar',{});if(!r.ok){$('#adm').innerHTML='<p class="msg">'+esc(r.error)+'</p>';return}adm=r;
 if(adm.puestos)mergePuestoNames(Object.fromEntries(adm.puestos.map(p=>[p.id,p.nombre])));
 if(!adm.stockByPu){try{const e=await API.estadoDueno(st.ses.token_dueno);if(e&&e.ok){adm.stockByPu=e.stock||{};mergePuestoNames(e.puestos_nombres)}}catch(_){adm.stockByPu=adm.stockByPu||{}}}
 admPaint();if(admTab==='puestos')ensurePines().then(()=>adm&&admTab==='puestos'&&admPaint())}
function form(titulo,campos,okTxt='Guardar'){return new Promise(res=>{const D=$('#dlg'),okb=$('#dlg-ok');
 if(D.open){try{D.close('no')}catch(e){}}
 busyBtn(okb,0);$('#dlg-t').textContent=titulo;$('#dlg-m').textContent='';okb.textContent=okTxt;
 $('#dlg-c').innerHTML=campos.map(c=>`<label>${esc(c.l)}</label>`+(c.op?`<select name="${c.n}">${c.op.map(o=>`<option value="${esc(o[0])}"${String(o[0])===String(c.v)?' selected':''}>${esc(o[1])}</option>`).join('')}</select>`:`<input name="${c.n}" type="${c.t||'text'}" value="${esc(c.v??'')}" ${c.t==='number'?'min="0" step="'+(c.s||1)+'"':''}${c.o?'':' required'}>`)).join('');
 let done=false;const finish=v=>{if(done)return;done=true;res(v)};
 D.onclose=()=>{if(D.returnValue!=='ok')return finish(null);finish(Object.fromEntries(new FormData($('#dlg-f'))))};
 D.returnValue='';
 try{D.showModal()}catch(e){alert('No se pudo abrir el formulario');finish(null)}})}
const pName=id=>puLabel(id),actP=()=>adm.puestos.filter(p=>p.activo);
function fila(txt,act,del,btns){return`<div class="line${act?'':' del'}"><span class="nm">${txt}</span>${act?btns:'<span class="tag">BORRADO</span>'}</div>`}
function admPaint(){document.querySelectorAll('#adm-tabs .blk').forEach(b=>b.classList.toggle('sel',b.dataset.t===admTab));const A=$('#adm');let h='';
 if(admTab==='figuras'){const figPuestos=fid=>{const m=adm.stockByPu||{},ps=Object.keys(m).filter(pu=>(m[pu]||[]).some(s=>String(s[0])===String(fid)));return ps.length?ps.map(puLabel).join(', '):'sin puesto'};
  h='<p class="hint2">Cada puesto tiene su catálogo: asigna la figura a un puesto (con stock). La misma figura puede estar en varios puestos.</p><button class="blk green add" data-a="fig-new">+ Nueva figura</button>'+adm.figuras.map(f=>fila(`<span class="sw" style="--ic:${esc(f.color_icono)};display:inline-block;vertical-align:middle"></span> ${esc(f.nombre)} · ${f.precio} € · <span class="tag">${esc(figPuestos(f.id))}</span>`,f.activo,0,
  `<button class="blk sm" data-a="fig-ed" data-id="${f.id}">Editar</button><button class="blk sm red" data-a="fig-del" data-id="${f.id}">Borrar</button>`)).join('')}
 if(admTab==='puestos'){const nP=adm.puestos.filter(p=>p.activo).length,capP=nP>=3;
  h='<p class="hint2">El PIN se borra al ocultar la pestaña o salir.</p>'+(capP?'<p class="hint2">Demo: máximo 3 puestos</p>':'')+(capP?'':'<button class="blk green add plus" data-a="pue-alta" aria-label="Añadir puesto" title="Añadir puesto">+</button>')+(pines?'' :'<button class="blk blue add" data-a="pin-show">Mostrar PINES</button>');
  const rows=adm.puestos.filter(p=>p.activo).map(p=>{
   const ven=(adm.vendedores||[]).find(v=>v.activo&&String(v.puesto)===String(p.id));
   const px=(pines||[]).find(x=>String(x.puesto)===String(p.id));
   const pinTxt=pines==null?'······':(px&&px.pin?px.pin:'—');
   const vid=esc((px&&px.vendedor)||(ven&&ven.id)||'');
   const acts=(pines==null?'':((px&&px.pin?`<button type="button" class="blk sm" data-a="pin-copy" data-id="${p.id}" data-vid="${vid}">Copiar PIN</button>`:'')+
    (ven||px?`<button type="button" class="blk sm blue" data-a="pin-ch" data-id="${p.id}" data-vid="${vid}">${px&&px.pin?'Cambiar PIN':'Crear PIN'}</button>`:'')))+
    `<button type="button" class="blk sm" data-a="pue-ed" data-id="${p.id}">Editar</button><button type="button" class="blk sm red" data-a="pue-del" data-id="${p.id}">Borrar</button>`;
   return `<tr><td>${esc(p.nombre||p.id)}</td><td>${esc(ven?ven.nombre:'—')}</td><td class="pin">${esc(pinTxt)}</td><td class="acts">${acts}</td></tr>`}).join('');
  h+=`<table class="puestos-tbl"><thead><tr><th>Puesto</th><th>Vendedor</th><th>PIN</th><th>Acciones</th></tr></thead><tbody>${rows||'<tr><td colspan="4">Sin puestos activos</td></tr>'}</tbody></table>`}
 if(admTab==='vendedores'){const nV=adm.vendedores.filter(v=>v.activo).length,capV=nV>=3;
  h=(capV?'<p class="hint2">Demo: máximo 3 vendedores</p>':'<button class="blk green add" data-a="ven-new">+ Nuevo vendedor</button>')+adm.vendedores.map(v=>fila(`${esc(v.nombre)} <span class="tag">${v.id}</span> · ${esc(pName(v.puesto))}`,v.activo,0,
  `<button class="blk sm" data-a="ven-ed" data-id="${v.id}">Editar</button><button class="blk sm blue" data-a="ven-mov" data-id="${v.id}">Mover</button><button class="blk sm red" data-a="ven-del" data-id="${v.id}">Borrar</button>`)).join('')}
 if(admTab==='stock'){h='<p class="hint2">Mueve unidades entre puestos que llevan la misma figura. Si el destino aún no la tenía, queda asignada allí.</p><button class="blk blue add" data-a="stk-mov">Mover stock entre puestos</button>'}
 A.innerHTML=h}
function admMsg(t){let m=$('#adm-msg');if(!m){m=document.createElement('p');m.id='adm-msg';m.className='msg';const A=$('#adm');if(A)A.prepend(m)}m.textContent=t||'';m.hidden=!t}
document.getElementById('adm-tabs').onclick=e=>{const t=e.target.dataset.t;if(!t)return;admTab=t;
 const eq=$('.owner-panel[data-panel="equipo"] .adm-slot');if(eq){const a=$('#adm');if(a)eq.appendChild(a)}
 if(!adm){admLoad();return}admPaint();if(t==='puestos')ensurePines().then(()=>adm&&admTab==='puestos'&&admPaint())};
document.getElementById('adm').onclick=async e=>{const b=e.target.closest('[data-a]');if(!b||b.dataset.lock==='1')return;const a=b.dataset.a,id=b.dataset.id;let r,v;
 if(a==='pin-show'){b.dataset.lock='1';try{await withBusy(b,async()=>{await ensurePines();admPaint();loadPuestos()})}finally{delete b.dataset.lock}return}
 if(a==='pin-copy'){const px=(pines||[]).find(x=>String(x.puesto)===String(id));if(!px||!px.pin)return alert('No hay PIN visible');
  try{await navigator.clipboard.writeText(px.pin);b.textContent='¡Copiado!'}catch(_){b.textContent='No se pudo'}setTimeout(()=>b.textContent='Copiar PIN',1500);return}
 if(a==='pin-ch'){const vid=b.dataset.vid||undefined;const puN=(adm.puestos.find(p=>p.id===id)||{}).nombre||id;
  if(!confirm('¿Generar un PIN nuevo de 6 cifras para '+puN+'? El anterior dejará de valer.'))return;
  b.dataset.lock='1';try{await withBusy(b,async()=>{const q=await API.pinCambiar(st.ses.token_dueno,id,vid||undefined).catch(()=>({ok:false,error:'Sin conexión'}));
   if(!q.ok)return alert(q.error);pines=null;await ensurePines();admPaint();loadPuestos();alert('PIN nuevo: '+q.pin)})}finally{delete b.dataset.lock}return}
 if(a.endsWith('-del')){if(!adm){await admLoad();if(!adm)return alert('No se pudo cargar la gestión')}
  const x=adm.figuras.find(y=>y.id===id)||adm.puestos.find(y=>y.id===id)||adm.vendedores.find(y=>y.id===id);if(!x)return alert('No se encontró el elemento');
  const msg=a==='pue-del'
   ?('¿Borrar el puesto «'+x.nombre+'»? Los vendedores con este puesto activo también se darán de baja (el historial no se pierde).')
   :('¿Borrar «'+x.nombre+'»? Se marcará como borrado (el historial no se pierde).');
  if(!confirm(msg))return}
 b.dataset.lock='1';
 try{
 if(!adm){await admLoad();if(!adm)return alert('No se pudo cargar la gestión')}
 const fig=adm.figuras.find(x=>x.id===id),pu=adm.puestos.find(x=>x.id===id),ve=adm.vendedores.find(x=>x.id===id),PO=actP().map(p=>[p.id,p.nombre]);
 const E={PUESTO_CON_VENDEDORES:'Este puesto aún tiene vendedores activos. Muévelos o bórralos antes.',PUESTO_INVALIDO:'Puesto no encontrado.',VENDEDOR_DESCONOCIDO:'Vendedor no encontrado.',DEMO_MAX_PUESTOS:'Demo: máximo 3 puestos.',DEMO_MAX_VENDEDORES:'Demo: máximo 3 vendedores.'};
 if(a==='fig-new'||a==='fig-ed'){
  if(!PO.length)return alert('Crea un puesto antes de asignar productos.');
  const est=await API.estadoDueno(st.ses.token_dueno).catch(()=>({ok:false}));
  const stockByPu=(est&&est.ok&&est.stock)||{};
  const enPuesto=pu=>(stockByPu[pu]||[]).some(s=>String(s[0])===String(fig&&fig.id));
  const puestosCon=PO.map(p=>p[0]).filter(enPuesto);
  const defPu=(fig&&puestosCon.includes(st.ownerStall)?st.ownerStall:null)||puestosCon[0]||st.ownerStall||PO[0][0];
  const curIni=+(((stockByPu[defPu]||[]).find(s=>String(s[0])===String(fig&&fig.id))||[])[1]||0);
  const fp=form(fig?'Editar figura':'Nueva figura',[
   {l:'Nombre',n:'nombre',v:fig&&fig.nombre},{l:'Precio (€)',n:'precio',t:'number',s:'0.01',v:fig?fig.precio:''},
   {l:'Coste (€)',n:'coste',t:'number',s:'0.01',v:fig?fig.coste:0},{l:'Color',n:'color_icono',t:'color',v:(fig&&fig.color_icono)||'#7a9cc6'},
   {l:'Puesto (catálogo de este puesto)',n:'puesto',op:PO,v:defPu},{l:'Stock inicial en ese puesto',n:'stock_ini',t:'number',v:curIni},
   {l:'Foto (enlace Drive, opcional)',n:'foto_url',t:'url',o:1,v:(fig&&fig.foto_url)||''}]);
  queueMicrotask(()=>{$('#dlg-m').textContent=fig?'Elige un puesto para fijar o añadir stock ahí. No quita la figura de otros puestos.':'Se asigna al puesto elegido; luego puedes añadirla a otro editándola o con Mover stock.'});
  v=await fp;
  if(v){const puesto=v.puesto,stockIni=Math.max(0,Math.floor(+v.stock_ini||0));delete v.puesto;delete v.stock_ini;if(!v.foto_url)delete v.foto_url;
   if(!puesto||!PO.some(p=>p[0]===puesto))return alert('Elige un puesto válido.');
   const otros=(stockByPu[puesto]||[]).filter(s=>{const pid=String(s[0]);if(fig&&pid===String(fig.id))return false;const fx=adm.figuras.find(y=>y.id===pid);return fx&&fx.activo});
   if(otros.length>=4)return alert('Demo: máximo 4 productos por puesto.');
   busyBtn(b,1);try{r=await admCall('figura_guardar',{figura:{...(fig?{id:fig.id}:{}),...v}});
    if(r&&r.ok&&r.figura&&r.figura.id){const q=await API.stockGuardar(st.ses.token_dueno,puesto,[{producto:r.figura.id,cantidad_inicial:stockIni}]).catch(()=>({ok:false,error:'Sin conexión'}));
     if(!q.ok)alert('Figura guardada, pero no se asignó al puesto: '+(q.error||'error'));
     else{adm.stockByPu=adm.stockByPu||{};adm.stockByPu[puesto]=q.stock?q.stock.map(s=>[s.producto,s.cantidad_inicial,s.vendidas,s.quedan]):(adm.stockByPu[puesto]||[])}}}finally{busyBtn(b,0)}}}
 if(a==='pue-alta'){if(adm.puestos.filter(p=>p.activo).length>=3)return alert('Demo: máximo 3 puestos');
  const atVend=adm.vendedores.filter(x=>x.activo).length>=3;
  if(atVend&&!confirm('Ya hay 3 vendedores (máximo demo). ¿Crear el puesto sin vendedor nuevo?'))return;
  admMsg('Creando puesto…');busyBtn(b,1);
  try{const N=1+Math.max(0,...adm.puestos.map(p=>+String(p.id).slice(1)||0));r=await admCall('puesto_guardar',{puesto:{nombre:'Puesto '+N}});
   if(!r.ok){admMsg('');return alert(E[r.error]||('Error: '+r.error))}const np=r.puesto;let nv=null,pin=null;
   if(!atVend){r=await admCall('vendedor_guardar',{vendedor:{nombre:'Vendedor '+np.nombre,puesto:np.id}});if(!r.ok){await admLoad();admMsg('');return alert('Puesto creado, pero falta el vendedor: '+(E[r.error]||r.error))}nv=r.vendedor;pin=r.pin}
   r=null;admMsg('');pines=null;await admLoad();loadOwner();
   busyBtn(b,0); /* unlock before dialog so the + button is not stuck for seconds */
   if(nv){for(;;){const pr=form('Editar '+np.nombre,[{l:'Nombre del puesto',n:'nombre',v:np.nombre},{l:'PIN',n:'pin_acc',op:[['','Mantener PIN'],['cambiar','Generar PIN nuevo']]}]);$('#dlg-m').textContent='PIN de '+nv.nombre+': '+(pin||'—')+' (apúntalo; no se guarda en el dispositivo)';v=await pr;if(!v)break;
    if(v.nombre!==np.nombre){const q=await admCall('puesto_guardar',{puesto:{id:np.id,nombre:v.nombre}});if(!q.ok){alert('Error: '+q.error);break}np.nombre=v.nombre}
    if(v.pin_acc!=='cambiar')break;const q=await admCall('pin_crear_o_cambiar',{puesto:np.id,vendedor_id:nv.id});if(!q.ok){alert('Error: '+q.error);break}pin=q.pin;pines=null;await ensurePines();admPaint();loadPuestos()}}
   else alert('Puesto «'+np.nombre+'» creado. Añade un vendedor cuando liberes cupo (máx. 3).');
   pin=null;r={ok:true}}catch(err){admMsg('');throw err}finally{busyBtn(b,0)}}
 if(a==='pue-new'||a==='pue-ed'){v=await form(pu?'Editar puesto':'Nuevo puesto',[{l:'Nombre',n:'nombre',v:pu&&pu.nombre}]);if(v){busyBtn(b,1);try{r=await admCall('puesto_guardar',{puesto:{...(pu?{id:pu.id}:{}),...v}})}finally{busyBtn(b,0)}}}
 if(a==='ven-new'||a==='ven-ed'){if(a==='ven-new'&&adm.vendedores.filter(x=>x.activo).length>=3)return alert('Demo: máximo 3 vendedores');
  v=await form(ve?'Editar vendedor':'Nuevo vendedor',[{l:'Nombre',n:'nombre',v:ve&&ve.nombre},{l:'Email',n:'email',t:'email',o:1,v:(ve&&ve.email)||''},{l:'Puesto activo (cambia al entrar en otro)',n:'puesto',op:PO,v:ve&&ve.puesto},{l:'PIN',n:'pin_acc',op:[['','Mantener PIN'],['cambiar','Generar PIN nuevo']]}]);
  if(v){const pinAcc=v.pin_acc;delete v.pin_acc;busyBtn(b,1);try{r=await admCall('vendedor_guardar',{vendedor:{...(ve?{id:ve.id}:{}),...v}});if(r.ok&&r.pin)alert('PIN del nuevo vendedor (apúntalo, no se guarda aquí): '+r.pin);if(r&&r.ok&&pinAcc==='cambiar'&&ve){const q=await admCall('pin_crear_o_cambiar',{puesto:v.puesto||ve.puesto,vendedor_id:ve.id});if(!q.ok)alert('Error PIN: '+q.error);else{alert('PIN nuevo: '+q.pin);pines=null;await ensurePines();admPaint();loadPuestos()}}}finally{busyBtn(b,0)}}}
 if(a==='ven-mov'){v=await form('Mover a '+ve.nombre,[{l:'Puesto destino',n:'puesto_destino',op:PO.filter(p=>p[0]!==ve.puesto)}],'Mover');if(v){busyBtn(b,1);try{r=await admCall('vendedor_mover',{vendedor_id:ve.id,...v})}finally{busyBtn(b,0)}}}
 if(a==='stk-mov'){if(PO.length<2)return alert('Necesitas al menos 2 puestos para mover stock.');
  const estM=await API.estadoDueno(st.ses.token_dueno).catch(()=>({ok:false}));const stockM=(estM&&estM.ok&&estM.stock)||adm.stockByPu||{};
  const seen={},pr=[];Object.keys(stockM).forEach(pu=>{(stockM[pu]||[]).forEach(s=>{const pid=String(s[0]);if(seen[pid])return;const f=adm.figuras.find(x=>x.id===pid&&x.activo);if(!f)return;seen[pid]=1;
   const donde=Object.keys(stockM).filter(p=>(stockM[p]||[]).some(x=>String(x[0])===pid));pr.push([f.id,f.nombre+(donde.length?' · '+donde.join(','):'')])})});
  if(!pr.length)return alert('Ningún puesto tiene productos asignados. Crea o edita una figura y elige un puesto.');
  const defDesde=st.ownerStall&&PO.some(p=>p[0]===st.ownerStall)?st.ownerStall:PO[0][0];
  const defHasta=PO.find(p=>p[0]!==defDesde);v=await form('Mover stock',[{l:'Figura (puestos que la llevan)',n:'producto',op:pr},{l:'Desde',n:'desde',op:PO,v:defDesde},{l:'Hasta',n:'hasta',op:PO,v:defHasta&&defHasta[0]},{l:'Cantidad',n:'cantidad',t:'number',v:1}],'Mover');
  if(v){busyBtn(b,1);try{r=await admCall('stock_mover',{...v,cantidad:+v.cantidad});if(r.ok)alert('Movido. Quedan en origen: '+(r.desde.find(s=>s.producto===v.producto)||{}).quedan)}finally{busyBtn(b,0)}}}
 if(a.endsWith('-del')){busyBtn(b,1);try{const acc={fig:'figura_borrar',pue:'puesto_borrar',ven:'vendedor_borrar'}[a.slice(0,3)];
  r=await admCall(acc,{id});
  if(a==='pue-del'&&r&&!r.ok&&r.error==='PUESTO_CON_VENDEDORES'){
   const vend=(adm.vendedores||[]).filter(x=>x.activo&&String(x.puesto)===String(id));
   for(const vx of vend){const q=await admCall('vendedor_borrar',{id:vx.id});if(!q.ok){r=q;break}}
   if(!r||r.error==='PUESTO_CON_VENDEDORES')r=await admCall('puesto_borrar',{id})}}finally{busyBtn(b,0)}}
 if(r&&!r.ok)return alert(E[r.error]||('Error: '+r.error));
 if(r){await admLoad();loadOwner();if(typeof loadControl==='function')loadControl()}}
 catch(err){if(err!==0)alert('Error: '+(err&&err.message||err))}
 finally{delete b.dataset.lock;busyBtn(b,0);admMsg('')}};
/* ---- Conectar mi hoja (v8): guarda la URL /exec en localStorage 'api_url' (la misma que ?api) ---- */
const EXEC=/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,}\/exec\/?$/,DEV=/^http:\/\/(127\.0\.0\.1|localhost):\d+\/exec$/;
const COMO='Necesito la URL de la aplicación web, no la de la hoja. En tu hoja: Extensiones › Apps Script › Implementar › Nueva implementación › tipo «Aplicación web» (ejecutar como: yo; acceso: cualquiera) › Implementar › copia la URL que termina en /exec.';
function hojaPaint(){const u=localStorage.getItem('api_url');const on=u&&u!=='mock';$('#hoja-est').textContent=on?'Conectado a: '+(localStorage.getItem('api_hoja')||u):'Modo DEMO (datos de EJEMPLO). Pega la URL /exec de tu Apps Script.';$('#hoja-off').hidden=!on;if(on)$('#hoja-url').value=u}
function hojaMsg(t,ok){const m=$('#hoja-msg');m.hidden=!t;m.textContent=t||'';m.classList.toggle('okm',!!ok)}
async function hojaCambio(){await new Promise(r=>setTimeout(r,1800));borrarPines();saveSes(null);show('login');loadPuestos()}
$('#hoja-ok').onclick=()=>withBusy($('#hoja-ok'),async()=>{const u=$('#hoja-url').value.trim();
 if(/docs\.google\.com\/spreadsheets/.test(u))return hojaMsg('Eso es la URL de la hoja de cálculo. '+COMO);
 if(!EXEC.test(u)&&!DEV.test(u))return hojaMsg('URL no válida. '+COMO);
 {const ps=await QueueDB.get('puestos')||[];await purgeOrphanQueue((ps||[]).map(p=>p.id||p));if(await QueueDB.count())return hojaMsg('Hay ventas pendientes de enviar. Sincroniza antes de cambiar de hoja.');}
 hojaMsg('Probando conexión…');let r;try{r=await API.ping(u)}catch(e){r={ok:false,error:e.message||'Sin respuesta'}}
 if(r&&r.ok&&r.app!=='miniaturas')return hojaMsg('Esa URL responde, pero no es la app de Miniaturas (app≠miniaturas). Implementa el Code.gs de Miniaturas en tu hoja. '+COMO);
 if(!r||!r.ok)return hojaMsg('No se pudo conectar ('+((r&&(r.mensaje||r.error))||'respuesta no válida')+'). Revisa que la implementación tenga acceso «Cualquiera». '+COMO);
 localStorage.setItem('api_url',u);localStorage.setItem('api_hoja',r.hoja||'');hojaPaint();hojaMsg('Conectado a: '+(r.hoja||'?')+(r.version?' (v '+r.version+')':'')+'. Entra con el PIN de dueño de esa hoja.',1);hojaCambio()});
$('#hoja-off').onclick=()=>withBusy($('#hoja-off'),async()=>{if(!confirm('¿Desconectar la hoja y volver a la DEMO?'))return;localStorage.removeItem('api_url');localStorage.removeItem('api_hoja');$('#hoja-url').value='';hojaPaint();hojaMsg('Desconectado. Vuelves al modo DEMO.',1);await hojaCambio()});
hojaPaint();
renderPin();updPend();loadPuestos();QueueDB.get('ses').then(ses=>{if(ses){st.ses=ses;start()}else show('login')});
if('serviceWorker'in navigator){const had=!!navigator.serviceWorker.controller;navigator.serviceWorker.register('sw.js?v=38',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!had||sessionStorage.getItem('sw_reload')==='20')return;sessionStorage.setItem('sw_reload','20');location.reload()})}
