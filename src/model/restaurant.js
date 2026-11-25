import { Details } from './details';
import { Link } from './link';

/**
 * Places to eat from the Google Places API (New), through server.js:
 * turning its places into swrls, and choosing their pictures. Pure; tested
 * in test/restaurant.test.js.
 *
 * Search asks for as little as possible (id, name, short address, location,
 * types), so a card's picture is a stock photo for its cuisine; opening the
 * place asks for its description and one Google photo, which replaces it
 * (and is saved with the swrl).
 */

/** The swrl id is this plus the Google place id. */
export const PLACE_ID_PREFIX = 'GPLACE_';

const UNSPLASH = (photo) => `https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=800&q=80`;

/**
 * When no cuisine photo fits: Eat's icon on its teal, so it cannot be taken
 * for a photo of the place itself.
 */
export const DEFAULT_PLACE_PHOTO = 'img/place-placeholder.svg';

/** Stock photos by cuisine (from Google types without "_restaurant", and a few kinds of place). */
const CUISINE_PHOTOS = {
    greek: UNSPLASH('1544025162-d76694265947'),
    mediterranean: UNSPLASH('1540189549336-e6e99c3679fe'),
    italian: UNSPLASH('1555396273-367ea4eb4db5'),
    pizza: UNSPLASH('1513104890138-7c749659a591'),
    japanese: UNSPLASH('1579871494447-9811cf80d66c'),
    sushi: UNSPLASH('1579871494447-9811cf80d66c'),
    ramen: UNSPLASH('1579871494447-9811cf80d66c'),
    indian: UNSPLASH('1585937421612-70a008356fbe'),
    thai: UNSPLASH('1559314809-0d155014e29e'),
    mexican: UNSPLASH('1565299585323-38d6b0865b47'),
    hamburger: UNSPLASH('1568901346375-23c9450c58cd'),
    burger: UNSPLASH('1568901346375-23c9450c58cd'),
    cafe: UNSPLASH('1509042239860-f550ce710b93'),
    coffee: UNSPLASH('1509042239860-f550ce710b93'),
    coffee_shop: UNSPLASH('1509042239860-f550ce710b93'),
    bakery: UNSPLASH('1509440159596-0249088772ff'),
    seafood: UNSPLASH('1559737558-2f5a35f4523b'),
    steak_house: UNSPLASH('1544025162-d76694265947'),
    steak: UNSPLASH('1544025162-d76694265947')
};

/** Google types that mean a place to eat or drink. */
const FOOD_TYPES = ['restaurant', 'food', 'cafe', 'coffee_shop', 'bar', 'pub', 'bakery', 'meal_takeaway', 'meal_delivery',
    'fast_food_restaurant', 'ice_cream_shop', 'sandwich_shop', 'dessert_shop', 'tea_house', 'wine_bar', 'bar_and_grill'];

/**
 * What a place is, as people say it, from its Google types.
 *
 * @param {string[]} types primary type first
 * @return {string}
 */
export function placeKind(types) {
    for (const type of types) {
        if (type === 'pub') return 'Pub';
        if (type === 'bar' || type === 'wine_bar') return 'Bar';
        if (type === 'cafe' || type === 'coffee_shop' || type === 'tea_house') return 'Café';
        if (type === 'bakery') return 'Bakery';
        if (type === 'meal_takeaway' || type === 'fast_food_restaurant') return 'Takeaway';
        if (type === 'restaurant' || type.endsWith('_restaurant')) return 'Restaurant';
    }
    return 'Restaurant';
}

/**
 * Cuisines from Google types: "italian_restaurant" -> "Italian",
 * "fast_food_restaurant" is a kind of place, not a cuisine.
 *
 * @param {string[]} types
 * @return {string[]}
 */
export function cuisineNames(types) {
    const names = types
        .filter(type => type.endsWith('_restaurant') && type !== 'fast_food_restaurant')
        .map(type => type.replace(/_restaurant$/, '').replace(/_/g, ' '))
        .map(name => name.charAt(0).toUpperCase() + name.slice(1));
    return [...new Set(names)].slice(0, 3);
}

/**
 * A stock photo for a place's cuisine, or its kind, or a restaurant.
 *
 * @param {string[]} types
 * @return {string}
 */
export function stockPhoto(types) {
    const tokens = types.map(type => type.replace(/_restaurant$/, ''));
    for (const token of tokens) {
        if (CUISINE_PHOTOS[token]) return CUISINE_PHOTOS[token];
    }
    return DEFAULT_PLACE_PHOTO;
}

/**
 * Whether a Google place is somewhere to eat or drink.
 *
 * @param {{types?: string[], primaryType?: string}} place
 * @return {boolean}
 */
