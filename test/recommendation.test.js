import { describe, it, expect, assert } from 'vitest';
// @ts-check

import { Timestamp } from 'firebase/firestore';
import { Swrl } from '../src/model/swrl';
import { ALBUM } from '../src/constants/Type';
import { LISTEN } from '../src/constants/Category';
import { Details } from '../src/model/details';
import { Recommendation, inboxHasSwrl, recommendationReason } from '../src/model/recommendation';
import { typeLabel, FILM, TV, BOARDGAME } from '../src/constants/Type';
import { Link } from '../src/model/link';
import { Rating } from '../src/model/rating';

describe('Can translate Firestore data to a recommendation', function () {
    describe('recommendation.js', function () {
        /**
         * this.fromSwrler = fromSwrler;
        this.toSwrlers = toSwrlers;
        this.swrlID = swrlID;
        this.created = created;
        this.swrl = swrl;
        this.read = read || [];
        this.dismissed = dismissed || [];
         */
        it('it get data without read/dismissed', async function () {
            const firestoreDoc =
            {
                id: '1234s',
                data: function () {
                    return {
                        from: 'user1',
                        to: ['user2', 'user3'],
                        message: 'is great',
                        created: new Timestamp(1568452504, 0),
                        swrlID: 'ITUNESALBUM_ABC123'
                    }
                }
            };
            const mockFirestore = {
                /**
                 * let swrl = await firestore.collection(Collection.SWRLS).doc(recommendation.swrlID).get();
            if (swrl.exists) {
                let swrlData = swrl.data();
                 */
                collection:
                    /**
                     * @param {string} collection
                     */
                    function (collection) {
                        assert.equal(collection, 'swrls');
                        return {
                            doc:
                                /**
                                 * @param {string} id
                                 */
                                function (id) {
                                    assert.equal(id, 'ITUNESALBUM_ABC123');
                                    return {
                                        get: function () {
                                            return new Promise((resolve, reject) => {
                                                resolve({
                                                    exists: true,
                                                    data: function () {
                                                        return {
                                                            details: {
                                                                title: 'No title',
                                                                author: 'Unknown',
                                                                id: 'isbn123',
                                                                imageUrl: '/img/NoPoster.jpg',
                                                                tagline: 'cool film',
                                                                overview: 'something happens',
                                                                director: 'mr director',
                                                                genres: ['action', 'comedy'],
                                                                links: [{
                                                                    url: 'http://',
                                                                    name: 'link',
                                                                    logo: 'http://img'
                                                                },
                                                                {
                                                                    url: 'http://',
                                                                    name: 'no logo'
                                                                }],
                                                                actors: ['Sean Connery'],
                                                                ratings: [{
                                                                    source: 'imdb',
                                                                    rating: '10/10'
                                                                },
                                                                {
                                                                    source: 'rotten tomatoes',
                                                                    rating: '95%',
                                                                    logo: 'http://rotten'
                                                                }],
                                                                runtime: '120 mins'
                                                            },
                                                            later: [],
                                                            done: [],
                                                            deleted: ['user1'],
                                                            loved: [],
                                                            added: new Timestamp(1568452504, 0),
                                                            type: 5, //ALBUM
                                                            category: 3, //LISTEN
                                                            swrlID: 'ITUNESALBUM_ABC123'
                                                        }
                                                    }
                                                })
                                            })
                                        }

                                    }
                                }
                        }
                    }
            };
            const swrl = new Swrl(ALBUM, LISTEN, 'ITUNESALBUM_ABC123',
                new Details('isbn123', 'No title', '/img/NoPoster.jpg', undefined, 'Unknown', undefined,
                    ['action', 'comedy'], [new Link('http://', 'link', 'http://img'), new Link('http://', 'no logo', undefined)], 'cool film', 'something happens',
                    ['Sean Connery'], [], 'mr director', [], [new Rating('imdb', '10/10', undefined), new Rating('rotten tomatoes', '95%', 'http://rotten')],
                    '120 mins', undefined, undefined, undefined, [],
                    [],
                    [],
                    [],
                    undefined,
                    undefined,
                    undefined),
                new Date(1568452504000), undefined, []);
            const expectedRecommendation = new Recommendation('1234s', 'user1', ['user2', 'user3'], 'is great', 'ITUNESALBUM_ABC123',
                new Date(1568452504000), [], []);
            // @ts-ignore
            const recommendation = await Recommendation.fromFirestore(firestoreDoc, mockFirestore);
            expect(recommendation).to.deep.equal(expectedRecommendation);
        })
        it('it get data with read/dismissed', async function () {
            const firestoreDoc =
            {
                id: '1234s',
                data: function () {
                    return {
                        from: 'user1',
                        to: ['user2', 'user3'],
                        message: 'is great',
                        created: new Timestamp(1568452504, 0),
                        swrlID: 'ITUNESALBUM_ABC123',
                        read: ['user2'],
                        dismissed: ['user3']
                    }
                }
            };
            const mockFirestore = {
                /**
                 * let swrl = await firestore.collection(Collection.SWRLS).doc(recommendation.swrlID).get();
            if (swrl.exists) {
                let swrlData = swrl.data();
                 */
                collection:
                    /**
                     * @param {string} collection
                     */
                    function (collection) {
                        assert.equal(collection, 'swrls');
                        return {
                            doc:
                                /**
                                 * @param {string} id
                                 */
                                function (id) {
                                    assert.equal(id, 'ITUNESALBUM_ABC123');
                                    return {
                                        get: function () {
                                            return new Promise((resolve, reject) => {
                                                resolve({
                                                    exists: true,
                                                    data: function () {
                                                        return {
                                                            details: {
                                                                title: 'No title',
                                                                author: 'Unknown',
                                                                id: 'isbn123',
                                                                imageUrl: '/img/NoPoster.jpg',
                                                                tagline: 'cool film',
                                                                overview: 'something happens',
                                                                director: 'mr director',
                                                                genres: ['action', 'comedy'],
                                                                links: [{
                                                                    url: 'http://',
                                                                    name: 'link',
                                                                    logo: 'http://img'
                                                                },
                                                                {
                                                                    url: 'http://',
                                                                    name: 'no logo'
                                                                }],
                                                                actors: ['Sean Connery'],
                                                                ratings: [{
                                                                    source: 'imdb',
                                                                    rating: '10/10'
                                                                },
                                                                {
                                                                    source: 'rotten tomatoes',
                                                                    rating: '95%',
                                                                    logo: 'http://rotten'
                                                                }],
                                                                runtime: '120 mins'
                                                            },
                                                            later: [],
                                                            done: [],
                                                            deleted: ['user1'],
                                                            loved: [],
                                                            added: new Timestamp(1568452504, 0),
                                                            type: 5, //ALBUM
                                                            category: 3, //LISTEN
                                                            swrlID: 'ITUNESALBUM_ABC123'
                                                        }
                                                    }
                                                })
                                            })
                                        }

                                    }
                                }
                        }
                    }
            };
            const swrl = new Swrl(ALBUM, LISTEN, 'ITUNESALBUM_ABC123',
                new Details('isbn123', 'No title', '/img/NoPoster.jpg', undefined, 'Unknown', undefined,
                    ['action', 'comedy'], [new Link('http://', 'link', 'http://img'), new Link('http://', 'no logo', undefined)], 'cool film', 'something happens',
                    ['Sean Connery'], [], 'mr director', [], [new Rating('imdb', '10/10', undefined), new Rating('rotten tomatoes', '95%', 'http://rotten')],
                    '120 mins', undefined, undefined, undefined, [],
                    [],
                    [],
                    [],
                    undefined,
                    undefined,
                    undefined),
                new Date(1568452504000), undefined, []);
            const expectedRecommendation = new Recommendation('1234s', 'user1', ['user2', 'user3'], 'is great', 'ITUNESALBUM_ABC123',
                new Date(1568452504000), ['user2'], ['user3']);
            // @ts-ignore
            const recommendation = await Recommendation.fromFirestore(firestoreDoc, mockFirestore);
            expect(recommendation).to.deep.equal(expectedRecommendation);
        })
    })
})

