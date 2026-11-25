import { Details } from './details';
import { Link } from './link';

/**
 * Pure logic behind the swrl page: which layout the user picked, and the
 * people, facts, links and header line built from a swrl's details. The DOM
 * lives in components/swrlPageSections.js and views/swrlFullPage.js.
 */

/** How the swrl page is arranged. The stored string goes on the user's profile (`swrlPageLayout`). */
export class PageLayout {
    /**
     * @param {'tabs' | 'poster'} id the stored value
     * @param {string} label name shown on the Settings screen
     * @param {string} hint one line under the label
     */
    constructor(id, label, hint) {
        this.id = id;
        this.label = label;
        this.hint = hint;
    }
}

export const TABS = new PageLayout('tabs', 'Tabs', 'Overview, cast, links, notes and friends each get a tab');
export const POSTER = new PageLayout('poster', 'Poster', 'Everything on one page you scroll');

export const pageLayouts = Object.freeze([TABS, POSTER]);

/** What everyone gets until they choose otherwise. */
export const DEFAULT_PAGE_LAYOUT = TABS;

/**
 * Looks up a layout from its stored value. Unknown or missing values give the
 * default, so a hand-edited profile never breaks the page.
 *
 * @param {string} [id]
 * @return {PageLayout}
 */
export function pageLayoutFromId(id) {
    return pageLayouts.find(layout => layout.id === id) || DEFAULT_PAGE_LAYOUT;
}

/** How many people show before "Show all". */
export const PEOPLE_SHOWN = 6;

/**
 * @typedef {Object} Person
 * @property {string} name
 * @property {string} role
 * @property {string | number} [id] TMDB id; when present the person can be searched for
 * @property {string} [imageUrl]
 */

/**
 * The cast and crew: directors first, then the actors. Uses the TMDB people
 * (with photos) when there are any and falls back to the plain names older
 * swrls saved.
 *
 * @param {Details} details
 * @return {Person[]}
 */
export function castAndCrew(details) {
    /** @type {Person[]} */
    const people = [];
    if (details.tMDBDirectors.length > 0) {
        details.tMDBDirectors.forEach(person => people.push(
            { name: person.name, role: 'Director', id: person.id, imageUrl: person.imageUrl }));
    } else if (details.director) {
        people.push({ name: details.director, role: 'Director' });
    }
    if (details.tMDBActors.length > 0) {
        details.tMDBActors.forEach(person => people.push(
            { name: person.name, role: 'Actor', id: person.id, imageUrl: person.imageUrl }));
    } else {
        details.actors.forEach(name => people.push({ name, role: 'Actor' }));
    }
    return people;
}

/**
 * The people to show now.
 *
 * @param {Person[]} people
 * @param {boolean} showAll
 * @return {Person[]}
 */
export function peopleToShow(people, showAll) {
    return showAll ? people : people.slice(0, PEOPLE_SHOWN);
}

/**
 * Up to two letters for a round badge standing in for a missing photo.
 *
 * @param {string} name
 * @return {string}
 */
