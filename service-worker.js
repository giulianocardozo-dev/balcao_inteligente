const CACHE\_NAME = 'balcao-inteligente-v1';
const ASSETS\_TO\_CACHE = [
 '/', '/index.html',
 '/manifest.json',
 '/icon-192.png',
 '/icon-512.png'
 ];

 // Instalação do Service Worker e cache dos arquivos estáticos
 self.addEventListener('install', (event) =>{ 
   event.waitUntil( 
      caches.open(CACHE_NAME).then((cache) =>{ 
        return cache.addAll(ASSETS_TO_CACHE);
      })
    );
    self.skipWaiting();
 });

 // Ativação e limpeza de caches antigos
 self.addEventListener('activate', (event) =>{ 
   event.waitUntil( 
     caches.keys().then((cacheNames) => {
        return Promise.all( 
          cacheNames.map((cache) => {
           if (cache !== CACHE_NAME) {
             return caches.delete(cache);
           }
         })
       );
     })
   ); 
   self.clients.claim();
 });

 // Intercepção de requisições: tenta rede primeiro; se offline, busca no cache
 self.addEventListener('fetch', (event) =>{
   event.respondWith(
     fetch(event.request).catch(() => {
       return caches.match(event.request);
     })
   );
 });
