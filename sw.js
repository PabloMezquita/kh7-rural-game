// KH7 Rural Games service worker: lets the app open without signal.
// Pages: network first (always the newest version when online), cache as fallback.
// Firebase SDK and fonts: cache first (they never change for a given version).
const CACHE = 'kh7-rural-games-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never touch Firestore / Auth network traffic
  if (url.hostname.endsWith('googleapis.com') && !url.hostname.startsWith('fonts.')) return;
  const isStatic = url.hostname === 'www.gstatic.com' || url.hostname.startsWith('fonts.');
  if (isStatic) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html'))));
  }
});
