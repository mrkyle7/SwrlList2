const express = require('express');
const https = require('https');
const path = require('path');
const querystring = require('querystring');

const app = express();
const www = path.join(__dirname, 'platforms/browser/www');
const indexHtml = path.join(www, 'index.html');

// Cloud Run terminates TLS in front of us and injects PORT (8080).
app.set('trust proxy', true);
app.set('port', process.env.PORT || 8080);

const staticOptions = {
  index: false,
  // Without this, /watch would 301 to /watch/ instead of reaching the app route.
  redirect: false,
  setHeaders: function (res, filePath) {
    const name = path.basename(filePath);
    if (name === 'sw.js' || name === 'firebase-messaging-sw.js') {
      // Service workers must always be revalidated or updates never ship.
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
// The browser and the mobile apps call these routes instead of the APIs
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
      console.error(options.service + ' responded ' + upstreamRes.statusCode + ' for ' + options.path);
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
    console.error(options.service + ' request failed', err);
    if (!res.headersSent) {
      res.status(502).json({ error: options.service + ' request failed' });
    }
  });
}

// The Android / iOS apps load from file://, so they call these cross-origin.
app.use('/api/v1', function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

/**
 * @param {any} value
 * @returns {string | undefined} a trimmed search term, or undefined if unusable
 */
function searchTerm(value) {
  const term = typeof value === 'string' ? value.trim() : '';
  return term.length > 0 && term.length <= 200 ? term : undefined;
}

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

app.get('/api/v1/tmdb/*', function (req, res) {
  const upstreamPath = tmdbPath(req.params[0].split('/'), req.query);
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
// The app itself.
//
// index.html references its assets with relative URLs because the same file
// is loaded from file:// inside the Android / iOS apps. A deep link such as
// /swrl/<id> therefore asks for /swrl/bundle.js, /swrl/img/..., so the static
// root is mounted again under every deep-link prefix.
// ---------------------------------------------------------------------------
const deepLinksWithId = ['swrl', 'swrler', 'recommend'];
const deepLinksWithoutId = ['savedsearches', 'recommendations', 'watch', 'listen', 'read', 'play'];

function sendIndex(req, res) {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(indexHtml);
}

app.get('/', sendIndex);
app.use(express.static(www, staticOptions));

deepLinksWithId.forEach(function (prefix) {
  app.use('/' + prefix, express.static(www, staticOptions));
  app.get('/' + prefix + '/:id', sendIndex);
});

deepLinksWithoutId.forEach(function (prefix) {
  app.use('/' + prefix, express.static(www, staticOptions));
  app.get('/' + prefix, sendIndex);
});

const server = app.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});

// Cloud Run sends SIGTERM before stopping an instance.
process.on('SIGTERM', function () {
  server.close(function () { process.exit(0); });
});
