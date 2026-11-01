/* Capa de API según el contrato real (/workspace/ferias/README.md, Code.gs).
   Transporte intercambiable: 'mock' (en el navegador, DATOS DE EJEMPLO) o 'http' (Apps Script /exec).
   Configurar: ?api=https://script.google.com/macros/s/XXX/exec  ·  volver al mock: ?api=mock */
const API=(()=>{
 const qs=new URLSearchParams(location.search);if(qs.get('api'))localStorage.setItem('api_url',qs.get('api'));
 const url=()=>{const u=localStorage.getItem('api_url');return u&&u!=='mock'?u:null};
  /* ---------- transporte HTTP real ---------- */
 const http=async(req,u)=>{const r=await fetch(u||url(),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(req),redirect:'follow',cache:'no-store'});
  if(!r.ok)throw Object.assign(new Error('HTTP '+r.status),{red:true});return r.json()};
 /* ---------- transporte MOCK: emula doPost de Code.gs en localStorage ---------- */
 const K='miniaturas_mock_v7';
 const nid=(arr,pre,w)=>pre+String(1+Math.max(0,...arr.map(x=>+String(x.id).slice(pre.length)||0))).padStart(w,'0');
 /* Clean demo base: no puestos (user recreates P1/P2); 4 products only; dueño 999999. */
 const SEED={puestosT:[],vendedores:[],dueno_pin:'999999',
  productos:[['F01','Dragón EJEMPLO',15,4.2,'#c8706a'],['F02','Caballero EJEMPLO',12,3,'#6f8fc4'],['F03','Castillo EJEMPLO',25,8,'#9c8574'],['F04','Robot EJEMPLO',10,2.5,'#8a9099']]
   .map(([id,nombre,precio,coste,color_icono])=>({id,nombre,precio,coste,color_icono,foto_url:'',activo:1})),
  stock:{},ventas:[],asignaciones:[]};
 const load=()=>JSON.parse(localStorage.getItem(K)||'null')||JSON.parse(JSON.stringify(SEED)),save=d=>localStorage.setItem(K,JSON.stringify(d));
 const tok=o=>btoa(JSON.stringify({...o,exp:Date.now()+14*3600e3}))+'.mock',untok=(t,rol)=>{if(!t||!String(t).endsWith('.mock'))throw'TOKEN_INVALIDO';
  const d=JSON.parse(atob(t.split('.')[0]));if(Date.now()>d.exp)throw'TOKEN_CADUCADO';if(rol&&d.rol!==rol)throw'SIN_PERMISO';return d};
 const stockDe=(d,p)=>Object.entries(d.stock[p]||{}).map(([producto,ini])=>{const v=d.ventas.filter(r=>r.puesto===p&&r.producto===producto).reduce((a,r)=>a-r.cantidad,0);return{producto,cantidad_inicial:ini,vendidas:v,quedan:ini-v}});
 const UUID4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const A={
  puestos(q,d){const pins={};d.vendedores.filter(v=>v.activo&&v.pin).forEach(v=>{pins[v.puesto]=v.pin});
   return{puestos:d.puestosT.filter(p=>p.activo).map(p=>p.id).sort(),demo_pins:pins}},
  demo_limpiar(q,d){untok(q.token_dueno,'dueno');d.puestosT.forEach(p=>p.activo=0);d.vendedores.forEach(v=>v.activo=false);
   d.productos.forEach(p=>{if(!['F01','F02','F03','F04'].includes(p.id))p.activo=0});d.stock={};d.asignaciones=[];
   return{ok_limpiar:true,puestos_activos:0,vendedores_activos:0,figuras_activas:d.productos.filter(p=>p.activo).length}},
  /* ---- CRUD del dueño (PROPUESTA: aún no está en Code.gs; ver bitacora.md) · borrado lógico ---- */
  /* ping: comprobar conexión (sin token). En Code.gs: {ok:true,hoja:getName(),version} */
  ping(q,d){return{app:'miniaturas',hoja:'Hoja EJEMPLO (demo)',version:'demo-v8'}},
  admin_listar(q,d){untok(q.token_dueno,'dueno');return{figuras:d.productos,puestos:d.puestosT,vendedores:d.vendedores.map(({pin,...v})=>({...v,activo:v.activo?1:0})),no_store:true}},
  figura_guardar(q,d){untok(q.token_dueno,'dueno');const f=q.figura||{};if(!f.nombre||!(Number(f.precio)>=0))throw'FALTAN_DATOS';
   let x=f.id&&d.productos.find(p=>p.id===f.id);if(f.id&&!x)throw'PRODUCTO_DESCONOCIDO';
   if(!x){x={id:nid(d.productos,'F',2),activo:1};d.productos.push(x)}
   Object.assign(x,{nombre:String(f.nombre).slice(0,60),precio:+f.precio,coste:+(f.coste||0),color_icono:/^#[0-9a-f]{6}$/i.test(f.color_icono)?f.color_icono:'#999999',foto_url:f.foto_url||''});return{figura:x}},
  figura_borrar(q,d){untok(q.token_dueno,'dueno');const x=d.productos.find(p=>p.id===q.id);if(!x)throw'PRODUCTO_DESCONOCIDO';x.activo=0;return{id:x.id,activo:0}},
  puesto_guardar(q,d){untok(q.token_dueno,'dueno');const p=q.puesto||{};if(!p.nombre)throw'FALTAN_DATOS';let x=p.id&&d.puestosT.find(y=>y.id===p.id);
   if(p.id&&!x)throw'PUESTO_INVALIDO';if(!x){if(d.puestosT.filter(y=>y.activo).length>=3)throw'DEMO_MAX_PUESTOS';x={id:nid(d.puestosT,'P',1),activo:1};d.puestosT.push(x);d.stock[x.id]={}}x.nombre=String(p.nombre).slice(0,40);return{puesto:x}},
  puesto_borrar(q,d){untok(q.token_dueno,'dueno');const x=d.puestosT.find(y=>y.id===q.id);if(!x)throw'PUESTO_INVALIDO';
   const vendOff=d.vendedores.filter(v=>v.activo&&v.puesto===x.id);vendOff.forEach(v=>{v.activo=false});x.activo=0;return{id:x.id,activo:0,vendedores_borrados:vendOff.map(v=>v.id)}},
  vendedor_guardar(q,d){untok(q.token_dueno,'dueno');const v=q.vendedor||{};if(!v.nombre||!v.puesto)throw'FALTAN_DATOS';
   if(!d.puestosT.some(p=>p.id===v.puesto&&p.activo))throw'PUESTO_INVALIDO';let x=v.id&&d.vendedores.find(y=>y.id===v.id),pin,prev;if(v.id&&!x)throw'VENDEDOR_DESCONOCIDO';
   if(!x){if(d.vendedores.filter(y=>y.activo).length>=3)throw'DEMO_MAX_VENDEDORES';x={id:nid(d.vendedores,'V',2),activo:true};do pin=String(crypto.getRandomValues(new Uint32Array(1))[0]%1e6).padStart(6,'0');while(d.vendedores.some(y=>y.pin===pin));x.pin=pin;d.vendedores.push(x)}
   else prev=x.puesto;x.nombre=String(v.nombre).slice(0,60);x.puesto=v.puesto;d.asignaciones=d.asignaciones||[];
   if(!prev||prev!==v.puesto)d.asignaciones.push({id:crypto.randomUUID(),fecha_hora:API.ahoraMadrid(),vendedor:x.id,puesto:v.puesto,origen:prev?'editar':'alta'});
   const{pin:_,...out}=x;return pin?{vendedor:out,pin,no_store:true}:{vendedor:out}},
  vendedor_borrar(q,d){untok(q.token_dueno,'dueno');const x=d.vendedores.find(y=>y.id===q.id);if(!x)throw'VENDEDOR_DESCONOCIDO';x.activo=false;return{id:x.id,activo:0}},
  vendedor_mover(q,d){untok(q.token_dueno,'dueno');const x=d.vendedores.find(y=>y.id===q.vendedor_id&&y.activo);if(!x)throw'VENDEDOR_DESCONOCIDO';
   if(!d.puestosT.some(p=>p.id===q.puesto_destino&&p.activo))throw'PUESTO_INVALIDO';x.puesto=q.puesto_destino;d.asignaciones=d.asignaciones||[];
   d.asignaciones.push({id:crypto.randomUUID(),fecha_hora:API.ahoraMadrid(),vendedor:x.id,puesto:x.puesto,origen:'mover'});return{vendedor_id:x.id,puesto:x.puesto}},
  stock_mover(q,d){untok(q.token_dueno,'dueno');const n=Number(q.cantidad);if(!(n>0)||Math.floor(n)!==n)throw'CANTIDAD_INVALIDA';
   if(q.desde===q.hasta||![q.desde,q.hasta].every(id=>d.puestosT.some(p=>p.id===id&&p.activo)))throw'PUESTO_INVALIDO';if(!d.productos.some(p=>p.id===q.producto))throw'PRODUCTO_DESCONOCIDO';
   const s=stockDe(d,q.desde).find(x=>x.producto===q.producto);if(!s||s.quedan<n)throw'STOCK_INSUFICIENTE';
   d.stock[q.desde][q.producto]-=n;d.stock[q.hasta]=d.stock[q.hasta]||{};d.stock[q.hasta][q.producto]=(d.stock[q.hasta][q.producto]||0)+n;return{desde:stockDe(d,q.desde),hasta:stockDe(d,q.hasta)}},
  estado_dueno(q,d){untok(q.token_dueno,'dueno');return{productos:d.productos.map(p=>[p.id,p.nombre,p.precio,p.coste,p.activo]),puestos:A.puestos(q,d).puestos,
   stock:Object.fromEntries(A.puestos(q,d).puestos.map(pu=>[pu,stockDe(d,pu).map(s=>[s.producto,s.cantidad_inicial,s.vendidas,s.quedan])]))}},
  /* pines_ver / pin_crear_o_cambiar como en Code.gs: el servidor genera el PIN nuevo */
  pines_ver(q,d){untok(q.token_dueno,'dueno');return{pines:d.vendedores.filter(v=>v.activo).sort((a,b)=>a.puesto.localeCompare(b.puesto)).map(v=>({puesto:v.puesto,vendedor:v.id,nombre:v.nombre,pin:v.pin,ejemplo:true})),no_store:true}},
  pin_crear_o_cambiar(q,d){untok(q.token_dueno,'dueno');const c=q.vendedor_id?d.vendedores.filter(v=>v.activo&&v.id===q.vendedor_id):d.vendedores.filter(v=>v.activo&&v.puesto===q.puesto);
   if(!q.vendedor_id&&!q.puesto)throw'FALTAN_DATOS';if(!c.length)throw q.vendedor_id?'VENDEDOR_DESCONOCIDO':'PUESTO_INVALIDO';if(c.length>1&&!q.vendedor_id)throw'VARIOS_VENDEDORES';
   let pin;do pin=String(crypto.getRandomValues(new Uint32Array(1))[0]%1e6).padStart(6,'0');while(d.vendedores.some(v=>v.pin===pin));
   c[0].pin=pin;return{puesto:c[0].puesto,vendedor:c[0].id,nombre:c[0].nombre,pin,ejemplo:true,no_store:true}},
  login(q,d){if(!q.dispositivo)throw'FALTAN_DATOS';if(!/^\d{6}$/.test(String(q.pin)))throw'PIN_FORMATO';if(q.dueno){if(q.pin!==d.dueno_pin)throw'PIN_INCORRECTO';return{rol:'dueno',token_dueno:tok({rol:'dueno'})}}
   if(!q.puesto)throw'FALTAN_DATOS';if(!d.puestosT.some(p=>p.id===q.puesto&&p.activo))throw'PUESTO_INVALIDO';
   const matches=d.vendedores.filter(v=>v.activo&&v.pin===String(q.pin)&&(!q.vendedor_id||v.id===q.vendedor_id));
   if(!matches.length)throw'PIN_INCORRECTO';if(matches.length>1)throw'VARIOS_VENDEDORES';const v=matches[0];
   v.puesto=q.puesto;d.asignaciones=d.asignaciones||[];d.asignaciones.push({id:crypto.randomUUID(),fecha_hora:API.ahoraMadrid(),vendedor:v.id,puesto:q.puesto,origen:'login'});
   return{rol:'vendedor',vendedor:{id:v.id,nombre:v.nombre,puesto:q.puesto},token:tok({rol:'vendedor',vid:v.id,p:q.puesto})}},
  control_dueno(q,d){untok(q.token_dueno,'dueno');const hoy=q.fecha||API.hoyMadrid();const hoyV=d.ventas.filter(r=>String(r.fecha_hora).slice(0,10)===hoy);
   const st=(vid,lista)=>{let vendidas=0,deshechas=0;lista.forEach(r=>{if(r.vendedor!==vid)return;if(+r.cantidad===-1)vendidas++;else if(+r.cantidad===1)deshechas++});return{vendidas,deshechas,neto:vendidas-deshechas}};
   const agg=(lista,key)=>{const m={};lista.forEach(r=>{const c=+r.cantidad;if(c!==-1&&c!==1)return;const k=key(r);m[k]=m[k]||{key:k,vendidas:0,deshechas:0,importe:0};if(c===-1){m[k].vendidas++;m[k].importe+=r.importe}else{m[k].deshechas++;m[k].importe+=r.importe}});
    return Object.values(m).map(x=>({...x,neto:x.vendidas-x.deshechas})).sort((a,b)=>b.neto-a.neto)};
   const pNames=Object.fromEntries(d.puestosT.map(p=>[p.id,p.nombre]));
   return{fecha:hoy,en_vivo:{por_puesto:agg(hoyV,r=>r.puesto).map(x=>({puesto:x.key,nombre:pNames[x.key]||x.key,vendidas:x.vendidas,deshechas:x.deshechas,neto:x.neto,importe:Math.round(x.importe*100)/100})),
    por_vendedor:agg(hoyV,r=>r.vendedor).map(x=>{const ve=d.vendedores.find(v=>v.id===x.key);return{vendedor:x.key,nombre:ve?ve.nombre:x.key,puesto_activo:ve?ve.puesto:'',vendidas:x.vendidas,deshechas:x.deshechas,neto:x.neto,importe:Math.round(x.importe*100)/100}}),
    totales:{vendidas:hoyV.filter(r=>+r.cantidad===-1).length,deshechas:hoyV.filter(r=>+r.cantidad===1).length}},
    vendedores:d.vendedores.filter(v=>v.activo).map(v=>{const hist=(d.asignaciones||[]).filter(a=>a.vendedor===v.id);const seen={};const puestos=[];hist.forEach(a=>{if(!seen[a.puesto]){seen[a.puesto]={puesto:a.puesto,nombre:pNames[a.puesto]||a.puesto,veces:0,ultimo:a.fecha_hora};puestos.push(seen[a.puesto])}seen[a.puesto].veces++;seen[a.puesto].ultimo=a.fecha_hora});
     if(!puestos.length&&v.puesto)puestos.push({puesto:v.puesto,nombre:pNames[v.puesto]||v.puesto,veces:0,ultimo:''});
     return{id:v.id,nombre:v.nombre,puesto_activo:v.puesto,historial_puestos:puestos,asignaciones:hist.slice(-20).reverse(),hoy:st(v.id,hoyV),total:st(v.id,d.ventas)}}),no_store:true}},
  catalogo(q,d){let pu;if(q.token_dueno){untok(q.token_dueno,'dueno');pu=q.puesto;if(!pu)throw'PUESTO_INVALIDO'}else pu=untok(q.token,'vendedor').p;return{puesto:pu,productos:d.productos.filter(p=>p.activo).map(({activo,...p})=>p),stock:stockDe(d,pu)}},
  ventas_lote(q,d){const t=untok(q.token,'vendedor');if(!Array.isArray(q.ventas)||q.ventas.length>200)throw'LOTE_INVALIDO';
   const precios=Object.fromEntries(d.productos.map(p=>[p.id,p.precio])),vistos=new Set(d.ventas.map(r=>r.id)),aceptadas=[],duplicadas=[],rechazadas=[],marcadas=[];
   for(const v of q.ventas){const id=String(v&&v.id||'');if(!UUID4.test(id)){rechazadas.push({id,motivo:'ID_INVALIDO'});continue}if(vistos.has(id)){duplicadas.push(id);continue}
    const c=Number(v.cantidad);if(c!==-1&&c!==1){rechazadas.push({id,motivo:'CANTIDAD_INVALIDA'});continue}if(!(v.producto in precios)){rechazadas.push({id,motivo:'PRODUCTO_DESCONOCIDO'});continue}
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v.fecha_hora||'')){rechazadas.push({id,motivo:'FECHA_INVALIDA'});continue}
    if(c===1){const jTipo=String(v.justificacion_tipo||''),jDet=String(v.justificacion||'').trim();
     if(jTipo!=='devolucion'&&jTipo!=='error'){rechazadas.push({id,motivo:'JUSTIFICACION_REQUERIDA'});continue}
     if(jDet.length<3){rechazadas.push({id,motivo:'JUSTIFICACION_REQUERIDA'});continue}
     if(v.ref){const o=d.ventas.find(r=>r.id===v.ref);
      if(!o||o.cantidad!==-1||o.puesto!==t.p||o.producto!==v.producto){rechazadas.push({id,motivo:'REF_INVALIDA'});continue}
      if(d.ventas.some(r=>r.ref_id===v.ref)){rechazadas.push({id,motivo:'REF_YA_DESHECHA'});continue}}}
    if(!d.productos.find(p=>p.id===v.producto).activo)marcadas.push({id,motivo:'PRODUCTO_INACTIVO'});
    vistos.add(id);aceptadas.push(id);d.ventas.push({id,fecha_hora:v.fecha_hora,vendedor:t.vid,puesto:t.p,producto:v.producto,cantidad:c,importe:-c*precios[v.producto],ref_id:c===1?(v.ref||''):'',justificacion_tipo:c===1?v.justificacion_tipo:'',justificacion:c===1?String(v.justificacion||'').trim().slice(0,200):''})}
   return{aceptadas,duplicadas,rechazadas,marcadas,stock:stockDe(d,t.p)}},
  stock_inicial_guardar(q,d){untok(q.token_dueno,'dueno');if(!q.puesto||!Array.isArray(q.items))throw'FALTAN_DATOS';d.stock[q.puesto]=d.stock[q.puesto]||{};
   for(const it of q.items){const n=Number(it.cantidad_inicial);if(!(n>=0)||Math.floor(n)!==n)throw'CANTIDAD_INVALIDA';d.stock[q.puesto][it.producto]=n}return{guardados:q.items.length,stock:stockDe(d,q.puesto)}},
  ventas_hoy(q,d){untok(q.token_dueno,'dueno');const hoy=q.fecha||API.hoyMadrid(),coste=Object.fromEntries(d.productos.map(p=>[p.id,p.coste]));
   const lista=d.ventas.filter(r=>r.fecha_hora.slice(0,10)===hoy),tot={importe:0,unidades:0,beneficio:0},por={};
   lista.forEach(r=>{const k=r.puesto+'|'+r.vendedor;por[k]=por[k]||{puesto:r.puesto,vendedor:r.vendedor,importe:0,unidades:0};por[k].importe+=r.importe;por[k].unidades-=r.cantidad;
    tot.importe+=r.importe;tot.unidades-=r.cantidad;tot.beneficio+=r.importe+r.cantidad*(coste[r.producto]||0)});tot.beneficio=Math.round(tot.beneficio*100)/100;
   return{fecha:hoy,totales:tot,por_vendedor:Object.values(por),ventas:lista.map(r=>[r.id,r.fecha_hora,r.vendedor,r.puesto,r.producto,r.cantidad,r.importe,r.ref_id||''])}}};
 const mock=async req=>{await new Promise(r=>setTimeout(r,120));if(!navigator.onLine)throw Object.assign(new Error('offline'),{red:true});
  const d=load();try{const f=A[req.accion];if(!f)throw'ACCION_DESCONOCIDA';const r=f(req,d);save(d);return{ok:true,...r}}catch(c){return{ok:false,error:typeof c==='string'?c:'ERROR_INTERNO',mensaje:String(c)}}};
 const call=req=>(url()?http:mock)(req);
 const dev=()=>{let d=localStorage.getItem('dispositivo');if(!d){d='web-'+crypto.randomUUID().slice(0,8);localStorage.setItem('dispositivo',d)}return d};
 return{get backend(){return url()?'apps-script':'mock'},call,
  puestos:()=>call({accion:'puestos'}),
  ping:u=>u?http({accion:'ping'},u):mock({accion:'ping'}),
  admin:(accion,token_dueno,extra)=>call({accion,token_dueno,...extra}),
  pinesVer:token_dueno=>call({accion:'pines_ver',token_dueno}),
  pinCambiar:(token_dueno,puesto,vendedor_id)=>call({accion:'pin_crear_o_cambiar',token_dueno,puesto,vendedor_id}),estadoDueno:token_dueno=>call({accion:'estado_dueno',token_dueno}),
  controlDueno:(token_dueno,fecha)=>call({accion:'control_dueno',token_dueno,...(fecha?{fecha}:{})}),
  login:(pin,puesto)=>call(puesto==='dueno'?{accion:'login',dueno:true,pin,dispositivo:dev()}:{accion:'login',puesto,pin,dispositivo:dev()}),
  catalogo:(token,puesto)=>call(puesto?{accion:'catalogo',token_dueno:token,puesto}:{accion:'catalogo',token}),
  ventasLote:(token,ventas)=>call({accion:'ventas_lote',token,ventas}),
  stockGuardar:(token_dueno,puesto,items)=>call({accion:'stock_inicial_guardar',token_dueno,puesto,items}),
  ventasHoy:(token_dueno,fecha)=>call({accion:'ventas_hoy',token_dueno,...(fecha?{fecha}:{})}),
  hoyMadrid:()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date()),
  ahoraMadrid:()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date()).replace(' ','T'),
  driveImg:u=>{if(!u)return'';const m=u.match(/\/d\/([\w-]{10,})|[?&]id=([\w-]{10,})/);return m?`https://drive.google.com/thumbnail?id=${m[1]||m[2]}&sz=w120`:u},
  _debug:()=>load()}})();
