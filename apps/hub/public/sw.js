// Minimal service worker. Its only job is to make the browser consider Helm installable.
//
// It deliberately caches nothing: this is a live dashboard that shows current status,
// alerts and secrets-adjacent configuration, and none of that should ever be served
// stale from a cache. Every request just goes straight to the network.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
