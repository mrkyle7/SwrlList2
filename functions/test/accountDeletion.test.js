const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    MAX_BATCH_WRITES, chunk, planRecommendation, friendMirrorPaths, legacyFieldsBySwrl, summaryLine
} = require('../accountDeletion');

test('batches stay under the Firestore limit and keep every item in order', () => {
    assert.ok(MAX_BATCH_WRITES <= 400);
    const items = Array.from({ length: 1001 }, (_, i) => i);
    const batches = chunk(items);
    assert.deepEqual(batches.map(b => b.length), [400, 400, 201]);
    assert.deepEqual(batches.flat(), items);
    assert.deepEqual(chunk([]), []);
    assert.deepEqual(chunk([1, 2, 3], 2), [[1, 2], [3]]);
});

test('a recommendation the user sent is deleted and comes off the swrl', () => {
    assert.deepEqual(planRecommendation({ from: 'd', to: ['a', 'b'] }, 'd'),
        { action: 'delete', removeFromSwrl: true });
});

test('a recommendation sent to the user alone is deleted and comes off the swrl', () => {
    assert.deepEqual(planRecommendation({ from: 'a', to: ['d'], read: ['d'] }, 'd'),
        { action: 'delete', removeFromSwrl: true });
});

test('a recommendation with other receivers only loses this one', () => {
    assert.deepEqual(planRecommendation({ from: 'a', to: ['d', 'b'] }, 'd'),
        { action: 'update', fields: { to: ['b'] } });
});

test('the user also leaves read and dismissed, when they are there', () => {
    assert.deepEqual(
        planRecommendation({ from: 'a', to: ['d', 'b', 'c'], read: ['d', 'b'], dismissed: ['d'] }, 'd'),
        { action: 'update', fields: { to: ['b', 'c'], read: ['b'], dismissed: [] } });
    // absent, or without the user: not written
    assert.deepEqual(planRecommendation({ from: 'a', to: ['d', 'b'], read: ['b'] }, 'd'),
        { action: 'update', fields: { to: ['b'] } });
});

test('a recommendation that does not involve the user is left alone', () => {
    assert.deepEqual(planRecommendation({ from: 'a', to: ['b'] }, 'd'), { action: 'none' });
    assert.deepEqual(planRecommendation({ from: 'a' }, 'd'), { action: 'none' });
    assert.deepEqual(planRecommendation({}, 'd'), { action: 'none' });
});

test('planning does not change the recommendation it is given', () => {
    const recommendation = { from: 'a', to: ['d', 'b'], read: ['d'] };
    planRecommendation(recommendation, 'd');
    assert.deepEqual(recommendation, { from: 'a', to: ['d', 'b'], read: ['d'] });
});

test('mirror friend docs: one per friend, no duplicates, never the user themself', () => {
    assert.deepEqual(friendMirrorPaths('d', ['a', 'b', 'a', 'd', '']),
        ['swrlers/a/friends/d', 'swrlers/b/friends/d']);
    assert.deepEqual(friendMirrorPaths('d', []), []);
});

test('legacy array hits are grouped per swrl, one entry per field', () => {
    const bySwrl = legacyFieldsBySwrl([
        { field: 'later', swrlIDs: ['s1', 's2'] },
        { field: 'done', swrlIDs: ['s1'] },
        { field: 'loved', swrlIDs: ['s1', 's1'] },
        { field: 'isRecommended', swrlIDs: [] },
        { field: 'recommendations', swrlIDs: ['s9'] } // not a uid array: ignored
    ]);
    assert.deepEqual([...bySwrl], [['s1', ['later', 'done', 'loved']], ['s2', ['later']]]);
});

test('the log line names the user and what was removed', () => {
    assert.equal(summaryLine('d', { 'list entries': 3, 'friend requests': 0 }),
        'deleted data of user d: 3 list entries, 0 friend requests');
});