export function isPlaceToEat(place) {
    const types = [place.primaryType, ...(place.types || [])].filter(Boolean);
    return types.some(type => FOOD_TYPES.includes(type) || type.endsWith('_restaurant'));
}

/**
 * @typedef {Object} GooglePlace
 * @property {string} id
 * @property {{text: string}} [displayName]
 * @property {string} [shortFormattedAddress]
 * @property {{latitude: number, longitude: number}} [location]
 * @property {string} [primaryType]
 * @property {string[]} [types]
 * @property {{text: string}} [editorialSummary] written by Google's editors (few places have one)
 * @property {{overview?: {text: string}, disclosureText?: {text: string}}} [generativeSummary] Gemini's, from details
 * @property {{text?: {text: string}, disclosureText?: {text: string}}} [reviewSummary] Gemini's summary of reviews, from details
 * @property {{uri: string, by?: string, byUri?: string}} [photo] added by server.js on details
 */

/**
 * Details for a Google place (from search, or the fuller answer when the
 * page opens), or undefined without an id or a name.
 *
 * @param {GooglePlace} place
 * @return {Details | undefined}
 */
export function placeDetails(place) {
    const name = place && place.displayName && place.displayName.text ? place.displayName.text.trim() : '';
    if (!place || !place.id || !name) return undefined;
    const types = [place.primaryType, ...(place.types || [])].filter(Boolean);
    const lat = place.location ? place.location.latitude : undefined;
    const lon = place.location ? place.location.longitude : undefined;
    const address = place.shortFormattedAddress || undefined;
    const area = address && address.includes(',') ? address.split(',').pop().trim() : undefined;
    const photo = place.photo && /^https:\/\//.test(place.photo.uri) ? place.photo : undefined;
    const links = [new Link(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(place.id)}`, 'Google Maps', undefined)];
    const kind = placeKind(types);
    const cuisines = cuisineNames(types);
    const summary = placeDescription(place, { kind, cuisine: cuisines[0], area });
    const details = new Details(place.id, name, photo ? photo.uri : stockPhoto(types),
        undefined, undefined, undefined, cuisines, links,
        undefined, summary.text,
        [], [], undefined, [], [], undefined, undefined, undefined, undefined, [], [], [], [], undefined, undefined, undefined);
    details.place = {
        kind,
        area,
        address,
        lat: typeof lat === 'number' ? lat : undefined,
        lon: typeof lon === 'number' ? lon : undefined,
        photoBy: photo && photo.by ? photo.by : undefined,
        photoByUrl: photo && photo.byUri ? photo.byUri : undefined,
        summaryNote: summary.note
    };
    return details;
}

/**
 * A place's description, best first: Google's editors' summary; Gemini's
 * overview or summary of reviews (with the note Google asks to show, "Summarized
 * with Gemini"); else a plain line from what we know ("Pizza restaurant in
 * London").
 *
 * @param {GooglePlace} place
 * @param {{kind: string, cuisine?: string, area?: string}} known
 * @return {{text: string, note?: string}}
 */
export function placeDescription(place, known) {
    const editorial = place.editorialSummary && place.editorialSummary.text;
    if (editorial && editorial.trim()) return { text: editorial.trim() };
    const ai = [
        place.generativeSummary && { text: place.generativeSummary.overview && place.generativeSummary.overview.text, note: place.generativeSummary.disclosureText && place.generativeSummary.disclosureText.text },
        place.reviewSummary && { text: place.reviewSummary.text && place.reviewSummary.text.text, note: place.reviewSummary.disclosureText && place.reviewSummary.disclosureText.text }
    ].find(found => found && found.text && found.text.trim());
    if (ai) return { text: ai.text.trim(), note: (ai.note && ai.note.trim()) || 'Summarized with Gemini' };
    const what = known.cuisine && known.kind === 'Restaurant' ? `${known.cuisine} restaurant` : known.kind;
    return { text: known.area ? `${what} in ${known.area}.` : `${what}.` };
}

/**
 * Details for every place to eat in a search answer, each once, in Google's
 * order (it already ranks by distance near me, by relevance in a town).
 *
 * @param {{places?: GooglePlace[]}} answer
 * @return {Details[]}
 */
export function placesFromSearch(answer) {
    const seen = new Set();
    const found = [];
    ((answer && answer.places) || []).forEach(place => {
        if (!isPlaceToEat(place)) return;
        const details = placeDetails(place);
        if (details && !seen.has(details.id)) {
            seen.add(details.id);
            found.push(details);
        }
    });
    return found;
}
