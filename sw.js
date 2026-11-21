const CACHE_NAME = 'cordon-pda-v1';
const APP_SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './src/main.js', './src/ui/views.js', './src/core/storage.js',
  './src/data/catalog.js', './src/systems/game-clock.js',
  './src/systems/inventory.js', './src/systems/world.js',
  './src/systems/combat.js', './src/systems/action-engine.js', './src/systems/audio.js',
  './assets/audio/wind.wav', './assets/audio/rain.wav', './assets/audio/geiger.wav',
  './assets/audio/underground.wav', './assets/audio/forest.wav', './assets/audio/campfire.wav',
  './assets/audio/radio.wav', './assets/audio/dogs.wav', './assets/audio/anomaly.wav', './assets/audio/generator.wav'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    return response;
  }).catch(() => caches.match('./index.html'))));
});
