// Tests for /firestore.rules against the Firestore emulator.
// Run with `npm run test:rules` (needs Java; starts the emulator itself).
// Not part of `npm test`: CI has no emulator.
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
    doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, collection, collectionGroup,
    query, where, serverTimestamp, arrayUnion, writeBatch
} from 'firebase/firestore';

/** @type {import('@firebase/rules-unit-testing').RulesTestEnvironment} */
let env;

const entry = (uid, swrlID, visibility, extra = {}) => ({
    swrlID, uid, type: 1, category: 1, details: { id: swrlID, title: 'T', imageUrl: '/i' },
    later: true, done: false, loved: false, deleted: false,
    visibility, visibilityOverride: false, ...extra
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.authenticatedContext('anon1', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const signedOut = () => env.unauthenticatedContext().firestore();

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: 'swrl-rules-test',
        firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') }
    });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        // owner has one entry of each visibility; bob is owner's friend, carol is not
        await setDoc(doc(db, 'swrlers/owner/listEntries/priv'), entry('owner', 'priv', 'private'));
        await setDoc(doc(db, 'swrlers/owner/listEntries/fr'), entry('owner', 'fr', 'friends'));
        await setDoc(doc(db, 'swrlers/owner/listEntries/pub'), entry('owner', 'pub', 'public'));
        await setDoc(doc(db, 'swrlers/owner/friends/bob'), { uid: 'bob', since: new Date() });
        await setDoc(doc(db, 'swrlers/bob/friends/owner'), { uid: 'owner', since: new Date() });
        await setDoc(doc(db, 'swrlers/owner'), { uid: 'owner', displayName: 'Owner' });
        await setDoc(doc(db, 'swrls/film-1'), { swrlID: 'film-1', type: 1, category: 1, details: {}, laterCount: 2 });
    });
});

describe('list entries: who can see what', () => {
    it('owner reads all three, and queries without a constraint', async () => {
        const db = as('owner');
        for (const id of ['priv', 'fr', 'pub']) await assertSucceeds(getDoc(doc(db, `swrlers/owner/listEntries/${id}`)));
        await assertSucceeds(getDocs(collection(db, 'swrlers/owner/listEntries')));
    });
    it('a friend reads public and friends but not private', async () => {
        const db = as('bob');
        await assertSucceeds(getDoc(doc(db, 'swrlers/owner/listEntries/pub')));
        await assertSucceeds(getDoc(doc(db, 'swrlers/owner/listEntries/fr')));
        await assertFails(getDoc(doc(db, 'swrlers/owner/listEntries/priv')));
    });
    it('a friend query must carry the constraint', async () => {
        const db = as('bob');
        const entries = collection(db, 'swrlers/owner/listEntries');
        await assertSucceeds(getDocs(query(entries, where('visibility', 'in', ['public', 'friends']))));
        await assertFails(getDocs(entries));
        await assertFails(getDocs(query(entries, where('visibility', 'in', ['public', 'friends', 'private']))));
    });
    it('another signed-in user reads public only', async () => {
        const db = as('carol');
        await assertSucceeds(getDoc(doc(db, 'swrlers/owner/listEntries/pub')));
        await assertFails(getDoc(doc(db, 'swrlers/owner/listEntries/fr')));
        await assertFails(getDoc(doc(db, 'swrlers/owner/listEntries/priv')));
        const entries = collection(db, 'swrlers/owner/listEntries');
        await assertSucceeds(getDocs(query(entries, where('visibility', '==', 'public'))));
        await assertFails(getDocs(query(entries, where('visibility', 'in', ['public', 'friends']))));
    });
    it('anonymous and signed-out users read public only', async () => {
        for (const db of [anon(), signedOut()]) {
            await assertSucceeds(getDoc(doc(db, 'swrlers/owner/listEntries/pub')));
            await assertFails(getDoc(doc(db, 'swrlers/owner/listEntries/fr')));
            await assertFails(getDoc(doc(db, 'swrlers/owner/listEntries/priv')));
        }
    });
    it('friendship is one-way data: a user the owner has not accepted is not a friend', async () => {
        await assertFails(getDoc(doc(as('dave'), 'swrlers/owner/listEntries/fr')));
    });
});

