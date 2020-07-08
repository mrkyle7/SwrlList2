/// <reference types="cypress" />
//@ts-check

import { Swrl } from '../../../src/model/swrl';
import { FILM, TV, ALBUM, BOOK } from '../../../src/constants/Type';
import { WATCH, LISTEN, READ } from '../../../src/constants/Category';
import { Details } from '../../../src/model/details';
import firebase from 'firebase/app';
import { Link } from '../../../src/model/link';
import { Rating } from '../../../src/model/rating';
import { Network } from '../../../src/model/network';
import { TmdbPerson } from '../../../src/model/tmdbPerson';

describe('Can parse JSON to Swrl', function () {
    context('swrl.js', function () {
        it('can compare swrl classes', function () {
            const aDate = new Date();
            const swrl1 = new Swrl(FILM, WATCH, 'abc123',
                new Details('film-123', 'A Film', 'http://img', undefined, undefined, '2019',
                    [], [], undefined, undefined, [], [], undefined, [], [], undefined, 1, '12 mins', '2', [],
                    [],
                    [],
                    [],
                    undefined,
                    undefined,
                    undefined),
                aDate, ['user1'], [], [], [], undefined, [], []);
            const swrl2 = new Swrl(FILM, WATCH, 'abc123',
                new Details('film-123', 'A Film', 'http://img', undefined, undefined, '2019',
                    [], [], undefined, undefined, [], [], undefined, [], [], undefined, 1, '12 mins', '2', [],
                    [],
                    [],
                    [],
                    undefined,
                    undefined,
                    undefined),
                aDate, ['user1'], [], [], [], undefined, [], []);
            const swrl3 = new Swrl(TV, WATCH, 'abc1234',
                new Details('tv-123', 'A TV Show', 'http://img', undefined, undefined, undefined,
                    [], [], undefined, undefined, [], [], undefined, [], [], undefined, 1, '12 mins', '2', [],
                    [],
                    [],
                    [],
                    undefined,
                    undefined,
                    undefined),
                aDate, [], [], [], [], undefined, [], []);
            expect(swrl1).to.deep.equal(swrl2);
            expect(swrl1).to.not.deep.equal(swrl3);
        })

        it('can parse FireStore Data to Swrl', function () {
            const data = {
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
                    tMDBActors: [{ name: 'Sean Connery', id: 2, imageUrl: '/img' }],
                    tMDBDirectors: [{ name: 'mr director', id: 2, imageUrl: '/img' }],
                    ratings: [{
                        source: 'imdb',
                        rating: '10/10'
                    },
                    {
                        source: 'rotten tomatoes',
                        rating: '95%',
                        logo: 'http://rotten'
                    }],
                    runtime: '120 mins',
                    numberOfSeasons: 1,
                    averageEpisodeLength: '12 mins',
                    lastAirDate: '2',
                    networks: [{ name: 'ABC', logo: 'http://img' }],
                    designers: ['mr harry'],
                    platforms: ['ps3'],
                    publishers: ['bob', 'jim'],
                    playerCount: '2',
                    twoPlayerRecommendation: 'nah',
                    playingTime: 'hours'
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
            const expected = new Swrl(ALBUM, LISTEN, 'ITUNESALBUM_ABC123',
                new Details('isbn123', 'No title', '/img/NoPoster.jpg', undefined, 'Unknown', undefined,
                    ['action', 'comedy'], [new Link('http://', 'link', 'http://img'), new Link('http://', 'no logo', undefined)], 'cool film', 'something happens',
                    ['Sean Connery'], [new TmdbPerson('Sean Connery', 2, '/img')], 'mr director',
                    [new TmdbPerson('mr director', 2, '/img')],
                    [new Rating('imdb', '10/10', undefined), new Rating('rotten tomatoes', '95%', 'http://rotten')],
                    '120 mins', 1, '12 mins', '2', [new Network('ABC', 'http://img')],
                    ['mr harry'],
                    ['ps3'],
                    ['bob', 'jim'],
                    '2',
                    'nah',
                    'hours'),
                new Date(1568452504000), [], [], ['user1'], [], undefined, [], []);
            expect(Swrl.fromFirestore(data)).to.deep.equal(expected);
        })

        it('can parse FireStore Data to Swrl with no added date', function () {
            const data = {
                details: {
                    title: 'No title',
                    artist: 'Unknown',
                    id: 'ABC123',
                    imageUrl: '/img/NoPoster.jpg'
                },
                later: [],
                done: [],
                deleted: ['user1'],
                loved: [],
                added: null,
                type: 5, //ALBUM
                category: 3, //LISTEN
                swrlID: 'ITUNESALBUM_ABC123'
            }
            const expected = new Swrl(ALBUM, LISTEN, 'ITUNESALBUM_ABC123',
                new Details('ABC123', 'No title', '/img/NoPoster.jpg', 'Unknown', undefined, undefined,
                    [], [], undefined, undefined, [], [], undefined, [], [], undefined,
                    undefined, undefined, undefined, [],
                    [],
                    [],
                    [],
                    undefined,
                    undefined,
                    undefined),
                undefined, [], [], ['user1'], [], undefined, [], []);
            expect(Swrl.fromFirestore(data)).to.deep.equal(expected);
        })

        it('can create JSON from Swrl with empty arrays', function () {
            const expectedJson = {
                details: {
                    title: 'No title',
                    author: 'Unknown',
                    id: 'isbn123',
                    imageUrl: '/img/NoPoster.jpg',
                    genres: [],
                    links: [],
                    actors: [],
                    ratings: [],
                    networks: [],
                    designers: [],
                    platforms: [],
                    publishers: [],
                    tMDBActors: [],
                    tMDBDirectors: []
                },
                type: 3, //BOOK
                category: 2, //READ
                swrlID: 'OPENLIBRARY-ISBN_123'
            };
            const swrl = new Swrl(BOOK, READ, 'OPENLIBRARY-ISBN_123',
                new Details('isbn123', 'No title', '/img/NoPoster.jpg', null, 'Unknown', undefined,
                    [], [], undefined, undefined, [], [], undefined, [], [], undefined,
                    undefined, undefined, undefined, [],
                    [],
                    [],
                    [],
                    undefined,
                    undefined,
                    undefined),
                new Date(), ['user1'], [], [], [], undefined, [], []);
            expect(swrl.toPartialFireStoreData()).to.deep.equal(expectedJson);
        })

        it('can translate to JSON from Swrl with full details', function () {
            const json = {
                details: {
                    title: 'No title',
                    author: 'Unknown',
                    id: 'isbn123',
                    imageUrl: '/img/NoPoster.jpg',
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
                    tMDBActors: [{name: 'Sean Connery', id: 2, imageUrl: '/img'}],
                    tMDBDirectors: [{name: 'mr director', id: 2, imageUrl: '/img'}],
                    ratings: [{
                        source: 'imdb',
                        rating: '10/10'
                    },
                    {
                        source: 'rotten tomatoes',
                        rating: '95%',
                        logo: 'http://rotten'
                    }],
                    numberOfSeasons: 1,
                    averageEpisodeLength: '12 mins',
                    lastAirDate: '2',
                    networks: [{ name: 'ABC', logo: 'http://img' }],
                    designers: ['mr harry'],
                    platforms: ['ps3'],
                    publishers: ['bob', 'jim'],
                    playerCount: '2',
                    twoPlayerRecommendation: 'nah',
                    playingTime: 'hours'
                },
                type: 3, //BOOK
                category: 2, //READ
                swrlID: 'OPENLIBRARY-ISBN_123'
            };
            const swrl = new Swrl(BOOK, READ, 'OPENLIBRARY-ISBN_123',
                new Details('isbn123', 'No title', '/img/NoPoster.jpg', undefined, 'Unknown', undefined,
                    ['action', 'comedy'], [new Link('http://', 'link', 'http://img'), new Link('http://', 'no logo', undefined)], undefined, undefined,
                    ['Sean Connery'], [new TmdbPerson('Sean Connery', 2, '/img')], undefined,
                    [new TmdbPerson('mr director', 2, '/img')], [new Rating('imdb', '10/10', undefined), new Rating('rotten tomatoes', '95%', 'http://rotten')],
                    undefined, 1, '12 mins', '2', [new Network('ABC', 'http://img')],
                    ['mr harry'],
                    ['ps3'],
                    ['bob', 'jim'],
                    '2',
                    'nah',
                    'hours'),
                new Date(), ['user1'], [], [], [], undefined, [], []);
            expect(swrl.toPartialFireStoreData()).to.deep.equal(json);
        })
    })
})