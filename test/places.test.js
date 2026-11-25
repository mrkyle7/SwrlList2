import { describe, it, expect } from 'vitest';
// @ts-ignore CommonJS module shared with server.js
import places from '../serverlib/places.js';

const { cleanPlace, parseNear, searchBody, cleanPlaceId, DailyCaps, DAILY_CAPS, SEARCH_FIELDS, DETAIL_FIELDS } = places;

describe('Google Places requests', () => {
    it('searches a town by name, or near a point by distance', () => {
        expect(searchBody({ q: ' pizza ', place: 'London' })).toEqual({ textQuery: 'pizza in London', pageSize: 15, languageCode: 'en' });
        expect(searchBody({ q: 'thai', near: { lat: 51.51, lon: -0.13 } })).toEqual({
            textQuery: 'thai', pageSize: 15, languageCode: 'en',
            locationBias: { circle: { center: { latitude: 51.51, longitude: -0.13 }, radius: 2500 } }, rankPreference: 'DISTANCE'
        });
        expect(searchBody({ q: 'p', place: 'London' })).toBeUndefined();
        expect(searchBody({ q: 'pizza' })).toBeUndefined();
    });

    it('asks only for fields inside the cheaper allowances', () => {
        // search: Text Search Pro fields only, never photos, ratings or descriptions
        expect(SEARCH_FIELDS.split(',')).toEqual(['places.id', 'places.displayName', 'places.shortFormattedAddress', 'places.location', 'places.primaryType', 'places.types']);
        // details: the description and one photo's reference, nothing else billed higher
        expect(DETAIL_FIELDS.split(',')).toEqual(['id', 'displayName', 'shortFormattedAddress', 'location', 'primaryType', 'types', 'photos', 'editorialSummary']);
    });

    it('cleans what the app sends', () => {
        expect(cleanPlace('Bristol"}')).toBe('Bristol');
        expect(parseNear('51.507351,-0.127758')).toEqual({ lat: 51.51, lon: -0.13 });
        expect(parseNear('91,0')).toBeUndefined();
        expect(cleanPlaceId('ChIJm8kQ0M4EdkgRrOXWGk3O7Kk')).toBe('ChIJm8kQ0M4EdkgRrOXWGk3O7Kk');
        expect(cleanPlaceId('../places:searchText')).toBeUndefined();
        expect(cleanPlaceId('short')).toBeUndefined();
    });

    it('caps each kind of request per day, starting again the next day', () => {
        const caps = new DailyCaps({ search: 2 });
        const monday = new Date('2026-11-23T10:00:00Z');
        expect(caps.take('search', monday)).toBe(true);
        expect(caps.take('search', monday)).toBe(true);
        expect(caps.take('search', monday)).toBe(false);
        expect(caps.take('details', monday)).toBe(false); // no allowance for it
        expect(caps.take('search', new Date('2026-11-24T00:01:00Z'))).toBe(true);
    });

    it('keeps two instances inside the free monthly allowances', () => {
        const month = (/** @type {number} */ perDay) => perDay * 2 * 31;
        expect(month(DAILY_CAPS.search)).toBeLessThanOrEqual(5000); // Text Search Pro
        expect(month(DAILY_CAPS.details)).toBeLessThanOrEqual(1000); // Place Details Enterprise + Atmosphere
        expect(month(DAILY_CAPS.photo)).toBeLessThanOrEqual(1000); // Place Photos
    });
});
