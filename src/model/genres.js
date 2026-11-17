/**
 * Pure helpers for the genre filter on my list. Tested in test/genres.test.js.
 */

const key = (/** @type {string} */ genre) => genre.trim().toLocaleLowerCase();

/**
 * Every genre on a list with how many swrls have it, most common first, then
 * A to Z. Genres that differ only in case count as one ("Sci-Fi", "sci-fi").
 *
 * @param {string[][]} genreLists one list of genres per swrl
 * @return {{genre: string, count: number}[]}
 */
export function genreCounts(genreLists) {
    /** @type {Map<string, {genre: string, count: number}>} */
    const counts = new Map();
    genreLists.forEach(genres => {
        /** @type {Map<string, string>} one of each genre on this swrl */
        const own = new Map();
        (genres || []).filter(g => typeof g === 'string' && g.trim())
            .forEach(g => { if (!own.has(key(g))) own.set(key(g), g.trim()); });
        own.forEach((genre, k) => {
            const found = counts.get(k);
            if (found) found.count++;
            else counts.set(k, { genre, count: 1 });
        });
    });
    return [...counts.values()].sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
}

/**
 * The genre filter: a swrl matches when it has at least one of the chosen
 * genres. Nothing chosen matches everything.
 *
 * @param {string[]} swrlGenres
 * @param {string[]} chosen
 * @return {boolean}
 */
export function matchesGenres(swrlGenres, chosen) {
    if (chosen.length === 0) return true;
    const wanted = new Set(chosen.map(key));
    return (swrlGenres || []).some(g => typeof g === 'string' && wanted.has(key(g)));
}

/**
 * Which genres to show before "Show all": the most common few, plus any
 * already chosen, in the same order as the full list.
 *
 * @param {{genre: string, count: number}[]} counts
 * @param {string[]} chosen
 * @param {number} few
 * @return {{genre: string, count: number}[]}
 */
export function genresToShow(counts, chosen, few) {
    const wanted = new Set(chosen.map(key));
    return counts.filter((c, i) => i < few || wanted.has(key(c.genre)));
}

/**
 * Genres whose name contains what was typed in the genre search.
 *
 * @param {{genre: string, count: number}[]} counts
 * @param {string} typed
 * @return {{genre: string, count: number}[]}
 */
export function searchGenres(counts, typed) {
    const needle = key(typed || '');
    return needle ? counts.filter(c => key(c.genre).includes(needle)) : counts;
}
