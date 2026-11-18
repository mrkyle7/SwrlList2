import { describe, it, expect } from 'vitest';
import {
    RecommendationReply, cleanReplyText, repliesByThread, threadsVisibleTo, MAX_REPLY_LENGTH
} from '../src/model/recommendationReply';

const reply = (id, thread, minutes, from = 'ann') =>
    new RecommendationReply(id, from, thread, id, new Date(2026, 0, 1, 0, minutes));

describe('recommendationReply.js', () => {
    it('trims text and refuses empty or too long text', () => {
        expect(cleanReplyText('  hi ')).toBe('hi');
        expect(cleanReplyText('   ')).toBeUndefined();
        expect(cleanReplyText(undefined)).toBeUndefined();
        expect(cleanReplyText('x'.repeat(MAX_REPLY_LENGTH + 1))).toBeUndefined();
        expect(cleanReplyText('x'.repeat(MAX_REPLY_LENGTH))).toHaveLength(MAX_REPLY_LENGTH);
    });
    it('groups replies per receiver, oldest first', () => {
        const threads = repliesByThread([reply('c', 'bob', 3), reply('a', 'bob', 1), reply('b', 'cy', 2)]);
        expect(Object.keys(threads).sort()).toEqual(['bob', 'cy']);
        expect(threads.bob.map(r => r.id)).toEqual(['a', 'c']);
        expect(threads.cy.map(r => r.id)).toEqual(['b']);
    });
    it('shows the sender every thread and a receiver only their own', () => {
        const recommendation = { from: 'ann', to: ['bob', 'cy'] };
        expect(threadsVisibleTo(recommendation, 'ann')).toEqual(['bob', 'cy']);
        expect(threadsVisibleTo(recommendation, 'cy')).toEqual(['cy']);
        expect(threadsVisibleTo(recommendation, 'dave')).toEqual([]);
    });
});
