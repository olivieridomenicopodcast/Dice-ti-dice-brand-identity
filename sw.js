// Service worker: l'app funziona offline e si aggiorna da sola.
// Strategia "stale-while-revalidate": risponde subito dalla cache e intanto scarica la versione nuova.
const CACHE = 'dicetidice-studio-v1';
const FILE = [
  './', 'index.html', 'manifest.webmanifest',
  'app/app.css', 'app/app.js', 'app/layouts.js', 'app/render.js', 'app/zip.js', 'app/idb.js', 'app/build.js',
  'assets/brand.css', 'assets/logo-dicetidice.png',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'fonts/PermanentMarker-400.ttf', 'fonts/Cinzel-700.ttf', 'fonts/Cinzel-900.ttf',
  'fonts/Nunito-400.ttf', 'fonts/Nunito-600.ttf', 'fonts/Nunito-800.ttf',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.searchParams.has('check')) return; // controllo aggiornamenti: sempre dalla rete
  ev.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const rete = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || rete;
    }),
  );
});
