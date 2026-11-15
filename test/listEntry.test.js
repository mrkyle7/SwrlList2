import { describe, it, expect } from 'vitest';
//@ts-check

import { Timestamp } from 'firebase/firestore';
import { ListEntry, visibilitiesViewerMayQuery, effectiveVisibility } from '../src/model/listEntry';
import { Swrl } from '../src/model/swrl';
import { Details } from '../src/model/details';
import { FILM } from '../src/constants/Type';
import { WATCH } from '../src/constants/Category';
import { PRIVATE, FRIENDS, PUBLIC, DEFAULT_VISIBILITY, visibilityFromId, visibilities } from '../src/constants/Visibility';
import {
    Collection, LIST_ENTRIES, listEntriesPath, listEntryPath, friendsPath, friendRequestId, privateCommentsPath
} from '../src/constants/Collection';

const rawDetails = { id: 'film-1', title: 'Alien', imageUrl: '/img' };

describe('Visibility', function () {
    it('has the three stored values, friends being the default', function () {
        expect(visibilities.map(v => v.id)).to.deep.equal(['private', 'friends', 'public']);
        expect(visibilities.every(v => v.label.length > 0)).toBe(true);
        expect(DEFAULT_VISIBILITY).toBe(FRIENDS);
    })
    it('looks up by stored value and falls back to the default', function () {
        expect(visibilityFromId('private')).toBe(PRIVATE);
        expect(visibilityFromId('public')).toBe(PUBLIC);
        expect(visibilityFromId('friends')).toBe(FRIENDS);
        expect(visibilityFromId('nonsense')).toBe(FRIENDS);
        expect(visibilityFromId(undefined)).toBe(FRIENDS);
        expect(visibilityFromId(null)).toBe(FRIENDS);
    })
})

describe('Collection paths', function () {
    it('builds list entry, friends and friend request paths', function () {
        expect(Collection.FRIENDREQUESTS).toBe('friendRequests');
        expect(LIST_ENTRIES).toBe('listEntries');
        expect(listEntriesPath('u1')).to.deep.equal(['swrlers', 'u1', 'listEntries']);
        expect(listEntryPath('u1', 'film-1')).to.deep.equal(['swrlers', 'u1', 'listEntries', 'film-1']);
        expect(friendsPath('u1')).to.deep.equal(['swrlers', 'u1', 'friends']);
        expect(friendRequestId('a', 'b')).toBe('a_b');
        expect(friendRequestId('b', 'a')).toBe('b_a');
    })
    it('keeps the existing exports working', function () {
        expect(Collection.SWRLS).toBe('swrls');
        expect(privateCommentsPath('u', 's')).to.deep.equal(['swrlers', 'u', 'privateComments', 's', 'comments']);
    })
})

