const V = 'enjambre7-v2';
const BASE = [
  './', 'index.html', 'css/style.css',
  'js/util.js', 'js/keys.js', 'js/ai.js', 'js/swarm.js', 'js/grupo.js', 'js/app.js',
  'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png',
  'img/col-percepcion.webp', 'img/col-razonamiento.webp', 'img/col-supervision.webp', 'img/col-accion.webp', 'img/col-feedback.webp', 'img/col-adaptacion.webp', 'img/col-fallos.webp',
  'img/av-percepcion.webp', 'img/av-razonamiento.webp', 'img/av-supervision.webp', 'img/av-accion.webp', 'img/av-feedback.webp', 'img/av-adaptacion.webp', 'img/av-fallos.webp'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(BASE)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin === location.origin) {
    if (u.pathname.endsWith('keys.enc.json')) return;
    e.respondWith(
      fetch(e.request).then(r => {
        const cp = r.clone();
        caches.open(V).then(c => c.put(e.request, cp));
        return r;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
  } else if (u.host.includes('fonts.g')) {
    e.respondWith(
      caches.match(e.request).then(m => m || fetch(e.request).then(r => {
        const cp = r.clone();
        caches.open(V).then(c => c.put(e.request, cp));
        return r;
      }))
    );
  }
});
