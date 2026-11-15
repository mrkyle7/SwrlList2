const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    countDeltas, justAccepted, friendDocsFor, entriesFromLegacySwrl, normaliseVisibility,
    addToCounts, legacyArraysPresent
} = require('../listEntries');
const { friendRequestMessage } = require('../messages');

test('a new entry adds one to each flag that is set', () => {
    assert.deepEqual(countDeltas(undefined, { later: true, done: false, loved: true }),
        { laterCount: 1, lovedCount: 1 });
});

test('a deleted entry takes its flags off the counts', () => {
    assert.deepEqual(countDeltas({ later: true, done: true, loved: false }, undefined),
        { laterCount: -1, doneCount: -1 });
});

test('moving from later to done changes both counts', () => {
    assert.deepEqual(countDeltas({ later: true, done: false }, { later: false, done: true }),
        { laterCount: -1, doneCount: 1 });
});

test('no change in the counted flags gives no deltas', () => {
    assert.deepEqual(countDeltas({ later: true, visibility: 'friends' }, { later: true, visibility: 'public' }), {});
    assert.deepEqual(countDeltas(undefined, undefined), {});
    assert.deepEqual(countDeltas({ deleted: false }, { deleted: true }), {});
});

test('missing or non-boolean flags count as false', () => {
    assert.deepEqual(countDeltas({}, { later: 'yes' }), {});
});

test('a request is accepted only on the change to accepted', () => {
    assert.equal(justAccepted({ status: 'pending' }, { status: 'accepted' }), true);
    assert.equal(justAccepted({ status: 'accepted' }, { status: 'accepted' }), false);
    assert.equal(justAccepted({ status: 'pending' }, { status: 'pending' }), false);
    assert.equal(justAccepted({ status: 'pending' }, undefined), false);
});

test('accepting writes a friend doc on each side', () => {
    assert.deepEqual(friendDocsFor({ from: 'a', to: 'b' }), [
        { path: 'swrlers/a/friends/b', uid: 'b' },
        { path: 'swrlers/b/friends/a', uid: 'a' }
    ]);
});

test('friend request message names the requester and links to /friends', () => {
    const message = friendRequestMessage(['t'], { displayName: 'Ann' });
    assert.deepEqual(message.tokens, ['t']);
    assert.equal(message.notification.body, 'Ann wants to be your friend on Swrl List!');
    assert.equal(message.webpush.fcmOptions.link, 'https://swrl-list.com/friends');
    assert.match(friendRequestMessage(['t'], {}).notification.body, /^Someone /);
});

const legacy = {
    swrlID: 'film-1', type: 1, category: 1, details: { id: 'film-1', title: 'Alien' },
    added: 'ADDED', updated: 'UPDATED',
    later: ['u1', 'u2'], done: ['u2'], loved: ['u3'], deleted: ['u4', 'u1'], isRecommended: ['u5']
};

test('legacy swrl becomes one entry per user in the arrays', () => {
    const entries = entriesFromLegacySwrl(legacy, 'film-1', { u2: 'public', u3: 'private' });
    assert.deepEqual(entries.map(e => e.uid).sort(), ['u1', 'u2', 'u3', 'u4']);
    const byUid = Object.fromEntries(entries.map(e => [e.uid, e.data]));
    assert.deepEqual(byUid.u1, {
        swrlID: 'film-1', uid: 'u1', type: 1, category: 1, details: legacy.details,
        later: true, done: false, loved: false, deleted: true,
        visibility: 'friends', visibilityOverride: false, added: 'ADDED', updated: 'UPDATED'
    });
    assert.equal(byUid.u2.visibility, 'public');
    assert.deepEqual([byUid.u2.later, byUid.u2.done], [true, true]);
    assert.equal(byUid.u3.visibility, 'private');
    assert.equal(byUid.u3.loved, true);
    assert.deepEqual([byUid.u4.later, byUid.u4.deleted], [false, true]);
});

test('legacy swrl copes with missing arrays, dates and bad visibility', () => {
    const entries = entriesFromLegacySwrl({ type: 2, category: 1, details: {}, later: ['u1'] }, 'doc-id', { u1: 'weird' });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].data.swrlID, 'doc-id');
    assert.equal(entries[0].data.visibility, 'friends');
    assert.equal('added' in entries[0].data, false);
    assert.deepEqual(entriesFromLegacySwrl({ type: 2, category: 1, details: {} }, 'x'), []);
});

test('visibility normalisation', () => {
    assert.equal(normaliseVisibility('private'), 'private');
    assert.equal(normaliseVisibility(undefined), 'friends');
    assert.equal(normaliseVisibility('everyone'), 'friends');
});

test('counts are totalled per swrl from entries', () => {
    const totals = {};
    addToCounts(totals, 's1', { later: true, done: true });
    addToCounts(totals, 's1', { later: true, loved: true, deleted: true });
    addToCounts(totals, 's2', { deleted: true });
    assert.deepEqual(totals, {
        s1: { laterCount: 2, doneCount: 1, lovedCount: 1 },
        s2: { laterCount: 0, doneCount: 0, lovedCount: 0 }
    });
});

test('legacy arrays present on a swrl doc', () => {
    assert.deepEqual(legacyArraysPresent({ later: [], loved: [], recommendations: [] }), ['later', 'loved']);
    assert.deepEqual(legacyArraysPresent({}), []);
});
