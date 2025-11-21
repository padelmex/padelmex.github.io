const CACHE_NAME = 'padel-mexicano-v12';
const VERSION = '20251121170324';

// Base URLs without version strings
const baseUrls = [
  './',
  './index.html',
  './manifest.json',
  './styles/style.css',
  './src/app.js',
  './src/config.js',
  './src/store.js',
  './src/tournament.js',
  './lib/vue.esm-browser.prod.js',
  './src/components/tournament_page.js',
  './src/components/tournament_config.js',
  './assets/favicon.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// Append version to all URLs
const urlsToCache = baseUrls.map(url => {
  // Don't add version to root path
  if (url === './') {
    return url;
  }
  return `${url}?v=${VERSION}`;
});

// Install event - cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch event - serve from cache first, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the new response for future use
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Network failed, and no cache available
          // Could return a custom offline page here
          return new Response('Offline - please check your connection', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});