describe('inboxHasSwrl', function () {
    const inbox = {
        r1: new Recommendation('r1', 'a', ['me'], 'hi', 'film-1', new Date(), [], []),
        r2: new Recommendation('r2', 'b', ['me'], 'hi', 'film-2', new Date(), [], ['me'])
    };
    it('is true when an inbox recommendation has the swrl, dismissed or not', function () {
        expect(inboxHasSwrl(inbox, 'film-1')).toBe(true);
        expect(inboxHasSwrl(inbox, 'film-2')).toBe(true);
    })
    it('is false for other swrls and an empty inbox', function () {
        expect(inboxHasSwrl(inbox, 'film-3')).toBe(false);
        expect(inboxHasSwrl({}, 'film-1')).toBe(false);
    })
})

describe('why a swrl is on my list', function () {
    it('quotes one person and their message', function () {
        expect(recommendationReason(['Alice'], ' You will love this ')).to.equal('Alice: \u201cYou will love this\u201d');
    });
    it('names the people when there is no message or more than one', function () {
        expect(recommendationReason(['Alice'], '')).to.equal('Swrled to you by Alice');
        expect(recommendationReason(['Alice', 'Bob'], 'hi')).to.equal('Swrled to you by Alice and Bob');
        expect(recommendationReason(['Alice', 'Bob', 'Cara', 'Dev'], 'hi')).to.equal('Swrled to you by Alice and 3 others');
    });
    it('says nothing when nobody is known', function () {
        expect(recommendationReason([], 'hi')).to.equal('');
        expect(recommendationReason([undefined], 'hi')).to.equal('');
    });
});

