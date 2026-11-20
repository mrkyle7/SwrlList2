const compression = require('compression');
const express = require('express');
const fs = require('fs');
const https = require('https');
const path = require('path');
const querystring = require('querystring');

const app = express();
// Built by `npm run build` (webpack): www/ plus bundle.<hash>.js.
const www = path.join(__dirname, 'dist');
const indexHtml = path.join(www, 'index.html');

// Cloud Run terminates TLS in front of us and injects PORT (8080).
app.set('trust proxy', true);
app.set('port', process.env.PORT || 8080);
// gzip/brotli for everything text: the app bundle alone goes from about
// 920 KB to about 270 KB, which is most of a first visit on a phone.
app.use(compression());

const staticOptions = {
  index: false,
  // Without this, /watch would 301 to /watch/ instead of reaching the app route.
  redirect: false,
  setHeaders: function (res, filePath) {
    const name = path.basename(filePath);
    if (/\.[0-9a-f]{8}\.(js|css)$/.test(name)) {
      // bundle.<hash>.js and css/index.<hash>.css: a new build has new names
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (name === 'sw.js' || name === 'firebase-messaging-sw.js' || name === 'version.json') {
      // The service workers and the version must always be revalidated, or
      // updates never ship (and the app could not tell).
      res.setHeader('Cache-Control', 'no-cache');
    } else if (name === 'manifest.webmanifest') {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    }
  }
};

app.get('/api/v1/health', function (req, res) {
  res.json({ isAvailable: true });
});

// ---------------------------------------------------------------------------
// Third-party API proxies.
//
// The browser calls these routes instead of the APIs
// themselves, so the credentials stay on the server (environment variables,
// filled from Secret Manager on Cloud Run) and never ship in bundle.js:
//
//   /api/v1/tmdb/...  The Movie Database       TMDB_API_KEY
//   /api/v1/omdb      OMDb (IMDb ratings)      OMDB_API_KEY
//   /api/v1/geek/...  BoardGameGeek XML API    BGG_API_TOKEN (BGG answers 401
//                     without a registered application's bearer token)
//
// Each route builds the upstream URL itself from validated parameters - none
// of them forwards an arbitrary path.
// ---------------------------------------------------------------------------
const PROXY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const PROXY_CACHE_MAX_ENTRIES = 1000;
/** @type {Map<string, {expires: number, body: string}>} */
const proxyCache = new Map();

/**
 * @param {string} name environment variable
 * @returns {string | undefined}
 */
function credential(name) {
  const value = process.env[name];
  // "not-set" is the placeholder terraform puts in a secret until the deploy
  // workflow copies the real value in.
  return value && value !== 'not-set' ? value : undefined;
}

/**
 * Fetch an upstream URL (with an in-memory cache) and relay it.
 *
 * @param {import('express').Response} res
 * @param {Object} options
 * @param {string} options.service name used in errors and logs
 * @param {string} options.host
 * @param {string} options.path upstream path without credentials; also the cache key
 * @param {string} [options.logPath] what to log instead of the path, e.g. without a person's search term
 * @param {string} [options.credentialQuery] appended to path for the request only, so
 *   the key is never cached or logged
 * @param {Object<string, string>} [options.headers]
 * @param {string} options.contentType
 */
function relay(res, options) {
  const cacheKey = options.host + options.path;
  const cached = proxyCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.type(options.contentType).send(cached.body);
  }

  const upstream = https.get({
    host: options.host,
    path: options.path + (options.credentialQuery || ''),
    headers: Object.assign({
      'Accept': options.contentType,
      'User-Agent': 'SwrlList/2 (+https://swrl-list.com)'
    }, options.headers),
    timeout: 20000
  }, function (upstreamRes) {
    const chunks = [];
    upstreamRes.on('data', function (chunk) { chunks.push(chunk); });
    upstreamRes.on('end', function () {
      const body = Buffer.concat(chunks).toString('utf8');
      if (upstreamRes.statusCode === 200) {
        if (proxyCache.size >= PROXY_CACHE_MAX_ENTRIES) {
          proxyCache.delete(proxyCache.keys().next().value);
        }
        proxyCache.set(cacheKey, { expires: Date.now() + PROXY_CACHE_TTL_MS, body: body });
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.type(options.contentType).send(body);
      }
      console.error(options.service + ' responded ' + upstreamRes.statusCode + ' for ' + (options.logPath || options.path));
      if (upstreamRes.statusCode === 404) {
        return res.status(404).json({ error: options.service + ' has no such item' });
      }
      // Never relay a 401 as-is: it is our credential that was refused, not the caller's.
      const status = upstreamRes.statusCode === 429 || upstreamRes.statusCode === 202
        ? 503 : 502;
      res.status(status).json({ error: options.service + ' responded ' + upstreamRes.statusCode });
    });
  });
  upstream.on('timeout', function () { upstream.abort(); });
  upstream.on('error', function (err) {
    console.error(options.service + ' request failed for ' + (options.logPath || options.path), err);
    if (!res.headersSent) {
      res.status(502).json({ error: options.service + ' request failed' });
    }
  });
}

