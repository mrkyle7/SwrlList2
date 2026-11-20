/*
 * Swrl List app-shell service worker.
 *
 * Strategy: one cache per build, and the app opens from it. Opening from
 * the cache means a cold start never waits on the network, which on a poor
 * mobile signal took several seconds when this worker went to the network
 * first.
 *
 * - The build (webpack.config.js, `hashedShell`) replaces '__BUILD__' with an
 *   id of this build and '__SHELL_FILES__' with its content-hashed bundle and
 *   stylesheet, so this file changes with every deploy. The browser notices
 *   the change, installs the new worker, and that install downloads the whole
 *   new build into a new cache before it takes over; the old cache is then
 *   deleted. Until then the app keeps opening the build it has, complete.
 * - src/components/updateCheck.js notices a newer build (version.json),
 *   waits for the new worker to take over, and reloads at a quiet moment.
 * - Pages (every app route is the same index.html): from this build's cache,
 *   the network only when it is missing (the first visit).
 * - Hashed files never change: cache first. Other files of ours (images,
 *   fonts, the manifest): the cached copy now, refreshed in the background.
 * - Third-party APIs, Firebase, our /api, /__/ (sign-in helpers),
 *   /version.json and the workers themselves: always the network.
 *
 * Push notifications are handled separately by firebase-messaging-sw.js, which
 * Firebase registers under its own scope.
 */
const BUILD = '__BUILD__';
const CACHE = 'swrl-shell-' + BUILD;
/** This build's bundle and stylesheet; installing fails without them. */
const SHELL_FILES = '__SHELL_FILES__';
/** Nice to have offline; one missing must not stop the install. */
const EXTRAS = [
  '/manifest.webmanifest',
  '/img/logo.png',
  '/img/icon-192.png',
  '/img/NoPoster.jpg',
  '/img/spinner.gif'
];
// Deep links (/swrl/<id>, /watch, ...) are all the same single page.
const APP_ROUTE = /^\/(swrl|swrler|recommend|savedsearches|friends|settings|recommendations|watch|listen|read|play|search|share|about)(\/[^/]*)?\/?$/;
const HASHED = /\.[0-9a-f]{8}\.(js|css)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(['/', ...SHELL_FILES])
        .then(() => Promise.all(EXTRAS.map((url) => cache.add(url).catch(() => undefined)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('swrl-shell-') && key !== CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

/**
 * @param {Request} request
 * @param {string} key what to store it under
 * @return {Promise<Response>}
 */
function fromNetwork(request, key) {
  return fetch(request).then((response) => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(key, copy));
    }
    return response;
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin
    || url.pathname.startsWith('/api/')
    || url.pathname.startsWith('/__/')
    || url.pathname === '/sw.js'
    || url.pathname === '/firebase-messaging-sw.js'
    // which build is live: always the network, never a cached answer
    || url.pathname === '/version.json') {
    return;
  }

  const page = url.pathname === '/' || APP_ROUTE.test(url.pathname);
  const key = page ? '/' : url.pathname;
  event.respondWith(
    caches.open(CACHE).then((cache) => cache.match(key)).then((cached) => {
      if (cached && (page || HASHED.test(url.pathname))) {
        return cached;
      }
      if (cached) {
        // the copy we have now, a fresh one for next time
        event.waitUntil(fromNetwork(request, key).catch(() => undefined));
        return cached;
      }
      return fromNetwork(request, key).catch(() => {
        // offline and not cached: a page still gets the app, if we have it
        if (page) {
          return caches.open(CACHE).then((cache) => cache.match('/'))
            .then((shell) => shell || new Response('Offline', { status: 503, statusText: 'Offline' }));
        }
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
