import { describe, it, expect } from 'vitest';
import { parseShare, recogniseLink } from '../src/model/share';

describe('shared links', function () {
    it('recognises IMDb title pages', function () {
        expect(recogniseLink('https://www.imdb.com/title/tt0133093/')).to.deep.equal({ source: 'imdb', imdbId: 'tt0133093' });
        expect(recogniseLink('https://m.imdb.com/title/tt0133093/?ref_=ext_shr_lnk')).to.deep.equal({ source: 'imdb', imdbId: 'tt0133093' });
        expect(recogniseLink('https://www.imdb.com/es-es/title/tt15239678')).to.deep.equal({ source: 'imdb', imdbId: 'tt15239678' });
        expect(recogniseLink('https://www.imdb.com/title/tt0133093/fullcredits')).to.deep.equal({ source: 'imdb', imdbId: 'tt0133093' });
    });

    it('recognises TMDB film and TV pages', function () {
        expect(recogniseLink('https://www.themoviedb.org/movie/603-the-matrix')).to.deep.equal({ source: 'tmdb', kind: 'movie', id: '603' });
        expect(recogniseLink('https://www.themoviedb.org/tv/1399?language=en-GB')).to.deep.equal({ source: 'tmdb', kind: 'tv', id: '1399' });
        expect(recogniseLink('https://themoviedb.org/tv/1399-game-of-thrones/season/1')).to.deep.equal({ source: 'tmdb', kind: 'tv', id: '1399' });
    });

    it('ignores everything else', function () {
        expect(recogniseLink('https://www.imdb.com/name/nm0000206/')).to.equal(undefined);
        expect(recogniseLink('https://www.themoviedb.org/person/6384')).to.equal(undefined);
        expect(recogniseLink('https://notimdb.com/title/tt0133093/')).to.equal(undefined);
        expect(recogniseLink('https://example.com/?u=https://www.imdb.com/title/tt0133093/')).to.equal(undefined);
        expect(recogniseLink('not a link')).to.equal(undefined);
        expect(recogniseLink('')).to.equal(undefined);
    });

    it('finds the link wherever the sharing app put it', function () {
        expect(parseShare({ url: 'https://www.imdb.com/title/tt0133093/' }).link).to.deep.equal({ source: 'imdb', imdbId: 'tt0133093' });
        expect(parseShare({ title: 'The Matrix', text: 'Check out The Matrix on IMDb https://www.imdb.com/title/tt0133093/?ref_=x' }))
            .to.deep.equal({ link: { source: 'imdb', imdbId: 'tt0133093' }, query: 'Check out The Matrix on IMDb' });
        expect(parseShare({ text: 'https://example.com/a https://www.themoviedb.org/movie/603' }).link)
            .to.deep.equal({ source: 'tmdb', kind: 'movie', id: '603' });
    });

    it('falls back to words to search for', function () {
        expect(parseShare({ text: 'Blade Runner 2049' })).to.deep.equal({ link: undefined, query: 'Blade Runner 2049' });
        expect(parseShare({ title: 'Dune (2021)', url: 'https://example.com/dune' })).to.deep.equal({ link: undefined, query: 'Dune (2021)' });
        expect(parseShare({ title: 'A title', text: 'Some  words\nhttps://example.com/x' }).query).to.equal('Some words');
        expect(parseShare({ url: 'https://example.com/x' })).to.deep.equal({ link: undefined, query: '' });
        expect(parseShare({})).to.deep.equal({ link: undefined, query: '' });
        expect(parseShare({ text: 'a'.repeat(300) }).query).to.have.length(200);
    });
});