/**
 * @param {any} value
 * @returns {string | undefined} a trimmed search term, or undefined if unusable
 */
function searchTerm(value) {
  const term = typeof value === 'string' ? value.trim() : '';
  return term.length > 0 && term.length <= 200 ? term : undefined;
}

// --- Apple iTunes (albums and podcasts) ----------------------------------------
// No key needed, but browsers on some phones and networks fail to reach Apple's
// API directly; through here they don't, and failures show in our logs.

const ITUNES_SEARCH = { music: 'album', podcast: 'podcast' };
const ITUNES_LOOKUP = ['song', 'podcast'];

app.get('/api/v1/itunes/search', function (req, res) {
  const term = searchTerm(req.query.term);
  const media = typeof req.query.media === 'string' ? req.query.media : '';
  const entity = Object.prototype.hasOwnProperty.call(ITUNES_SEARCH, media) ? ITUNES_SEARCH[media] : undefined;
  if (!term || !entity || req.query.entity !== entity) {
    return res.status(400).json({ error: 'Bad iTunes search' });
  }
  relay(res, {
    service: 'iTunes',
    host: 'itunes.apple.com',
    path: '/search?term=' + encodeURIComponent(term) + '&media=' + media + '&entity=' + entity,
    logPath: '/search ' + media,
    contentType: 'application/json'
  });
});

app.get('/api/v1/itunes/lookup', function (req, res) {
  const id = typeof req.query.id === 'string' ? req.query.id : '';
  const entity = typeof req.query.entity === 'string' ? req.query.entity : '';
  if (!/^\d{1,15}$/.test(id) || !ITUNES_LOOKUP.includes(entity)) {
    return res.status(400).json({ error: 'Bad iTunes lookup' });
  }
  relay(res, {
    service: 'iTunes',
    host: 'itunes.apple.com',
    path: '/lookup?id=' + id + '&entity=' + entity,
    contentType: 'application/json'
  });
});

// --- Spotify oEmbed ---------------------------------------------------------------
// A Spotify link shared to the app carries no title. Spotify's public oEmbed
// endpoint (no key) gives one, which the app then searches for. Only Spotify
// album, show, episode and track pages are accepted.
const SPOTIFY_PAGE = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:album|show|episode|track)\/[A-Za-z0-9]{10,40}\/?$/;

app.get('/api/v1/oembed/spotify', function (req, res) {
  const page = typeof req.query.url === 'string' ? req.query.url : '';
  if (!SPOTIFY_PAGE.test(page)) {
    return res.status(400).json({ error: 'Not a Spotify album, show, episode or track page' });
  }
  relay(res, {
    service: 'Spotify',
    host: 'open.spotify.com',
    path: '/oembed?url=' + encodeURIComponent(page),
    contentType: 'application/json'
  });
});

// --- The Movie Database --------------------------------------------------------

/**
 * @param {string[]} parts path segments after /api/v1/tmdb/
 * @param {Object} query
 * @returns {string | undefined} the upstream path, or undefined if the request is invalid
 */