describe('list entries: writes', () => {
    it('owner can create, update and delete with valid data', async () => {
        const db = as('owner');
        await assertSucceeds(setDoc(doc(db, 'swrlers/owner/listEntries/new'), entry('owner', 'new', 'public')));
        await assertSucceeds(updateDoc(doc(db, 'swrlers/owner/listEntries/new'), { visibility: 'private' }));
        await assertSucceeds(deleteDoc(doc(db, 'swrlers/owner/listEntries/new')));
    });
    it('owner can change only visibility / visibilityOverride on existing entries, in one batch (Settings)', async () => {
        const db = as('owner');
        const batch = writeBatch(db);
        for (const id of ['priv', 'fr', 'pub']) {
            batch.update(doc(db, `swrlers/owner/listEntries/${id}`), { visibility: 'private' });
        }
        await assertSucceeds(batch.commit());
        await assertSucceeds(updateDoc(doc(db, 'swrlers/owner/listEntries/pub'),
            { visibility: 'public', visibilityOverride: true }));
        await assertSucceeds(updateDoc(doc(db, 'swrlers/owner/listEntries/pub'),
            { visibility: 'friends', visibilityOverride: false }));
        // an invalid value anywhere in the batch refuses the whole batch
        const bad = writeBatch(db);
        bad.update(doc(db, 'swrlers/owner/listEntries/fr'), { visibility: 'public' });
        bad.update(doc(db, 'swrlers/owner/listEntries/priv'), { visibility: 'everyone' });
        await assertFails(bad.commit());
        await assertFails(updateDoc(doc(db, 'swrlers/owner/listEntries/pub'), { uid: 'carol' }));
    });
    it('rejects a wrong uid, swrlID or visibility', async () => {
        const db = as('owner');
        await assertFails(setDoc(doc(db, 'swrlers/owner/listEntries/x'), entry('someoneelse', 'x', 'public')));
        await assertFails(setDoc(doc(db, 'swrlers/owner/listEntries/x'), entry('owner', 'y', 'public')));
        await assertFails(setDoc(doc(db, 'swrlers/owner/listEntries/x'), entry('owner', 'x', 'everyone')));
        const { visibility, ...withoutVisibility } = entry('owner', 'x', 'public');
        await assertFails(setDoc(doc(db, 'swrlers/owner/listEntries/x'), withoutVisibility));
    });
    it('others cannot write or delete an owner\'s entries', async () => {
        for (const db of [as('bob'), as('carol'), anon(), signedOut()]) {
            await assertFails(setDoc(doc(db, 'swrlers/owner/listEntries/new'), entry('owner', 'new', 'public')));
            await assertFails(updateDoc(doc(db, 'swrlers/owner/listEntries/pub'), { visibility: 'private' }));
            await assertFails(deleteDoc(doc(db, 'swrlers/owner/listEntries/pub')));
        }
    });
});

describe('collection group query on listEntries', () => {
    it('returns public entries for anyone', async () => {
        for (const db of [as('carol'), anon(), signedOut()]) {
            await assertSucceeds(getDocs(query(collectionGroup(db, 'listEntries'),
                where('swrlID', '==', 'pub'), where('visibility', '==', 'public'))));
        }
    });
    it('is refused without the public constraint', async () => {
        const db = as('carol');
        await assertFails(getDocs(query(collectionGroup(db, 'listEntries'), where('swrlID', '==', 'pub'))));
        await assertFails(getDocs(query(collectionGroup(db, 'listEntries'),
            where('swrlID', '==', 'fr'), where('visibility', 'in', ['public', 'friends']))));
    });
});

describe('the queries and writes the client makes (Phase 2)', () => {
    it('own list: an equality query on my entries, and the listener on the whole collection', async () => {
        const db = as('owner');
        await assertSucceeds(getDocs(query(collection(db, 'swrlers/owner/listEntries'),
            where('category', '==', 1), where('later', '==', true), where('type', '==', 1))));
        await assertSucceeds(getDocs(collection(db, 'swrlers/owner/listEntries')));
    });
    it('swrler list: later/loved/done + type + the visibility constraint, as a non-owner', async () => {
        for (const field of ['later', 'loved', 'done']) {
            await assertSucceeds(getDocs(query(collection(as('carol'), 'swrlers/owner/listEntries'),
                where(field, '==', true), where('type', '==', 1), where('visibility', 'in', ['public']))));
            await assertSucceeds(getDocs(query(collection(anon(), 'swrlers/owner/listEntries'),
                where(field, '==', true), where('visibility', 'in', ['public']))));
            await assertFails(getDocs(query(collection(as('carol'), 'swrlers/owner/listEntries'), where(field, '==', true))));
        }
        await assertSucceeds(getDocs(query(collection(as('bob'), 'swrlers/owner/listEntries'),
            where('later', '==', true), where('visibility', 'in', ['public', 'friends']))));
    });
    it('an action batch: my entry (new, default visibility) plus the shared details, no arrays or counts', async () => {
        const db = as('carol');
        const batch = writeBatch(db);
        batch.set(doc(db, 'swrlers/carol/listEntries/film-9'),
            { ...entry('carol', 'film-9', 'friends'), added: serverTimestamp(), updated: serverTimestamp() }, { merge: true });
        batch.set(doc(db, 'swrls/film-9'),
            { swrlID: 'film-9', type: 1, category: 1, details: {}, added: serverTimestamp(), updated: serverTimestamp() }, { merge: true });
        await assertSucceeds(batch.commit());
        // a later merge write of a few flags leaves visibility alone and is allowed
        await assertSucceeds(setDoc(doc(db, 'swrlers/carol/listEntries/film-9'),
            { swrlID: 'film-9', uid: 'carol', type: 1, category: 1, details: {}, loved: true, updated: serverTimestamp() }, { merge: true }));
    });
    it('the same batch with a legacy array on the shared doc is refused', async () => {
        const db = as('carol');
        const batch = writeBatch(db);
        batch.set(doc(db, 'swrlers/carol/listEntries/film-9'), entry('carol', 'film-9', 'friends'), { merge: true });
        batch.set(doc(db, 'swrls/film-9'), { swrlID: 'film-9', later: arrayUnion('carol') }, { merge: true });
        await assertFails(batch.commit());
    });
});

