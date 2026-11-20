/**
 * The swrls on my own lists whose title matches what I typed, for Search
 * everything to show at once while the online sources are still answering.
 * Pure; tested in test/listMatches.test.js.
 */

/** How many of my own swrls a search shows first. */
export const LIST_MATCHES_SHOWN = 4;

/**
 * Lower case, accents and punctuation gone, spaces squeezed.
 *
 * @param {string} text
 * @return {string}
 */
export function normaliseTitle(text) {
    return (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/**
 * Entries on a list (to do, done or loved; not removed) whose title has every
 * word typed. Titles that start with the words come first; otherwise the
 * entries keep their order.
 *
 * @template {{details: {title: string}, later?: boolean, done?: boolean, loved?: boolean, deleted?: boolean}} E
 * @param {E[]} entries
 * @param {string} query
 * @param {number} [max]
 * @return {E[]}
 */
export function listMatches(entries, query, max = LIST_MATCHES_SHOWN) {
    const typed = normaliseTitle(query);
    if (typed.length < 2) return [];
    const words = typed.split(' ');
    const matching = entries.filter(entry => {
        if (entry.deleted || !(entry.later || entry.done || entry.loved)) return false;
        const title = normaliseTitle(entry.details && entry.details.title);
        return words.every(word => title.includes(word));
    });
    const starts = matching.filter(entry => normaliseTitle(entry.details.title).startsWith(typed));
    const rest = matching.filter(entry => !starts.includes(entry));
    return [...starts, ...rest].slice(0, max);
}
