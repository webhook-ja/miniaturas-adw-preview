const $=s=>document.querySelector(s);const st={ses:null,prods:[],stock:{},ownerStall:null,undo:null,syncing:false,fallos:0,bo:null};
const thr=()=>+(localStorage.getItem('umbral')??3);
const uuid=()=>crypto.randomUUID?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
let ac;function pop(up){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;
 o.type='square';o.frequency.setValueAtTime(up?300:900,t);o.frequency.exponentialRampToValueAtTime(up?900:180,t+.09);
 g.gain.setValueAtTime(.25,t);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+.13)}catch(e){}}
let pines=null,ownerGen=0,adjBusy=false;
function borrarPines(){pines=null;const e=document.getElementById('pines');if(e)e.innerHTML=''}
function clearAdm(){adm=null;const m=document.getElementById('adm');if(m)m.innerHTML=''}
function show(v){borrarPines();if(v==='login')clearAdm();document.querySelectorAll('.view').forEach(x=>x.hidden=x.id!=='v-'+v);$('#logout').hidden=v==='login'}
const saveSes=s=>{st.ses=s;QueueDB.set('ses',s)};
/* ---- PIN ---- */
let pin='';const renderPin=()=>$('#pin-dots').textContent='●'.repeat(pin.length)+'○'.repeat(Math.max(0,6-pin.length));
async function loadPuestos(){let ps=await QueueDB.get('puestos');try{const r=await API.puestos();if(r.ok){ps=r.puestos;QueueDB.set('puestos',ps)}}catch(e){}
 $('#who').innerHTML=(ps||[]).map(p=>`<option value="${p}">Puesto ${p}</option>`).join('')+'<option value="dueno">DUEÑO</option>'}
$('#be').textContent=API.backend==='mock'?'MOCK · DATOS DE EJEMPLO':'Apps Script';
['1','2','3','4','5','6','7','8','9','⌫','0','OK'].forEach(k=>{const b=document.createElement('button');b.textContent=k;b.dataset.k=k;if(k==='OK')b.className='green';
 b.onclick=()=>{if(k==='⌫')pin=pin.slice(0,-1);else if(k==='OK')doLogin();else if(pin.length<8)pin+=k;renderPin()};$('#pad').append(b)});
const ERR={PIN_FORMATO:'El PIN tiene 6 cifras',PIN_INCORRECTO:'PIN incorrecto',DEMASIADOS_INTENTOS:'Demasiados intentos: espera 15 min',VENDEDOR_INACTIVO:'Vendedor dado de baja'};
async function doLogin(){$('#login-msg').textContent='';const who=$('#who').value;try{const r=await API.login(pin,who);pin='';renderPin();
 if(!r.ok)return $('#login-msg').textContent=ERR[r.error]||r.error;
 saveSes(r.rol==='dueno'?{rol:'dueno',token_dueno:r.token_dueno}:{rol:'vendedor',token:r.token,puesto:r.vendedor.puesto,nombre:r.vendedor.nombre});start()}
 catch(e){$('#login-msg').textContent='Sin conexión: el primer acceso necesita red'}}
function start(){if(st.ses.rol==='vendedor'){$('#stall-name').textContent=st.ses.nombre+' · '+st.ses.puesto;show('stall');loadStall();sync()}else{show('owner');loadOwner()}}
$('#logout').onclick=()=>{borrarPines();saveSes(null);$('#undo').hidden=true;show('login')};
function tokenMalo(r){if(['TOKEN_INVALIDO','TOKEN_CADUCADO','VENDEDOR_INACTIVO'].includes(r.error)){/* la cola NO se borra */saveSes(null);show('login');$('#login-msg').textContent='Sesión caducada: vuelve a meter el PIN (las ventas pendientes se conservan)';return true}}
/* ---- Puesto ---- */
const setStock=arr=>{st.stock=Object.fromEntries((arr||[]).map(s=>[s.producto,s.quedan]));QueueDB.set('stock_'+st.ses.puesto,st.stock)};
async function loadStall(){const P=st.ses.puesto;try{const r=await API.catalogo(st.ses.token);if(r.ok){await QueueDB.set('prods',r.productos);setStock(r.stock)}else tokenMalo(r)}catch(e){}
 st.prods=await QueueDB.get('prods')||[];if(!Object.keys(st.stock).length)st.stock=await QueueDB.get('stock_'+P)||{};await renderGrid()}
