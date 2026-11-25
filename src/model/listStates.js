import { categoryWords } from './categoryWords';

/**
 * Which part of my list a category's Your list shows: Later (everything on
 * the list, what I have started first), In progress ("Watching", "Booked",
 * ...: started only) or Done. Chosen with the switch in the list toolbar
 * (views/swrlList.js) and kept on the State as `listState`. Pure; tested in
 * test/listStates.test.js.
 */

/** @typedef {'later' | 'inProgress' | 'done'} ListStateID */

/** @type {ListStateID} */
export const LIST_LATER = 'later';
/** @type {ListStateID} */
export const LIST_IN_PROGRESS = 'inProgress';
/** @type {ListStateID} */
export const LIST_DONE = 'done';

/** @type {readonly ListStateID[]} */
export const listStates = Object.freeze([LIST_LATER, LIST_IN_PROGRESS, LIST_DONE]);

/**
 * @param {any} [id]
 * @return {ListStateID}
 */
export function listStateFromId(id) {
    return listStates.includes(id) ? id : LIST_LATER;
}

/**
 * The switch's words for a category: "Later", "Watching" (or "Reading",
 * "Booked", ...), "Done".
 *
 * @param {number} categoryID
 * @return {{id: ListStateID, label: string}[]}
 */
export function listStateOptions(categoryID) {
    return [
        { id: LIST_LATER, label: 'Later' },
        { id: LIST_IN_PROGRESS, label: categoryWords(categoryID).now },
        { id: LIST_DONE, label: 'Done' }
    ];
}

/**
 * Whether one of my entries belongs in that part of my list.
 *
 * @param {{later: boolean, inProgress: boolean, done: boolean, deleted?: boolean}} entry
 * @param {ListStateID} state
 * @return {boolean}
 */
export function inListState(entry, state) {
    if (!entry || entry.deleted) return false;
    if (state === LIST_DONE) return entry.done;
    if (state === LIST_IN_PROGRESS) return entry.later && entry.inProgress;
    return entry.later;
}

/**
 * How many of my swrls in a category are in each part, for the switch.
 * Filters do not change them: the Filter button's count says when those are on.
 *
 * @param {{later: boolean, inProgress: boolean, done: boolean, deleted?: boolean, category: {id: number}}[]} entries
 * @param {number} categoryID
 * @return {Record<ListStateID, number>}
 */
export function listStateCounts(entries, categoryID) {
    /** @type {Record<ListStateID, number>} */
    const counts = { later: 0, inProgress: 0, done: 0 };
    entries.filter(entry => entry && entry.category && entry.category.id === categoryID).forEach(entry => {
        listStates.forEach(state => { if (inListState(entry, state)) counts[state]++; });
    });
    return counts;
}

/**
 * What to say when that part of my list is empty (with no filters on).
 *
 * @param {ListStateID} state
 * @param {number} categoryID
 * @param {string} laterMessage the category's own message for an empty list
 * @return {string}
 */
export function emptyListStateMessage(state, categoryID, laterMessage) {
    const words = categoryWords(categoryID);
    if (state === LIST_IN_PROGRESS) {
        return `Nothing started yet. Open something on your list and select “${words.start}”.`;
    }
    if (state === LIST_DONE) {
        return `Nothing done yet. Once you have ${words.doneIt}, select “Mark as done” and it shows here.`;
    }
    return laterMessage;
}
