const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recommendationMessage, deadTokens, userActivityText } = require('../messages');

test('recommendation message names the recommender and the swrl', () => {
    const message = recommendationMessage(['t1', 't2'], { displayName: 'Ann' }, { details: { title: 'Alien' } });
    assert.deepEqual(message.tokens, ['t1', 't2']);
    assert.equal(message.notification.body, 'Ann swrled Alien to you');
    assert.equal(message.webpush.fcmOptions.link, 'https://swrl-list.com/recommendations');
});

test('recommendation message copes with missing names', () => {
    assert.equal(recommendationMessage(['t'], {}, {}).notification.body, 'Someone swrled something to you');
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

test('an update that keeps lastLoginTime is not a login', () => {
    const stamp = (seconds) => ({ seconds, nanoseconds: 0, toMillis: () => seconds * 1000, isEqual: (o) => o.seconds === seconds });
    const profile = (seconds, extra) => Object.assign({ uid: 'u', displayName: 'Bob', lastLoginTime: stamp(seconds) }, extra);
    // default visibility changed, same login time
    assert.equal(userActivityText(profile(10), profile(10, { defaultVisibility: 'private' }), 'owner'), undefined);
    // a new login time is a login
    assert.equal(userActivityText(profile(10), profile(20), 'owner'), 'User Bob has just logged in.');
    // plain Dates and numbers compare by value
    assert.equal(userActivityText({ uid: 'u', lastLoginTime: new Date(5) }, { uid: 'u', lastLoginTime: new Date(5) }, 'owner'), undefined);
    assert.equal(userActivityText({ uid: 'u', lastLoginTime: 5 }, { uid: 'u', lastLoginTime: 6 }, 'owner'), 'User An unnamed user has just logged in.');
    // legacy profile without a login time that gains one
    assert.equal(userActivityText({ uid: 'u', displayName: 'Bob' }, profile(10), 'owner'), 'User Bob has just logged in.');
    // neither has one: nothing changed
    assert.equal(userActivityText({ uid: 'u', displayName: 'Bob' }, { uid: 'u', displayName: 'Bob', defaultVisibility: 'public' }, 'owner'), undefined);
    // creates and deletes behave as before; the owner is still skipped
    assert.equal(userActivityText(undefined, profile(10), 'owner'), 'User Bob has just logged in.');
    assert.equal(userActivityText(profile(10), undefined, 'owner'), 'User Bob was deleted');
    assert.equal(userActivityText(profile(10, { uid: 'owner' }), profile(20, { uid: 'owner' }), 'owner'), undefined);
});

const { replyMessage, replyRecipient } = require('../messages');

test('reply message names who replied and about what', () => {
    const message = replyMessage(['t'], { displayName: 'Bob' }, { details: { title: 'Alien' } }, 'Loved it');
    assert.equal(message.notification.title, 'Bob replied about Alien');
    assert.equal(message.notification.body, 'Loved it');
    assert.deepEqual(message.tokens, ['t']);
});

test('reply message falls back and shortens long text', () => {
    const message = replyMessage(['t'], {}, {}, 'x'.repeat(200));
    assert.equal(message.notification.title, 'Someone replied about a swrl');
    assert.equal(message.notification.body.length, 100);
});

test('a reply goes to the thread receiver when the sender wrote it, otherwise the sender', () => {
    const recommendation = { from: 'ann', to: ['bob', 'cy'] };
    assert.equal(replyRecipient(recommendation, { from: 'ann', thread: 'bob' }), 'bob');
    assert.equal(replyRecipient(recommendation, { from: 'cy', thread: 'cy' }), 'ann');
});
