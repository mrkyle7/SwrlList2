import { describe, it, expect } from 'vitest';
import { Details } from '../src/model/details';
import { Link } from '../src/model/link';
import { TmdbPerson } from '../src/model/tmdbPerson';
import {
    TABS, POSTER, DEFAULT_PAGE_LAYOUT, pageLayoutFromId, pageLayouts,
    castAndCrew, peopleToShow, PEOPLE_SHOWN, initials, hueFor, detailFacts, metaLine,
    groupLinks, linkDisplay, tabsToShow, activeTab, capitalise, splitGenres, GENRES_SHOWN, artShape
} from '../src/model/swrlPage';

/**
 * A Details with only the fields a test names.
 *
 * @param {Object} fields
 * @return {Details}
 */
function details(fields = {}) {
    const d = new Details('id-1', 'A Film', 'http://img', undefined, undefined, undefined,
        [], [], undefined, undefined, [], [], undefined, [], [], undefined,
        undefined, undefined, undefined, [], [], [], [], undefined, undefined, undefined);
    return Object.assign(d, fields);
}

describe('page layout', () => {
    it('gives the tab layout until the user chooses', () => {
        expect(DEFAULT_PAGE_LAYOUT).toBe(TABS);
        expect(pageLayoutFromId(undefined)).toBe(TABS);
    });
    it('reads the stored values back', () => {
        expect(pageLayoutFromId('tabs')).toBe(TABS);
        expect(pageLayoutFromId('poster')).toBe(POSTER);
    });
    it('treats an unknown or malformed value as the default', () => {
        expect(pageLayoutFromId('grid')).toBe(TABS);
        expect(pageLayoutFromId('')).toBe(TABS);
        // @ts-ignore a bad value from a hand-edited profile
        expect(pageLayoutFromId(42)).toBe(TABS);
    });
    it('keeps the stored ids stable', () => {
        expect(pageLayouts.map(layout => layout.id)).toEqual(['tabs', 'poster']);
    });
});

describe('castAndCrew', () => {
    it('puts directors before actors and keeps TMDB ids and photos', () => {
        const people = castAndCrew(details({
            tMDBDirectors: [new TmdbPerson('Dee Rector', 7, 'http://d')],
            tMDBActors: [new TmdbPerson('Ann Actor', 1, 'http://a'), new TmdbPerson('Bo Actor', 2, undefined)]
        }));
        expect(people).toEqual([
            { name: 'Dee Rector', role: 'Director', id: 7, imageUrl: 'http://d' },
            { name: 'Ann Actor', role: 'Actor', id: 1, imageUrl: 'http://a' },
            { name: 'Bo Actor', role: 'Actor', id: 2, imageUrl: undefined }
        ]);
    });
    it('falls back to the plain names older swrls saved', () => {
        const people = castAndCrew(details({ director: 'Old Director', actors: ['One', 'Two'] }));
        expect(people.map(p => `${p.role}:${p.name}`)).toEqual(['Director:Old Director', 'Actor:One', 'Actor:Two']);
        expect(people.every(p => p.id === undefined)).toBe(true);
    });
    it('is empty for something with no people', () => {
        expect(castAndCrew(details())).toEqual([]);
    });
    it('does not list the plain director twice when TMDB directors exist', () => {
        const people = castAndCrew(details({ director: 'Dee Rector', tMDBDirectors: [new TmdbPerson('Dee Rector', 7, 'x')] }));
        expect(people.filter(p => p.role === 'Director')).toHaveLength(1);
    });
});

describe('peopleToShow', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ name: `P${i}`, role: 'Actor' }));
    it('shows the first few until asked for all', () => {
        expect(peopleToShow(many, false)).toHaveLength(PEOPLE_SHOWN);
        expect(peopleToShow(many, true)).toHaveLength(10);
    });
    it('shows everyone when there are few', () => {
        expect(peopleToShow(many.slice(0, 2), false)).toHaveLength(2);
    });
});

