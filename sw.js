const VER = 'hud-v4';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Harita/rota API'leri her zaman ağdan
  if (/overpass|nominatim|osrm|openfreemap/.test(url.hostname)) return;
  // Sayfa ve betikler: önce ağ (hep güncel), çevrimdışıyken önbellek
  if (req.mode === 'navigate' || /\.(html|js|json)$/.test(url.pathname) || url.pathname.endsWith('/')) {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VER).then(x => x.put(req, c)); return r; })
      .catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  // Fontlar ve simgeler: önce önbellek, arkada güncelle
  e.respondWith(caches.open(VER).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
