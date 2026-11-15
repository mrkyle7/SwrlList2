import { describe, it, expect } from 'vitest';
//@ts-check

import { buildEntryWrite, buildSharedSwrlWrite } from '../src/model/listEntryWrite';
import { Swrl } from '../src/model/swrl';
import { Details } from '../src/model/details';
import { FILM } from '../src/constants/Type';
import { WATCH } from '../src/constants/Category';
import { PRIVATE, FRIENDS, PUBLIC } from '../src/constants/Visibility';

const TIME = { serverTimestamp: true };
const swrl = new Swrl(FILM, WATCH, 'film-1', Details.fromJSON({ id: 'film-1', title: 'Alien', imageUrl: '/img' }));
const LEGACY_FIELDS = ['later', 'done', 'deleted', 'loved', 'isRecommended'];
const COUNT_FIELDS = ['laterCount', 'doneCount', 'lovedCount'];

describe('buildEntryWrite', function () {
    it('creates a new entry with all four flags, added, the default visibility and no override', function () {
        const data = buildEntryWrite(swrl, 'u1', { later: true, done: false, deleted: false }, false, PRIVATE, TIME);
        expect(data).to.deep.include({
            swrlID: 'film-1', uid: 'u1', type: FILM.id, category: WATCH.id,
            later: true, done: false, loved: false, deleted: false,
            visibility: 'private', visibilityOverride: false
        });
        expect(data.added).toBe(TIME);
        expect(data.updated).toBe(TIME);
        expect(data.details.title).toBe('Alien');
    })
    it('a new entry made by loving has the other flags false', function () {
        const data = buildEntryWrite(swrl, 'u1', { loved: true }, false, FRIENDS, TIME);
        expect([data.later, data.done, data.loved, data.deleted]).to.deep.equal([false, false, true, false]);
        expect(data.visibility).toBe('friends');
    })
    it('an existing entry gets only the given flags, keeping added, visibility and override', function () {
        const data = buildEntryWrite(swrl, 'u1', { loved: false }, true, PUBLIC, TIME);
        expect(data.loved).toBe(false);
        ['later', 'done', 'deleted', 'added', 'visibility', 'visibilityOverride']
            .forEach(field => expect(data).not.toHaveProperty(field));
        expect(data.updated).toBe(TIME);
        expect(data.uid).toBe('u1');
        expect(data.swrlID).toBe('film-1');
    })
    it('sets the flags exactly as the old array operations implied', function () {
        const flagsOf = (flags) => {
            const data = buildEntryWrite(swrl, 'u1', flags, true, FRIENDS, TIME);
            return ['later', 'done', 'deleted', 'loved'].filter(f => f in data).map(f => `${f}=${data[f]}`).join(',');
        };
        expect(flagsOf({ later: true, done: false, deleted: false })).toBe('later=true,done=false,deleted=false');
        expect(flagsOf({ later: false, done: true, deleted: false })).toBe('later=false,done=true,deleted=false');
        expect(flagsOf({ later: false, done: false, deleted: true })).toBe('later=false,done=false,deleted=true');
        expect(flagsOf({ later: false })).toBe('later=false');
        expect(flagsOf({ done: false })).toBe('done=false');
    })
})

describe('buildSharedSwrlWrite', function () {
    it('carries the details and never uid arrays or counts', function () {
        const data = buildSharedSwrlWrite(swrl, { added: true, updated: true }, TIME);
        expect(data).to.deep.include({ swrlID: 'film-1', type: FILM.id, category: WATCH.id });
        expect(data.added).toBe(TIME);
        expect(data.updated).toBe(TIME);
        [...LEGACY_FIELDS, ...COUNT_FIELDS].forEach(field => expect(data).not.toHaveProperty(field));
    })
    it('only writes the timestamps asked for', function () {
        const data = buildSharedSwrlWrite(swrl, {}, TIME);
        expect(data).not.toHaveProperty('added');
        expect(data).not.toHaveProperty('updated');
        expect(buildSharedSwrlWrite(swrl, { updated: true }, TIME)).not.toHaveProperty('added');
    })
})
