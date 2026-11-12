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
// BoardGameGeek proxy.
//
// BGG's XML API rejects anonymous requests (HTTP 401) - every call needs the
// bearer token of an application registered at
// https://boardgamegeek.com/applications. A bearer token cannot live in the
// client bundle, so the browser and the mobile apps call these two routes and
// the token stays in the BGG_API_TOKEN environment variable (Secret Manager on
// Cloud Run).
// ---------------------------------------------------------------------------
const BGG_HOST = 'boardgamegeek.com';
const BGG_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const BGG_CACHE_MAX_ENTRIES = 500;
const GEEK_TYPES = ['boardgame', 'videogame'];
/** @type {Map<string, {expires: number, body: string}>} */
const bggCache = new Map();

/**
 * @param {string} resource
 * @param {Object} query
 * @returns {string | undefined} the upstream path, or undefined if the query is invalid
 */
function bggPath(resource, query) {
  if (resource === 'search') {
    const term = typeof query.query === 'string' ? query.query.trim() : '';
    if (GEEK_TYPES.indexOf(query.type) === -1 || term.length === 0 || term.length > 200) {
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
  // The Android / iOS apps load from file://, so they call this cross-origin.
  res.setHeader('Access-Control-Allow-Origin', '*');

  const upstreamPath = bggPath(req.params.resource, req.query);
  if (!upstreamPath) {
    return res.status(400).json({ error: 'Invalid BoardGameGeek request' });
  }
  const token = process.env.BGG_API_TOKEN;
  // "not-set" is the placeholder terraform puts in the secret until the
  // deploy workflow copies the real token in.
  if (!token || token === 'not-set') {
    return res.status(503).json({ error: 'BGG_API_TOKEN is not configured on the server' });
  }

  const cached = bggCache.get(upstreamPath);
  if (cached && cached.expires > Date.now()) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.type('application/xml').send(cached.body);
  }

  const upstream = https.get({
    host: BGG_HOST,
    path: upstreamPath,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/xml',
      'User-Agent': 'SwrlList/2 (+https://swrl-list.com)'
    },
    timeout: 20000
  }, function (upstreamRes) {
    const chunks = [];
    upstreamRes.on('data', function (chunk) { chunks.push(chunk); });
    upstreamRes.on('end', function () {
      const body = Buffer.concat(chunks).toString('utf8');
      if (upstreamRes.statusCode === 200) {
        if (bggCache.size >= BGG_CACHE_MAX_ENTRIES) {
          bggCache.delete(bggCache.keys().next().value);
        }
        bggCache.set(upstreamPath, { expires: Date.now() + BGG_CACHE_TTL_MS, body: body });
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.type('application/xml').send(body);
      }
      console.error('BoardGameGeek responded ' + upstreamRes.statusCode + ' for ' + upstreamPath);
      // Never relay a 401 as-is: it is our token that was refused, not the caller's.
      const status = upstreamRes.statusCode === 429 || upstreamRes.statusCode === 202
        ? 503 : 502;
      res.status(status).json({ error: 'BoardGameGeek responded ' + upstreamRes.statusCode });
    });
  });
  upstream.on('timeout', function () { upstream.abort(); });
  upstream.on('error', function (err) {
    console.error('BoardGameGeek request failed', err);
    if (!res.headersSent) {
      res.status(502).json({ error: 'BoardGameGeek request failed' });
    }
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
