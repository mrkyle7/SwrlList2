// @ts-nocheck server code (CommonJS, like server.js); its pure parts are tested in test/
'use strict';

/**
 * Places to eat from the Google Places API (New), kept inside its free
 * monthly allowances:
 *
 * - Search is Text Search with Pro fields only (id, name, short address,
 *   location, types): 5,000 free a month. No photos in search: each photo is
 *   billed on its own.
 * - Opening a place asks for its details once: the description
 *   (`editorialSummary`) makes it an Enterprise + Atmosphere request, 1,000
 *   free a month; then one photo (Place Photos), 1,000 free a month.
 * - DAILY_CAPS stop each server instance (at most 2, terraform/app.tf) well
 *   before those allowances, and answers are cached by server.js.
 *
 * Authentication: the Cloud Run service account's own token from the
 * metadata server (no API key to keep); GOOGLE_PLACES_API_KEY, when set,
 * is used instead (local runs).
 */

const https = require('https');
const http = require('http');

const PLACES_HOST = 'places.googleapis.com';
const SEARCH_FIELDS = ['places.id', 'places.displayName', 'places.shortFormattedAddress', 'places.location',
  'places.primaryType', 'places.types'].join(',');
const DETAIL_FIELDS = ['id', 'displayName', 'shortFormattedAddress', 'location', 'primaryType', 'types',
  'photos', 'editorialSummary'].join(',');
const NEAR_RADIUS_M = 2500;
const RESULTS = 15;
const PHOTO_WIDTH = 800;
/** Per instance per day; two instances stay inside the free monthly allowances. */
const DAILY_CAPS = { search: 80, details: 15, photo: 15 };

/**
 * A town or city as typed, made safe for a quoted Overpass string (letters,
 * digits, spaces, hyphens, apostrophes and full stops only).
 *
 * @param {string} text
 * @returns {string | undefined}
 */
function cleanPlace(text) {
  const place = String(text || '').replace(/[^\p{L}\p{N}\s'’.-]+/gu, ' ').replace(/\s+/g, ' ').trim();
  return place.length > 0 && place.length <= 60 ? place : undefined;
}

/**
 * "near" as sent by the client ("51.5072,-0.1276"), rounded to two decimal
 * places (about a kilometre): close enough to search a 2.5 km radius, and
 * neither the cache nor Overpass sees exactly where someone is.
 *
 * @param {string} text
 * @returns {{lat: number, lon: number} | undefined}
 */
function parseNear(text) {
  const match = /^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/.exec(String(text || ''));
  if (!match) return undefined;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return undefined;
  return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 };
}

/**
 * The search as Google wants it: the words, "in <town>" or near a point.
 *
 * @param {{q: string, near?: {lat: number, lon: number}, place?: string}} search
 * @returns {{textQuery: string, pageSize: number, languageCode: string, locationBias?: object, rankPreference?: string} | undefined}
 */
function searchBody(search) {
  const q = String(search.q || '').replace(/\s+/g, ' ').trim();
  if (q.length < 2 || q.length > 100 || (!search.near && !search.place)) return undefined;
  if (search.near) {
    return {
      textQuery: q,
      pageSize: RESULTS,
      languageCode: 'en',
      locationBias: { circle: { center: { latitude: search.near.lat, longitude: search.near.lon }, radius: NEAR_RADIUS_M } },
      rankPreference: 'DISTANCE'
    };
  }
  return { textQuery: `${q} in ${search.place}`, pageSize: RESULTS, languageCode: 'en' };
}

/**
 * A Google place id as the app sends it, if it looks like one.
 *
 * @param {any} id
 * @returns {string | undefined}
 */
function cleanPlaceId(id) {
  const value = typeof id === 'string' ? id.trim() : '';
  return /^[A-Za-z0-9_-]{10,300}$/.test(value) ? value : undefined;
}

/**
 * Counts requests of each kind per day and says when a kind is used up.
 */
class DailyCaps {
  /** @param {{[kind: string]: number}} caps */
  constructor(caps) {
    this.caps = caps;
    this.day = '';
    this.used = {};
  }

  /**
   * Takes one of `kind` for today, if any are left.
   *
   * @param {string} kind
   * @param {Date} [now]
   * @returns {boolean}
   */
  take(kind, now = new Date()) {
    const day = now.toISOString().slice(0, 10);
    if (day !== this.day) {
      this.day = day;
      this.used = {};
    }
    const used = this.used[kind] || 0;
    if (used >= (this.caps[kind] || 0)) return false;
    this.used[kind] = used + 1;
    return true;
  }
}

/** @type {{token: string, expires: number, project: string} | undefined} */
let metadataToken;

/** @param {string} path */
function metadata(path) {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: 'metadata.google.internal', path, headers: { 'Metadata-Flavor': 'Google' }, timeout: 3000 }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => response.statusCode === 200
        ? resolve(Buffer.concat(chunks).toString('utf8'))
        : reject(new Error(`metadata server answered ${response.statusCode}`)));
    });
    request.on('timeout', () => request.destroy(new Error('metadata server timed out')));
    request.on('error', reject);
  });
}

