import { categoryWords } from './categoryWords';

/**
 * Reading what another app shared with Swrl List (the PWA share target), or
 * what the user pasted: is it a link to something we know, and if not, what
 * is there to search for? Pure, so it can be unit-tested.
 */

/**
 * A link we know what to do with:
 * - `imdb`, `tmdb`: a film or TV show, looked up through TMDB.
 * - `item`: a thing whose page we can open straight away from its source's id
 *   (an ISBN, an iTunes collection id, a BoardGameGeek id).
 * - `openlibrary`: an Open Library work or edition, looked up to find its ISBN.
 * - `spotify`: Spotify links carry no title; the server asks Spotify's public
 *   oEmbed endpoint for one, and that is searched for.
 * - `search`: a page whose address has the title in it (Goodreads, Letterboxd,
 *   Steam): search that category for it.
 *
 * @typedef {{source: 'imdb', imdbId: string}
 *   | {source: 'tmdb', kind: 'movie' | 'tv', id: string}
 *   | {source: 'item', type: 'book' | 'album' | 'podcast' | 'boardgame' | 'videogame', id: string}
 *   | {source: 'openlibrary', kind: 'works' | 'books', id: string}
 *   | {source: 'spotify', url: string}
 *   | {source: 'search', category: 'watch' | 'read' | 'listen' | 'play', query: string}} SharedLink
 */

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const MAX_QUERY_LENGTH = 200;

/**
 * @param {string} hostname
 * @param {string} domain
 * @return {boolean} whether hostname is the domain or one of its subdomains
 */
const isHost = (hostname, domain) => hostname === domain || hostname.endsWith('.' + domain);

/**
 * The words in an address's slug: "dune-part-two" or "Hades_II" or
 * "1234.Project_Hail_Mary" -> "dune part two", "Hades II", "Project Hail Mary".
 *
 * @param {string} slug
 * @return {string}
 */
