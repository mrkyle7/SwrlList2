import { describe, it, expect } from 'vitest';
import { hiddenByInboxFilters, emptyInboxMessage } from '../src/model/recommendation';

const state = (fields = {}) => ({ unread: false, hasUnreadReply: false, done: false, onList: false, ...fields });
const off = { showDone: false, showOnList: false };

describe('hiddenByInboxFilters', () => {
    it('counts what each filter hides', () => {
        const states = [state({ onList: true }), state({ onList: true }), state({ done: true }), state()];
        expect(hiddenByInboxFilters(states, off)).toEqual({ done: 1, onList: 2 });
    });
    it('never counts unread swrls or unread replies, which always show', () => {
        expect(hiddenByInboxFilters([state({ onList: true, unread: true }), state({ done: true, hasUnreadReply: true })], off))
            .toEqual({ done: 0, onList: 0 });
    });
    it('counts nothing for a filter that is already on', () => {
        expect(hiddenByInboxFilters([state({ onList: true }), state({ done: true })], { showDone: true, showOnList: false }))
            .toEqual({ done: 0, onList: 1 });
    });
    it('counts done and on my list once, as done', () => {
        expect(hiddenByInboxFilters([state({ done: true, onList: true })], off)).toEqual({ done: 1, onList: 0 });
    });
});

describe('emptyInboxMessage', () => {
    it('offers to show what is on my list', () => {
        const empty = emptyInboxMessage({ done: 0, onList: 3 });
        expect(empty.message).toBe("You're all caught up. 3 swrls sent to you are already on your list.");
        expect(empty.actions).toEqual([{ filter: 'showOnList', label: 'Show 3 on your list' }]);
    });
    it('uses the singular for one', () => {
        expect(emptyInboxMessage({ done: 0, onList: 1 }).message)
            .toBe("You're all caught up. 1 swrl sent to you is already on your list.");
    });
    it('offers both, on my list first', () => {
        const empty = emptyInboxMessage({ done: 2, onList: 1 });
        expect(empty.message).toBe("You're all caught up. 1 swrl sent to you is already on your list, and you've done 2 more.");
        expect(empty.actions.map(a => a.filter)).toEqual(['showOnList', 'showDone']);
        expect(empty.actions[1].label).toBe("Show 2 you've done");
    });
    it('names the sender when one is picked', () => {
        expect(emptyInboxMessage({ done: 0, onList: 2 }, 'Sam').message)
            .toBe("You're all caught up. 2 swrls sent to you from Sam are already on your list.");
        expect(emptyInboxMessage({ done: 0, onList: 0 }, 'Sam'))
            .toEqual({ message: 'Nothing swrled to you from Sam right now.', actions: [] });
    });
    it('says what to expect when nothing has been sent', () => {
        const empty = emptyInboxMessage({ done: 0, onList: 0 });
        expect(empty.actions).toEqual([]);
        expect(empty.message).toMatch(/^Nothing swrled to you yet/);
    });
});
