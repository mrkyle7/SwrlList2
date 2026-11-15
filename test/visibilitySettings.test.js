import { describe, it, expect } from 'vitest';
import { PRIVATE, FRIENDS, PUBLIC } from '../src/constants/Visibility';
import {
    chunk, entriesToRewrite, writeOrder, entryVisibilityData, currentChoice, defaultOptionLabel,
    emptySwrlerMessage, USE_DEFAULT, MAX_BATCH_WRITES
} from '../src/model/visibilitySettings';

const entry = (swrlID, visibility, visibilityOverride) => ({ swrlID, visibility, visibilityOverride });

describe('chunk', () => {
    it('splits into slices of at most the size, keeping order', () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
        expect(chunk([], 2)).toEqual([]);
        expect(chunk([1, 2], 2)).toEqual([[1, 2]]);
    });
    it('defaults to a size under the Firestore batch limit', () => {
        expect(MAX_BATCH_WRITES).toBeLessThanOrEqual(400);
        const sizes = chunk(Array.from({ length: 1001 }, (_, i) => i)).map(c => c.length);
        expect(sizes).toEqual([400, 400, 201]);
    });
});

describe('entriesToRewrite', () => {
    const entries = [
        entry('a', FRIENDS, false), entry('b', FRIENDS, true), entry('c', PUBLIC, false), entry('d', PRIVATE, true)
    ];
    it('picks the entries without an override that are not at the target yet', () => {
        expect(entriesToRewrite(entries, PUBLIC)).toEqual(['a']);
        expect(entriesToRewrite(entries, PRIVATE)).toEqual(['a', 'c']);
    });
    it('never touches an override, even a different one', () => {
        expect(entriesToRewrite(entries, FRIENDS)).toEqual(['c']);
    });
    it('is empty once everything is done, so a retry has nothing left', () => {
        const after = entries.map(e => e.visibilityOverride ? e : entry(e.swrlID, PRIVATE, false));
        expect(entriesToRewrite(after, PRIVATE)).toEqual([]);
    });
});

describe('writeOrder', () => {
    it('writes entries first when going more private or staying', () => {
        expect(writeOrder(PUBLIC, FRIENDS)).toBe('entriesFirst');
        expect(writeOrder(FRIENDS, PRIVATE)).toBe('entriesFirst');
        expect(writeOrder(PUBLIC, PRIVATE)).toBe('entriesFirst');
        expect(writeOrder(FRIENDS, FRIENDS)).toBe('entriesFirst');
    });
    it('writes the profile first when going less private', () => {
        expect(writeOrder(PRIVATE, FRIENDS)).toBe('profileFirst');
        expect(writeOrder(FRIENDS, PUBLIC)).toBe('profileFirst');
        expect(writeOrder(PRIVATE, PUBLIC)).toBe('profileFirst');
    });
});

describe('entryVisibilityData', () => {
    it('a specific choice is stored as an override and never touches `updated`', () => {
        const data = entryVisibilityData(PRIVATE, PUBLIC);
        expect(data).toEqual({ visibility: 'private', visibilityOverride: true });
        expect('updated' in data).toBe(false);
    });
    it('"use my default" stores the default as a non-override', () => {
        expect(entryVisibilityData(USE_DEFAULT, PUBLIC)).toEqual({ visibility: 'public', visibilityOverride: false });
        expect(entryVisibilityData(USE_DEFAULT, undefined)).toEqual({ visibility: 'friends', visibilityOverride: false });
    });
});

describe('currentChoice and labels', () => {
    it('shows the default unless the entry has an override', () => {
        expect(currentChoice({ visibility: PUBLIC, visibilityOverride: false })).toBe(USE_DEFAULT);
        expect(currentChoice({ visibility: PUBLIC, visibilityOverride: true })).toBe(PUBLIC);
    });
    it('names the default option after the current default', () => {
        expect(defaultOptionLabel(FRIENDS)).toBe('Default (Friends)');
        expect(defaultOptionLabel(PRIVATE)).toBe('Default (Private)');
        expect(defaultOptionLabel(undefined)).toBe('Default (Friends)');
    });
});

describe('emptySwrlerMessage', () => {
    it('does not reveal anything to strangers or signed-out viewers', () => {
        const text = 'Sam only shares swrls with friends, or has nothing public here.';
        expect(emptySwrlerMessage('viewer', 'sam', 'Sam', false)).toBe(text);
        expect(emptySwrlerMessage(undefined, 'sam', 'Sam', false)).toBe(text);
        expect(emptySwrlerMessage(undefined, 'sam', 'Sam', true)).toBe(text);
    });
    it('tells a friend there is nothing yet', () => {
        expect(emptySwrlerMessage('viewer', 'sam', 'Sam', true)).toBe('Nothing here yet.');
    });
    it('leaves the owner\'s own message alone', () => {
        expect(emptySwrlerMessage('sam', 'sam', 'Sam', false)).toBe('No Swrls to see here :(');
    });
    it('copes with a missing name', () => {
        expect(emptySwrlerMessage(undefined, 'sam', undefined, false)).toContain('only shares swrls with friends');
    });
});
