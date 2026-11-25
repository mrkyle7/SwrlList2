import { describe, it, expect } from 'vitest';
// Category first, as the app loads it (the searches need it)
import '../src/constants/Category';
import {
    placeDetails, placesFromSearch, placeKind, cuisineNames, stockPhoto, isPlaceToEat, placeDescription, DEFAULT_PLACE_PHOTO, PLACE_ID_PREFIX
} from '../src/model/restaurant';
import { Details } from '../src/model/details';
import { swrlKind, RESTAURANT } from '../src/constants/Type';
import { metaLine, detailFacts } from '../src/model/swrlPage';

/** A search result as Google sends it, with only the fields we ask for. */
const dishoom = {
    id: 'ChIJm8kQ0M4EdkgRrOXWGk3O7Kk',
    displayName: { text: 'Dishoom Covent Garden', languageCode: 'en' },
    shortFormattedAddress: "12 Upper St Martin's Ln, London",
    location: { latitude: 51.5131, longitude: -0.1270 },
    primaryType: 'indian_restaurant',
    types: ['indian_restaurant', 'restaurant', 'food', 'point_of_interest', 'establishment']
};

describe('places to eat from Google', () => {
    it('makes a card from a search result, with the cuisine photo', () => {
        const details = placeDetails(dishoom);
        expect(details.id).toBe('ChIJm8kQ0M4EdkgRrOXWGk3O7Kk');
        expect(details.title).toBe('Dishoom Covent Garden');
        expect(details.imageUrl).toContain('1585937421612-70a008356fbe'); // indian
        expect(details.genres).toEqual(['Indian']);
        expect(details.overview).toBe('Indian restaurant in London.');
        expect(details.place).toEqual({
            kind: 'Restaurant', area: 'London', address: "12 Upper St Martin's Ln, London",
            lat: 51.5131, lon: -0.127, photoBy: undefined, photoByUrl: undefined, summaryNote: undefined
        });
        expect(details.links[0].url).toBe('https://www.google.com/maps/search/?api=1&query=Dishoom%20Covent%20Garden&query_place_id=ChIJm8kQ0M4EdkgRrOXWGk3O7Kk');
        expect(PLACE_ID_PREFIX + details.id).toBe('GPLACE_ChIJm8kQ0M4EdkgRrOXWGk3O7Kk');
    });

    it('uses the description and the Google photo when the page opens', () => {
        const details = placeDetails({
            ...dishoom,
            editorialSummary: { text: 'Bombay café serving breakfast, small plates and grills.' },
            photo: { uri: 'https://lh3.googleusercontent.com/places/abc=s800', by: 'A Diner', byUri: 'https://maps.google.com/maps/contrib/1' }
        });
        expect(details.imageUrl).toBe('https://lh3.googleusercontent.com/places/abc=s800');
        expect(details.overview).toBe('Bombay café serving breakfast, small plates and grills.');
        expect(details.place.photoBy).toBe('A Diner');
        expect(detailFacts(details).map(fact => fact.label)).toEqual(['Address', 'Photo']);
    });

    it('describes a place: editors first, then Gemini with its note, then a plain line', () => {
        const known = { kind: 'Restaurant', cuisine: 'Pizza', area: 'Soho' };
        expect(placeDescription({ id: 'x', editorialSummary: { text: 'Hand-written.' }, generativeSummary: { overview: { text: 'AI.' } } }, known))
            .toEqual({ text: 'Hand-written.' });
        expect(placeDescription({ id: 'x', generativeSummary: { overview: { text: 'Lively pizzeria.' }, disclosureText: { text: 'Summarized with Gemini' } } }, known))
            .toEqual({ text: 'Lively pizzeria.', note: 'Summarized with Gemini' });
        expect(placeDescription({ id: 'x', reviewSummary: { text: { text: 'People love the crust.' } } }, known))
            .toEqual({ text: 'People love the crust.', note: 'Summarized with Gemini' });
        expect(placeDescription({ id: 'x' }, known)).toEqual({ text: 'Pizza restaurant in Soho.' });
        expect(placeDescription({ id: 'x' }, { kind: 'Pub', area: 'Bloomsbury' })).toEqual({ text: 'Pub in Bloomsbury.' });
        expect(placeDescription({ id: 'x' }, { kind: 'Café' })).toEqual({ text: 'Café.' });
        const details = placeDetails({ ...dishoom, generativeSummary: { overview: { text: 'Bustling.' }, disclosureText: { text: 'Summarized with Gemini' } } });
        expect(detailFacts(details).map(fact => [fact.label, fact.value])).toContainEqual(['Description', 'Summarized with Gemini']);
    });

    it('uses a placeholder, not a photo of somewhere, when no cuisine fits', () => {
        expect(DEFAULT_PLACE_PHOTO).toBe('img/place-placeholder.svg');
        expect(placeDetails({ id: 'ChIJplain0000001', displayName: { text: 'Somewhere' }, types: ['restaurant'] }).imageUrl).toBe(DEFAULT_PLACE_PHOTO);
    });

    it('says what kind of place it is, and its cuisines', () => {
        expect(placeKind(['pub', 'bar', 'restaurant'])).toBe('Pub');
        expect(placeKind(['coffee_shop', 'cafe'])).toBe('Café');
        expect(placeKind(['fast_food_restaurant'])).toBe('Takeaway');
        expect(placeKind(['sushi_restaurant', 'restaurant'])).toBe('Restaurant');
        expect(cuisineNames(['middle_eastern_restaurant', 'fast_food_restaurant', 'restaurant'])).toEqual(['Middle eastern']);
        expect(stockPhoto(['pizza_restaurant'])).toContain('1513104890138');
        expect(stockPhoto(['coffee_shop'])).toContain('1509042239860');
        expect(stockPhoto(['georgian_restaurant'])).toBe(DEFAULT_PLACE_PHOTO);
    });

    it('keeps only places to eat or drink, each once, in Google\'s order', () => {
        const lamb = { id: 'ChIJlamb00000001', displayName: { text: 'The Lamb' }, primaryType: 'pub', types: ['pub', 'bar'] };
        const museum = { id: 'ChIJmuseum000001', displayName: { text: 'Dishoom Museum' }, types: ['museum'] };
        expect(isPlaceToEat(museum)).toBe(false);
        expect(placesFromSearch({ places: [lamb, museum, dishoom, lamb] }).map(d => d.title)).toEqual(['The Lamb', 'Dishoom Covent Garden']);
        expect(placesFromSearch({})).toEqual([]);
        expect(placeDetails({ id: 'ChIJnoname000001', types: ['restaurant'] })).toBeUndefined();
    });

    it('keeps the place through Firestore and leaves out what is missing', () => {
        const details = placeDetails({ id: 'ChIJbar000000001', displayName: { text: 'Bar Termini' }, types: ['bar'], location: { latitude: 1, longitude: 2 } });
        expect(details.toJSON().place).toEqual({ kind: 'Bar', lat: 1, lon: 2 });
        expect(Details.fromJSON(JSON.parse(JSON.stringify(details.toJSON()))).place).toEqual({ kind: 'Bar', lat: 1, lon: 2 });
    });

    it('says the kind of place and where on cards', () => {
        const details = placeDetails(dishoom);
        expect(swrlKind(RESTAURANT, details)).toBe('Restaurant');
        expect(metaLine(details)).toBe('London');
    });
});
