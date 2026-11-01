/* IndexedDB: cola_ventas (cola offline, sale solo con ACK) + kv (sesión, catálogo, stock). */
const QueueDB=(()=>{const N='miniaturas',S='cola_ventas';let p;
 const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open(N,2);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(S))d.createObjectStore(S,{keyPath:'id'});if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
 const tx=async(st,m,f)=>{const d=await open();return new Promise((res,rej)=>{const t=d.transaction(st,m),o=f(t.objectStore(st));t.oncomplete=()=>res(o&&o.result);t.onerror=()=>rej(t.error)})};
 return{add:e=>tx(S,'readwrite',s=>s.put(e)),all:()=>tx(S,'readonly',s=>s.getAll()),remove:ids=>tx(S,'readwrite',s=>{ids.forEach(i=>s.delete(i))}),count:()=>tx(S,'readonly',s=>s.count()),
  get:k=>tx('kv','readonly',s=>s.get(k)),set:(k,v)=>tx('kv','readwrite',s=>v==null?s.delete(k):s.put(v,k))}})();