async function pendingDelta(){const m={};(await QueueDB.all()).filter(e=>e._puesto===st.ses.puesto).forEach(e=>m[e.producto]=(m[e.producto]||0)+e.cantidad);return m}
async function renderGrid(){if(!st.ses||st.ses.rol!=='vendedor')return;const pd=await pendingDelta(),g=$('#grid');g.innerHTML='';
 st.prods.filter(p=>p.id in st.stock).forEach(p=>{const s=st.stock[p.id]+(pd[p.id]||0),b=document.createElement('button');b.className='tile'+(s<=thr()?' low':'')+(s<=0?' zero':'');
  b.style.setProperty('--c',p.color_icono);b.dataset.id=p.id;const img=API.driveImg(p.foto_url);
  b.innerHTML=`${img?`<img class="ic" alt="" loading="lazy" decoding="async" width="56" height="56" src="${img}">`:`<span class="ic" style="--ic:${p.color_icono}"></span>`}<div class="nm"></div><div class="st">${s}</div>`;
  b.querySelector('.nm').textContent=p.nombre;const im=b.querySelector('img');if(im)im.onerror=()=>{const sp=document.createElement('span');sp.className='ic';sp.style.setProperty('--ic',p.color_icono);im.replaceWith(sp)};
  b.onclick=()=>sell(p,s);g.append(b)})}
const evento=(p,c)=>({id:uuid(),fecha_hora:API.ahoraMadrid(),producto:p,cantidad:c,_puesto:st.ses.puesto,_ts:Date.now()});
async function sell(p,s){if(s<=0){pop(true);return}pop();const e=evento(p.id,-1);await QueueDB.add(e);await renderGrid();setUndo(e,p);updPend();sync()}
function setUndo(e,p){st.undo=e;$('#undo-txt').textContent='−1 '+p.nombre;$('#undo').hidden=false;clearTimeout(st.ut);st.ut=setTimeout(()=>{$('#undo').hidden=true;st.undo=null},15000)}
$('#undo-btn').onclick=async()=>{const v=st.undo;if(!v)return;st.undo=null;$('#undo').hidden=true;pop(true);
 await QueueDB.add({...evento(v.producto,1),ref:v.id});await renderGrid();updPend();sync()};
