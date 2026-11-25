import { describe, it, expect } from 'vitest';
import { adjustGenres, genreChanges, myGenres, cleanGenre, MAX_GENRE_CHANGES } from '../src/model/myGenres';
import { ListEntry } from '../src/model/listEntry';
import { categoryWords } from '../src/model/categoryWords';

describe('my own genres and cuisines', () => {
    it('applies my changes to the source\'s genres, each once whatever its case', () => {
        expect(adjustGenres(['Indian', 'Vegan'], ['Breakfast', 'indian'], ['vegan'])).toEqual(['Indian', 'Breakfast']);
        expect(adjustGenres([], ['Pizza'])).toEqual(['Pizza']);
    });

    it('stores only what differs from the source', () => {
        expect(genreChanges(['Indian', 'Vegan'], ['Indian', 'Breakfast'])).toEqual({ genresAdded: ['Breakfast'], genresRemoved: ['Vegan'] });
        expect(genreChanges(['Indian'], ['indian'])).toEqual({ genresAdded: [], genresRemoved: [] });
        expect(genreChanges([], [])).toEqual({ genresAdded: [], genresRemoved: [] });
        const many = Array.from({ length: 50 }, (_, i) => 'G' + i);
        expect(genreChanges([], many).genresAdded).toHaveLength(MAX_GENRE_CHANGES);
    });

    it('shows the source\'s genres when I have no entry', () => {
        expect(myGenres(['Thai'], undefined)).toEqual(['Thai']);
        expect(myGenres(undefined, { genresAdded: ['Pizza'] })).toEqual(['Pizza']);
    });

    it('cleans what is typed', () => {
        expect(cleanGenre('  thai   street food ')).toBe('Thai street food');
        expect(cleanGenre('   ')).toBeUndefined();
        expect(cleanGenre('x'.repeat(41))).toBeUndefined();
    });

    it('reads my changes from my entry, and nothing when absent or wrong', () => {
        const base = { uid: 'u', swrlID: 's', type: 8, category: 6, details: { id: 's', title: 'T', imageUrl: 'i' } };
        const entry = ListEntry.fromFirestore({ ...base, genresAdded: ['Pizza', 3], genresRemoved: ['Vegan'] });
        expect(entry.genresAdded).toEqual(['Pizza']);
        expect(entry.genresRemoved).toEqual(['Vegan']);
        expect(ListEntry.fromFirestore({ ...base, genresAdded: 'Pizza' }).genresAdded).toEqual([]);
    });

    it('calls them cuisines for places to eat, genres elsewhere', () => {
        expect(categoryWords(6).genre).toBe('cuisine');
        [1, 2, 3, 4].forEach(id => expect(categoryWords(id).genre).toBe('genre'));
    });
});
