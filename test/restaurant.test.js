import { describe, it, expect } from 'vitest';
// Category first, as the app loads it (the searches need it)
import '../src/constants/Category';
import {
    placeDetails, placesFromOverpass, photoFromTags, stockPhoto, cuisineNames, websiteOf, placeId,
    distanceMetres, DEFAULT_PLACE_PHOTO, PLACE_ID_PREFIX
} from '../src/model/restaurant';
import { Details } from '../src/model/details';
import { swrlKind, RESTAURANT, FILM } from '../src/constants/Type';
import { metaLine, detailFacts } from '../src/model/swrlPage';

const dishoom = {
    type: 'node', id: 2210258521, lat: 51.5131, lon: -0.1270,
    tags: {
        amenity: 'restaurant', name: 'Dishoom', cuisine: 'indian', website: 'https://www.dishoom.com/covent-garden/',
        'addr:housenumber': '12', 'addr:street': 'Upper St Martin\'s Lane', 'addr:city': 'London', 'addr:postcode': 'WC2H 9FB',
        opening_hours: 'Mo-Fr 08:00-23:00; Sa,Su 09:00-23:00', phone: '+44 20 7420 9320'
    }
};

describe('places to eat from OpenStreetMap', () => {
    it('makes details from a node, with the cuisine photo when it has none', () => {
        const details = placeDetails(dishoom);
        expect(details.id).toBe('n2210258521');
        expect(details.title).toBe('Dishoom');
        expect(details.imageUrl).toContain('1585937421612-70a008356fbe'); // indian
        expect(details.genres).toEqual(['Indian']);
        expect(details.place).toEqual({
            kind: 'Restaurant', area: 'London', address: '12 Upper St Martin\'s Lane, London WC2H 9FB',
            openingHours: 'Mo-Fr 08:00-23:00; Sa,Su 09:00-23:00', phone: '+44 20 7420 9320',
            website: 'https://www.dishoom.com/covent-garden/', lat: 51.5131, lon: -0.127
        });
        expect(details.links.map(link => link.name)).toEqual(['Website', 'Google Maps', 'OpenStreetMap']);
        expect(details.links[2].url).toBe('https://www.openstreetmap.org/node/2210258521');
    });

    it('uses the centre of a way, and leaves out places without a name', () => {
        const pub = placeDetails({ type: 'way', id: 45, center: { lat: 51.5, lon: -0.1 }, tags: { amenity: 'pub', name: 'The Lamb', 'addr:suburb': 'Bloomsbury' } });
        expect(pub.id).toBe('w45');
        expect(pub.place.kind).toBe('Pub');
        expect(pub.place.area).toBe('Bloomsbury');
        expect(pub.place.lat).toBe(51.5);
        expect(placeDetails({ type: 'node', id: 1, tags: { amenity: 'cafe' } })).toBeUndefined();
        expect(placeId({ type: 'area', id: 3 })).toBeUndefined();
    });

    it('prefers the photo the entry links to, then the cuisine, then a restaurant', () => {
        expect(photoFromTags({ image: 'http://example.com/a.jpg' })).toBe('https://example.com/a.jpg');
        expect(photoFromTags({ wikimedia_commons: 'File:The Lamb, Bloomsbury.jpg' }))
            .toBe('https://commons.wikimedia.org/wiki/Special:FilePath/The_Lamb%2C_Bloomsbury.jpg?width=800');
        expect(photoFromTags({ image: 'https://example.com/logo.svg' })).toBeUndefined();
        expect(stockPhoto('greek;mediterranean')).toContain('1544025162');
        expect(stockPhoto('Neapolitan_pizza')).toContain('1513104890138'); // contains "pizza"
        expect(stockPhoto(undefined, 'cafe')).toContain('1509042239860');
        expect(stockPhoto('georgian')).toBe(DEFAULT_PLACE_PHOTO);
        expect(placeDetails({ ...dishoom, tags: { ...dishoom.tags, image: 'https://example.com/d.jpg' } }).imageUrl).toBe('https://example.com/d.jpg');
    });

    it('reads cuisines and websites as people expect', () => {
        expect(cuisineNames('greek;fish_and_chips')).toEqual(['Greek', 'Fish and chips']);
        expect(cuisineNames(undefined)).toEqual([]);
        expect(websiteOf({ website: 'www.example.com' })).toBe('https://www.example.com/');
        expect(websiteOf({ 'contact:website': 'https://a.example; https://b.example' })).toBe('https://a.example/');
        expect(websiteOf({ website: 'not a site' })).toBeUndefined();
    });

    it('lists each place once, nearest first near me, names starting with the words first otherwise', () => {
        const answer = { elements: [
            { type: 'node', id: 1, lat: 51.52, lon: -0.10, tags: { name: 'The Pizza Place', amenity: 'restaurant' } },
            { type: 'node', id: 2, lat: 51.50, lon: -0.12, tags: { name: 'Pizza Union', amenity: 'restaurant' } },
            { type: 'node', id: 2, lat: 51.50, lon: -0.12, tags: { name: 'Pizza Union', amenity: 'restaurant' } }
        ] };
        expect(placesFromOverpass(answer, { query: 'pizza' }).map(d => d.title)).toEqual(['Pizza Union', 'The Pizza Place']);
        expect(placesFromOverpass(answer, { near: { lat: 51.521, lon: -0.101 } }).map(d => d.title)).toEqual(['The Pizza Place', 'Pizza Union']);
        expect(placesFromOverpass({}, {})).toEqual([]);
        expect(Math.round(distanceMetres({ lat: 51.5, lon: 0 }, { lat: 51.51, lon: 0 }))).toBe(1112);
    });

    it('keeps the place through Firestore and leaves out what is missing', () => {
        const details = placeDetails({ type: 'node', id: 7, lat: 1, lon: 2, tags: { name: 'Bar Termini', amenity: 'bar' } });
        const json = details.toJSON();
        expect(json.place).toEqual({ kind: 'Bar', lat: 1, lon: 2 });
        expect(Details.fromJSON(JSON.parse(JSON.stringify(json))).place).toEqual({ kind: 'Bar', lat: 1, lon: 2 });
        expect(PLACE_ID_PREFIX + details.id).toBe('OSMPLACE_n7');
    });

    it('says the kind of place and where on cards and the page', () => {
        const details = placeDetails(dishoom);
        expect(swrlKind(RESTAURANT, details)).toBe('Restaurant');
        expect(swrlKind(RESTAURANT, placeDetails({ type: 'node', id: 8, tags: { name: 'Monmouth', amenity: 'cafe' } }))).toBe('Café');
        expect(swrlKind(FILM, { })).toBe('Film');
        expect(metaLine(details)).toBe('London');
        expect(detailFacts(details).map(fact => fact.label)).toEqual(['Address', 'Opening hours', 'Phone']);
    });
});
