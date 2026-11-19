import { describe, it, expect } from 'vitest';
import { progressWords, inProgressFirst } from '../src/model/progress';
import { activityCaption } from '../src/model/activity';
import { ListEntry } from '../src/model/listEntry';
import { buildEntryWrite } from '../src/model/listEntryWrite';
import { Swrl } from '../src/model/swrl';
import { Details } from '../src/model/details';
import { FILM } from '../src/constants/Type';
import { WATCH } from '../src/constants/Category';
import { FRIENDS } from '../src/constants/Visibility';

describe('in progress', function () {
    it('uses each category\'s verb', function () {
        expect(progressWords(1)).to.deep.equal({ now: 'Watching', start: 'Start watching', caption: 'watching' });
        expect(progressWords(2).now).to.equal('Reading');
        expect(progressWords(3)).to.deep.equal({ now: 'Listening', start: 'Start listening', caption: 'listening to' });
        expect(progressWords(4).start).to.equal('Start playing');
    });

    it('puts what I have started first, keeping the order otherwise', function () {
        const order = inProgressFirst([{ id: 'a' }, { id: 'b', inProgress: true }, { id: 'c' }, { id: 'd', inProgress: true }]);
        expect(order.map(e => e.id)).to.deep.equal(['b', 'd', 'a', 'c']);
    });

    it('tells friends who has started it, after love and done', function () {
        expect(activityCaption([{ name: 'Bob', loved: false, inProgress: true }], 1)).to.equal('Bob is watching it');
        expect(activityCaption([{ name: 'Bob', loved: false, inProgress: true }, { name: 'Cara', loved: false, inProgress: true }], 3))
            .to.equal('Bob and Cara are listening to it');
        expect(activityCaption([{ name: 'Bob', loved: false, inProgress: true }, { name: 'Cara', loved: false, done: true }], 2))
            .to.equal('Cara read it');
        expect(activityCaption([{ name: 'Bob', loved: false }], 4)).to.equal('Bob wants to play it');
    });

    it('is stored on the list entry and read back', function () {
        const entry = ListEntry.fromFirestore({ uid: 'u', swrlID: 's', type: FILM.id, category: WATCH.id, details: { id: 's', title: 'T', imageUrl: 'x' }, later: true, inProgress: true });
        expect(entry.inProgress).to.equal(true);
        expect(entry.toFirestoreData().inProgress).to.equal(true);
        const old = ListEntry.fromFirestore({ uid: 'u', swrlID: 's', type: FILM.id, category: WATCH.id, details: { id: 's', title: 'T', imageUrl: 'x' }, later: true });
        expect(old.inProgress).to.equal(false);
    });

    it('starts false on a new entry', function () {
        const swrl = new Swrl(FILM, WATCH, 's', Details.fromJSON({ id: 's', title: 'T', imageUrl: 'x' }));
        expect(buildEntryWrite(swrl, 'u', { later: true }, false, FRIENDS, 'now').inProgress).to.equal(false);
        expect(buildEntryWrite(swrl, 'u', { later: true }, true, FRIENDS, 'now')).not.to.have.property('inProgress');
    });
});

import { inProgressByCategory, countsByCategory } from '../src/model/listView';

describe('in progress on the home tiles', function () {
    it('counts what I have started, on my list and not dismissed', function () {
        const watch = { name: 'watch' };
        const entries = [
            { later: true, inProgress: true, deleted: false, category: watch },
            { later: true, deleted: false, category: watch },
            { later: false, inProgress: true, deleted: false, category: watch },
            { later: true, inProgress: true, deleted: true, category: watch },
        ];
        expect(inProgressByCategory(entries)).to.deep.equal({ watch: 1 });
        expect(countsByCategory(entries)).to.deep.equal({ watch: 2 });
    });
});