describe('swrls', () => {
    it('anyone reads, including signed-out', async () => {
        for (const db of [as('carol'), anon(), signedOut()]) await assertSucceeds(getDoc(doc(db, 'swrls/film-1')));
    });
    it('signed-in users can create and update details', async () => {
        const db = as('carol');
        await assertSucceeds(setDoc(doc(db, 'swrls/film-2'), { swrlID: 'film-2', type: 1, category: 1, details: {}, updated: serverTimestamp() }));
        await assertSucceeds(setDoc(doc(db, 'swrls/film-1'), { updated: serverTimestamp(), recommendations: arrayUnion('r1') }, { merge: true }));
    });
    it('signed-out users cannot write', async () => {
        await assertFails(setDoc(doc(signedOut(), 'swrls/film-1'), { updated: 1 }, { merge: true }));
    });
    it('cannot change or set the counts', async () => {
        const db = as('carol');
        await assertFails(setDoc(doc(db, 'swrls/film-1'), { laterCount: 99 }, { merge: true }));
        await assertFails(updateDoc(doc(db, 'swrls/film-1'), { doneCount: 1 }));
        await assertFails(updateDoc(doc(db, 'swrls/film-1'), { lovedCount: 1 }));
        await assertFails(setDoc(doc(db, 'swrls/film-3'), { swrlID: 'film-3', laterCount: 5 }));
    });
    it('an unchanged count in a write is fine', async () => {
        await assertSucceeds(setDoc(doc(as('carol'), 'swrls/film-1'), { laterCount: 2, updated: 1 }, { merge: true }));
    });
    it('cannot write the legacy uid arrays', async () => {
        const db = as('carol');
        for (const field of ['later', 'done', 'deleted', 'loved', 'isRecommended']) {
            await assertFails(setDoc(doc(db, 'swrls/film-1'), { [field]: arrayUnion('carol') }, { merge: true }));
            await assertFails(setDoc(doc(db, `swrls/new-${field}`), { swrlID: 'x', [field]: ['carol'] }));
        }
    });
    it('nobody deletes from a client', async () => {
        await assertFails(deleteDoc(doc(as('carol'), 'swrls/film-1')));
    });
});

describe('swrlers', () => {
    it('are readable by signed-in users, anonymous included, not by signed-out', async () => {
        await assertSucceeds(getDoc(doc(as('carol'), 'swrlers/owner')));
        await assertSucceeds(getDoc(doc(anon(), 'swrlers/owner')));
        await assertSucceeds(getDocs(collection(as('carol'), 'swrlers')));
        await assertFails(getDoc(doc(signedOut(), 'swrlers/owner')));
    });
    it('are written by the owner only', async () => {
        await assertSucceeds(setDoc(doc(as('carol'), 'swrlers/carol'), { uid: 'carol', displayName: 'C', lastLoginTime: serverTimestamp() }, { merge: true }));
        await assertFails(setDoc(doc(as('carol'), 'swrlers/owner'), { displayName: 'hacked' }, { merge: true }));
        await assertFails(setDoc(doc(signedOut(), 'swrlers/carol'), { uid: 'carol' }));
    });
    it('never take an email, and only a valid default visibility', async () => {
        const db = as('carol');
        await assertFails(setDoc(doc(db, 'swrlers/carol'), { uid: 'carol', email: 'a@b.c' }, { merge: true }));
        await assertSucceeds(setDoc(doc(db, 'swrlers/carol'), { uid: 'carol', defaultVisibility: 'public' }, { merge: true }));
        await assertFails(setDoc(doc(db, 'swrlers/carol'), { defaultVisibility: 'everyone' }, { merge: true }));
    });
    it('cannot be deleted from a client', async () => {
        await assertFails(deleteDoc(doc(as('owner'), 'swrlers/owner')));
    });
});

