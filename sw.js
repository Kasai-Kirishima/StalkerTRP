const CACHE_NAME = 'cordon-pda-v23-random-npcs-trade-starter-gear';
const APP_SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './assets/icons/radioactive.svg', './assets/images/cordon-clean.webp',
  './assets/images/location-backgrounds/blokpostpodmostomfon.webp',
  './assets/images/location-backgrounds/fonatp.webp',
  './assets/images/location-backgrounds/fonderevnanovickov%20vhod.webp',
  './assets/images/location-backgrounds/fonelevator.webp',
  './assets/images/location-backgrounds/fonferma.webp',
  './assets/images/location-backgrounds/fonlagervlesy.webp',
  './assets/images/location-backgrounds/fonlokomotiv.webp',
  './assets/images/location-backgrounds/fonpodvalderevnanovickov.webp',
  './assets/images/location-backgrounds/fonpodvalsidorovic.webp',
  './assets/images/location-backgrounds/fonryinhytor.webp',
  './assets/images/location-backgrounds/fontainlager.webp',
  './assets/images/location-backgrounds/fonvagoncik.webp',
  './assets/images/location-backgrounds/fonvosttyneljd.webp',
  './assets/images/location-backgrounds/fonygblokpost.webp',
  './assets/images/location-backgrounds/kpkfon.webp',
  './assets/images/location-backgrounds/ostanovkafon.webp',
  './assets/images/location-backgrounds/podxemperehodfon.webp',
  './assets/images/location-backgrounds/severblokpostfon.webp',
  './assets/images/location-backgrounds/tynelloshinafon.webp',
  './assets/images/location-backgrounds/tynelpodjdfon.webp',
  './src/main.js', './src/ui/views.js', './src/core/storage.js',
  './src/data/catalog.js', './src/systems/game-clock.js', './src/systems/music.js',
  './src/systems/inventory.js', './src/systems/world.js', './src/systems/dialogue-engine.js',
  './assets/images/armor/berilicon.webp', './assets/images/armor/debyticon.webp',
  './assets/images/armor/kosyhaicon.webp', './assets/images/armor/kozankaicon.webp',
  './assets/images/armor/kozanplashicon.webp', './assets/images/armor/protivogazavroraicon.webp',
  './assets/images/armor/protivogazoptikicon.webp', './assets/images/armor/protivogazpa-10icon.webp',
  './assets/images/armor/protivogazpa-8icon.webp', './assets/images/armor/protivogazpg-4icon.webp',
  './assets/images/armor/pz-5icon.webp', './assets/images/armor/stalnoishlemicon.webp', './assets/images/armor/zaraicon.webp',
  './src/systems/combat.js', './src/systems/action-engine.js', './src/systems/russian-language.js'
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
