import { describe, it, expect } from 'vitest';
import { parseShare, recogniseLink, shareText, shareUrl, slugWords, isIsbn10 } from '../src/model/share';

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
            .to.deep.equal({ link: { source: 'imdb', imdbId: 'tt0133093' }, query: 'The Matrix' });
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

describe('more shared links', function () {
    it('opens books from Open Library and Amazon', function () {
        expect(recogniseLink('https://openlibrary.org/isbn/978-0-441-01359-3')).to.deep.equal({ source: 'item', type: 'book', id: '9780441013593' });
        expect(recogniseLink('https://openlibrary.org/works/OL893415W/Dune')).to.deep.equal({ source: 'openlibrary', kind: 'works', id: 'OL893415W' });
        expect(recogniseLink('https://openlibrary.org/books/OL26242482M/Dune')).to.deep.equal({ source: 'openlibrary', kind: 'books', id: 'OL26242482M' });
        expect(recogniseLink('https://www.amazon.co.uk/Dune-Frank-Herbert/dp/0340960191/ref=sr_1_1')).to.deep.equal({ source: 'item', type: 'book', id: '0340960191' });
        expect(recogniseLink('https://www.amazon.com/gp/product/044101359X')).to.equal(undefined); // bad check digit
        expect(recogniseLink('https://www.amazon.com/dp/B08N5WRWNW')).to.equal(undefined); // not a book
    });
    it('opens Apple Music albums and Apple Podcasts', function () {
        expect(recogniseLink('https://music.apple.com/gb/album/dune-original-motion-picture-soundtrack/1580335349?i=1580335350'))
            .to.deep.equal({ source: 'item', type: 'album', id: '1580335349' });
        expect(recogniseLink('https://podcasts.apple.com/gb/podcast/the-rest-is-history/id1537788786'))
            .to.deep.equal({ source: 'item', type: 'podcast', id: '1537788786' });
        expect(recogniseLink('https://itunes.apple.com/gb/album/blonde/id1146195596')).to.deep.equal({ source: 'item', type: 'album', id: '1146195596' });
        expect(recogniseLink('https://music.apple.com/gb/artist/hans-zimmer/1088474')).to.equal(undefined);
    });
    it('opens BoardGameGeek and VideoGameGeek games', function () {
        expect(recogniseLink('https://boardgamegeek.com/boardgame/266192/wingspan')).to.deep.equal({ source: 'item', type: 'boardgame', id: '266192' });
        expect(recogniseLink('https://boardgamegeek.com/boardgameexpansion/290837/wingspan-oceania')).to.deep.equal({ source: 'item', type: 'boardgame', id: '290837' });
        expect(recogniseLink('https://videogamegeek.com/videogame/69327/hades')).to.deep.equal({ source: 'item', type: 'videogame', id: '69327' });
        expect(recogniseLink('https://boardgamegeek.com/user/someone')).to.equal(undefined);
    });
    it('searches the right category for links with a title in them', function () {
        expect(recogniseLink('https://www.goodreads.com/book/show/58613451-project-hail-mary')).to.deep.equal({ source: 'search', category: 'read', query: 'project hail mary' });
        expect(recogniseLink('https://www.goodreads.com/en/book/show/44767458.Dune')).to.deep.equal({ source: 'search', category: 'read', query: 'Dune' });
        expect(recogniseLink('https://letterboxd.com/film/dune-part-two/')).to.deep.equal({ source: 'search', category: 'watch', query: 'dune part two' });
        expect(recogniseLink('https://store.steampowered.com/app/1145350/Hades_II/')).to.deep.equal({ source: 'search', category: 'play', query: 'Hades II' });
        expect(recogniseLink('https://store.steampowered.com/app/1145350')).to.equal(undefined);
    });
    it('asks Spotify for the title of an album, show, episode or track', function () {
        expect(recogniseLink('https://open.spotify.com/album/0Pr7nGCgVmwdkpwasw9S1E?si=abc')).to.deep.equal({ source: 'spotify', url: 'https://open.spotify.com/album/0Pr7nGCgVmwdkpwasw9S1E' });
        expect(recogniseLink('https://open.spotify.com/intl-de/show/2mTUnDkuKUkhiueKcVWoP0')).to.deep.equal({ source: 'spotify', url: 'https://open.spotify.com/intl-de/show/2mTUnDkuKUkhiueKcVWoP0' });
        expect(recogniseLink('https://open.spotify.com/user/someone')).to.equal(undefined);
    });
    it('leaves the sharing app\'s wording out of the search', function () {
        expect(parseShare({ text: 'Check out Piranesi by Susanna Clarke on Goodreads: https://example.com/x' }).query).to.equal('Piranesi by Susanna Clarke');
        expect(parseShare({ text: "I'm reading Babel" }).query).to.equal('Babel');
        expect(parseShare({ text: 'Past Lives via @letterboxd' }).query).to.equal('Past Lives');
        expect(parseShare({ text: 'Watch' }).query).to.equal('Watch'); // nothing left: keep it
    });
    it('reads slugs and ISBN-10s', function () {
        expect(slugWords('1234.Project_Hail_Mary')).to.equal('Project Hail Mary');
        expect(slugWords('caf%C3%A9-society')).to.equal('café society');
        expect(isIsbn10('0340960191')).to.equal(true);
        expect(isIsbn10('080442957X')).to.equal(true);
        expect(isIsbn10('0340960192')).to.equal(false);
    });
});

describe('sharing a swrl outside the app', function () {
    it('says who swrled it and what they said', function () {
        expect(shareText({ title: 'Dune', category: 1, fromName: 'Alice', message: ' You will love it ' }))
            .to.equal('Alice swrled you Dune: “You will love it”');
        expect(shareText({ title: 'Dune', category: 2, fromName: 'Alice' })).to.equal('Alice swrled you Dune.');
    });
    it('without a name, says what to do with it', function () {
        expect(shareText({ title: 'Dune', category: 2 })).to.equal('You should read Dune.');
        expect(shareText({ title: 'Serial', category: 3, message: 'hi' })).to.equal('You should listen to Serial: “hi”');
        expect(shareText({ title: 'X', category: 99 })).to.equal('You should try X.');
    });
    it('links to the swrl, and to the share when there is one', function () {
        expect(shareUrl('https://swrl-list.com', 'TMDBMOVIE_603')).to.equal('https://swrl-list.com/swrl/TMDBMOVIE_603');
        expect(shareUrl('https://swrl-list.com', 'OPENLIBRARY-ISBN_1', 'abc')).to.equal('https://swrl-list.com/swrl/OPENLIBRARY-ISBN_1?from=abc');
    });
});
