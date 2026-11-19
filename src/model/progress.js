/**
 * "In progress": something on my list I have started (watching, reading,
 * listening to, playing). Stored as `inProgress` on my list entry, alongside
 * `later` (it stays on my list); marking it done or taking it off my list
 * clears it. Tested in test/progress.test.js.
 */

/** [now, to start, present for captions] per category id. */
const WORDS = {
    1: ['Watching', 'Start watching', 'watching'],
    2: ['Reading', 'Start reading', 'reading'],
    3: ['Listening', 'Start listening', 'listening to'],
    4: ['Playing', 'Start playing', 'playing']
};

/**
 * @param {number} categoryID
 * @return {{now: string, start: string, caption: string}} e.g. "Watching", "Start watching", "watching"
 */
export function progressWords(categoryID) {
    const [now, start, caption] = WORDS[categoryID] || ['In progress', 'Start', 'on'];
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