/* ---- Sincronización: lotes ≤200, idempotente, backoff exponencial 2 s → 5 min ---- */
function backoff(){st.fallos++;const ms=Math.min(2000*2**(st.fallos-1),300000);clearTimeout(st.bo);st.bo=setTimeout(sync,ms);return ms}
async function sync(){if(st.syncing||!navigator.onLine||!st.ses||st.ses.rol!=='vendedor')return;st.syncing=true;try{
 let q=(await QueueDB.all()).filter(e=>e._puesto===st.ses.puesto).sort((a,b)=>a._ts-b._ts);
 while(q.length){const lote=q.slice(0,200).map(({_puesto,_ts,...v})=>v);const r=await API.ventasLote(st.ses.token,lote);
  if(!r.ok){if(tokenMalo(r))return;throw new Error(r.error)}
  const ack=[...r.aceptadas,...r.duplicadas];await QueueDB.remove(ack);
  if(r.rechazadas?.length){/* no se reintentan: se apartan y se muestran */const rej=JSON.parse(localStorage.getItem('rechazadas')||'[]');
   const ids=r.rechazadas.map(x=>x.id);rej.push(...r.rechazadas.map(x=>({...x,...q.find(e=>e.id===x.id)})));localStorage.setItem('rechazadas',JSON.stringify(rej));await QueueDB.remove(ids);ack.push(...ids);
   $('#rech').hidden=false;$('#rech').textContent='⚠ '+rej.length+' ventas rechazadas por el servidor: '+r.rechazadas.map(x=>x.motivo).join(', ')}
  if(r.marcadas?.length){$('#rech').hidden=false;$('#rech').textContent='ℹ '+r.marcadas.length+' ventas guardadas de productos desactivados ('+r.marcadas.map(x=>x.motivo).join(', ')+')'}
  setStock(r.stock);q=q.filter(e=>!ack.includes(e.id));if(!ack.length)break}
 st.fallos=0;clearTimeout(st.bo);await renderGrid()
}catch(e){backoff()}finally{st.syncing=false;updPend()}}
async function updPend(){const n=await QueueDB.count();$('#pend').textContent='⏳'+n;$('#net').textContent=navigator.onLine?'ONLINE':'OFFLINE';$('#net').className='pill '+(navigator.onLine?'on':'off')}
addEventListener('online',()=>{st.fallos=0;updPend();sync()});addEventListener('offline',updPend);setInterval(async()=>{if(await QueueDB.count())sync()},30000); /* sin red si la cola está vacía */
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){borrarPines();return}
 sync();
 if(st.ses&&st.ses.rol==='dueno'){if(!adm)admLoad();loadOwner()}
});
/* ---- Dueño ---- */
$('#thr').value=thr();$('#thr').onchange=e=>{localStorage.setItem('umbral',e.target.value);renderGrid()};
function paintStallTabs(puestos,sel){
 const t=$('#stall-tabs');t.innerHTML='';
 puestos.forEach(p=>{const b=document.createElement('button');b.type='button';b.className='blk'+(p===sel?' sel':'');b.textContent='Puesto '+p;
  b.onclick=()=>{if(st.ownerStall===p||adjBusy)return;st.ownerStall=p;paintStallTabs(puestos,p);$('#stock-list').innerHTML='<p class="msg">Cargando…</p>';loadOwner()};t.append(b)});
}
async function loadOwner(){if(!st.ses||st.ses.rol!=='dueno')return;const T=st.ses.token_dueno;const gen=++ownerGen;if(!adm)admLoad();
 try{const e=await API.estadoDueno(T);if(gen!==ownerGen)return;if(!e.ok){if(tokenMalo(e))return;throw new Error(e.error)}
 st.puestosDueno=e.puestos;st.ownerStall=e.puestos.includes(st.ownerStall)?st.ownerStall:e.puestos[0];
 paintStallTabs(e.puestos,st.ownerStall);
 const names=Object.fromEntries(e.productos.map(p=>[p[0],{nombre:p[1],activo:p[4]}])),L=$('#stock-list');L.innerHTML='';
 (e.stock[st.ownerStall]||[]).forEach(([producto,ini,vend,quedan])=>{const p=names[producto]||{nombre:producto},d=document.createElement('div');d.className='line';
  d.innerHTML=`<span class="nm"></span><button type="button" class="blk red">−</button><span class="n">${ini}</span><button type="button" class="blk green">+</button>`;
  d.querySelector('.nm').textContent=p.nombre+(p.activo===0?' (inactivo)':'')+' · vendidas '+vend+' · quedan '+quedan;const[m,pl]=d.querySelectorAll('button');
  m.onclick=()=>adj(producto,ini-1,d);pl.onclick=()=>adj(producto,ini+1,d);L.append(d)});
 const h=await API.ventasHoy(T);if(gen!==ownerGen)return;if(!h.ok)throw new Error(h.error);const tp={};(h.ventas||[]).forEach(([id,fh,ve,pu,pr,c])=>{const k=pu+'|'+pr;tp[k]=(tp[k]||0)-c});
 const nm=k=>(names[k]||{nombre:k}).nombre;
 $('#sales').innerHTML=`<table><tr><th>Hoy ${h.fecha}</th><th>Uds</th><th>€</th><th>Benef.</th></tr><tr><td>TOTAL</td><td class="n">${h.totales.unidades}</td><td class="n">${h.totales.importe}</td><td class="n">${h.totales.beneficio}</td></tr></table>`+
  '<table><tr><th>Puesto</th><th>Producto</th><th>Uds</th></tr>'+Object.entries(tp).filter(x=>x[1]).map(([k,u])=>{const[pu,pr]=k.split('|');return`<tr><td>${pu}</td><td>${nm(pr)}</td><td class="n">${u}</td></tr>`}).join('')+'</table>'+
  '<table><tr><th>Puesto · vendedor</th><th>Uds</th><th>€</th></tr>'+(h.por_vendedor||[]).map(x=>`<tr><td>${x.puesto} · ${x.vendedor}</td><td class="n">${x.unidades}</td><td class="n">${x.importe}</td></tr>`).join('')+'</table>';
}catch(e){if(gen!==ownerGen)return;$('#sales').innerHTML='<p class="msg">Sin conexión o error: '+(e&&e.message||e)+'</p>'}}
async function adj(producto,n,row){pop(n>0);if(n<0||adjBusy)return;adjBusy=true;
 if(row){const num=row.querySelector('.n');if(num)num.textContent=String(n);row.querySelectorAll('button').forEach(b=>b.disabled=true)}
 try{const r=await API.stockGuardar(st.ses.token_dueno,st.ownerStall,[{producto,cantidad_inicial:n}]);if(!r.ok){alert(r.error||'No se pudo guardar stock');await loadOwner();return}await loadOwner()}
 catch(e){alert('Sin conexión al guardar stock');await loadOwner()}finally{adjBusy=false}}
