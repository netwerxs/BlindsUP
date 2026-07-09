const CACHE = 'blindsup-static-v4';
const STATIC = ['./index.html', './manifest.json', './icons/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  // Do NOT self.skipWaiting() here — a new version installs in the
  // background but stays "waiting" until the page explicitly asks for it
  // (see the SKIP_WAITING message below), which only happens when the user
  // presses "Check for Updates". Otherwise the app should just keep running
  // whatever was already installed, fully offline.
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // checkForUpdates() in index.html tags its request with this param. It must
  // bypass the cache-first rule below (a plain fetch would just get served
  // back its own stale cached copy), so fetch the network directly and
  // refresh the cached index.html as a side effect — the next reload then
  // picks up the change even though sw.js itself never changed.
  if (url.searchParams.has('swCheckUpdate')) {
    e.respondWith((async () => {
      const res = await fetch('./index.html', { cache: 'no-store' });
      const cache = await caches.open(CACHE);
      cache.put('./index.html', res.clone());
      return res;
    })());
    return;
  }
  // Cache-first for everything else, including normal navigations — the app
  // runs entirely from the installed cache and never touches the network on
  // its own otherwise.
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
