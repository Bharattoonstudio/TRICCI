// TRICCI service worker.
// Its only job is to make the site installable as an app (Chrome/Edge/Android).
// It deliberately does NOT cache anything: pages, API responses and sign-in
// sessions always come from the network, so users never see stale data.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