function tmdbPath(parts, query) {
  if (parts.length !== 2) {
    return undefined;
  }
  if (parts[0] === 'search' && (parts[1] === 'movie' || parts[1] === 'tv')) {
    const term = searchTerm(query.query);
    return term && '/3/search/' + parts[1] + '?' + querystring.stringify({ query: term });
  }
  // Look up a film or TV show by its IMDb id (a link shared from IMDb).
  if (parts[0] === 'find') {
    return /^tt\d{5,12}$/.test(parts[1])
      ? '/3/find/' + parts[1] + '?external_source=imdb_id'
      : undefined;
  }
  if (!/^\d{1,10}$/.test(parts[1])) {
    return undefined;
  }
  if (parts[0] === 'movie' || parts[0] === 'tv') {
    return '/3/' + parts[0] + '/' + parts[1] + '?append_to_response=credits';
  }
  if (parts[0] === 'person') {
    return '/3/person/' + parts[1] + '?append_to_response=movie_credits,tv_credits';
  }
  return undefined;
}

app.get('/api/v1/tmdb/*parts', function (req, res) {
  const upstreamPath = tmdbPath(req.params.parts, req.query);
  if (!upstreamPath) {
    return res.status(400).json({ error: 'Invalid TMDB request' });
  }
  const key = credential('TMDB_API_KEY');
  if (!key) {
    return res.status(503).json({ error: 'TMDB_API_KEY is not configured on the server' });
  }
  relay(res, {
    service: 'TMDB',
    host: 'api.themoviedb.org',
    path: upstreamPath,
    credentialQuery: '&api_key=' + encodeURIComponent(key),
    contentType: 'application/json'
  });
});

// --- OMDb ----------------------------------------------------------------------

app.get('/api/v1/omdb', function (req, res) {
  if (typeof req.query.i !== 'string' || !/^tt\d{5,12}$/.test(req.query.i)) {
    return res.status(400).json({ error: 'Invalid OMDb request' });
  }
  const key = credential('OMDB_API_KEY');
  if (!key) {
    return res.status(503).json({ error: 'OMDB_API_KEY is not configured on the server' });
  }
  relay(res, {
    service: 'OMDb',
    host: 'www.omdbapi.com',
    path: '/?i=' + req.query.i,
    credentialQuery: '&apikey=' + encodeURIComponent(key),
    contentType: 'application/json'
  });
});

// --- BoardGameGeek -------------------------------------------------------------

const GEEK_TYPES = ['boardgame', 'videogame'];

// BoardGameGeek is paused while we wait for BGG to issue our API key: until
// then every call is refused upstream, slowly. While paused, the geek routes
// answer 503 at once and never call BGG; the app reports board and video games
// as unavailable and shows the other sources' results. Set to false once the
// key is in BGG_API_TOKEN.
const BGG_PAUSED = true;

/**
 * @param {string} resource
 * @param {Object} query
 * @returns {string | undefined} the upstream path, or undefined if the query is invalid
 */
function bggPath(resource, query) {
  if (resource === 'search') {
    const term = searchTerm(query.query);
    if (GEEK_TYPES.indexOf(query.type) === -1 || !term) {
      return undefined;
    }
    return '/xmlapi2/search?' + querystring.stringify({ type: query.type, query: term });
  }
  if (resource === 'thing') {
    const ids = typeof query.id === 'string' ? query.id : '';
    // BGG accepts at most 20 comma separated ids per request.
    if (!/^\d+(,\d+){0,19}$/.test(ids)) {
      return undefined;
    }
    return '/xmlapi2/thing?id=' + ids;
  }
  return undefined;
}

app.get('/api/v1/geek/:resource', function (req, res) {
  if (BGG_PAUSED) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'BoardGameGeek is unavailable for now' });
  }
  const upstreamPath = bggPath(req.params.resource, req.query);
  if (!upstreamPath) {
    return res.status(400).json({ error: 'Invalid BoardGameGeek request' });
  }
  const token = credential('BGG_API_TOKEN');
  if (!token) {
    return res.status(503).json({ error: 'BGG_API_TOKEN is not configured on the server' });
  }
  relay(res, {
    service: 'BoardGameGeek',
    host: 'boardgamegeek.com',
    path: upstreamPath,
    headers: { 'Authorization': 'Bearer ' + token },
    contentType: 'application/xml'
  });
});