export function slugWords(slug) {
    let text = slug;
    try { text = decodeURIComponent(slug); } catch (error) { /* keep it as it is */ }
    return text.replace(/^\d+[.-]?/, '').replace(/[-_.+]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Whether an Amazon product id is a valid ISBN-10 (books' ASINs are).
 *
 * @param {string} id
 * @return {boolean}
 */
export function isIsbn10(id) {
    if (!/^\d{9}[\dX]$/i.test(id)) return false;
    const sum = id.toUpperCase().split('').reduce((total, char, i) => total + (char === 'X' ? 10 : Number(char)) * (10 - i), 0);
    return sum % 11 === 0;
}

/**
 * Recognises a link to something we can show: see SharedLink.
 *
 * @param {string} link
 * @return {SharedLink | undefined}
 */
export function recogniseLink(link) {
    let url;
    try {
        url = new URL(link);
    } catch (error) {
        return undefined;
    }
    const hostname = url.hostname.toLowerCase();
    if (isHost(hostname, 'imdb.com')) {
        // also localised paths such as /es-es/title/tt0133093/
        const match = /\/title\/(tt\d{5,12})(?:\/|$)/.exec(url.pathname);
        return match ? { source: 'imdb', imdbId: match[1] } : undefined;
    }
    if (isHost(hostname, 'themoviedb.org')) {
        // /movie/603-the-matrix, /tv/1399, also under a language prefix
        const match = /\/(movie|tv)\/(\d{1,10})(?:-[^/]*)?(?:\/|$)/.exec(url.pathname);
        // @ts-ignore match[1] is 'movie' or 'tv'
        return match ? { source: 'tmdb', kind: match[1], id: match[2] } : undefined;
    }
    const path = url.pathname;
    let match;
    if (isHost(hostname, 'openlibrary.org')) {
        if ((match = /^\/isbn\/([\dXx-]{10,17})\/?$/.exec(path))) return { source: 'item', type: 'book', id: match[1].replace(/-/g, '').toUpperCase() };
        if ((match = /^\/works\/(OL\d+W)(?:\/|$)/.exec(path))) return { source: 'openlibrary', kind: 'works', id: match[1] };
        if ((match = /^\/books\/(OL\d+M)(?:\/|$)/.exec(path))) return { source: 'openlibrary', kind: 'books', id: match[1] };
        return undefined;
    }
    if (/(^|\.)amazon\.[a-z.]{2,6}$/.test(hostname)) {
        match = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i.exec(path);
        return match && isIsbn10(match[1]) ? { source: 'item', type: 'book', id: match[1].toUpperCase() } : undefined;
    }
    if (isHost(hostname, 'goodreads.com')) {
        match = /\/book\/show\/([^/?#]+)/.exec(path);
        const query = match ? slugWords(match[1]) : '';
        return query ? { source: 'search', category: 'read', query } : undefined;
    }
    if (hostname === 'music.apple.com' || hostname === 'itunes.apple.com') {
        if ((match = /\/album\/(?:[^/]+\/)?(?:id)?(\d{3,15})\/?$/.exec(path))) return { source: 'item', type: 'album', id: match[1] };
    }
    if (hostname === 'podcasts.apple.com' || hostname === 'itunes.apple.com') {
        if ((match = /\/podcast\/(?:[^/]+\/)?id(\d{3,15})\/?$/.exec(path))) return { source: 'item', type: 'podcast', id: match[1] };
        return undefined;
    }
    if (hostname === 'open.spotify.com') {
        return /^\/(?:intl-[a-z-]+\/)?(?:album|show|episode|track)\/[A-Za-z0-9]{10,40}\/?$/.test(path)
            ? { source: 'spotify', url: `https://open.spotify.com${path}` } : undefined;
    }
    if (isHost(hostname, 'boardgamegeek.com') || isHost(hostname, 'videogamegeek.com')) {
        if ((match = /^\/(boardgame|boardgameexpansion|videogame)\/(\d{1,10})(?:\/|$)/.exec(path))) {
            return { source: 'item', type: match[1] === 'videogame' ? 'videogame' : 'boardgame', id: match[2] };
        }
        return undefined;
    }
    if (hostname === 'store.steampowered.com') {
        match = /^\/app\/\d+\/([^/?#]+)/.exec(path);
        const query = match ? slugWords(match[1]) : '';
        return query ? { source: 'search', category: 'play', query } : undefined;
    }
    if (isHost(hostname, 'letterboxd.com')) {
        match = /^\/film\/([^/?#]+)\/?/.exec(path);
        const query = match ? slugWords(match[1]) : '';
        return query ? { source: 'search', category: 'watch', query } : undefined;
    }
    return undefined;
}

/** What apps put around a title when they share it, left out of the words searched for. */
const SHARE_PHRASES = [
    /^(check out|look at|i'?m (reading|watching|listening to|playing)|i (just )?(read|watched|finished|rated|want to read)|listen to|watch|read)\s+/i,
    /\s+(on|at|via|from) (imdb|goodreads|spotify|apple music|apple podcasts|letterboxd|steam|amazon|boardgamegeek|open library|netflix|youtube)\b.*$/i,
    /\s+via @\w+.*$/i,
    /[\s:–—-]+$/
];

/**
 * @param {string} words
 * @return {string} without the sharing app's boilerplate ("Check out ... on Goodreads")
 */
function withoutSharePhrases(words) {
    const cleaned = SHARE_PHRASES.reduce((text, phrase) => text.replace(phrase, ''), words).trim();
    return cleaned || words;
}

/**
 * What to do with a share: the first link we recognise, and the words to
 * search for if there is none (the shared text without its links, or failing
 * that the title).
 *
 * Apps differ in where they put things: Android usually puts the link in
 * `text`, sometimes after a sentence, and leaves `url` empty.
 *
 * @param {{title?: string | null, text?: string | null, url?: string | null}} shared
 * @return {{link: SharedLink | undefined, query: string}}
 */
export function parseShare(shared) {
    const title = (shared.title || '').trim();
    const text = (shared.text || '').trim();
    const url = (shared.url || '').trim();
    const links = [url, ...(text.match(URL_PATTERN) || []), ...(title.match(URL_PATTERN) || [])]
        .filter(candidate => candidate.length > 0);
    let link;
    for (const candidate of links) {
        link = recogniseLink(candidate);
        if (link) break;
    }
    const words = (/** @type {string} */ value) => withoutSharePhrases(value.replace(URL_PATTERN, ' ').replace(/\s+/g, ' ').trim());
    const query = (words(text) || words(title)).substring(0, MAX_QUERY_LENGTH).trim();
    return { link, query };
}


/**
 * The words that go with a link shared outside the app (WhatsApp, Messages),
 * before the link itself.
 *
 * @param {{title: string, category: number, fromName?: string, message?: string}} share
 * @return {string}
 */
export function shareText(share) {
    const verb = categoryWords(share.category).verb;
    const message = (share.message || '').trim();
    const opening = share.fromName
        ? `${share.fromName} swrled you ${share.title}`
        : `You should ${verb} ${share.title}`;
    return message ? `${opening}: “${message}”` : `${opening}.`;
}

/**
 * The link for a swrl, with the share it came from when there is one. The
 * swrl's id is in the path so the link still opens the swrl if the share
 * cannot be read.
 *
 * @param {string} origin e.g. https://swrl-list.com
 * @param {string} swrlID
 * @param {string} [shareID]
 * @return {string}
 */
export function shareUrl(origin, swrlID, shareID) {
    const url = `${origin}/swrl/${encodeURIComponent(swrlID)}`;
    return shareID ? `${url}?from=${encodeURIComponent(shareID)}` : url;
}

/** The longest message a share may carry (the rules allow 500). */
export const MAX_SHARE_MESSAGE = 500;
