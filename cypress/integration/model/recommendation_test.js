/// <reference types="cypress" />
// @ts-check

import firebase from 'firebase';
import { Swrl } from '../../../src/model/swrl';
import { ALBUM } from '../../../src/constants/Type';
import { LISTEN } from '../../../src/constants/Category';
import { Details } from '../../../src/model/details';
import { Recommendation } from '../../../src/model/recommendation';
import { Link } from '../../../src/model/link';
import { Rating } from '../../../src/model/rating';

describe('Can translate Firestore data to a recommendation', function () {
    context('recommendation.js', function () {
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
                        created: new firebase.firestore.Timestamp(1568452504, 0),
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
                                                            added: new firebase.firestore.Timestamp(1568452504, 0),
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
                    ['Sean Connery'], 'mr director', [new Rating('imdb', '10/10', undefined), new Rating('rotten tomatoes', '95%', 'http://rotten')],
                    '120 mins', undefined, undefined, undefined, [],
                    [],
                    [],
                    [],
                    undefined,
                    undefined,
                    undefined),
                new Date(1568452504000), [], [], ['user1'], [], undefined, [], []);
            const expectedRecommendation = new Recommendation('1234s', 'user1', ['user2', 'user3'], 'is great', 'ITUNESALBUM_ABC123',
                new Date(1568452504000), swrl, [], []);
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
                        created: new firebase.firestore.Timestamp(1568452504, 0),
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
                                                            added: new firebase.firestore.Timestamp(1568452504, 0),
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
                    ['Sean Connery'], 'mr director', [new Rating('imdb', '10/10', undefined), new Rating('rotten tomatoes', '95%', 'http://rotten')],
                    '120 mins', undefined, undefined, undefined, [],
                    [],
                    [],
                    [],
                    undefined,
                    undefined,
                    undefined),
                new Date(1568452504000), [], [], ['user1'], [], undefined, [], []);
            const expectedRecommendation = new Recommendation('1234s', 'user1', ['user2', 'user3'], 'is great', 'ITUNESALBUM_ABC123',
                new Date(1568452504000), swrl, ['user2'], ['user3']);
            // @ts-ignore
            const recommendation = await Recommendation.fromFirestore(firestoreDoc, mockFirestore);
            expect(recommendation).to.deep.equal(expectedRecommendation);
        })
    })
})