import { describe, it, expect } from 'vitest';
import { BOOT_VERSION, entryFromBoot, entryToBoot, usableBoot } from '../src/model/bootData';
import { changedData, changedDoc } from '../src/firebase/cacheFirst';
import { ListEntry } from '../src/model/listEntry';
import { FILM } from '../src/constants/Type';
import { WATCH } from '../src/constants/Category';

const raw = {
    uid: 'u1', swrlID: 's1', type: FILM.id, category: WATCH.id,
    details: { id: 's1', title: 'Past Lives', imageUrl: 'x.jpg', genres: ['Drama'] },
    later: true, inProgress: true, done: false, loved: true, deleted: false,
    visibility: 'friends', visibilityOverride: true,
    added: { toDate: () => new Date(1000) }, updated: { toDate: () => new Date(2000) }
};

describe('the copy saved for an instant start', () => {
    it('keeps a list entry, dates and all, through saving and reading back', () => {
        const entry = ListEntry.fromFirestore(raw);
        const saved = entryToBoot(entry);
        expect(saved.added).toBe(1000);
        expect(saved.updated).toBe(2000);
        expect(JSON.parse(JSON.stringify(saved))).toEqual(saved); // plain data, safe to store
        const back = entryFromBoot(saved);
        expect(back.swrlID).toBe('s1');
        expect(back.details.title).toBe('Past Lives');
        expect(back.inProgress && back.loved && back.later).toBe(true);
        expect(back.visibility.id).toBe('friends');
        expect(back.added.getTime()).toBe(1000);
        expect(back.updated.getTime()).toBe(2000);
    });
    it('skips an entry it cannot read rather than failing', () => {
        expect(entryFromBoot({ nonsense: true })).toBeUndefined();
    });
    it('only opens from a copy of the current shape, for someone', () => {
        const ok = { version: BOOT_VERSION, savedAt: 1, user: { uid: 'u1' }, settings: {}, entries: [] };
        expect(usableBoot(ok)).toBe(ok);
        expect(usableBoot(undefined)).toBeUndefined();
        expect(usableBoot({ ...ok, version: BOOT_VERSION - 1 })).toBeUndefined();
        expect(usableBoot({ ...ok, user: { uid: '' } })).toBeUndefined();
        expect(usableBoot({ ...ok, entries: 'x' })).toBeUndefined();
    });
});

describe('telling whether the server changed something', () => {
    const snap = (exists, data) => ({ exists: () => exists, data: () => data });
    it('compares what was shown with the fresh copy', () => {
        expect(changedDoc(snap(true, { a: 1 }), snap(true, { a: 1 }))).toBe(false);
        expect(changedDoc(snap(true, { a: 1 }), snap(true, { a: 2 }))).toBe(true);
        expect(changedDoc(snap(true, { a: 1 }), snap(false, undefined))).toBe(true);
        expect(changedDoc(undefined, snap(true, {}))).toBe(true);
        expect(changedData(['a'], ['a'])).toBe(false);
    });
});
