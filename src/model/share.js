/**
 * Reading what another app shared with Swrl List (the PWA share target), or
 * what the user pasted: is it a link to something we know, and if not, what
 * is there to search for? Pure, so it can be unit-tested.
 */

/**
 * @typedef {{source: 'imdb', imdbId: string} | {source: 'tmdb', kind: 'movie' | 'tv', id: string}} SharedLink
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
 * Recognises an IMDb title page or a TMDB film or TV page.
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
    return undefined;
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
    const words = (/** @type {string} */ value) => value.replace(URL_PATTERN, ' ').replace(/\s+/g, ' ').trim();
    const query = (words(text) || words(title)).substring(0, MAX_QUERY_LENGTH).trim();
    return { link, query };
}
