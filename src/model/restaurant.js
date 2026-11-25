import { Details } from './details';
import { Link } from './link';

/**
 * Places to eat from OpenStreetMap (the Overpass API, through server.js):
 * turning its elements into swrls, and choosing their pictures. Pure; tested
 * in test/restaurant.test.js.
 *
 * Pictures, best first: a photo the OpenStreetMap entry links to (`image`,
 * `wikimedia_commons`); then the picture the restaurant's own website shares
 * (its og:image, looked up when the swrl's page opens, see
 * detailGetters/osmPlaceGetter.js); then a stock photo for its cuisine.
 */

/** The swrl id is this plus n, w or r (node, way, relation) and the OSM id. */
export const PLACE_ID_PREFIX = 'OSMPLACE_';

const UNSPLASH = (photo) => `https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=800&q=80`;

/** When nothing better is known: a restaurant dining room. */
export const DEFAULT_PLACE_PHOTO = UNSPLASH('1517248135467-4c7edcad34c4');

/** Stock photos by cuisine (OSM `cuisine` values and a few kinds of place). */
const CUISINE_PHOTOS = {
    greek: UNSPLASH('1544025162-d76694265947'),
    mediterranean: UNSPLASH('1540189549336-e6e99c3679fe'),
    italian: UNSPLASH('1555396273-367ea4eb4db5'),
    pizza: UNSPLASH('1513104890138-7c749659a591'),
    japanese: UNSPLASH('1579871494447-9811cf80d66c'),
    sushi: UNSPLASH('1579871494447-9811cf80d66c'),
    indian: UNSPLASH('1585937421612-70a008356fbe'),
    thai: UNSPLASH('1559314809-0d155014e29e'),
    mexican: UNSPLASH('1565299585323-38d6b0865b47'),
    burger: UNSPLASH('1568901346375-23c9450c58cd'),
    cafe: UNSPLASH('1509042239860-f550ce710b93'),
    coffee: UNSPLASH('1509042239860-f550ce710b93'),
    coffee_shop: UNSPLASH('1509042239860-f550ce710b93'),
    bakery: UNSPLASH('1509440159596-0249088772ff'),
    seafood: UNSPLASH('1559737558-2f5a35f4523b'),
    fish_and_chips: UNSPLASH('1559737558-2f5a35f4523b'),
    steak: UNSPLASH('1544025162-d76694265947'),
    steak_house: UNSPLASH('1544025162-d76694265947')
};

/** OSM `amenity` values, as people say them. */
const KINDS = { restaurant: 'Restaurant', cafe: 'Café', fast_food: 'Takeaway', pub: 'Pub', bar: 'Bar' };

/**
 * A stock photo for a place's cuisine(s) ("greek;mediterranean"), or failing
 * that its kind (a café), or a restaurant.
 *
 * @param {string | undefined} cuisine OSM `cuisine`
 * @param {string} [amenity] OSM `amenity`
 * @return {string}
 */
export function stockPhoto(cuisine, amenity) {
    const tokens = String(cuisine || '').toLowerCase().split(/[;,/|]+/).map(token => token.trim()).filter(Boolean);
    for (const token of tokens) {
        if (CUISINE_PHOTOS[token]) return CUISINE_PHOTOS[token];
    }
    for (const token of tokens) {
        const key = Object.keys(CUISINE_PHOTOS).find(name => token.includes(name) || name.includes(token));
        if (key) return CUISINE_PHOTOS[key];
    }
    if (amenity === 'cafe') return CUISINE_PHOTOS.cafe;
    return DEFAULT_PLACE_PHOTO;
}

/**
 * A photo the OpenStreetMap entry itself points at: an `image` URL, or a
 * Wikimedia Commons file.
 *
 * @param {Object<string, string>} tags
 * @return {string | undefined}
 */
