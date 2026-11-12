const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recommendationMessage, deadTokens, userActivityText } = require('../messages');

test('recommendation message names the recommender and the swrl', () => {
    const message = recommendationMessage(['t1', 't2'], { displayName: 'Ann' }, { details: { title: 'Alien' } });
    assert.deepEqual(message.tokens, ['t1', 't2']);
    assert.equal(message.notification.body, 'Ann recommended Alien to you!');
    assert.equal(message.webpush.fcmOptions.link, 'https://swrl-list.com/recommendations');
});

test('recommendation message copes with missing names', () => {
    assert.equal(recommendationMessage(['t'], {}, {}).notification.body, 'Someone recommended something to you!');
});

test('only permanently failed tokens are dead', () => {
    const responses = [
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
        { success: false, error: { code: 'messaging/internal-error' } }
    ];
    assert.deepEqual(deadTokens(['a', 'b', 'c'], responses), ['b']);
});

test('user activity text', () => {
    assert.equal(userActivityText(undefined, { uid: 'u', displayName: 'Bob' }, 'owner'), 'User Bob has just logged in.');
    assert.equal(userActivityText({ uid: 'u', displayName: 'Bob' }, undefined, 'owner'), 'User Bob was deleted');
    assert.equal(userActivityText(undefined, { uid: 'owner', displayName: 'Me' }, 'owner'), undefined);
    assert.equal(userActivityText({ uid: 'owner' }, undefined, 'owner'), undefined);
    assert.equal(userActivityText(undefined, undefined, 'owner'), undefined);
});
