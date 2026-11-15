import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
    FriendRequest, friendFromFirestore, Relationship, relationshipTo, findSwrlersByName, MAX_SEARCH_RESULTS
} from '../src/model/friendRequest';

const request = (from, to, status = 'pending') => new FriendRequest(`${from}_${to}`, from, to, status);

describe('FriendRequest', function () {
    it('reads a document', function () {
        const created = new Date('2026-01-02T03:04:05Z');
        const r = FriendRequest.fromFirestore('a_b', { from: 'a', to: 'b', status: 'accepted', created: Timestamp.fromDate(created) });
        expect(r.id).toBe('a_b');
        expect(r.from).toBe('a');
        expect(r.to).toBe('b');
        expect(r.isAccepted).toBe(true);
        expect(r.created.getTime()).toBe(created.getTime());
    })
    it('treats a missing or odd status as pending, and a pending server timestamp as no date', function () {
        const r = FriendRequest.fromFirestore('a_b', { from: 'a', to: 'b', created: null });
        expect(r.status).toBe('pending');
        expect(r.isAccepted).toBe(false);
        expect(r.created).toBeUndefined();
    })
    it('rejects a document without from or to', function () {
        expect(() => FriendRequest.fromFirestore('x', { to: 'b' })).toThrow();
        expect(() => FriendRequest.fromFirestore('x', { from: 'a' })).toThrow();
    })
    it('reads a friend doc', function () {
        expect(friendFromFirestore('bob', { uid: 'bob', since: Timestamp.fromDate(new Date(5)) }).since.getTime()).toBe(5);
        expect(friendFromFirestore('bob', { uid: 'bob', since: null })).toEqual({ uid: 'bob', since: undefined });
    })
})

describe('relationshipTo', function () {
    const data = {
        friendUids: new Set(['f']),
        incoming: [request('in', 'me')],
        sent: [request('me', 'out')]
    };
    it('tells the five relationships apart', function () {
        expect(relationshipTo('me', 'me', data)).toBe(Relationship.SELF);
        expect(relationshipTo('me', 'f', data)).toBe(Relationship.FRIEND);
        expect(relationshipTo('me', 'in', data)).toBe(Relationship.REQUEST_RECEIVED);
        expect(relationshipTo('me', 'out', data)).toBe(Relationship.REQUEST_SENT);
        expect(relationshipTo('me', 'stranger', data)).toBe(Relationship.NONE);
    })
    it('lets a friend win over a leftover request, and an incoming request over a sent one', function () {
        const both = { friendUids: ['f'], incoming: [request('f', 'me'), request('x', 'me')], sent: [request('me', 'f'), request('me', 'x')] };
        expect(relationshipTo('me', 'f', both)).toBe(Relationship.FRIEND);
        expect(relationshipTo('me', 'x', both)).toBe(Relationship.REQUEST_RECEIVED);
    })
    it('is NONE with nothing known, and nobody is SELF without a user', function () {
        expect(relationshipTo(undefined, 'a', { friendUids: [], incoming: [], sent: [] })).toBe(Relationship.NONE);
    })
})

describe('findSwrlersByName', function () {
    const swrlers = [
        { uid: 'me', displayName: 'Marty Me' },
        { uid: 'a', displayName: 'Alice Smith', email: 'zed@example.com' },
        { uid: 'b', displayName: 'bob SMITH' },
        { uid: 'c', displayName: 'Carol' },
        { uid: 'd' }
    ];
    it('needs at least two characters', function () {
        expect(findSwrlersByName(swrlers, '', 'me').matches).toEqual([]);
        expect(findSwrlersByName(swrlers, 's', 'me').matches).toEqual([]);
        expect(findSwrlersByName(swrlers, ' s ', 'me').matches).toEqual([]);
        expect(findSwrlersByName(swrlers, 'sm', 'me').matches.length).toBe(2);
    })
    it('matches case-insensitively inside the name, sorted, never me', function () {
        expect(findSwrlersByName(swrlers, 'SMITH', 'me').matches.map(s => s.uid)).toEqual(['a', 'b']);
        expect(findSwrlersByName(swrlers, 'mar', 'me').matches).toEqual([]);
        expect(findSwrlersByName(swrlers, 'mar', 'someone else').matches.map(s => s.uid)).toEqual(['me']);
    })
    it('never matches an email, and skips profiles without a name', function () {
        expect(findSwrlersByName(swrlers, 'example', 'me').matches).toEqual([]);
        expect(findSwrlersByName(swrlers, 'zed', 'me').total).toBe(0);
    })
    it('caps the matches but reports the total', function () {
        const many = Array.from({ length: 50 }, (_, i) => ({ uid: 'u' + i, displayName: 'Sam ' + String(i).padStart(2, '0') }));
        const found = findSwrlersByName(many, 'sam', 'me');
        expect(found.matches.length).toBe(MAX_SEARCH_RESULTS);
        expect(found.total).toBe(50);
        expect(found.matches[0].displayName).toBe('Sam 00');
        expect(findSwrlersByName(many, 'sam', 'me', 5).matches.length).toBe(5);
    })
})
