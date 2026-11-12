/*
 * Swrl List app-shell service worker (browser / installed PWA only - the
 * Cordova apps never register it).
 *
 * Strategy: network first, cache as fallback. bundle.js is not content-hashed,
 * so serving it cache-first would pin users to a stale build. Going to the
 * network first means an online user always gets the current deploy, and an
 * offline user gets the last shell they loaded. Firestore's own offline
 * persistence then supplies the data.
 *
 * Push notifications are handled separately by firebase-messaging-sw.js, which
 * Firebase registers under its own scope.
 */
const CACHE = 'swrl-shell-v1';
const SHELL = [
  '/',
  '/css/index.css',
  '/bundle.js',
  '/cordova.js',
  '/cordova_plugins.js',
  '/manifest.webmanifest',
  '/img/logo.png',
  '/img/icon-192.png',
  '/img/NoPoster.jpg'
];
// Deep links (/swrl/<id>, /watch, ...) are all the same single page.
const APP_ROUTE = /^\/(swrl|swrler|recommend|savedsearches|recommendations|watch|listen|read|play)(\/[^/]*)?\/?$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // One missing file must not stop the worker installing.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

/**
 * Deep-link prefixes are an artefact of relative asset URLs: /swrl/bundle.js
 * is the same file as /bundle.js. Normalise so each asset is cached once.
 * @param {URL} url
 */
function cacheKey(url) {
  const isNavigation = url.pathname === '/' || APP_ROUTE.test(url.pathname);
  if (isNavigation) {
    return '/';
  }
  return url.pathname.replace(
    /^\/(swrl|swrler|recommend|savedsearches|recommendations|watch|listen|read|play)\/(?=(img|css|fonts|plugins|cordova-js-src)\/|bundle\.js$|cordova\.js$|cordova_plugins\.js$)/,
    '/');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }
  const url = new URL(request.url);
  // Third-party APIs, Firebase, and our own /api and Firebase auth helper
  // paths always go straight to the network.
  if (url.origin !== self.location.origin
    || url.pathname.startsWith('/api/')
    || url.pathname.startsWith('/__/')
    || url.pathname === '/sw.js'
    || url.pathname === '/firebase-messaging-sw.js') {
    return;
  }

  const key = cacheKey(url);
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(key, copy));
        }
        return response;
      })
      .catch(() => caches.open(CACHE)
        .then((cache) => cache.match(key))
        .then((cached) => cached || Response.error()))
  );
});