describe('friends', () => {
    it('the owner reads and deletes, nobody else does', async () => {
        await assertSucceeds(getDoc(doc(as('owner'), 'swrlers/owner/friends/bob')));
        await assertSucceeds(getDocs(collection(as('owner'), 'swrlers/owner/friends')));
        await assertFails(getDoc(doc(as('bob'), 'swrlers/owner/friends/bob')));
        await assertFails(getDoc(doc(as('carol'), 'swrlers/owner/friends/bob')));
        await assertFails(deleteDoc(doc(as('carol'), 'swrlers/owner/friends/bob')));
        await assertSucceeds(deleteDoc(doc(as('owner'), 'swrlers/owner/friends/bob')));
    });
    it('nobody creates or updates from a client, not even for themselves', async () => {
        await assertFails(setDoc(doc(as('owner'), 'swrlers/owner/friends/carol'), { uid: 'carol', since: serverTimestamp() }));
        await assertFails(setDoc(doc(as('carol'), 'swrlers/owner/friends/carol'), { uid: 'carol', since: serverTimestamp() }));
        await assertFails(setDoc(doc(as('carol'), 'swrlers/carol/friends/owner'), { uid: 'owner', since: serverTimestamp() }));
        await assertFails(updateDoc(doc(as('owner'), 'swrlers/owner/friends/bob'), { since: serverTimestamp() }));
    });
});

describe('friend requests', () => {
    const pending = (from, to) => ({ from, to, created: serverTimestamp(), status: 'pending' });
    const requestDoc = (db, from, to) => doc(db, `friendRequests/${from}_${to}`);

    it('the sender creates a pending request with the right id', async () => {
        await assertSucceeds(setDoc(requestDoc(as('carol'), 'carol', 'owner'), pending('carol', 'owner')));
    });
    it('rejects someone else as sender, a wrong id, a wrong status, a self request, extra fields', async () => {
        const db = as('carol');
        await assertFails(setDoc(requestDoc(db, 'owner', 'carol'), pending('owner', 'carol')));
        await assertFails(setDoc(doc(db, 'friendRequests/whatever'), pending('carol', 'owner')));
        await assertFails(setDoc(requestDoc(db, 'carol', 'owner'), { ...pending('carol', 'owner'), status: 'accepted' }));
        await assertFails(setDoc(requestDoc(db, 'carol', 'carol'), pending('carol', 'carol')));
        await assertFails(setDoc(requestDoc(db, 'carol', 'owner'), { ...pending('carol', 'owner'), extra: 1 }));
        await assertFails(setDoc(requestDoc(signedOut(), 'carol', 'owner'), pending('carol', 'owner')));
    });
    it('cannot request someone who is already a friend', async () => {
        await assertFails(setDoc(requestDoc(as('bob'), 'bob', 'owner'), pending('bob', 'owner')));
    });
    describe('with a pending request from carol to owner', () => {
        beforeEach(async () => {
            await env.withSecurityRulesDisabled(async (context) => {
                await setDoc(requestDoc(context.firestore(), 'carol', 'owner'),
                    { from: 'carol', to: 'owner', created: new Date(), status: 'pending' });
            });
        });
        it('is readable by both sides only, also as a query', async () => {
            await assertSucceeds(getDoc(requestDoc(as('carol'), 'carol', 'owner')));
            await assertSucceeds(getDoc(requestDoc(as('owner'), 'carol', 'owner')));
            await assertFails(getDoc(requestDoc(as('dave'), 'carol', 'owner')));
            await assertFails(getDoc(requestDoc(signedOut(), 'carol', 'owner')));
            await assertSucceeds(getDocs(query(collection(as('owner'), 'friendRequests'), where('to', '==', 'owner'))));
            await assertSucceeds(getDocs(query(collection(as('carol'), 'friendRequests'), where('from', '==', 'carol'))));
            await assertFails(getDocs(query(collection(as('dave'), 'friendRequests'), where('to', '==', 'owner'))));
        });
        it('only the receiver may accept, and only by changing status to accepted', async () => {
            await assertFails(updateDoc(requestDoc(as('carol'), 'carol', 'owner'), { status: 'accepted' }));
            await assertFails(updateDoc(requestDoc(as('dave'), 'carol', 'owner'), { status: 'accepted' }));
            await assertFails(updateDoc(requestDoc(as('owner'), 'carol', 'owner'), { status: 'declined' }));
            await assertFails(updateDoc(requestDoc(as('owner'), 'carol', 'owner'), { status: 'accepted', to: 'dave' }));
            await assertFails(updateDoc(requestDoc(as('owner'), 'carol', 'owner'), { note: 'hi' }));
            await assertSucceeds(updateDoc(requestDoc(as('owner'), 'carol', 'owner'), { status: 'accepted' }));
        });
        it('either side may delete, nobody else', async () => {
            await assertFails(deleteDoc(requestDoc(as('dave'), 'carol', 'owner')));
            await assertSucceeds(deleteDoc(requestDoc(as('carol'), 'carol', 'owner')));
            await env.withSecurityRulesDisabled(async (context) => {
                await setDoc(requestDoc(context.firestore(), 'carol', 'owner'),
                    { from: 'carol', to: 'owner', created: new Date(), status: 'pending' });
            });
            await assertSucceeds(deleteDoc(requestDoc(as('owner'), 'carol', 'owner')));
        });
    });
});

