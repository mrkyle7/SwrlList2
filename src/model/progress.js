import { categoryWords } from './categoryWords';

/**
 * "In progress": something on my list I have started (watching, reading,
 * listening to, playing). Stored as `inProgress` on my list entry, alongside
 * `later` (it stays on my list); marking it done or taking it off my list
 * clears it. Tested in test/progress.test.js.
 */


/**
 * @param {number} categoryID
 * @return {{now: string, start: string, caption: string}} e.g. "Watching", "Start watching", "watching"
 */
export function progressWords(categoryID) {
    const { now, start, caption } = categoryWords(categoryID);
    return { now, start, caption };
}

/**
 * Puts what I have started first, keeping the chosen order within each group.
 *
 * @template {{inProgress?: boolean}} E
 * @param {E[]} entries already sorted
 * @return {E[]}
 */
export function inProgressFirst(entries) {
    return [...entries.filter(e => e.inProgress), ...entries.filter(e => !e.inProgress)];
}