$('#refresh').onclick=()=>loadOwner();
/* ---- Puestos y PIN (solo dueño, solo en memoria) ---- */
async function verPines(){if(!st.ses||st.ses.rol!=='dueno')return;const r=await API.pinesVer(st.ses.token_dueno).catch(e=>({ok:false,error:'Sin conexión'}));
 if(!r.ok){if(tokenMalo(r))return;$('#pines').innerHTML='<p class="msg"></p>';$('#pines .msg').textContent=r.error;return}pines=r.pines;pintarPines()}
function pintarPines(){const P=$('#pines');P.innerHTML='';const con=new Set((pines||[]).map(x=>x.puesto));
 (st.puestosDueno||[]).filter(p=>!con.has(p)).forEach(p=>pines.push({puesto:p,vendedor:'',pin:''}));pines.sort((a,b)=>a.puesto.localeCompare(b.puesto));
 (pines||[]).forEach((x,i)=>{const d=document.createElement('div');d.className='line';
 d.innerHTML=`<span class="nm"></span><span class="pin"></span><button class="blk sm">Copiar</button><button class="blk sm blue">${x.pin?'Cambiar PIN':'Crear PIN'}</button>`;
 d.querySelector('.nm').textContent=`Puesto ${i+1} (${x.puesto}) · ${x.nombre||('vendedor '+x.vendedor)}${x.ejemplo?' · EJEMPLO':''}`;d.querySelector('.pin').textContent=x.pin||'— sin PIN guardado —';if(!x.pin)d.querySelector('button').hidden=true;
 const[cp,ch]=d.querySelectorAll('button');cp.onclick=async()=>{try{await navigator.clipboard.writeText(x.pin);cp.textContent='¡Copiado!'}catch(e){cp.textContent='No se pudo'}setTimeout(()=>cp.textContent='Copiar',1500)};
 ch.onclick=async()=>{if(!confirm('¿Generar un PIN nuevo de 6 cifras para '+x.vendedor+' ('+x.puesto+')? El anterior dejará de valer.'))return;
  const r=await API.pinCambiar(st.ses.token_dueno,x.puesto,x.vendedor||undefined).catch(()=>({ok:false,error:'Sin conexión'}));if(!r.ok)return alert(r.error);x.pin=r.pin;x.vendedor=r.vendedor;if(r.nombre)x.nombre=r.nombre;pintarPines()};P.append(d)})}
$('#pines-ver').onclick=verPines;
/* ---- Gestión (CRUD dueño, borrado lógico). Datos solo en memoria. ---- */
var adm=null,admTab='figuras';const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function admCall(accion,extra){const r=await API.admin(accion,st.ses.token_dueno,extra).catch(()=>({ok:false,error:'Sin conexión'}));if(!r.ok&&tokenMalo(r))throw 0;return r}
async function admLoad(){const r=await admCall('admin_listar',{});if(!r.ok){$('#adm').innerHTML='<p class="msg">'+esc(r.error)+'</p>';return}adm=r;admPaint()}
function form(titulo,campos,okTxt='Guardar'){return new Promise(res=>{const D=$('#dlg');
 if(D.open){try{D.close('no')}catch(e){}}
 $('#dlg-t').textContent=titulo;$('#dlg-m').textContent='';$('#dlg-ok').textContent=okTxt;
 $('#dlg-c').innerHTML=campos.map(c=>`<label>${esc(c.l)}</label>`+(c.op?`<select name="${c.n}">${c.op.map(o=>`<option value="${esc(o[0])}"${String(o[0])===String(c.v)?' selected':''}>${esc(o[1])}</option>`).join('')}</select>`:`<input name="${c.n}" type="${c.t||'text'}" value="${esc(c.v??'')}" ${c.t==='number'?'min="0" step="'+(c.s||1)+'"':''}${c.o?'':' required'}>`)).join('');
 let done=false;const finish=v=>{if(done)return;done=true;res(v)};
 D.onclose=()=>{if(D.returnValue!=='ok')return finish(null);finish(Object.fromEntries(new FormData($('#dlg-f'))))};
 D.returnValue='';
 try{D.showModal()}catch(e){alert('No se pudo abrir el formulario');finish(null)}})}
