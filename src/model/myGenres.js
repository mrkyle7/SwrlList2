/**
 * My own changes to a swrl's genres (cuisines for places to eat): kept on my
 * list entry as `genresAdded` and `genresRemoved`, because the shared swrl's
 * genres come from its source and are refreshed whenever its page opens.
 * They change what my filters, my cards and the swrl page show me, nobody
 * else's. Pure; tested in test/myGenres.test.js.
 */

/** The longest genre someone can add, and how many changes an entry keeps. */
export const MAX_GENRE_LENGTH = 40;
export const MAX_GENRE_CHANGES = 30;

/**
 * A genre as typed: spaces squeezed, first letter capital ("thai street food"
 * -> "Thai street food"), or undefined when empty or too long.
 *
 * @param {string} text
 * @return {string | undefined}
 */
export function cleanGenre(text) {
    const genre = String(text || '').replace(/\s+/g, ' ').trim();
    if (!genre || genre.length > MAX_GENRE_LENGTH) return undefined;
    return genre.charAt(0).toUpperCase() + genre.slice(1);
}

/** @param {string} genre */
const key = genre => genre.toLocaleLowerCase();

/**
 * The source's genres with mine applied: removed ones gone, added ones after
 * the rest, each once whatever its case.
 *
 * @param {string[]} base
 * @param {string[]} [added]
 * @param {string[]} [removed]
 * @return {string[]}
 */
export function adjustGenres(base, added = [], removed = []) {
    const gone = new Set(removed.map(key));
    const seen = new Set();
    return [...base, ...added].filter(genre => {
        const k = key(genre);
        if (gone.has(k) || seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

/**
 * What to store for the genres I want, given the source's: what I added that
 * it lacks, and what of its I removed.
 *
 * @param {string[]} base the source's genres
 * @param {string[]} wanted the genres I want shown
 * @return {{genresAdded: string[], genresRemoved: string[]}}
 */
export function genreChanges(base, wanted) {
    const baseKeys = new Set(base.map(key));
    const wantedKeys = new Set(wanted.map(key));
    return {
        genresAdded: adjustGenres(wanted.filter(genre => !baseKeys.has(key(genre)))).slice(0, MAX_GENRE_CHANGES),
        genresRemoved: base.filter(genre => !wantedKeys.has(key(genre))).slice(0, MAX_GENRE_CHANGES)
    };
}

/**
 * The genres I see for a swrl: its own, adjusted by my entry when I have one.
 *
 * @param {string[]} base
 * @param {{genresAdded?: string[], genresRemoved?: string[]} | undefined} entry
 * @return {string[]}
 */
export function myGenres(base, entry) {
    return entry ? adjustGenres(base || [], entry.genresAdded, entry.genresRemoved) : (base || []);
}
