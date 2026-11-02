const V='miniaturas-v38',SHELL=['./','index.html','style.css?v=38','app.js?v=38','api.js?v=38','db.js?v=38','manifest.json','fonts/px.woff2?v=38','icons/icon.svg','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>{const old=k.filter(x=>x!==V&&x.startsWith('miniaturas-'));return Promise.all(old.map(x=>caches.delete(x))).then(()=>self.clients.claim()).then(()=>old.length&&self.clients.matchAll({type:'window'}).then(cs=>cs.forEach(c=>c.navigate(c.url).catch(()=>{}))))})));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put('index.html',c));return r}).catch(()=>caches.match('index.html')));return}
 e.respondWith(caches.match(e.request,{ignoreSearch:u.pathname.endsWith('/')||u.pathname.endsWith('index.html')}).then(r=>r||fetch(e.request)))});
