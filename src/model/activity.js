import { categoryWords } from './categoryWords';

/**
 * Pure helpers for the rows at the top of a category's Discover tab
 * ("Swrled to you", "Friends' recent activity"). Tested in test/activity.test.js.
 */

/**
 * "Alice", "Alice and Bob", "Alice, Bob and 2 others".
 *
 * @param {string[]} names
 * @return {string}
 */
export function nameList(names) {
    const known = names.filter(Boolean);
    if (known.length <= 1) return known[0] || '';
    if (known.length === 2) return `${known[0]} and ${known[1]}`;
    const others = known.length - 2;
    return `${known[0]}, ${known[1]} and ${others} other${others === 1 ? '' : 's'}`;
}

/**
 * The swrls sent to me that I have not read or dismissed yet, newest first,
 * one per swrl with everyone who sent it.
 *
 * @param {{swrlID: string, from: string, created?: Date, read?: string[], dismissed?: string[]}[]} recommendations my inbox
 * @param {string} uid me
 * @return {{swrlID: string, from: string[], created?: Date}[]}
 */
export function newForYou(recommendations, uid) {
    /** @type {Map<string, {swrlID: string, from: string[], created?: Date}>} */
    const bySwrl = new Map();
    recommendations
        .filter(r => !(r.read || []).includes(uid) && !(r.dismissed || []).includes(uid))
        .sort((a, b) => time(b.created) - time(a.created))
        .forEach(r => {
            const found = bySwrl.get(r.swrlID);
            if (found) {
                if (!found.from.includes(r.from)) found.from.push(r.from);
            } else {
                bySwrl.set(r.swrlID, { swrlID: r.swrlID, from: [r.from], created: r.created });
            }
        });
    return [...bySwrl.values()];
}

/**
 * What my friends have recently added, finished or loved, newest first, one
 * per swrl with every friend who has it. Leaves out what is already on my
 * list or done, and what I dismissed.
 *
 * @template {{swrlID: string, later: boolean, done: boolean, loved: boolean, deleted: boolean, inProgress?: boolean, updated?: Date}} E
 * @param {{uid: string, entries: E[]}[]} friendsEntries
 * @param {(swrlID: string) => ({later: boolean, done: boolean, deleted: boolean} | undefined)} mine my entry for a swrl
 * @param {number} limit
 * @return {{swrlID: string, entry: E, friends: {uid: string, loved: boolean, done: boolean, inProgress: boolean}[], updated: number}[]}
 */
export function friendsActivity(friendsEntries, mine, limit) {
    /** @type {Map<string, {swrlID: string, entry: E, friends: {uid: string, loved: boolean, done: boolean, inProgress: boolean}[], updated: number}>} */
    const bySwrl = new Map();
    friendsEntries.forEach(({ uid, entries }) => entries.forEach(entry => {
        if (entry.deleted || !(entry.later || entry.done || entry.loved)) return;
        const my = mine(entry.swrlID);
        if (my && (my.later || my.done || my.deleted)) return;
        const found = bySwrl.get(entry.swrlID);
        const updated = time(entry.updated);
        if (found) {
            found.friends.push({ uid, loved: entry.loved, done: entry.done, inProgress: entry.inProgress === true });
            if (updated > found.updated) {
                found.updated = updated;
                found.entry = entry;
            }
        } else {
            bySwrl.set(entry.swrlID, { swrlID: entry.swrlID, entry, friends: [{ uid, loved: entry.loved, done: entry.done, inProgress: entry.inProgress === true }], updated });
        }
    }));
    return [...bySwrl.values()].sort((a, b) => b.updated - a.updated).slice(0, limit);
}


/**
 * The line under a tile in "Friends' recent activity", leading with love:
 * "Alice loved it", "Alice watched it", "Alice is watching it",
 * "Alice and Bob want to watch it".
 *
 * @param {{name: string, loved: boolean, done?: boolean, inProgress?: boolean}[]} friends
 * @param {number} categoryID
 * @return {string}
 */
export function activityCaption(friends, categoryID) {
    const words = categoryWords(categoryID);
    const loved = friends.filter(f => f.loved).map(f => f.name);
    if (loved.length > 0) return `${nameList(loved)} loved it`;
    const done = friends.filter(f => f.done).map(f => f.name);
    if (done.length > 0) return `${nameList(done)} ${words.doneIt}`;
    const started = friends.filter(f => f.inProgress).map(f => f.name);
    if (started.length > 0) return `${nameList(started)} ${started.length === 1 ? words.isStarted : words.areStarted}`;
    const names = friends.map(f => f.name);
    return `${nameList(names)} ${names.length === 1 ? 'wants' : 'want'} to ${words.doIt}`;
}

/** @param {Date | undefined} date */
function time(date) {
    return date ? date.getTime() : 0;
}