describe('initials and hueFor', () => {
    it('takes up to two capital letters', () => {
        expect(initials('ines calderwood')).toBe('IC');
        expect(initials('Cher')).toBe('C');
        expect(initials('Mary Jane Watson')).toBe('MJ');
        expect(initials('  ')).toBe('');
        expect(initials(undefined)).toBe('');
    });
    it('gives one name the same hue each time, always in range', () => {
        expect(hueFor('Priya Anand')).toBe(hueFor('Priya Anand'));
        ['', 'A', 'Priya Anand', 'x'.repeat(500)].forEach(name => {
            const hue = hueFor(name);
            expect(hue).toBeGreaterThanOrEqual(0);
            expect(hue).toBeLessThan(360);
        });
    });
});

describe('detailFacts', () => {
    it('lists only the facts that are there, in a fixed order', () => {
        const facts = detailFacts(details({ runtime: '1h 58m', designers: ['A', 'B'], playerCount: '2-4' }));
        expect(facts).toEqual([
            { label: 'Designers', value: 'A, B' },
            { label: 'Runtime', value: '1h 58m' },
            { label: 'Player count', value: '2-4' }
        ]);
    });
    it('skips empty strings and empty lists', () => {
        expect(detailFacts(details({ runtime: '  ', platforms: [], author: '' }))).toEqual([]);
    });
    it('keeps a season count of zero out of the way but shows real counts', () => {
        expect(detailFacts(details({ numberOfSeasons: 3 }))).toEqual([{ label: 'Number of seasons', value: '3' }]);
    });
    it('leaves out what the header and the story already show', () => {
        const labels = detailFacts(details({
            title: 'T', tagline: 'tag', overview: 'story', genres: ['Drama'], releaseYear: '2020'
        })).map(f => f.label);
        expect(labels).toEqual([]);
    });
});

describe('metaLine', () => {
    it('joins who, when and how long', () => {
        expect(metaLine(details({ releaseYear: '2021', runtime: '1h 58m' }))).toBe('2021 · 1h 58m');
        expect(metaLine(details({ author: 'Ann Author', releaseYear: '1999' }))).toBe('Ann Author · 1999');
        expect(metaLine(details({ artist: 'Band', releaseYear: '1999' }))).toBe('Band · 1999');
    });
    it('says how many seasons, singular or plural', () => {
        expect(metaLine(details({ numberOfSeasons: 1 }))).toBe('1 season');
        expect(metaLine(details({ releaseYear: '2020', numberOfSeasons: 4 }))).toBe('2020 · 4 seasons');
    });
    it('is empty when nothing is known', () => {
        expect(metaLine(details())).toBe('');
    });
});

describe('groupLinks', () => {
    const tmdb = new Link('https://www.themoviedb.org/movie/1', 'The Movie Database', 'img/tmdb_logo.png');
    const imdb = new Link('https://www.imdb.com/title/tt1/', 'IMDb', 'img/imdb-logo.png');
    const home = new Link('https://film.example/', 'Film Home Page', undefined);
    const album = new Link('https://music.apple.com/gb/album/1', 'iTunes', 'img/itunes.svg');
    const game = new Link('https://boardgamegeek.com/boardgame/13', 'Geek URL', 'img/bgg.svg');
    it('groups by what the link is for and keeps the order inside a group', () => {
        const groups = groupLinks([tmdb, home, imdb, album, game]);
        expect(groups.map(g => g.title)).toEqual(['Listen', 'Play', 'Official site', 'Find out more']);
        expect(groups[3].links.map(l => l.name)).toEqual(['The Movie Database', 'IMDb']);
    });
    it('drops links with no address', () => {
        expect(groupLinks([new Link(undefined, 'Film Home Page', undefined), imdb]).map(g => g.title)).toEqual(['Find out more']);
    });
    it('is empty with no links', () => {
        expect(groupLinks([])).toEqual([]);
    });
});

