const CACHE='fuji-shopper-shell-__SHELL_VERSION__';
const PRECACHE=/*PRECACHE*/['./','./index.html','./app.js?v=chat1','./style.css','./design.css?v=camera2','./chat.css?v=chat1','./lib/chat/client.js?v=chat1','./lib/chat/worker.js?v=chat1','./lib/chat/engine.js','./lib/chat/normalize.js','./lib/chat/history.js','./lib/chat/templates.js','./chat-data/catalog.json','./chat-data/aliases.json','./lib/art.js','./fonts/inter-latin.woff2','./fonts/inter-latin-ext.woff2','./i18n.js','./lib/core.js','./lib/catalog.js','./lib/storage.js','./lib/icons.js','./lib/scanner.js?v=camera2','./lib/account.js','./account-config.json','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fuji-shopper-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname)||url.pathname.includes('/catalog/')||url.pathname.endsWith('account-config.json')||url.pathname.includes('staff'))return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match(new URL('./index.html',self.registration.scope))));return;}
 event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(c=>c.put(event.request,clone));}return response;})));
});
