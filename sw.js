const CACHE_NAME = 'xy-story-v2-20261101';
const CORE = ['./','./index.html','./assets/style.css','./assets/app.js','./gallery-data.js','./manifest.webmanifest'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME&&k.startsWith('xy-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const u=new URL(event.request.url);
  if(u.origin!==self.location.origin)return;
  const isImage=/\.(?:jpg|jpeg|png|webp|gif|avif)$/i.test(u.pathname);
  if(isImage){
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      if(response.ok){const clone=response.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,clone)).catch(()=>{});}
      return response;
    })));
  } else {
    event.respondWith(fetch(event.request).then(response=>{
      if(response.ok){const clone=response.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,clone)).catch(()=>{});}
      return response;
    }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
  }
});