describe('linkDisplay', () => {
    it('gives known sites their proper names, whatever name was saved', () => {
        expect(linkDisplay(new Link('https://music.apple.com/gb/album/1', 'iTunes', 'img/itunes.svg')))
            .toEqual({ url: 'https://music.apple.com/gb/album/1', name: 'Apple Music', icon: 'music', group: 'listen', logo: 'img/links/apple-music.png' });
        expect(linkDisplay(new Link('https://podcasts.apple.com/gb/podcast/2', 'iTunes', undefined)).name).toBe('Apple Podcasts');
        expect(linkDisplay(new Link('https://boardgamegeek.com/boardgame/13', 'Geek URL', undefined)).name).toBe('BoardGameGeek');
        expect(linkDisplay(new Link('https://videogamegeek.com/videogame/9', 'Geek URL', undefined)))
            .toMatchObject({ name: 'VideoGameGeek', icon: 'videogame', group: 'play' });
        expect(linkDisplay(new Link('https://www.imdb.com/title/tt1/', 'imdb', undefined)).name).toBe('IMDb');
        expect(linkDisplay(new Link('https://openlibrary.org/books/OL1M', 'Open Library', undefined)).icon).toBe('book');
        expect(linkDisplay(new Link('https://www.themoviedb.org/movie/1', 'TMDB', undefined)).logo).toBe('img/links/tmdb.png');
    });
    it('calls a home page the official site', () => {
        expect(linkDisplay(new Link('https://film.example/', 'TV Home Page', undefined))).toMatchObject({ name: 'Official site', icon: 'site', group: 'official' });
    });
    it('keeps the name of anything else, with a plain link icon and no logo', () => {
        expect(linkDisplay(new Link('https://en.wikipedia.org/wiki/X', 'Wikipedia', undefined))).toMatchObject({ name: 'Wikipedia', icon: 'link', group: 'more' });
        expect(linkDisplay(new Link('https://en.wikipedia.org/wiki/X', 'Wikipedia', undefined)).logo).toBeUndefined();
    });
    it('does not mistake a look-alike host for a known site', () => {
        expect(linkDisplay(new Link('https://notimdb.com/x', 'Somewhere', undefined)).name).toBe('Somewhere');
    });
    it('copes with an address that is not a URL', () => {
        expect(linkDisplay(new Link('not a url', 'Odd', undefined)).name).toBe('Odd');
    });
});

describe('tabs', () => {
    it('always has Overview first and Friends last', () => {
        const ids = tabsToShow({ overview: true, cast: true, links: true }).map(t => t.id);
        expect(ids).toEqual(['overview', 'cast', 'links', 'friends']);
        expect(tabsToShow({ overview: true, cast: false, links: false }).map(t => t.id)).toEqual(['overview', 'friends']);
    });
    it('leaves out a tab with nothing in it', () => {
        expect(tabsToShow({ overview: true, cast: false, links: true }).map(t => t.id)).toEqual(['overview', 'links', 'friends']);
    });
    it('opens the asked-for tab, or the first when it is gone', () => {
        const tabs = tabsToShow({ overview: true, cast: false, links: true });
        expect(activeTab(tabs, 'links')).toBe('links');
        expect(activeTab(tabs, 'cast')).toBe('overview');
    });
});

describe('capitalise', () => {
    it('upper-cases only the first letter', () => {
        expect(capitalise('film')).toBe('Film');
        expect(capitalise('TV show')).toBe('TV show');
        expect(capitalise('')).toBe('');
    });
});

describe('splitGenres', () => {
    const many = ['Naturalists', 'Ichthyology', 'Biography', 'Biology', 'Classification', 'Presidents', 'Educators'];
    it('shows the first few and counts the rest', () => {
        expect(splitGenres(many, false)).toEqual({ shown: many.slice(0, GENRES_SHOWN), hidden: many.length - GENRES_SHOWN });
    });
    it('shows them all when asked', () => {
        expect(splitGenres(many, true)).toEqual({ shown: many, hidden: 0 });
    });
    it('needs no "more" for a short list, even with exactly the limit', () => {
        expect(splitGenres(['Drama'], false)).toEqual({ shown: ['Drama'], hidden: 0 });
        expect(splitGenres(many.slice(0, GENRES_SHOWN), false).hidden).toBe(0);
    });
});

describe('artShape', () => {
    it('calls iTunes art and other near-squares square', () => {
        expect(artShape(600, 600)).toBe('square');
        expect(artShape(500, 560)).toBe('square');
        expect(artShape(800, 600)).toBe('square');
    });
    it('calls posters and book covers tall', () => {
        expect(artShape(500, 750)).toBe('tall');
        expect(artShape(400, 600)).toBe('tall');
    });
    it('treats an image with no size (not loaded) as tall', () => {
        expect(artShape(0, 0)).toBe('tall');
    });
});