const pName=id=>(adm.puestos.find(p=>p.id===id)||{nombre:id}).nombre,actP=()=>adm.puestos.filter(p=>p.activo);
function fila(txt,act,del,btns){return`<div class="line${act?'':' del'}"><span class="nm">${txt}</span>${act?btns:'<span class="tag">BORRADO</span>'}</div>`}
function admPaint(){document.querySelectorAll('#adm-tabs .blk').forEach(b=>b.classList.toggle('sel',b.dataset.t===admTab));const A=$('#adm');let h='';
 if(admTab==='figuras'){h='<button class="blk green add" data-a="fig-new">+ Nueva figura</button>'+adm.figuras.map(f=>fila(`<span class="sw" style="--ic:${esc(f.color_icono)};display:inline-block;vertical-align:middle"></span> ${esc(f.nombre)} · ${f.precio} €`,f.activo,0,
  `<button class="blk sm" data-a="fig-ed" data-id="${f.id}">Editar</button><button class="blk sm red" data-a="fig-del" data-id="${f.id}">Borrar</button>`)).join('')}
 if(admTab==='puestos'){h='<button class="blk green add plus" data-a="pue-alta" aria-label="Añadir puesto" title="Añadir puesto">+</button>'+adm.puestos.map(p=>fila(`${esc(p.nombre)} <span class="tag">${p.id}</span> · ${adm.vendedores.filter(v=>v.activo&&v.puesto===p.id).length} vend.`,p.activo,0,
  `<button class="blk sm" data-a="pue-ed" data-id="${p.id}">Editar</button><button class="blk sm red" data-a="pue-del" data-id="${p.id}">Borrar</button>`)).join('')}
 if(admTab==='vendedores'){h='<button class="blk green add" data-a="ven-new">+ Nuevo vendedor</button>'+adm.vendedores.map(v=>fila(`${esc(v.nombre)} <span class="tag">${v.id}</span> · ${esc(pName(v.puesto))}`,v.activo,0,
  `<button class="blk sm" data-a="ven-ed" data-id="${v.id}">Editar</button><button class="blk sm blue" data-a="ven-mov" data-id="${v.id}">Mover</button><button class="blk sm red" data-a="ven-del" data-id="${v.id}">Borrar</button>`)).join('')}
 if(admTab==='stock'){h='<p class="hint2">Pasa unidades del stock inicial de un puesto a otro (no puede superar lo que queda).</p><button class="blk blue add" data-a="stk-mov">Mover stock entre puestos</button>'}
 A.innerHTML=h}