describe('the queries and writes the friends client makes (Phase 3)', () => {
    const pending = (from, to) => ({ from, to, created: serverTimestamp(), status: 'pending' });
    const requestDoc = (db, from, to) => doc(db, `friendRequests/${from}_${to}`);

    beforeEach(async () => {
        await env.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(requestDoc(db, 'carol', 'owner'), { from: 'carol', to: 'owner', created: new Date(), status: 'pending' });
            await setDoc(requestDoc(db, 'owner', 'dave'), { from: 'owner', to: 'dave', created: new Date(), status: 'pending' });
        });
    });

    it('the three friends listeners: my friends, requests to me and requests from me', async () => {
        const db = as('owner');
        await assertSucceeds(getDocs(collection(db, 'swrlers/owner/friends')));
        const incoming = await assertSucceeds(getDocs(query(collection(db, 'friendRequests'), where('to', '==', 'owner'))));
        const sent = await assertSucceeds(getDocs(query(collection(db, 'friendRequests'), where('from', '==', 'owner'))));
        if (incoming.size !== 1 || sent.size !== 1) throw new Error(`expected 1 and 1, got ${incoming.size} and ${sent.size}`);
    });
    it('a user cannot list someone else\'s requests, or all of them', async () => {
        const db = as('carol');
        await assertFails(getDocs(query(collection(db, 'friendRequests'), where('to', '==', 'owner'))));
        await assertFails(getDocs(collection(db, 'friendRequests')));
    });
    it('"they already asked me": I accept their request (status only) and send no second one', async () => {
        await assertSucceeds(updateDoc(requestDoc(as('owner'), 'carol', 'owner'), { status: 'accepted' }));
    });
    it('the rules alone would allow a second request in the other direction, which is why the client accepts instead', async () => {
        await assertSucceeds(setDoc(requestDoc(as('owner'), 'owner', 'carol'), pending('owner', 'carol')));
    });
    it('decline (receiver) and cancel (sender) both delete', async () => {
        await assertSucceeds(deleteDoc(requestDoc(as('owner'), 'carol', 'owner')));
        await assertSucceeds(deleteDoc(requestDoc(as('owner'), 'owner', 'dave')));
    });
    it('swrlers card: a friend reads a friends-visibility entry by getDoc, is denied a private one, and a missing one', async () => {
        const db = as('bob');
        await assertSucceeds(getDoc(doc(db, 'swrlers/owner/listEntries/fr')));
        await assertFails(getDoc(doc(db, 'swrlers/owner/listEntries/priv')));
        // the client cannot tell "private" from "no entry": both are permission-denied
        await assertFails(getDoc(doc(db, 'swrlers/owner/listEntries/nothing-here')));
    });
    it('a non-friend is denied a friends-visibility entry; access ends when the OWNER\'s friends doc goes', async () => {
        await assertFails(getDoc(doc(as('carol'), 'swrlers/owner/listEntries/fr')));
        // the rule looks at owner's side (swrlers/owner/friends/bob), so bob's own side does not matter
        await env.withSecurityRulesDisabled(async (context) => {
            await deleteDoc(doc(context.firestore(), 'swrlers/bob/friends/owner'));
        });
        await assertSucceeds(getDoc(doc(as('bob'), 'swrlers/owner/listEntries/fr')));
        await env.withSecurityRulesDisabled(async (context) => {
            await deleteDoc(doc(context.firestore(), 'swrlers/owner/friends/bob'));
        });
        await assertFails(getDoc(doc(as('bob'), 'swrlers/owner/listEntries/fr')));
    });
});

