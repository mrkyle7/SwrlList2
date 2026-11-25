import { tmdbFilmToSwrl, tmdbTVToSwrl } from './watchSearch';
import { booksFromSearch, SEARCH_FIELDS } from './readSearch';
import { Swrl } from '../model/swrl';
import { ALBUM, BOARDGAME, BOOK, PODCAST, VIDEOGAME, RESTAURANT } from '../constants/Type';
import { EAT, LISTEN, PLAY, READ, WATCH } from '../constants/Category';
import { PLACE_ID_PREFIX } from '../model/restaurant';

/**
 * What a shared link leads to: the swrl itself, or a search of one category.
 *
 * @typedef {{swrl?: Swrl, search?: {category: import('../constants/Category').Category, query: string}}} SharedLinkTarget
 */

/** The types a link can name directly, with how their swrl ids start. */
const ITEM_TYPES = {
    book: { type: BOOK, category: READ, prefix: 'OPENLIBRARY-ISBN_' },
    album: { type: ALBUM, category: LISTEN, prefix: 'ITUNESALBUM_' },
    podcast: { type: PODCAST, category: LISTEN, prefix: 'ITUNESPODCAST_' },
    boardgame: { type: BOARDGAME, category: PLAY, prefix: 'GEEK' + BOARDGAME.geekType + '_' },
    videogame: { type: VIDEOGAME, category: PLAY, prefix: 'GEEK' + VIDEOGAME.geekType + '_' },
    restaurant: { type: RESTAURANT, category: EAT, prefix: PLACE_ID_PREFIX }
};

const SEARCH_CATEGORIES = { watch: WATCH, read: READ, listen: LISTEN, play: PLAY };

/**
 * Where a recognised shared link (model/share.js) leads: a swrl, ready to
 * open, or a search of one category for the title the link carries.
 *
 * @param {import('../model/share').SharedLink} link
 * @param {AbortSignal} [signal]
 * @return {Promise<SharedLinkTarget | undefined>} undefined when the source does not know it
 */
export async function resolveSharedLink(link, signal) {
    switch (link.source) {
        case 'search':
            return { search: { category: SEARCH_CATEGORIES[link.category], query: link.query } };
        case 'spotify': {
            const embed = await getJson(`/api/v1/oembed/spotify?url=${encodeURIComponent(link.url)}`, signal);
            const title = embed && typeof embed.title === 'string' ? embed.title.trim() : '';
            return title ? { search: { category: LISTEN, query: title } } : undefined;
        }
        case 'item': {
            const item = ITEM_TYPES[link.type];
            const { details } = await item.type.detailGetter.get(link.id, signal, 0);
            return { swrl: new Swrl(item.type, item.category, item.prefix + link.id, details) };
        }
        case 'openlibrary': {
            const isbn = await openLibraryIsbn(link, signal);
            if (!isbn) return undefined;
            const { details } = await BOOK.detailGetter.get(isbn, signal, 0);
            return { swrl: new Swrl(BOOK, READ, ITEM_TYPES.book.prefix + isbn, details) };
        }
        default: {
            const swrl = await swrlFromLink(link, signal);
            return swrl ? { swrl } : undefined;
        }
    }
}

/**
 * The ISBN for an Open Library work (the first edition its search lists) or
 * edition.
 *
 * @param {{kind: 'works' | 'books', id: string}} link
 * @param {AbortSignal} [signal]
 * @return {Promise<string | undefined>}
 */
async function openLibraryIsbn(link, signal) {
    if (link.kind === 'works') {
        const found = await getJson(`https://openlibrary.org/search.json?q=key:/works/${link.id}&fields=${SEARCH_FIELDS}&limit=1`, signal);
        const [book] = booksFromSearch((found && found.docs) || []);
        return book ? book.details.id : undefined;
    }
    const edition = await getJson(`https://openlibrary.org/books/${link.id}.json`, signal);
    const isbns = edition ? [...(edition.isbn_13 || []), ...(edition.isbn_10 || [])] : [];
    return isbns.length > 0 ? String(isbns[0]) : undefined;
}

/**
 * Turns a shared IMDb or TMDB link into a Swrl, with just enough detail to
 * open its page; the page fetches the rest.
 *
 * @param {{source: 'imdb', imdbId: string} | {source: 'tmdb', kind: 'movie' | 'tv', id: string}} link
 * @param {AbortSignal} [signal]
 * @return {Promise<import('../model/swrl').Swrl | undefined>} undefined when the source does not know it
 */
export async function swrlFromLink(link, signal) {
    if (link.source === 'tmdb') {
        const data = await getJson(`/api/v1/tmdb/${link.kind}/${link.id}`, signal);
        if (!data || !data.id) return undefined;
        return link.kind === 'movie' ? tmdbFilmToSwrl(data) : tmdbTVToSwrl(data);
    }
    // IMDb ids are looked up through TMDB, which is where our film and TV data comes from.
    const found = await getJson(`/api/v1/tmdb/find/${link.imdbId}`, signal);
    if (!found) return undefined;
    if (found.movie_results && found.movie_results.length > 0) {
        return tmdbFilmToSwrl(found.movie_results[0]);
    }
    if (found.tv_results && found.tv_results.length > 0) {
        return tmdbTVToSwrl(found.tv_results[0]);
    }
    // an episode's page: open its show
    const episode = found.tv_episode_results && found.tv_episode_results[0];
    if (episode && episode.show_id) {
        const show = await getJson(`/api/v1/tmdb/tv/${episode.show_id}`, signal);
        return show && show.id ? tmdbTVToSwrl(show) : undefined;
    }
    return undefined;
}

/**
 * @param {string} url
 * @param {AbortSignal} [signal]
 * @return {Promise<any | undefined>} undefined on a 404
 */
async function getJson(url, signal) {
    const response = await fetch(url, { signal });
    if (response.status === 404) return undefined;
    if (!response.ok) {
        throw new Error(`Request failed with HTTP ${response.status}`);
    }
    return response.json();
}
