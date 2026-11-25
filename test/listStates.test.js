import { describe, it, expect } from 'vitest';
import { LIST_DONE, LIST_IN_PROGRESS, LIST_LATER, emptyListStateMessage, inListState, listStateCounts, listStateFromId, listStateOptions } from '../src/model/listStates';

const entry = (fields) => ({ later: false, inProgress: false, done: false, deleted: false, ...fields });

describe('the parts of my list', () => {
    it('names them with the category words', () => {
        expect(listStateOptions(1).map(o => o.label)).toEqual(['Later', 'Watching', 'Done']);
        expect(listStateOptions(3).map(o => o.label)).toEqual(['Later', 'Listening', 'Done']);
        expect(listStateOptions(6).map(o => o.label)).toEqual(['Later', 'Booked', 'Done']);
        expect(listStateOptions(2).map(o => o.id)).toEqual([LIST_LATER, LIST_IN_PROGRESS, LIST_DONE]);
    });

    it('defaults to Later', () => {
        expect(listStateFromId(undefined)).toBe(LIST_LATER);
        expect(listStateFromId('nonsense')).toBe(LIST_LATER);
        expect(listStateFromId('done')).toBe(LIST_DONE);
    });

    it('puts everything on the list under Later, started ones also under in progress', () => {
        const waiting = entry({ later: true });
        const started = entry({ later: true, inProgress: true });
        const done = entry({ done: true });
        expect(inListState(waiting, LIST_LATER)).toBe(true);
        expect(inListState(started, LIST_LATER)).toBe(true);
        expect(inListState(waiting, LIST_IN_PROGRESS)).toBe(false);
        expect(inListState(started, LIST_IN_PROGRESS)).toBe(true);
        expect(inListState(done, LIST_LATER)).toBe(false);
        expect(inListState(done, LIST_DONE)).toBe(true);
        expect(inListState(entry({ done: true, deleted: true }), LIST_DONE)).toBe(false);
        // in progress without being on the list (left over) does not count
        expect(inListState(entry({ inProgress: true }), LIST_IN_PROGRESS)).toBe(false);
    });

    it('says what to do when a part is empty', () => {
        expect(emptyListStateMessage(LIST_LATER, 1, 'Nothing on your list')).toBe('Nothing on your list');
        expect(emptyListStateMessage(LIST_IN_PROGRESS, 2, '')).toContain('“Start reading”');
        expect(emptyListStateMessage(LIST_IN_PROGRESS, 6, '')).toContain('“Mark as booked”');
        expect(emptyListStateMessage(LIST_DONE, 6, '')).toContain('ate there');
    });

    it('counts each part in one category', () => {
        const watch = { id: 1 };
        const entries = [
            entry({ later: true, category: watch }),
            entry({ later: true, inProgress: true, category: watch }),
            entry({ done: true, category: watch }),
            entry({ done: true, deleted: true, category: watch }),
            entry({ later: true, category: { id: 2 } })
        ];
        expect(listStateCounts(entries, 1)).toEqual({ later: 2, inProgress: 1, done: 1 });
        expect(listStateCounts(entries, 6)).toEqual({ later: 0, inProgress: 0, done: 0 });
    });
});