describe('private comments (copied from the swrl-firebase skill)', () => {
    const comments = (uid) => `swrlers/${uid}/privateComments/film-1/comments`;
    it('are the owner\'s alone', async () => {
        const created = await assertSucceeds(addDoc(collection(as('owner'), comments('owner')), { text: 'hi', created: serverTimestamp() }));
        await assertSucceeds(getDoc(created));
        await assertFails(getDoc(doc(as('bob'), created.path)));
        await assertFails(addDoc(collection(as('bob'), comments('owner')), { text: 'hi', created: serverTimestamp() }));
        await assertFails(addDoc(collection(as('owner'), comments('owner')), { text: '', created: serverTimestamp() }));
        await assertFails(addDoc(collection(as('owner'), comments('owner')), { text: 'hi', created: serverTimestamp(), extra: 1 }));
        await assertSucceeds(updateDoc(created, { text: 'edited' }));
        await assertSucceeds(deleteDoc(created));
    });
});

describe('private labels', () => {
    const labels = (uid) => `swrlers/${uid}/labels/film-1`;
    it('are the owner\'s alone, and limited in size', async () => {
        await assertSucceeds(setDoc(doc(as('owner'), labels('owner')), { labels: ['comedy', 'date night'], updated: serverTimestamp() }));
        await assertSucceeds(getDoc(doc(as('owner'), labels('owner'))));
        await assertSucceeds(getDocs(collection(as('owner'), 'swrlers/owner/labels')));
        // not even a friend, whatever the list entry's visibility
        await assertFails(getDoc(doc(as('bob'), labels('owner'))));
        await assertFails(getDocs(collection(as('bob'), 'swrlers/owner/labels')));
        await assertFails(getDoc(doc(signedOut(), labels('owner'))));
        await assertFails(setDoc(doc(as('bob'), labels('owner')), { labels: ['x'], updated: serverTimestamp() }));
        await assertFails(setDoc(doc(as('owner'), labels('owner')), { labels: [], updated: serverTimestamp() }));
        await assertFails(setDoc(doc(as('owner'), labels('owner')), { labels: 'comedy', updated: serverTimestamp() }));
        await assertFails(setDoc(doc(as('owner'), labels('owner')), { labels: ['x'], updated: serverTimestamp(), extra: 1 }));
        await assertFails(setDoc(doc(as('owner'), labels('owner')),
            { labels: Array.from({ length: 21 }, (_, i) => 'l' + i), updated: serverTimestamp() }));
        await assertFails(setDoc(doc(as('owner'), labels('owner')), { labels: ['a'.repeat(601)], updated: serverTimestamp() }));
        await assertSucceeds(deleteDoc(doc(as('owner'), labels('owner'))));
    });
});

describe('shares (links sent outside the app)', () => {
    const share = (from, extra = {}) => ({ from, fromName: 'Owner', message: 'You will love it', swrlID: 'film-1', created: serverTimestamp(), ...extra });
    const google = (uid) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } }).firestore();
    it('are created by a signed-in person as themselves, read by link, never listed', async () => {
        const created = await assertSucceeds(addDoc(collection(google('owner'), 'shares'), share('owner')));
        // anyone with the link, even signed out
        await assertSucceeds(getDoc(doc(signedOut(), created.path)));
        await assertSucceeds(getDoc(doc(google('bob'), created.path)));
        await assertFails(getDocs(collection(signedOut(), 'shares')));
        await assertFails(getDocs(query(collection(google('owner'), 'shares'), where('from', '==', 'owner'))));
        // not as someone else, not anonymously, not oversized, no extra fields, no edits
        await assertFails(addDoc(collection(google('bob'), 'shares'), share('owner')));
        await assertFails(addDoc(collection(anon(), 'shares'), share('anon1')));
        await assertFails(addDoc(collection(google('owner'), 'shares'), share('owner', { message: 'a'.repeat(501) })));
        await assertFails(addDoc(collection(google('owner'), 'shares'), share('owner', { fromName: '' })));
        await assertFails(addDoc(collection(google('owner'), 'shares'), share('owner', { extra: 1 })));
        await assertFails(updateDoc(doc(google('owner'), created.path), { message: 'changed' }));
        await assertFails(deleteDoc(doc(google('bob'), created.path)));
        await assertSucceeds(deleteDoc(doc(google('owner'), created.path)));
    });
});