describe('type labels', function () {
    it('are the display name in sentence case', function () {
        expect(typeLabel(FILM)).to.equal('Film');
        expect(typeLabel(TV)).to.equal('TV show');
        expect(typeLabel(BOARDGAME)).to.equal('Board game');
    });
});

import { myStateOfSwrl, showInboxRecommendation, badgeCount } from '../src/model/recommendation';

describe('recommendation filters and badge', () => {
    const none = { showDone: false, showOnList: false };
    const base = { unread: false, hasUnreadReply: false, done: false, onList: false };
    it('works out done and on list from my entry', () => {
        expect(myStateOfSwrl(undefined)).toEqual({ done: false, onList: false });
        expect(myStateOfSwrl({ later: true, done: false, deleted: false })).toEqual({ done: false, onList: true });
        expect(myStateOfSwrl({ later: true, done: true, deleted: false })).toEqual({ done: true, onList: false });
        expect(myStateOfSwrl({ later: true, done: false, deleted: true })).toEqual({ done: false, onList: false });
    });
    it('by default hides done and on-list ones, unless unread or with an unread reply', () => {
        expect(showInboxRecommendation(base, none)).toBe(true);
        expect(showInboxRecommendation({ ...base, done: true }, none)).toBe(false);
        expect(showInboxRecommendation({ ...base, onList: true }, none)).toBe(false);
        expect(showInboxRecommendation({ ...base, done: true, unread: true }, none)).toBe(true);
        expect(showInboxRecommendation({ ...base, onList: true, hasUnreadReply: true }, none)).toBe(true);
    });
    it('the filters bring the hidden ones back', () => {
        expect(showInboxRecommendation({ ...base, done: true }, { showDone: true, showOnList: false })).toBe(true);
        expect(showInboxRecommendation({ ...base, onList: true }, { showDone: true, showOnList: false })).toBe(false);
        expect(showInboxRecommendation({ ...base, onList: true }, { showDone: false, showOnList: true })).toBe(true);
    });
    it('counts unread and unread-reply recommendations once each', () => {
        const rec = (id, read, dismissed) => new Recommendation(id, 'a', ['me'], 'm', 's', undefined, read, dismissed);
        const inbox = { r1: rec('r1', [], []), r2: rec('r2', ['me'], []), r3: rec('r3', [], ['me']), r4: rec('r4', ['me'], []) };
        const sent = { r9: rec('r9', [], []) };
        // r1 unread; r2 read; r3 dismissed; r4 read but has an unread reply; r9 sent with an unread reply; gone has no recommendation
        expect(badgeCount(inbox, sent, 'me', ['r1', 'r4', 'r9', 'gone'])).toBe(3);
        expect(badgeCount({}, {}, 'me', [])).toBe(0);
    });
});