export function photoFromTags(tags) {
    const image = (tags.image || '').trim();
    if (/^https?:\/\//i.test(image) && !/\.(svg|pdf)(\?|$)/i.test(image)) return image.replace(/^http:/i, 'https:');
    const commons = (tags.wikimedia_commons || (/^File:/i.test(image) ? image : '')).trim();
    const file = /^File:(.+)$/i.exec(commons);
    if (file) return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file[1].trim().replace(/ /g, '_'))}?width=800`;
    return undefined;
}

/**
 * Cuisines as words for people (and the genre filter): "greek;fish_and_chips"
 * -> ["Greek", "Fish and chips"].
 *
 * @param {string | undefined} cuisine
 * @return {string[]}
 */
export function cuisineNames(cuisine) {
    return String(cuisine || '').split(/[;,]+/).map(token => token.trim().replace(/_/g, ' ')).filter(Boolean)
        .map(token => token.charAt(0).toUpperCase() + token.slice(1)).slice(0, 5);
}

/**
 * @param {Object<string, string>} tags
 * @return {string | undefined} "12 Frith Street, London W1D 4RG"
 */
function addressOf(tags) {
    const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
    const town = [tags['addr:city'], tags['addr:postcode']].filter(Boolean).join(' ');
    const line = [tags['addr:housename'], street, town].filter(Boolean).join(', ');
    return line || undefined;
}

/**
 * The website an entry lists, as a full address.
 *
 * @param {Object<string, string>} tags
 * @return {string | undefined}
 */
export function websiteOf(tags) {
    const raw = (tags.website || tags['contact:website'] || tags.url || '').trim().split(/\s*;\s*/)[0];
    if (!raw) return undefined;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : undefined;
    } catch (error) {
        return undefined;
    }
}

/**
 * The id this app keeps for an OSM element: "n123", "w45", "r6".
 *
 * @param {{type: string, id: number}} element
 * @return {string | undefined}
 */
export function placeId(element) {
    const letter = { node: 'n', way: 'w', relation: 'r' }[element && element.type];
    return letter && Number.isInteger(element.id) ? letter + element.id : undefined;
}

/**
 * Details for an Overpass element (a node with lat/lon, or a way or relation
 * with a `center`), or undefined when it is no place to eat (no name).
 *
 * @param {{type: string, id: number, lat?: number, lon?: number, center?: {lat: number, lon: number}, tags?: Object<string, string>}} element
 * @return {Details | undefined}
 */
export function placeDetails(element) {
    const id = placeId(element);
    const tags = (element && element.tags) || {};
    const name = (tags.name || '').trim();
    if (!id || !name) return undefined;
    const lat = element.lat !== undefined ? element.lat : element.center && element.center.lat;
    const lon = element.lon !== undefined ? element.lon : element.center && element.center.lon;
    const website = websiteOf(tags);
    const links = [];
    if (website) links.push(new Link(website, 'Website', undefined));
    if (typeof lat === 'number' && typeof lon === 'number') {
        links.push(new Link(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}%20${lat},${lon}`, 'Google Maps', undefined));
    }
    links.push(new Link(`https://www.openstreetmap.org/${element.type}/${element.id}`, 'OpenStreetMap', undefined));
    const details = new Details(id, name, photoFromTags(tags) || stockPhoto(tags.cuisine, tags.amenity),
        undefined, undefined, undefined, cuisineNames(tags.cuisine), links,
        undefined, tags.description || undefined,
        [], [], undefined, [], [], undefined, undefined, undefined, undefined, [], [], [], [], undefined, undefined, undefined);
    details.place = {
        kind: KINDS[tags.amenity] || 'Restaurant',
        area: tags['addr:suburb'] || tags['addr:district'] || tags['addr:city'] || undefined,
        address: addressOf(tags),
        openingHours: tags.opening_hours || undefined,
        phone: tags.phone || tags['contact:phone'] || undefined,
        website,
        lat: typeof lat === 'number' ? lat : undefined,
        lon: typeof lon === 'number' ? lon : undefined
    };
    return details;
}

/**
 * Straight-line distance in metres.
 *
 * @param {{lat: number, lon: number}} a
 * @param {{lat: number, lon: number}} b
 * @return {number}
 */
export function distanceMetres(a, b) {
    const rad = (/** @type {number} */ degrees) => degrees * Math.PI / 180;
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Details for every place in an Overpass answer, each once, nearest first
 * when searching near somewhere, otherwise names that start with what was
 * typed first.
 *
 * @param {{elements?: any[]}} answer
 * @param {{query?: string, near?: {lat: number, lon: number}}} [search]
 * @return {Details[]}
 */
export function placesFromOverpass(answer, search = {}) {
    const seen = new Set();
    const places = [];
    ((answer && answer.elements) || []).forEach(element => {
        const details = placeDetails(element);
        if (details && !seen.has(details.id)) {
            seen.add(details.id);
            places.push(details);
        }
    });
    if (search.near) {
        const near = search.near;
        const far = (/** @type {Details} */ details) => details.place && typeof details.place.lat === 'number'
            ? distanceMetres(near, { lat: details.place.lat, lon: details.place.lon }) : Infinity;
        return places.sort((a, b) => far(a) - far(b));
    }
    const typed = String(search.query || '').trim().toLowerCase();
    if (!typed) return places;
    const starts = places.filter(details => details.title.toLowerCase().startsWith(typed));
    return [...starts, ...places.filter(details => !starts.includes(details))];
}
