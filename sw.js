const CACHE_NAME='xy-story-v3-20261111';
const CORE=['./','./index.html','./assets/style.css','./assets/app.js','./assets/music-birthday.css','./assets/music-birthday.js','./gallery-data.js','./music-data.js','./manifest.webmanifest'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME&&k.startsWith('xy-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 // Range requests from HTML audio must go to network; otherwise seeking can break.
 if(event.request.headers.has('range'))return;
 const isMedia=/\.(?:jpg|jpeg|png|webp|gif|avif|mp3|ogg|wav|m4a)$/i.test(url.pathname);
 if(isMedia){
   event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
     if(response.ok && response.status===200){const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,copy)).catch(()=>{});}
     return response;
   })));
 }else{
   event.respondWith(fetch(event.request).then(response=>{
     if(response.ok && response.status===200){const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,copy)).catch(()=>{});}
     return response;
   }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
 }
});
