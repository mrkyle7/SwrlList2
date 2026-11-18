import { describe, it, expect } from 'vitest';
import { searchFailureText } from '../src/model/searchFailure';
import { settle } from '../src/search/settle';

describe('telling people part of a search failed', function () {
    it('names what is missing, briefly', function () {
        expect(searchFailureText([])).to.equal('');
        expect(searchFailureText(['albums'])).to.equal("Couldn't load albums right now");
        expect(searchFailureText(['albums', 'podcasts'])).to.equal("Couldn't load albums or podcasts right now");
        expect(searchFailureText(['films', 'TV shows', 'books', 'films'])).to.equal("Couldn't load films, TV shows or books right now");
    });
});

describe('settling a search', function () {
    it('keeps what worked and names what failed', async function () {
        const out = await settle([
            { name: 'albums', run: () => Promise.reject(new Error('blocked')) },
            { name: 'podcasts', run: () => Promise.resolve(['p1']) },
        ]);
        expect(out).to.deep.equal({ results: [[], ['p1']], failed: ['albums'] });
    });
    it('does not count a superseded search as a failure', async function () {
        const controller = new AbortController();
        controller.abort();
        const out = await settle([{ name: 'albums', run: () => Promise.reject(new Error('aborted')) }], controller.signal);
        expect(out.failed).to.deep.equal([]);
    });
});
