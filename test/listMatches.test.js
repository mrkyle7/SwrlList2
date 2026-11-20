import { describe, it, expect } from 'vitest';
import { listMatches, normaliseTitle } from '../src/model/listMatches';

/** @param {string} title @param {{later?: boolean, done?: boolean, loved?: boolean, deleted?: boolean}} [flags] */
const entry = (title, flags = { later: true }) => ({ details: { title }, ...flags });

describe('normaliseTitle', () => {
    it('ignores case, accents and punctuation', () => {
        expect(normaliseTitle('Amélie: The Film!')).toBe('amelie the film');
    });
});

describe('listMatches', () => {
    const entries = [entry('Dune: Part Two'), entry('The Dune Encyclopedia'), entry('Dune'), entry('Arrival')];
    it('finds titles with every word typed, the ones starting with it first', () => {
        expect(listMatches(entries, 'dune').map(e => e.details.title)).toEqual(['Dune: Part Two', 'Dune', 'The Dune Encyclopedia']);
        expect(listMatches(entries, 'dune two').map(e => e.details.title)).toEqual(['Dune: Part Two']);
    });
    it('needs at least two letters', () => {
        expect(listMatches(entries, 'd')).toEqual([]);
        expect(listMatches(entries, '  ')).toEqual([]);
    });
    it('leaves out swrls taken off every list', () => {
        const gone = [entry('Dune', { deleted: true, later: true }), entry('Dune Messiah', { later: false, done: false, loved: false })];
        expect(listMatches(gone, 'dune')).toEqual([]);
    });
    it('keeps done and loved ones', () => {
        expect(listMatches([entry('Dune', { done: true })], 'dune')).toHaveLength(1);
        expect(listMatches([entry('Dune', { loved: true })], 'dune')).toHaveLength(1);
    });
    it('shows a few at most', () => {
        const many = Array.from({ length: 10 }, (_, i) => entry('Dune ' + i));
        expect(listMatches(many, 'dune')).toHaveLength(4);
        expect(listMatches(many, 'dune', 2)).toHaveLength(2);
    });
});