describe('recommendations', () => {
    const recommendation = (from, to) => ({ from, to, message: 'm', swrlID: 'film-1', created: serverTimestamp() });
    beforeEach(async () => {
        await env.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'recommendations/r1'),
                { from: 'owner', to: ['bob', 'carol'], message: 'm', swrlID: 'film-1', created: new Date() });
        });
    });
    it('are read by the sender and receivers only, via the app\'s queries', async () => {
        await assertSucceeds(getDoc(doc(as('owner'), 'recommendations/r1')));
        await assertSucceeds(getDoc(doc(as('bob'), 'recommendations/r1')));
        await assertFails(getDoc(doc(as('dave'), 'recommendations/r1')));
        await assertFails(getDoc(doc(signedOut(), 'recommendations/r1')));
        await assertSucceeds(getDocs(query(collection(as('bob'), 'recommendations'), where('to', 'array-contains', 'bob'))));
        await assertSucceeds(getDocs(query(collection(as('owner'), 'recommendations'), where('from', '==', 'owner'))));
        await assertFails(getDocs(query(collection(as('dave'), 'recommendations'), where('to', 'array-contains', 'bob'))));
        await assertFails(getDocs(collection(as('bob'), 'recommendations')));
    });
    it('are created by the sender', async () => {
        await assertSucceeds(addDoc(collection(as('carol'), 'recommendations'), recommendation('carol', ['bob'])));
        await assertFails(addDoc(collection(as('carol'), 'recommendations'), recommendation('bob', ['carol'])));
        await assertFails(addDoc(collection(as('carol'), 'recommendations'), recommendation('carol', [])));
    });
    it('a receiver may mark read and dismissed for themselves only', async () => {
        await assertSucceeds(setDoc(doc(as('bob'), 'recommendations/r1'), { read: arrayUnion('bob') }, { merge: true }));
        await assertSucceeds(setDoc(doc(as('bob'), 'recommendations/r1'), { dismissed: arrayUnion('bob') }, { merge: true }));
        await assertSucceeds(updateDoc(doc(as('bob'), 'recommendations/r1'), { read: [] }));
        await assertFails(setDoc(doc(as('bob'), 'recommendations/r1'), { read: arrayUnion('carol') }, { merge: true }));
        await assertFails(setDoc(doc(as('bob'), 'recommendations/r1'), { message: 'changed' }, { merge: true }));
        await assertFails(setDoc(doc(as('dave'), 'recommendations/r1'), { read: arrayUnion('dave') }, { merge: true }));
        await assertFails(setDoc(doc(as('owner'), 'recommendations/r1'), { read: arrayUnion('owner') }, { merge: true }));
    });
    it('cannot be deleted by a client', async () => {
        await assertFails(deleteDoc(doc(as('owner'), 'recommendations/r1')));
        await assertFails(deleteDoc(doc(as('bob'), 'recommendations/r1')));
    });

    describe('replies', () => {
        const reply = (from, thread, extra = {}) => ({ from, thread, text: 'hi', created: serverTimestamp(), ...extra });
        beforeEach(async () => {
            await env.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                await setDoc(doc(db, 'recommendations/r1/replies/toBob'), { from: 'owner', thread: 'bob', text: 'a', created: new Date() });
                await setDoc(doc(db, 'recommendations/r1/replies/toCarol'), { from: 'owner', thread: 'carol', text: 'b', created: new Date() });
            });
        });
        const replies = (db) => collection(db, 'recommendations/r1/replies');

        it('the sender reads every thread', async () => {
            await assertSucceeds(getDocs(replies(as('owner'))));
            await assertSucceeds(getDoc(doc(as('owner'), 'recommendations/r1/replies/toCarol')));
        });
        it('a receiver reads only their own thread', async () => {
            await assertSucceeds(getDocs(query(replies(as('bob')), where('thread', '==', 'bob'))));
            await assertSucceeds(getDoc(doc(as('bob'), 'recommendations/r1/replies/toBob')));
            await assertFails(getDoc(doc(as('bob'), 'recommendations/r1/replies/toCarol')));
            await assertFails(getDocs(replies(as('bob'))));
            await assertFails(getDocs(query(replies(as('bob')), where('thread', '==', 'carol'))));
        });
        it('others cannot read', async () => {
            await assertFails(getDocs(query(replies(as('dave')), where('thread', '==', 'dave'))));
            await assertFails(getDoc(doc(as('dave'), 'recommendations/r1/replies/toBob')));
            await assertFails(getDocs(replies(signedOut())));
        });
        it('the sender may write to any receiver, before they have replied', async () => {
            await assertSucceeds(addDoc(replies(as('owner')), reply('owner', 'bob')));
            await assertSucceeds(addDoc(replies(as('owner')), reply('owner', 'carol')));
            await assertFails(addDoc(replies(as('owner')), reply('owner', 'dave')));
        });
        it('a receiver may write only to their own thread, as themselves', async () => {
            await assertSucceeds(addDoc(replies(as('bob')), reply('bob', 'bob')));
            await assertFails(addDoc(replies(as('bob')), reply('bob', 'carol')));
            await assertFails(addDoc(replies(as('bob')), reply('owner', 'bob')));
            await assertFails(addDoc(replies(as('dave')), reply('dave', 'dave')));
        });
        it('checks the shape of a reply', async () => {
            await assertFails(addDoc(replies(as('bob')), reply('bob', 'bob', { text: '' })));
            await assertFails(addDoc(replies(as('bob')), reply('bob', 'bob', { text: 'x'.repeat(1001) })));
            await assertFails(addDoc(replies(as('bob')), reply('bob', 'bob', { text: 5 })));
            await assertFails(addDoc(replies(as('bob')), reply('bob', 'bob', { created: new Date(0) })));
            await assertFails(addDoc(replies(as('bob')), reply('bob', 'bob', { extra: 1 })));
        });
        it('cannot be edited or deleted by a client', async () => {
            await assertFails(updateDoc(doc(as('owner'), 'recommendations/r1/replies/toBob'), { text: 'changed' }));
            await assertFails(deleteDoc(doc(as('owner'), 'recommendations/r1/replies/toBob')));
            await assertFails(deleteDoc(doc(as('bob'), 'recommendations/r1/replies/toBob')));
        });
    });
});

