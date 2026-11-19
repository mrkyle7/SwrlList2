import { describe, it, expect } from 'vitest';
import { activityCaption, friendsActivity, nameList, newForYou } from '../src/model/activity';

const d = (n) => new Date(2026, 0, n);
const e = (swrlID, flags, day) => ({ swrlID, later: false, done: false, loved: false, deleted: false, ...flags, updated: d(day) });

describe('name lists', function () {
    it('read naturally', function () {
        expect(nameList([])).to.equal('');
        expect(nameList(['Alice'])).to.equal('Alice');
        expect(nameList(['Alice', 'Bob'])).to.equal('Alice and Bob');
        expect(nameList(['Alice', 'Bob', 'Cara'])).to.equal('Alice, Bob and 1 other');
        expect(nameList(['Alice', 'Bob', 'Cara', 'Dev'])).to.equal('Alice, Bob and 2 others');
        expect(nameList([undefined, 'Bob'])).to.equal('Bob');
    });
});

describe('new for you', function () {
    it('keeps unread, undismissed swrls, newest first, one per swrl', function () {
        const inbox = [
            { swrlID: 'a', from: 'bob', created: d(1) },
            { swrlID: 'b', from: 'bob', created: d(3), read: ['me'] },
            { swrlID: 'c', from: 'cara', created: d(4), dismissed: ['me'] },
            { swrlID: 'a', from: 'cara', created: d(5) },
            { swrlID: 'd', from: 'bob', created: d(2) },
        ];
        expect(newForYou(inbox, 'me')).to.deep.equal([
            { swrlID: 'a', from: ['cara', 'bob'], created: d(5) },
            { swrlID: 'd', from: ['bob'], created: d(2) },
        ]);
    });
});

describe("what friends are into", function () {
    it('groups by swrl, newest first, and leaves out what I have or dismissed', function () {
        const friends = [
            { uid: 'bob', entries: [e('a', { loved: true }, 5), e('b', { later: true }, 3), e('mine', { later: true }, 9), e('gone', { deleted: true }, 9)] },
            { uid: 'cara', entries: [e('a', { later: true }, 6), e('c', { done: true }, 1), e('dismissed', { later: true }, 8)] },
        ];
        const mine = (id) => id === 'mine' ? { later: true, done: false, deleted: false }
            : id === 'dismissed' ? { later: false, done: false, deleted: true } : undefined;
        const result = friendsActivity(friends, mine, 10);
        expect(result.map(r => r.swrlID)).to.deep.equal(['a', 'b', 'c']);
        expect(result[0].friends).to.deep.equal([{ uid: 'bob', loved: true, done: false, inProgress: false }, { uid: 'cara', loved: false, done: false, inProgress: false }]);
        expect(friendsActivity(friends, mine, 2).map(r => r.swrlID)).to.deep.equal(['a', 'b']);
    });
    it('shows a swrl I only loved but did not keep', function () {
        const friends = [{ uid: 'bob', entries: [e('a', { later: true }, 1)] }];
        expect(friendsActivity(friends, () => ({ later: false, done: false, deleted: false }), 5)).to.have.length(1);
    });
});

describe('captions', function () {
    it('lead with love', function () {
        expect(activityCaption([{ name: 'Bob', loved: false }, { name: 'Cara', loved: true }], 1)).to.equal('Cara loved it');
        expect(activityCaption([{ name: 'Bob', loved: false, done: true }], 1)).to.equal('Bob watched it');
        expect(activityCaption([{ name: 'Bob', loved: false, done: true }], 3)).to.equal('Bob listened to it');
        expect(activityCaption([{ name: 'Bob', loved: false }], 1)).to.equal('Bob wants to watch it');
        expect(activityCaption([{ name: 'Bob', loved: false }], 2)).to.equal('Bob wants to read it');
        expect(activityCaption([{ name: 'Bob', loved: false }, { name: 'Cara', loved: false }], 4)).to.equal('Bob and Cara want to play it');
    });
});
