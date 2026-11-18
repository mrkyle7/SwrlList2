import { describe, it, expect } from 'vitest';
import { Details } from '../src/model/details';
import {
    COMPACT, DETAILED, DEFAULT_LIST_VIEW, listViewFromId, listViews, cardMeta, statsSentence, activeFilterCount
} from '../src/model/listView';

/** @param {Object} fields */
function details(fields = {}) {
    const d = new Details('id-1', 'A Film', 'http://img', undefined, undefined, undefined,
        [], [], undefined, undefined, [], [], undefined, [], [], undefined,
        undefined, undefined, undefined, [], [], [], [], undefined, undefined, undefined);
    return Object.assign(d, fields);
}

describe('list view', () => {
    it('is compact until the user chooses', () => {
        expect(DEFAULT_LIST_VIEW).toBe(COMPACT);
        expect(listViewFromId(undefined)).toBe(COMPACT);
    });
    it('reads the stored values back, and treats anything else as compact', () => {
        expect(listViewFromId('compact')).toBe(COMPACT);
        expect(listViewFromId('detailed')).toBe(DETAILED);
        expect(listViewFromId('cards')).toBe(COMPACT);
    });
    it('keeps the stored ids stable', () => {
        expect(listViews.map(view => view.id)).toEqual(['compact', 'detailed']);
    });
});

describe('cardMeta', () => {
    it('starts with the kind and adds who, when and how long', () => {
        expect(cardMeta('Film', details({ releaseYear: '2021', runtime: '1h 58m' }))).toBe('Film · 2021 · 1h 58m');
        expect(cardMeta('Book', details({ author: 'Ann Author', releaseYear: '1999' }))).toBe('Book · Ann Author · 1999');
    });
    it('is just the kind when nothing else is known', () => {
        expect(cardMeta('Board game', details())).toBe('Board game');
    });
});

describe('statsSentence', () => {
    it('says the counts in words', () => {
        expect(statsSentence({ listCount: 4, recommendedCount: 1, lovedCount: 2 })).toBe('On 4 lists · Swrled once · 2 love it');
        expect(statsSentence({ listCount: 1, recommendedCount: 3, lovedCount: 1 })).toBe('On 1 list · Swrled 3 times · 1 loves it');
    });
    it('leaves out the zeros, and is empty when all are zero', () => {
        expect(statsSentence({ listCount: 2, recommendedCount: 0, lovedCount: 0 })).toBe('On 2 lists');
        expect(statsSentence({ listCount: 0, recommendedCount: 0, lovedCount: 0 })).toBe('');
    });
});

describe('activeFilterCount', () => {
    it('counts the type, the other filters, labels and genres', () => {
        expect(activeFilterCount({ typeFilter: undefined, filters: [], labelFilters: [], genreFilters: [] })).toBe(0);
        expect(activeFilterCount({ typeFilter: {}, filters: [1], labelFilters: ['a', 'b'], genreFilters: ['Drama'] })).toBe(5);
    });
});

import { countsByCategory, latestRecommendedSwrls } from '../src/model/listView';

describe('countsByCategory', () => {
    const watch = { name: 'watch' }, read = { name: 'read' };
    it('counts what is on my list per category, leaving out done-only and dismissed', () => {
        expect(countsByCategory([
            { later: true, deleted: false, category: watch },
            { later: true, deleted: false, category: watch },
            { later: false, deleted: false, category: watch },
            { later: true, deleted: true, category: read },
            { later: true, deleted: false, category: read }
        ])).toEqual({ watch: 2, read: 1 });
    });
    it('is empty for an empty list', () => {
        expect(countsByCategory([])).toEqual({});
    });
});

describe('latestRecommendedSwrls', () => {
    it('gives the newest swrls first, each once, up to the limit', () => {
        const day = n => new Date(2026, 0, n);
        expect(latestRecommendedSwrls([
            { swrlID: 'a', created: day(1) }, { swrlID: 'b', created: day(5) }, { swrlID: 'a', created: day(9) },
            { swrlID: 'c', created: day(3) }, { swrlID: 'd' }
        ], 3)).toEqual(['a', 'b', 'c']);
    });
});