document.getElementById('adm-tabs').onclick=e=>{const t=e.target.dataset.t;if(!t)return;admTab=t;adm?admPaint():admLoad()};
document.getElementById('adm').onclick=async e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,id=b.dataset.id;let r,v;try{
 if(!adm){await admLoad();if(!adm)return alert('No se pudo cargar la gestión')}
 const fig=adm.figuras.find(x=>x.id===id),pu=adm.puestos.find(x=>x.id===id),ve=adm.vendedores.find(x=>x.id===id),PO=actP().map(p=>[p.id,p.nombre]);
 if(a==='fig-new'||a==='fig-ed'){v=await form(fig?'Editar figura':'Nueva figura',[{l:'Nombre',n:'nombre',v:fig?.nombre},{l:'Precio (€)',n:'precio',t:'number',s:'0.01',v:fig?.precio??''},{l:'Coste (€)',n:'coste',t:'number',s:'0.01',v:fig?.coste??0},{l:'Color',n:'color_icono',t:'color',v:fig?.color_icono||'#7a9cc6'},{l:'Foto (enlace Drive, opcional)',n:'foto_url',t:'url',o:1,v:fig?.foto_url||''}]);
  if(v){if(!v.foto_url)delete v.foto_url;r=await admCall('figura_guardar',{figura:{...(fig?{id:fig.id}:{}),...v}})}}
 if(a==='pue-alta'){const N=1+Math.max(0,...adm.puestos.map(p=>+p.id.slice(1)||0));r=await admCall('puesto_guardar',{puesto:{nombre:'Puesto '+N}});if(!r.ok)return alert('Error: '+r.error);const np=r.puesto;
  r=await admCall('vendedor_guardar',{vendedor:{nombre:'Vendedor '+np.nombre,puesto:np.id}});if(!r.ok){await admLoad();return alert('Puesto creado, pero falta el vendedor: '+r.error)}const nv=r.vendedor;let pin=r.pin;r=null;await admLoad();loadOwner();await verPines();
  for(;;){const pr=form('Editar '+np.id,[{l:'Nombre del puesto',n:'nombre',v:np.nombre},{l:'PIN',n:'pin_acc',op:[['','Mantener PIN'],['cambiar','Generar PIN nuevo']]}]);$('#dlg-m').textContent='PIN de '+nv.nombre+': '+pin+' (no se guarda en el dispositivo)';v=await pr;if(!v)break;
   if(v.nombre!==np.nombre){const q=await admCall('puesto_guardar',{puesto:{id:np.id,nombre:v.nombre}});if(!q.ok){alert('Error: '+q.error);break}np.nombre=v.nombre}
   if(v.pin_acc!=='cambiar')break;const q=await admCall('pin_crear_o_cambiar',{puesto:np.id,vendedor_id:nv.id});if(!q.ok){alert('Error: '+q.error);break}pin=q.pin;await verPines()}
  pin=null;r={ok:true}}
 if(a==='pue-new'||a==='pue-ed'){v=await form(pu?'Editar puesto':'Nuevo puesto',[{l:'Nombre',n:'nombre',v:pu?.nombre}]);if(v)r=await admCall('puesto_guardar',{puesto:{...(pu?{id:pu.id}:{}),...v}})}
 if(a==='ven-new'||a==='ven-ed'){v=await form(ve?'Editar vendedor':'Nuevo vendedor',[{l:'Nombre',n:'nombre',v:ve?.nombre},{l:'Email',n:'email',t:'email',o:1,v:ve?.email||''},{l:'Puesto',n:'puesto',op:PO,v:ve?.puesto},{l:'PIN',n:'pin_acc',op:[['','Mantener PIN'],['cambiar','Generar PIN nuevo']]}]);
  if(v){const pinAcc=v.pin_acc;delete v.pin_acc;r=await admCall('vendedor_guardar',{vendedor:{...(ve?{id:ve.id}:{}),...v}});if(r.ok&&r.pin)alert('PIN del nuevo vendedor (apúntalo, no se guarda aquí): '+r.pin);if(r&&r.ok&&pinAcc==='cambiar'&&ve){const q=await admCall('pin_crear_o_cambiar',{puesto:v.puesto||ve.puesto,vendedor_id:ve.id});if(!q.ok)alert('Error PIN: '+q.error);else{alert('PIN nuevo: '+q.pin);await verPines()}}}}
 if(a==='ven-mov'){v=await form('Mover a '+ve.nombre,[{l:'Puesto destino',n:'puesto_destino',op:PO.filter(p=>p[0]!==ve.puesto)}],'Mover');if(v)r=await admCall('vendedor_mover',{vendedor_id:ve.id,...v})}
 if(a==='stk-mov'){const pr=adm.figuras.filter(f=>f.activo).map(f=>[f.id,f.nombre]);v=await form('Mover stock',[{l:'Figura',n:'producto',op:pr},{l:'Desde',n:'desde',op:PO},{l:'Hasta',n:'hasta',op:PO,v:PO[1]?.[0]},{l:'Cantidad',n:'cantidad',t:'number',v:1}],'Mover');
  if(v){r=await admCall('stock_mover',{...v,cantidad:+v.cantidad});if(r.ok)alert('Movido. Quedan en origen: '+r.desde.find(s=>s.producto===v.producto).quedan)}}
 if(a.endsWith('-del')){const x=fig||pu||ve;if(!confirm('¿Borrar «'+x.nombre+'»? Se marcará como borrado (no se pierde el historial).'))return;
  r=await admCall({fig:'figura_borrar',pue:'puesto_borrar',ven:'vendedor_borrar'}[a.slice(0,3)],{id})}
 if(r&&!r.ok)return alert('Error: '+r.error);if(r){await admLoad();loadOwner()}}catch(err){if(err!==0)alert('Error: '+(err&&err.message||err))}};
