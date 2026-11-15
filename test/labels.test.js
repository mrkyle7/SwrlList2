import { describe, it, expect } from 'vitest';
import {
    MAX_LABEL_LENGTH, MAX_LABELS_PER_SWRL, addLabel, allLabels, cleanLabel, hasLabel,
    labelSuggestions, labelsFromFirestore, matchesLabels, removeLabel
} from '../src/model/labels';
import { labelsPath } from '../src/constants/Collection';

describe('labels', function () {
    it('cleans what is typed and rejects empty or oversized labels', function () {
        expect(cleanLabel('  with   the kids \n')).to.equal('with the kids');
        expect(cleanLabel('   ')).to.equal(undefined);
        expect(cleanLabel(undefined)).to.equal(undefined);
        expect(cleanLabel('a'.repeat(MAX_LABEL_LENGTH))).to.have.length(MAX_LABEL_LENGTH);
        expect(cleanLabel('a'.repeat(MAX_LABEL_LENGTH + 1))).to.equal(undefined);
    });

    it('adds a label once, ignoring case, and keeps the list sorted', function () {
        expect(addLabel(['scary'], 'Comedy')).to.deep.equal(['Comedy', 'scary']);
        expect(addLabel(['Comedy'], 'comedy')).to.equal(undefined);
        expect(hasLabel(['Comedy'], 'COMEDY')).to.equal(true);
    });

    it('refuses more labels than a swrl may have', function () {
        const full = Array.from({ length: MAX_LABELS_PER_SWRL }, (_, i) => 'label' + i);
        expect(addLabel(full, 'one more')).to.equal(undefined);
    });

    it('removes a label ignoring case', function () {
        expect(removeLabel(['Comedy', 'scary'], 'comedy')).to.deep.equal(['scary']);
        expect(removeLabel(['scary'], 'comedy')).to.deep.equal(['scary']);
    });

    it('lists every label once, sorted', function () {
        expect(allLabels({ a: ['scary', 'Comedy'], b: ['comedy', 'date night'], c: [] }))
            .to.deep.equal(['Comedy', 'date night', 'scary']);
        expect(allLabels({})).to.deep.equal([]);
    });

    it('matches a swrl that has every selected label', function () {
        expect(matchesLabels(['Comedy', 'scary'], [])).to.equal(true);
        expect(matchesLabels(['Comedy', 'scary'], ['comedy'])).to.equal(true);
        expect(matchesLabels(['Comedy'], ['comedy', 'scary'])).to.equal(false);
        expect(matchesLabels(undefined, ['comedy'])).to.equal(false);
        expect(matchesLabels(undefined, [])).to.equal(true);
    });

    it('reads stored labels, tolerating bad data', function () {
        expect(labelsFromFirestore({ labels: ['a', '', 3, 'b'] })).to.deep.equal(['a', 'b']);
        expect(labelsFromFirestore({})).to.deep.equal([]);
        expect(labelsFromFirestore(undefined)).to.deep.equal([]);
    });

    it('suggests my other labels and offers to create a new one', function () {
        const all = ['Comedy', 'date night', 'scary'];
        expect(labelSuggestions(all, ['scary'], '')).to.deep.equal({ existing: ['Comedy', 'date night'], create: undefined });
        expect(labelSuggestions(all, ['scary'], ' NIG')).to.deep.equal({ existing: ['date night'], create: 'NIG' });
        expect(labelSuggestions(all, [], 'comedy')).to.deep.equal({ existing: ['Comedy'], create: undefined });
        expect(labelSuggestions(all, ['scary'], 'Scary')).to.deep.equal({ existing: [], create: undefined });
        expect(labelSuggestions([], [], 'a'.repeat(31))).to.deep.equal({ existing: [], create: undefined });
    });

    it('are stored under the owning user, per swrl', function () {
        expect(labelsPath('user1')).to.deep.equal(['swrlers', 'user1', 'labels']);
    });
});