/**
 * Headers that let us call Places: an API key when one is set, otherwise the
 * service account's token (renewed a minute before it expires).
 *
 * @returns {Promise<Object<string, string>>}
 */
async function authHeaders() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (key && key !== 'not-set') return { 'X-Goog-Api-Key': key };
  if (!metadataToken || metadataToken.expires < Date.now() + 60000) {
    const [token, project] = await Promise.all([
      metadata('/computeMetadata/v1/instance/service-accounts/default/token'),
      metadataToken ? Promise.resolve(metadataToken.project) : metadata('/computeMetadata/v1/project/project-id')
    ]);
    const parsed = JSON.parse(token);
    metadataToken = { token: parsed.access_token, expires: Date.now() + parsed.expires_in * 1000, project: project.trim() };
  }
  return { 'Authorization': `Bearer ${metadataToken.token}`, 'X-Goog-User-Project': metadataToken.project };
}

/**
 * One call to the Places API.
 *
 * @param {'GET' | 'POST'} method
 * @param {string} path
 * @param {{body?: object, fieldMask?: string}} [options]
 * @returns {Promise<{status: number, json: any}>}
 */
async function placesCall(method, path, options = {}) {
  const headers = Object.assign({ 'Accept': 'application/json' }, await authHeaders());
  if (options.fieldMask) headers['X-Goog-FieldMask'] = options.fieldMask;
  const payload = options.body ? JSON.stringify(options.body) : undefined;
  if (payload) headers['Content-Type'] = 'application/json';
  return new Promise((resolve, reject) => {
    const request = https.request({ host: PLACES_HOST, path, method, headers, timeout: 10000 }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        let json;
        try { json = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (error) { json = undefined; }
        resolve({ status: response.statusCode || 0, json });
      });
    });
    request.on('timeout', () => request.destroy(new Error('Places timed out')));
    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

/**
 * @param {{q: string, near?: {lat: number, lon: number}, place?: string}} search
 */
function searchPlaces(search) {
  return placesCall('POST', '/v1/places:searchText', { body: searchBody(search), fieldMask: SEARCH_FIELDS });
}

/**
 * The details of one place, with its first photo as an address that needs no
 * key (and who took it, which Google asks us to show).
 *
 * @param {string} id
 * @param {DailyCaps} caps
 * @returns {Promise<{status: number, json: any}>}
 */
async function placeDetails(id, caps) {
  const details = await placesCall('GET', `/v1/places/${encodeURIComponent(id)}`, { fieldMask: DETAIL_FIELDS });
  if (details.status !== 200 || !details.json) return details;
  const photo = (details.json.photos || [])[0];
  delete details.json.photos;
  if (photo && photo.name && caps.take('photo')) {
    const media = await placesCall('GET', `/v1/${photo.name}/media?maxWidthPx=${PHOTO_WIDTH}&skipHttpRedirect=true`).catch(() => undefined);
    if (media && media.status === 200 && media.json && media.json.photoUri) {
      const author = (photo.authorAttributions || [])[0] || {};
      details.json.photo = { uri: media.json.photoUri, by: author.displayName, byUri: author.uri };
    }
  }
  return details;
}

module.exports = { cleanPlace, parseNear, searchBody, cleanPlaceId, DailyCaps, DAILY_CAPS, searchPlaces, placeDetails, SEARCH_FIELDS, DETAIL_FIELDS, NEAR_RADIUS_M };