describe('messagingtokens', () => {
    it('a user stores a token for themselves, and can take over a device\'s token', async () => {
        await assertSucceeds(setDoc(doc(as('bob'), 'messagingtokens/tok1'), { uid: 'bob', token: 'tok1' }));
        await assertSucceeds(setDoc(doc(as('carol'), 'messagingtokens/tok1'), { uid: 'carol', token: 'tok1' }));
        await assertFails(setDoc(doc(as('carol'), 'messagingtokens/tok2'), { uid: 'bob', token: 'tok2' }));
        await assertFails(setDoc(doc(as('carol'), 'messagingtokens/tok3'), { uid: 'carol', token: 'other' }));
        await assertFails(setDoc(doc(signedOut(), 'messagingtokens/tok4'), { uid: 'x', token: 'tok4' }));
    });
    it('only the owner reads or deletes', async () => {
        await env.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'messagingtokens/tok1'), { uid: 'bob', token: 'tok1' });
        });
        await assertSucceeds(getDoc(doc(as('bob'), 'messagingtokens/tok1')));
        await assertSucceeds(getDocs(query(collection(as('bob'), 'messagingtokens'), where('uid', '==', 'bob'))));
        await assertFails(getDoc(doc(as('carol'), 'messagingtokens/tok1')));
        await assertFails(getDocs(collection(as('carol'), 'messagingtokens')));
        await assertFails(deleteDoc(doc(as('carol'), 'messagingtokens/tok1')));
        await assertSucceeds(deleteDoc(doc(as('bob'), 'messagingtokens/tok1')));
    });
});

describe('savedsearches', () => {
    it('are the owner\'s alone', async () => {
        const created = await assertSucceeds(addDoc(collection(as('bob'), 'savedsearches'), { uid: 'bob', searchText: 'x', category: 1 }));
        await assertSucceeds(getDocs(query(collection(as('bob'), 'savedsearches'), where('uid', '==', 'bob'), where('category', '==', 1))));
        await assertFails(getDocs(query(collection(as('carol'), 'savedsearches'), where('uid', '==', 'bob'))));
        await assertFails(getDocs(collection(as('bob'), 'savedsearches')));
        await assertFails(addDoc(collection(as('carol'), 'savedsearches'), { uid: 'bob', searchText: 'x', category: 1 }));
        await assertFails(deleteDoc(doc(as('carol'), created.path)));
        await assertSucceeds(deleteDoc(doc(as('bob'), created.path)));
    });
});

describe('everything else', () => {
    it('is denied', async () => {
        await assertFails(setDoc(doc(as('bob'), 'somethingelse/x'), { a: 1 }));
        await assertFails(getDoc(doc(as('bob'), 'somethingelse/x')));
    });
});

describe('unread reply markers', () => {
    beforeEach(async () => {
        await env.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'swrlers/bob/unreadReplies/r1'), { recommendationID: 'r1', from: 'owner', at: new Date() });
        });
    });
    it('the owner reads and deletes their own', async () => {
        await assertSucceeds(getDoc(doc(as('bob'), 'swrlers/bob/unreadReplies/r1')));
        await assertSucceeds(getDocs(collection(as('bob'), 'swrlers/bob/unreadReplies')));
        await assertSucceeds(deleteDoc(doc(as('bob'), 'swrlers/bob/unreadReplies/r1')));
    });
    it('nobody else reads them, and no client writes them', async () => {
        await assertFails(getDoc(doc(as('carol'), 'swrlers/bob/unreadReplies/r1')));
        await assertFails(setDoc(doc(as('bob'), 'swrlers/bob/unreadReplies/r2'), { recommendationID: 'r2' }));
        await assertFails(setDoc(doc(as('owner'), 'swrlers/bob/unreadReplies/r2'), { recommendationID: 'r2' }));
    });
});
