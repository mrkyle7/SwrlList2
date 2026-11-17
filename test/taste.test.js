import { describe, it, expect } from 'vitest';
import { pickWeighted, tasteLine, tasteOverlap, tastePicks } from '../src/model/taste';

const e = (swrlID, flags = {}, day = 1) => ({ swrlID, later: false, done: false, loved: false, deleted: false, ...flags, updated: new Date(2026, 0, day) });

describe('taste overlap', function () {
    it('counts what we both loved, then what we both finished', function () {
        const mine = [e('a', { loved: true }), e('b', { done: true }), e('c', { loved: true }), e('d', { later: true }), e('x', { loved: true, deleted: true })];
        const theirs = [e('a', { loved: true }), e('b', { done: true, loved: true }), e('c', { later: true }), e('d', { loved: true }), e('x', { loved: true })];
        expect(tasteOverlap(mine, theirs)).to.deep.equal({ bothLoved: 1, bothDone: 1, score: 3 });
        expect(tasteOverlap([], theirs)).to.deep.equal({ bothLoved: 0, bothDone: 0, score: 0 });
    });
    it('says it in words', function () {
        expect(tasteLine({ bothLoved: 4, bothDone: 2 })).to.equal('You both loved 4 things');
        expect(tasteLine({ bothLoved: 1, bothDone: 0 })).to.equal('You both loved 1 thing');
        expect(tasteLine({ bothLoved: 0, bothDone: 3 })).to.equal("You've both finished 3 things");
        expect(tasteLine({ bothLoved: 0, bothDone: 0 })).to.equal('');
    });
});

describe('taste picks', function () {
    it('ranks what like-minded friends loved, leaving out mine and strangers to my taste', function () {
        const friends = [
            { uid: 'bob', score: 4, entries: [e('p', { loved: true }), e('q', { loved: true }), e('mine', { loved: true }), e('later', { later: true })] },
            { uid: 'cara', score: 1, entries: [e('q', { loved: true }), e('r', { loved: true }, 9)] },
            { uid: 'dev', score: 0, entries: [e('s', { loved: true })] },
        ];
        const mine = (id) => id === 'mine' ? { swrlID: id, later: true, done: false, loved: false, deleted: false } : undefined;
        const picks = tastePicks(friends, mine, 10);
        expect(picks.map(p => p.swrlID)).to.deep.equal(['q', 'p', 'r']);
        expect(picks[0].friends).to.deep.equal(['bob', 'cara']);
        expect(picks[0].score).to.equal(5);
    });
});

describe('picking for tonight', function () {
    const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };
    it('picks without repeats, the heavier more likely', function () {
        const candidates = [{ item: 'a', weight: 1 }, { item: 'b', weight: 3 }, { item: 'c', weight: 1 }];
        expect(pickWeighted(candidates, 3, seq(0.5, 0, 0))).to.deep.equal(['b', 'a', 'c']);
        expect(pickWeighted(candidates, 2, seq(0.99, 0.99))).to.deep.equal(['c', 'b']);
        expect(pickWeighted(candidates, 5, Math.random)).to.have.length(3);
        expect(pickWeighted([], 3, Math.random)).to.deep.equal([]);
    });
});
