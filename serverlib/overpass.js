// @ts-nocheck server code (CommonJS, like server.js); its pure parts are tested in test/
'use strict';

/**
 * Overpass API (OpenStreetMap) queries for the Eat category, built here from
 * validated pieces: the client sends what it typed and where, never query
 * text. Pure, so test/overpass.test.js can check the queries.
 *
 * Overpass QL: https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL
 */

/** The kinds of place to eat we search for (OSM `amenity` values). */
const AMENITIES = ['restaurant', 'cafe', 'fast_food', 'pub', 'bar'];
/** The kinds whose `cuisine` is worth searching ("pizza", "thai"). */
const CUISINE_AMENITIES = ['restaurant', 'cafe', 'fast_food'];
/** How far "near me" reaches, in metres. */
const NEAR_RADIUS_M = 2500;
/** At most this many places per search. */
const MAX_RESULTS = 40;
/** Places people type whose boundary has another name in OSM. */
const PLACE_ALIASES = {
  'london': 'Greater London',
  'greater london': 'Greater London'
};

/**
 * The words of a search as an Overpass regular expression: letters and
 * digits only, each word in turn with anything between them ("pizza express"
 * finds "PizzaExpress"); apostrophes and "&" match any character, so
 * "nandos" and "nando's" both find "Nando’s". Undefined when nothing is left.
 *
 * @param {string} text
 * @returns {string | undefined}
 */
function searchPattern(text) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/['’&]/g, '.')
    .replace(/[^\p{L}\p{N}.\s]+/gu, ' ')
    .split(/\s+/)
    .map(word => word.replace(/^\.+|\.+$/g, ''))
    .filter(word => word.length > 0)
    .slice(0, 6);
  if (words.length === 0) return undefined;
  const pattern = words.join('.*');
  return pattern.length <= 100 ? pattern : undefined;
}

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
 * The OSM names to look for a town or city's boundary under: the alias
 * ("London" is "Greater London"), what was typed, the same in title case, and
 * "City of ..." (Edinburgh's boundary is "City of Edinburgh").
 *
 * @param {string} place cleaned
 * @returns {string[]}
 */
function boundaryNames(place) {
  const alias = PLACE_ALIASES[place.toLowerCase()];
  if (alias) return [alias];
  const titled = place.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (all, start, letter) => start + letter.toUpperCase());
  return [...new Set([place, titled, `City of ${titled}`])];
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
 * The query for places to eat whose name, or cuisine, matches what was typed,
 * near a point or inside a town or city.
 *
 * @param {{q: string, near?: {lat: number, lon: number}, place?: string}} search
 *   q: what was typed; near: from parseNear; place: from cleanPlace
 * @returns {string | undefined} undefined when the search is unusable
 */
function searchQuery(search) {
  const pattern = searchPattern(search.q);
  if (!pattern || (!search.near && !search.place)) return undefined;
  // one exact amenity per statement: Overpass finds exact tags in its index,
  // where a pattern on amenity makes it read every element in the area
  // (Greater London took longer than the 20 s we wait)
  let scope;
  let head = '';
  if (search.near) {
    scope = `(around:${NEAR_RADIUS_M},${search.near.lat},${search.near.lon})`;
  } else {
    const areas = boundaryNames(search.place)
      .map(name => `area["name"="${name}"]["boundary"="administrative"];`).join('');
    head = `(${areas})->.a;`;
    scope = '(area.a)';
  }
  const byName = AMENITIES.map(kind => `nwr["amenity"="${kind}"]["name"~"${pattern}",i]${scope};`).join('');
  const byCuisine = CUISINE_AMENITIES.map(kind => `nwr["amenity"="${kind}"]["cuisine"~"${pattern}",i]${scope};`).join('');
  return '[out:json][timeout:25];' + head + '(' + byName + byCuisine + `);out center tags ${MAX_RESULTS};`;
}

/**
 * The query for one place, by the id the app keeps: n, w or r and the OSM id
 * ("n123" is node 123).
 *
 * @param {string} id
 * @returns {string | undefined}
 */
function placeQuery(id) {
  const match = /^([nwr])(\d{1,12})$/.exec(String(id || ''));
  if (!match) return undefined;
  const kind = { n: 'node', w: 'way', r: 'relation' }[match[1]];
  return `[out:json][timeout:15];${kind}(${match[2]});out center tags;`;
}

module.exports = { searchPattern, cleanPlace, boundaryNames, parseNear, searchQuery, placeQuery, AMENITIES, NEAR_RADIUS_M, MAX_RESULTS };