export function initials(name) {
    return (name || '')
        .split(/\s+/)
        .filter(word => word.length > 0)
        .map(word => Array.from(word)[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

/**
 * A hue (0 to 359) for a name, so the same person always gets the same colour.
 *
 * @param {string} name
 * @return {number}
 */
export function hueFor(name) {
    let hue = 0;
    for (let i = 0; i < name.length; i++) {
        hue = (hue * 31 + name.charCodeAt(i)) % 360;
    }
    return hue;
}

/**
 * @typedef {Object} Fact
 * @property {string} label
 * @property {string} value
 */

/**
 * The plain facts about a swrl, as label and value pairs, in a fixed order.
 * Anything missing or empty is left out.
 *
 * @param {Details} details
 * @return {Fact[]}
 */
export function detailFacts(details) {
    /** @type {Fact[]} */
    const facts = [];
    /**
     * @param {string} label
     * @param {string | string[] | number | undefined | null} value
     */
    const add = (label, value) => {
        const text = Array.isArray(value) ? value.join(', ') : value;
        if (text !== undefined && text !== null && String(text).trim() !== '') {
            facts.push({ label, value: String(text) });
        }
    };
    add('Artist', details.artist);
    add('Author', details.author);
    add('Designers', details.designers);
    add('Platforms', details.platforms);
    add('Publishers', details.publishers);
    add('Runtime', details.runtime);
    add('Average episode length', details.averageEpisodeLength);
    add('Number of seasons', details.numberOfSeasons);
    add('Last air date', details.lastAirDate);
    add('Player count', details.playerCount);
    add('2 player recommendation', details.twoPlayerRecommendation);
    add('Playing time', details.playingTime);
    if (details.place) {
        add('Address', details.place.address);
        add('Opening hours', details.place.openingHours);
        add('Phone', details.place.phone);
        add('Description', details.place.summaryNote);
        add('Photo', details.place.photoBy);
    }
    return facts;
}

/**
 * The line under the title: who made it, when, and how long.
 *
 * @param {Details} details
 * @return {string}
 */
export function metaLine(details) {
    const parts = [
        details.place && details.place.area,
        details.artist || details.author,
        details.releaseYear,
        details.runtime
    ];
    if (typeof details.numberOfSeasons === 'number') {
        parts.push(details.numberOfSeasons === 1 ? '1 season' : `${details.numberOfSeasons} seasons`);
    }
    return parts
        .filter(part => part !== undefined && part !== null && String(part).trim() !== '')
        .join(' · ');
}

/**
 * @typedef {Object} LinkGroup
 * @property {string} title
 * @property {DisplayLink[]} links
 */

/**
 * @typedef {Object} DisplayLink
 * @property {string} url
 * @property {string} name what the row says: the site's proper name
 * @property {'music' | 'podcast' | 'boardgame' | 'videogame' | 'film' | 'book' | 'site' | 'link'} icon
 * @property {'listen' | 'play' | 'more' | 'official'} group
 * @property {string} [logo] the site's own square icon, kept in img/links
 */

/**
 * Sites we link to, by host: their proper names, their own square icons and a
 * plain icon for the kind of site (used if the logo will not load).
 *
 * @type {{host: string, name: string, icon: DisplayLink['icon'], group: DisplayLink['group'], logo: string}[]}
 */
const KNOWN_SITES = [
    { host: 'music.apple.com', name: 'Apple Music', icon: 'music', group: 'listen', logo: 'img/links/apple-music.png' },
    { host: 'podcasts.apple.com', name: 'Apple Podcasts', icon: 'podcast', group: 'listen', logo: 'img/links/apple-podcasts.png' },
    { host: 'boardgamegeek.com', name: 'BoardGameGeek', icon: 'boardgame', group: 'play', logo: 'img/links/geek.png' },
    { host: 'videogamegeek.com', name: 'VideoGameGeek', icon: 'videogame', group: 'play', logo: 'img/links/geek.png' },
    { host: 'themoviedb.org', name: 'The Movie Database', icon: 'film', group: 'more', logo: 'img/links/tmdb.png' },
    { host: 'imdb.com', name: 'IMDb', icon: 'film', group: 'more', logo: 'img/links/imdb.png' },
    { host: 'openlibrary.org', name: 'Open Library', icon: 'book', group: 'more', logo: 'img/links/openlibrary.png' }
];

/**
 * @param {string} url
 * @return {string} the host without "www.", or empty when the address is not a URL
 */
function hostOf(url) {
    try {
        return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch (error) {
        return '';
    }
}

/**
 * What a link row shows. Known sites get their proper name and their own
 * icon, worked out from the address, so swrls saved with old names
 * ("iTunes", "Geek URL") show the right one too. A film's or show's home page
 * becomes "Official site"; anything else keeps the name it came with.
 *
 * @param {Link} link
 * @return {DisplayLink}
 */
export function linkDisplay(link) {
    const host = hostOf(link.url);
    const known = KNOWN_SITES.find(site => host === site.host || host.endsWith('.' + site.host));
    if (known) {
        return { url: link.url, name: known.name, icon: known.icon, group: known.group, logo: known.logo };
    }
    const name = (link.name || '').toLowerCase();
    if (name.includes('home page') || name.includes('homepage') || name.includes('official') || name.includes('website')) {
        return { url: link.url, name: 'Official site', icon: 'site', group: 'official' };
    }
    return { url: link.url, name: link.name || host || 'Link', icon: 'link', group: 'more' };
}

/**
 * Sorts the links into labelled groups, keeping their order inside a group,
 * and drops links with no address (the film's home page can be blank).
 *
 * @param {Link[]} links
 * @return {LinkGroup[]}
 */
export function groupLinks(links) {
    const titles = { listen: 'Listen', play: 'Play', official: 'Official site', more: 'Find out more' };
    const shown = links.filter(link => link.url).map(linkDisplay);
    /** @type {LinkGroup[]} */
    const groups = [];
    ['listen', 'play', 'official', 'more'].forEach(group => {
        const inGroup = shown.filter(link => link.group === group);
        if (inGroup.length > 0) {
            groups.push({ title: titles[group], links: inGroup });
        }
    });
    return groups;
}

/**
 * The tabs of the tab layout, in order. A tab with nothing to show is left out.
 *
 * @param {{overview: boolean, cast: boolean, links: boolean, notes?: boolean}} has what the swrl has to show
 *        (notes: whether I can keep notes, i.e. I am signed in); Friends always shows
 * @return {{id: string, label: string}[]}
 */
export function tabsToShow(has) {
    const tabs = [{ id: 'overview', label: 'Overview' }];
    if (has.cast) tabs.push({ id: 'cast', label: 'Cast' });
    if (has.links) tabs.push({ id: 'links', label: 'Links' });
    if (has.notes) tabs.push({ id: 'notes', label: 'Notes' });
    tabs.push({ id: 'friends', label: 'Friends' });
    return tabs;
}

/**
 * Which tab is open: the one asked for if it exists, else the first.
 *
 * @param {{id: string}[]} tabs
 * @param {string} wanted
 * @return {string}
 */
export function activeTab(tabs, wanted) {
    return tabs.some(tab => tab.id === wanted) ? wanted : tabs[0].id;
}

/**
 * The first letter in capitals, for a type's name ("TV show", "film") at the start of a chip.
 *
 * @param {string} text
 * @return {string}
 */
export function capitalise(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** How many genres the swrl page's header shows before "+N more". */
export const GENRES_SHOWN = 4;

/**
 * The genres to show in the header, and how many are tucked behind "+N more".
 * Books can come with twenty or more subjects, which would fill the screen.
 *
 * @param {string[]} genres
 * @param {boolean} showAll
 * @return {{shown: string[], hidden: number}}
 */
export function splitGenres(genres, showAll) {
    if (showAll || genres.length <= GENRES_SHOWN) {
        return { shown: genres, hidden: 0 };
    }
    return { shown: genres.slice(0, GENRES_SHOWN), hidden: genres.length - GENRES_SHOWN };
}

/**
 * Whether cover art is square-ish (albums and podcasts from iTunes, many game
 * boxes) or tall like a film poster or a book cover, so the header can size
 * and line it up to suit.
 *
 * @param {number} width the image's natural width
 * @param {number} height the image's natural height
 * @return {'square' | 'tall'}
 */
export function artShape(width, height) {
    return width > 0 && height > 0 && width / height > 0.85 ? 'square' : 'tall';
}

