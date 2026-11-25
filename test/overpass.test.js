import { describe, it, expect } from 'vitest';
// @ts-ignore CommonJS module shared with server.js
import overpass from '../serverlib/overpass.js';

const { searchPattern, cleanPlace, boundaryNames, parseNear, searchQuery, placeQuery } = overpass;

describe('Overpass queries for places to eat', () => {
    it('turns what was typed into a safe pattern', () => {
        expect(searchPattern('Dishoom')).toBe('dishoom');
        expect(searchPattern('pizza  express')).toBe('pizza.*express');
        expect(searchPattern("Nando's")).toBe('nando.s');
        expect(searchPattern('fish & chips')).toBe('fish.*chips');
        expect(searchPattern('"]; out; ("')).toBe('out');
        expect(searchPattern('café')).toBe('café');
        expect(searchPattern('  ')).toBeUndefined();
        expect(searchPattern('***')).toBeUndefined();
    });

    it('cleans a town or city and finds the boundary names to try', () => {
        expect(cleanPlace(' Newcastle upon Tyne ')).toBe('Newcastle upon Tyne');
        expect(cleanPlace('Bristol"];out;')).toBe('Bristol ;out;'.replace(/;/g, ' ').replace(/\s+/g, ' ').trim());
        expect(cleanPlace('')).toBeUndefined();
        expect(boundaryNames('London')).toEqual(['Greater London']);
        expect(boundaryNames('london')).toEqual(['Greater London']);
        expect(boundaryNames('manchester')).toEqual(['manchester', 'Manchester', 'City of Manchester']);
        expect(boundaryNames('Edinburgh')).toEqual(['Edinburgh', 'City of Edinburgh']);
    });

    it('rounds "near" to about a kilometre and refuses nonsense', () => {
        expect(parseNear('51.507351,-0.127758')).toEqual({ lat: 51.51, lon: -0.13 });
        expect(parseNear('91,0')).toBeUndefined();
        expect(parseNear('51.5')).toBeUndefined();
        expect(parseNear('51.5,-0.1;out')).toBeUndefined();
    });

    it('searches names and cuisines inside a town or city', () => {
        const query = searchQuery({ q: 'pizza', place: 'London' });
        expect(query).toBe('[out:json][timeout:20];(area["name"="Greater London"]["boundary"="administrative"];)->.a;(' +
            'nwr["amenity"~"^(restaurant|cafe|fast_food|pub|bar)$"]["name"~"pizza",i](area.a);' +
            'nwr["amenity"~"^(restaurant|cafe|fast_food|pub|bar)$"]["cuisine"~"pizza",i](area.a);' +
            ');out center tags 40;');
    });

    it('searches near a point', () => {
        const query = searchQuery({ q: 'thai', near: { lat: 51.51, lon: -0.13 } });
        expect(query).toContain('["name"~"thai",i](around:2500,51.51,-0.13);');
        expect(query).not.toContain('area');
    });

    it('needs words and a place', () => {
        expect(searchQuery({ q: '', place: 'London' })).toBeUndefined();
        expect(searchQuery({ q: 'pizza' })).toBeUndefined();
    });

    it('looks up one place by the id the app keeps', () => {
        expect(placeQuery('n123')).toBe('[out:json][timeout:15];node(123);out center tags;');
        expect(placeQuery('w45')).toContain('way(45)');
        expect(placeQuery('r6')).toContain('relation(6)');
        expect(placeQuery('x1')).toBeUndefined();
        expect(placeQuery('n1);out;(')).toBeUndefined();
    });
});
