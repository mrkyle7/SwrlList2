/// <reference types="cypress" />
//@ts-check

import { Swrl } from '../../../src/model/swrl';
import { FILM, TV, ALBUM, BOOK } from '../../../src/constants/Type';
import { WATCH, LISTEN, READ } from '../../../src/constants/Category';
import { Details } from '../../../src/model/details';
import firebase from 'firebase';

describe('Can parse JSON to Swrl', function () {
    context('swrl.js', function () {
        it('can compare swrl classes', function () {
            const aDate = new Date();
            const swrl1 = new Swrl(FILM, WATCH, 'abc123',
                new Details('film-123', 'A Film', 'http://img', undefined, undefined, '2019'),
                aDate, ['user1'], [], [], [], undefined, [], []);
            const swrl2 = new Swrl(FILM, WATCH, 'abc123',
                new Details('film-123', 'A Film', 'http://img', undefined, undefined, '2019'),
                aDate, ['user1'], [], [], [], undefined, [], []);
            const swrl3 = new Swrl(TV, WATCH, 'abc1234',
                new Details('tv-123', 'A TV Show', 'http://img', undefined, undefined, undefined),
                aDate, [], [], [], [], undefined, [], []);
            expect(swrl1.equals(swrl2)).to.be.true;
            expect(swrl1).to.deep.equal(swrl2);
            expect(swrl1.equals(swrl3)).to.be.false;
        })

        it('can parse FireStore Data to Swrl', function () {
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
                added: new firebase.firestore.Timestamp(1568452504, 0),
                type: 5, //ALBUM
                category: 3, //LISTEN
                swrlID: 'ITUNESALBUM_ABC123'
            }
            const expected = new Swrl(ALBUM, LISTEN, 'ITUNESALBUM_ABC123',
                new Details('ABC123', 'No title', '/img/NoPoster.jpg', 'Unknown', undefined, undefined),
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
                new Details('ABC123', 'No title', '/img/NoPoster.jpg', 'Unknown', undefined, undefined),
                undefined, [], [], ['user1'], [], undefined, [], []);
            expect(Swrl.fromFirestore(data)).to.deep.equal(expected);
        })

        it('can create JSON from Swrl', function () {
            const expectedJson = {
                details: {
                    title: 'No title',
                    author: 'Unknown',
                    id: 'isbn123',
                    imageUrl: '/img/NoPoster.jpg'
                },
                type: 3, //BOOK
                category: 2, //READ
                swrlID: 'OPENLIBRARY-ISBN_123'
            };
            const swrl = new Swrl(BOOK, READ, 'OPENLIBRARY-ISBN_123',
                new Details('isbn123', 'No title', '/img/NoPoster.jpg', undefined, 'Unknown', undefined),
                new Date(), ['user1'], [], [], [], undefined, [], []);
            expect(swrl.toPartialFireStoreData()).to.deep.equal(expectedJson);
        })
    })
})