app.use('/api', function (req, res) {
  res.status(404).json({ error: 'Not found' });
});

// ---------------------------------------------------------------------------
// Firebase Auth helper pages, served from our own domain.
//
// Sign-in opens <authDomain>/__/auth/handler. With authDomain set to this
// site (src/firebase/init.js) instead of swrl-1118.firebaseapp.com, Google's
// sign-in screen names swrl-list.com, and the helper shares our origin, so
// browser storage partitioning cannot break it. The pages themselves still
// live on Firebase Hosting; this passes them through unchanged.
// ---------------------------------------------------------------------------
const FIREBASE_AUTH_HOST = 'swrl-1118.firebaseapp.com';

app.use('/__', function (req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).end();
  }
  const upstream = https.request({
    host: FIREBASE_AUTH_HOST,
    path: '/__' + req.url,
    method: req.method,
    headers: {
      'Accept': req.headers.accept || '*/*',
      'Accept-Language': req.headers['accept-language'] || 'en',
      'User-Agent': req.headers['user-agent'] || 'SwrlList/2'
    },
    timeout: 20000
  }, function (upstreamRes) {
    res.status(upstreamRes.statusCode);
    ['content-type', 'cache-control', 'etag', 'last-modified'].forEach(function (name) {
      if (upstreamRes.headers[name]) {
        res.setHeader(name, upstreamRes.headers[name]);
      }
    });
    upstreamRes.pipe(res);
  });
  upstream.on('timeout', function () { upstream.destroy(new Error('timed out')); });
  upstream.on('error', function (err) {
    console.error('Firebase auth helper request failed', err);
    if (!res.headersSent) {
      res.status(502).end();
    }
  });
  upstream.end();
});

// ---------------------------------------------------------------------------
// The app itself: static files, and index.html for every client-side route.
// ---------------------------------------------------------------------------
const appRoutes = [
  '/',
  '/swrl/:id', '/swrler/:id', '/recommend/:id',
  '/savedsearches', '/friends', '/settings', '/recommendations', '/watch', '/listen', '/read', '/play',
  '/search', '/share', '/about'
];

// ---------------------------------------------------------------------------
// Link previews. WhatsApp, Messages and the like read a page's og: tags
// without running its JavaScript, so for a link to a swrl (/swrl/:id, and
// /swrl/:id?from=<share> when a person shared it) the server fills them in:
// the title, the poster and, for a share, who sent it and what they said.
//
// The swrl and share documents are public (see firestore.rules), so they are
// read over Firestore's REST API with no credentials. Anything that goes
// wrong falls back to the plain page.
// ---------------------------------------------------------------------------
const FIREBASE_PROJECT = process.env.FIREBASE_PROJECT || 'swrl-1118';
const firestoreBase = (process.env.FIRESTORE_EMULATOR_HOST
  ? 'http://' + process.env.FIRESTORE_EMULATOR_HOST
  : 'https://firestore.googleapis.com')
  + '/v1/projects/' + FIREBASE_PROJECT + '/databases/(default)/documents/';
const SITE = 'https://swrl-list.com';
const PREVIEW_CACHE_MILLIS = 10 * 60 * 1000;
const PREVIEW_CACHE_SIZE = 500;
/** @type {Map<string, {at: number, value: any}>} */
const previewCache = new Map();
/** @type {string | undefined} */
let indexTemplate;

/** A Firestore REST value as plain JavaScript (strings, maps and arrays are all we need). */
function fromFirestoreValue(value) {
  if (!value) return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('mapValue' in value) return fromFirestoreFields(value.mapValue.fields);
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  return undefined;
}

function fromFirestoreFields(fields) {
  const result = {};
  Object.keys(fields || {}).forEach(key => { result[key] = fromFirestoreValue(fields[key]); });
  return result;
}

/**
 * @param {string} collection
 * @param {string} id
 * @returns {Promise<Object | undefined>} the document, or undefined if it cannot be read
 */
