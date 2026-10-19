/* Ohlly's Dashboard service worker — offline shell, always-fresh app when online. */
var CACHE = 'ohllys-shell-v1';
var ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png',
  './apple-touch-icon.png', './favicon-32.png'
];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS).catch(function(){}); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;                       // never touch writes
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;        // Supabase + CDN go straight to the network

  // Navigations: network-first so the app is always the latest deploy when online; cache is the offline fallback.
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(function(r){
        var cp = r.clone(); caches.open(CACHE).then(function(c){ c.put('./index.html', cp); });
        return r;
      }).catch(function(){ return caches.match('./index.html'); })
    );
    return;
  }

  // Static same-origin assets (icons, manifest): cache-first.
  e.respondWith(
    caches.match(req).then(function(c){
      return c || fetch(req).then(function(r){
        var cp = r.clone(); caches.open(CACHE).then(function(ch){ ch.put(req, cp); });
        return r;
      });
    })
  );
});