describe('ListEntry', function () {
    it('parses Firestore data', function () {
        const entry = ListEntry.fromFirestore({
            uid: 'u1', swrlID: 'film-1', type: FILM.id, category: WATCH.id, details: rawDetails,
            later: true, done: false, loved: true, deleted: false,
            added: new Timestamp(1568452504, 0), updated: new Timestamp(1568452505, 0),
            visibility: 'public', visibilityOverride: true
        });
        expect(entry.uid).toBe('u1');
        expect(entry.type).toBe(FILM);
        expect(entry.category).toBe(WATCH);
        expect(entry.later).toBe(true);
        expect(entry.loved).toBe(true);
        expect(entry.done).toBe(false);
        expect(entry.added).to.deep.equal(new Date(1568452504000));
        expect(entry.updated).to.deep.equal(new Date(1568452505000));
        expect(entry.visibility).toBe(PUBLIC);
        expect(entry.visibilityOverride).toBe(true);
    })
    it('tolerates missing booleans, timestamps and visibility', function () {
        const entry = ListEntry.fromFirestore({
            uid: 'u1', swrlID: 'film-1', type: FILM.id, category: WATCH.id, details: rawDetails,
            added: null
        });
        expect([entry.later, entry.done, entry.loved, entry.deleted]).to.deep.equal([false, false, false, false]);
        expect(entry.added).toBeUndefined();
        expect(entry.updated).toBeUndefined();
        expect(entry.visibility).toBe(FRIENDS);
        expect(entry.visibilityOverride).toBe(false);
    })
    it('refuses data without its identity', function () {
        expect(() => ListEntry.fromFirestore({ uid: 'u1', type: 1, category: 1, details: rawDetails })).toThrow();
    })
    it('builds Firestore data for a write', function () {
        const entry = new ListEntry('u1', 'film-1', FILM, WATCH, Details.fromJSON(rawDetails),
            true, false, false, false, undefined, undefined, PRIVATE, true);
        const data = entry.toFirestoreData('UPDATED', 'ADDED');
        expect(data).toMatchObject({
            swrlID: 'film-1', uid: 'u1', type: FILM.id, category: WATCH.id,
            later: true, done: false, loved: false, deleted: false,
            visibility: 'private', visibilityOverride: true, added: 'ADDED', updated: 'UPDATED'
        });
        expect(data.details.title).toBe('Alien');
        expect('added' in entry.toFirestoreData('UPDATED')).toBe(false);
        expect('updated' in entry.toFirestoreData()).toBe(false);
    })
    it('round trips through Firestore data', function () {
        const entry = new ListEntry('u1', 'film-1', FILM, WATCH, Details.fromJSON(rawDetails),
            true, true, false, false, undefined, undefined, PUBLIC, false);
        expect(ListEntry.fromFirestore(entry.toFirestoreData())).to.deep.equal(entry);
    })
    it('turns into a Swrl holding only the owner', function () {
        const entry = new ListEntry('u1', 'film-1', FILM, WATCH, Details.fromJSON(rawDetails),
            true, false, true, false, new Date(1), new Date(2), FRIENDS, false);
        const swrl = entry.toSwrl();
        expect(swrl).toBeInstanceOf(Swrl);
        expect(swrl.swrlID).toBe('film-1');
        expect(swrl.later).to.deep.equal(['u1']);
        expect(swrl.loved).to.deep.equal(['u1']);
        expect(swrl.done).to.deep.equal([]);
        expect(swrl.deleted).to.deep.equal([]);
        expect(swrl.added).to.deep.equal(new Date(1));
    })
})

describe('visibility helpers', function () {
    it('lets the owner query everything', function () {
        expect(visibilitiesViewerMayQuery('u1', 'u1', false)).toBeUndefined();
        expect(visibilitiesViewerMayQuery('u1', 'u1', true)).toBeUndefined();
    })
    it('lets a friend query public and friends', function () {
        expect(visibilitiesViewerMayQuery('u2', 'u1', true)).to.deep.equal(['public', 'friends']);
    })
    it('lets anyone else, signed in or not, query public only', function () {
        expect(visibilitiesViewerMayQuery('u2', 'u1', false)).to.deep.equal(['public']);
        expect(visibilitiesViewerMayQuery(undefined, 'u1', false)).to.deep.equal(['public']);
        expect(visibilitiesViewerMayQuery(undefined, 'u1', true)).to.deep.equal(['public']);
    })
    it('decides whether an entry is visible to a viewer', function () {
        const entryWith = (v) => new ListEntry('u1', 's', FILM, WATCH, Details.fromJSON(rawDetails),
            true, false, false, false, undefined, undefined, v, false);
        expect(entryWith(PRIVATE).isVisibleTo('u1', false)).toBe(true);
        expect(entryWith(PRIVATE).isVisibleTo('u2', true)).toBe(false);
        expect(entryWith(FRIENDS).isVisibleTo('u2', true)).toBe(true);
        expect(entryWith(FRIENDS).isVisibleTo('u2', false)).toBe(false);
        expect(entryWith(PUBLIC).isVisibleTo(undefined, false)).toBe(true);
    })
    it('picks the effective visibility', function () {
        expect(effectiveVisibility(PUBLIC, false, PRIVATE)).toBe(PUBLIC);
        expect(effectiveVisibility(PUBLIC, true, PRIVATE)).toBe(PRIVATE);
        expect(effectiveVisibility(undefined, false, PRIVATE)).toBe(FRIENDS);
        expect(effectiveVisibility(PUBLIC, true, undefined)).toBe(PUBLIC);
    })
})