async function publicDocument(collection, id) {
  if (!/^[\w.~:-]{1,200}$/.test(id)) return undefined;
  const key = collection + '/' + id;
  const cached = previewCache.get(key);
  if (cached && Date.now() - cached.at < PREVIEW_CACHE_MILLIS) return cached.value;
  let value;
  try {
    const response = await fetch(firestoreBase + collection + '/' + encodeURIComponent(id),
      { signal: AbortSignal.timeout(1500) });
    value = response.ok ? fromFirestoreFields((await response.json()).fields) : undefined;
  } catch (error) {
    value = undefined;
  }
  if (previewCache.size >= PREVIEW_CACHE_SIZE) previewCache.delete(previewCache.keys().next().value);
  previewCache.set(key, { at: Date.now(), value: value });
  return value;
}

function escapeAttribute(text) {
  return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * index.html with its title, description and og: tags replaced.
 *
 * @param {string} html
 * @param {{title: string, description: string, image?: string, url: string}} preview
 * @returns {string}
 */
function withPreview(html, preview) {
  const content = (attribute, name, value) => {
    // matches the tag whether or not the build minified away its quotes
    const tag = new RegExp('<meta ' + attribute + '=["\']?' + name + '["\']?\\s+content=(?:"[^"]*"|[^\\s>]*)\\s*/?>');
    html = html.replace(tag, () => '<meta ' + attribute + '="' + name + '" content="' + escapeAttribute(value) + '">');
  };
  html = html.replace(/<title>[^<]*<\/title>/, () => '<title>' + escapeAttribute(preview.title) + '</title>');
  content('property', 'og:title', preview.title);
  content('name', 'description', preview.description);
  content('property', 'og:description', preview.description);
  content('property', 'og:url', preview.url);
  if (preview.image && /^https:\/\//.test(preview.image)) content('property', 'og:image', preview.image);
  return html;
}

const VERBS = { 1: 'watch', 2: 'read', 3: 'listen to', 4: 'play' };

/**
 * @param {string} path the request path
 * @param {any} shareID the ?from= of a link someone shared
 * @returns {Promise<{title: string, description: string, image?: string, url: string} | undefined>}
 */
async function previewFor(path, shareID) {
  const match = /^\/swrl\/([^/]+)\/?$/.exec(path);
  if (!match) return undefined;
  const swrlID = decodeURIComponent(match[1]);
  const [swrl, found] = await Promise.all([
    publicDocument('swrls', swrlID),
    typeof shareID === 'string' ? publicDocument('shares', shareID) : Promise.resolve(undefined)
  ]);
  // a share only speaks for the swrl it was made for
  const share = found && found.swrlID === swrlID ? found : undefined;
  if (!swrl || !swrl.details || !swrl.details.title) return undefined;
  const title = swrl.details.title;
  const verb = VERBS[swrl.category] || 'try';
  const cut = (text, length) => text.length > length ? text.substring(0, length - 1) + '\u2026' : text;
  if (share && share.fromName) {
    return {
      title: cut(share.fromName + ' swrled you ' + title, 110),
      description: cut(share.message ? '\u201c' + share.message + '\u201d' : share.fromName + ' thinks you should ' + verb + ' this.', 200),
      image: swrl.details.imageUrl,
      url: SITE + path + '?from=' + encodeURIComponent(shareID)
    };
  }
  return {
    title: cut(title + ' on Swrl List', 110),
    description: 'You should ' + verb + ' this. Save it to your list, or swrl it to a friend.',
    image: swrl.details.imageUrl,
    url: SITE + path
  };
}

app.get(appRoutes, async function (req, res) {
  res.setHeader('Cache-Control', 'no-cache');
  try {
    const preview = await previewFor(req.path, req.query.from);
    if (preview) {
      if (indexTemplate === undefined) indexTemplate = fs.readFileSync(indexHtml, 'utf8');
      return res.type('html').send(withPreview(indexTemplate, preview));
    }
  } catch (error) {
    console.error('Could not build a link preview for ' + req.path, error);
  }
  res.sendFile(indexHtml);
});
app.use(express.static(www, staticOptions));

const server = app.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});

// Cloud Run sends SIGTERM before stopping an instance.
process.on('SIGTERM', function () {
  server.close(function () { process.exit(0); });
});
