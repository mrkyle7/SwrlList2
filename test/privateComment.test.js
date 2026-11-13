import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { MAX_PRIVATE_COMMENT_LENGTH, PrivateComment } from '../src/model/privateComment';
import { privateCommentsPath } from '../src/constants/Collection';

describe('PrivateComment', function () {
    it('reads a stored comment', function () {
        const comment = PrivateComment.fromFirestore('c1', { text: 'Sam said watch this', created: new Timestamp(1568452504, 0) });
        expect(comment).to.deep.equal(new PrivateComment('c1', 'Sam said watch this', new Date(1568452504000)));
    });

    it('copes with a comment the server has not timestamped yet', function () {
        const comment = PrivateComment.fromFirestore('c1', { text: 'new', created: null });
        expect(comment.created).to.equal(undefined);
        expect(comment.text).to.equal('new');
    });

    it('trims what is typed and rejects empty or oversized text', function () {
        expect(PrivateComment.clean('  hello\n')).to.equal('hello');
        expect(PrivateComment.clean('   ')).to.equal(undefined);
        expect(PrivateComment.clean(undefined)).to.equal(undefined);
        expect(PrivateComment.clean('a'.repeat(MAX_PRIVATE_COMMENT_LENGTH))).to.have.length(MAX_PRIVATE_COMMENT_LENGTH);
        expect(PrivateComment.clean('a'.repeat(MAX_PRIVATE_COMMENT_LENGTH + 1))).to.equal(undefined);
    });

    it('is stored under the owning user, per swrl', function () {
        expect(privateCommentsPath('user1', 'TMDBMOVIE_348'))
            .to.deep.equal(['swrlers', 'user1', 'privateComments', 'TMDBMOVIE_348', 'comments']);
    });
});