/* ---- Conectar mi hoja (v8): guarda la URL /exec en localStorage 'api_url' (la misma que ?api) ---- */
const EXEC=/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,}\/exec\/?$/,DEV=/^http:\/\/(127\.0\.0\.1|localhost):\d+\/exec$/;
const COMO='Necesito la URL de la aplicación web, no la de la hoja. En tu hoja: Extensiones › Apps Script › Implementar › Nueva implementación › tipo «Aplicación web» (ejecutar como: yo; acceso: cualquiera) › Implementar › copia la URL que termina en /exec.';
function hojaPaint(){const u=localStorage.getItem('api_url');const on=u&&u!=='mock';$('#hoja-est').textContent=on?'Conectado a: '+(localStorage.getItem('api_hoja')||u):'Modo DEMO (datos de EJEMPLO). Pega la URL /exec de tu Apps Script.';$('#hoja-off').hidden=!on;if(on)$('#hoja-url').value=u}
function hojaMsg(t,ok){const m=$('#hoja-msg');m.hidden=!t;m.textContent=t||'';m.classList.toggle('okm',!!ok)}
async function hojaCambio(){await new Promise(r=>setTimeout(r,1800));borrarPines();saveSes(null);show('login');loadPuestos()}
$('#hoja-ok').onclick=async()=>{const u=$('#hoja-url').value.trim();
 if(/docs\.google\.com\/spreadsheets/.test(u))return hojaMsg('Eso es la URL de la hoja de cálculo. '+COMO);
 if(!EXEC.test(u)&&!DEV.test(u))return hojaMsg('URL no válida. '+COMO);
 if(await QueueDB.count())return hojaMsg('Hay ventas pendientes de enviar. Sincroniza antes de cambiar de hoja.');
 hojaMsg('Probando conexión…');let r;try{r=await API.ping(u)}catch(e){r={ok:false,error:e.message||'Sin respuesta'}}
 if(r&&r.ok&&r.app!=='miniaturas')return hojaMsg('Esa URL responde, pero no es la app de Miniaturas (app≠miniaturas). Implementa el Code.gs de Miniaturas en tu hoja. '+COMO);
 if(!r||!r.ok)return hojaMsg('No se pudo conectar ('+((r&&(r.mensaje||r.error))||'respuesta no válida')+'). Revisa que la implementación tenga acceso «Cualquiera». '+COMO);
 localStorage.setItem('api_url',u);localStorage.setItem('api_hoja',r.hoja||'');hojaPaint();hojaMsg('Conectado a: '+(r.hoja||'?')+(r.version?' (v '+r.version+')':'')+'. Entra con el PIN de dueño de esa hoja.',1);hojaCambio()};
$('#hoja-off').onclick=async()=>{if(!confirm('¿Desconectar la hoja y volver a la DEMO?'))return;localStorage.removeItem('api_url');localStorage.removeItem('api_hoja');$('#hoja-url').value='';hojaPaint();hojaMsg('Desconectado. Vuelves al modo DEMO.',1);hojaCambio()};
hojaPaint();
renderPin();updPend();loadPuestos();QueueDB.get('ses').then(ses=>{if(ses){st.ses=ses;start()}else show('login')});
if('serviceWorker'in navigator){const had=!!navigator.serviceWorker.controller;navigator.serviceWorker.register('sw.js?v=10',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!had||sessionStorage.getItem('sw_reload')==='10')return;sessionStorage.setItem('sw_reload','10');location.reload()})}
