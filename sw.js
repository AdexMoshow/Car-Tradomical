const CACHE_NAME = 'adexmoshow-cache-v6';
const urlsToCache = [
  'index.html',
  'style.css',
  'script.js',
  'site.webmanifest',
  'icon.svg',
  'lib/porsche.jpg',
  'lib/mercedes.jpg',
  'lib/ferrari.jpg',
  'lib/ford.jpg',
  'lib/lamborghini.jpg',
  'lib/audi.jpg',
  'lib/range_rover.jpg',
  'lib/cover.jpg',
  'lib/herb.jpg',
  'lib/ginger.jpg',
  'lib/aloe.jpg',
'lib/turmeric.jpg',
  'lib/moringa.jpg',
  'CERTIFICATE - ADEXMOSHOW TRADOMEDICAL VENTURES.pdf',
  'cac-certificate.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        );
      })
    ])
  );
});

// Improved fetch handler: cache-first for images, network-first for navigation, cache-then-network for others
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Network-first strategy for navigation to ensure updates are seen immediately
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(networkRes => {
        const copy = networkRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('index.html', copy));
        return networkRes;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }

  // Images: cache-first strategy
  if (req.destination === 'image' || url.pathname.startsWith('/lib/')) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(networkRes => {
        return caches.open(CACHE_NAME).then(cache => { cache.put(req, networkRes.clone()); return networkRes; });
      }).catch(() => {
        // Return a small transparent placeholder if offline
        return new Response('', { status: 404 });
      }))
    );
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(req).then(networkRes => {
      // Optionally cache GET requests
      if (req.method === 'GET' && networkRes && networkRes.status === 200) {
        const copy = networkRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      }
      return networkRes;
    }).catch(() => caches.match(req))
  );
});
