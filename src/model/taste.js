/**
 * Pure helpers for taste matches (friends whose loves overlap with mine) and
 * the tonight picker. Tested in test/taste.test.js.
 */

/**
 * @typedef {{swrlID: string, later: boolean, done: boolean, loved: boolean, deleted: boolean}} Flags
 */

/**
 * How much a friend's taste overlaps with mine: the swrls we both loved, and
 * the ones we have both finished (without both loving them).
 *
 * @param {Flags[]} mine
 * @param {Flags[]} theirs
 * @return {{bothLoved: number, bothDone: number, score: number}}
 */
export function tasteOverlap(mine, theirs) {
    /** @type {Map<string, Flags>} */
    const byID = new Map(mine.filter(e => !e.deleted).map(e => [e.swrlID, e]));
    let bothLoved = 0;
    let bothDone = 0;
    theirs.forEach(their => {
        const my = byID.get(their.swrlID);
        if (!my || their.deleted) return;
        if (my.loved && their.loved) bothLoved++;
        else if ((my.done || my.loved) && (their.done || their.loved)) bothDone++;
    });
    return { bothLoved, bothDone, score: bothLoved * 2 + bothDone };
}

/**
 * The line under a friend's name: "You both loved 4 things".
 *
 * @param {{bothLoved: number, bothDone: number}} overlap
 * @return {string} empty when we have nothing in common yet
 */
export function tasteLine(overlap) {
    const things = (/** @type {number} */ n) => `${n} ${n === 1 ? 'thing' : 'things'}`;
    if (overlap.bothLoved > 0) return `You both loved ${things(overlap.bothLoved)}`;
    if (overlap.bothDone > 0) return `You've both finished ${things(overlap.bothDone)}`;
    return '';
}

/**
 * What friends with taste like mine loved that I do not have yet: each swrl
 * scored by the taste overlap of every friend who loved it, best first.
 *
 * @template {Flags & {updated?: Date}} E
 * @param {{uid: string, entries: E[], score: number}[]} friends
 * @param {(swrlID: string) => (Flags | undefined)} mine my entry for a swrl
 * @param {number} limit
 * @return {{swrlID: string, entry: E, friends: string[], score: number}[]}
 */
export function tastePicks(friends, mine, limit) {
    /** @type {Map<string, {swrlID: string, entry: E, friends: string[], score: number}>} */
    const bySwrl = new Map();
    friends.filter(f => f.score > 0).forEach(friend => friend.entries.forEach(entry => {
        if (!entry.loved || entry.deleted) return;
        const my = mine(entry.swrlID);
        if (my && (my.later || my.done || my.loved || my.deleted)) return;
        const found = bySwrl.get(entry.swrlID);
        if (found) {
            found.friends.push(friend.uid);
            found.score += friend.score;
        } else {
            bySwrl.set(entry.swrlID, { swrlID: entry.swrlID, entry, friends: [friend.uid], score: friend.score });
        }
    }));
    return [...bySwrl.values()]
        .sort((a, b) => b.score - a.score || time(b.entry.updated) - time(a.entry.updated))
        .slice(0, limit);
}

/**
 * A few picks from a list, at random, more likely the heavier they are
 * (something a friend swrled to me counts for more). No repeats.
 *
 * @template T
 * @param {{item: T, weight: number}[]} candidates
 * @param {number} count
 * @param {() => number} random a number from 0 up to 1, e.g. Math.random
 * @return {T[]}
 */
export function pickWeighted(candidates, count, random) {
    const pool = candidates.filter(c => c.weight > 0).slice();
    /** @type {T[]} */
    const picked = [];
    while (picked.length < count && pool.length > 0) {
        const total = pool.reduce((sum, c) => sum + c.weight, 0);
        let roll = random() * total;
        let index = 0;
        while (index < pool.length - 1 && roll >= pool[index].weight) {
            roll -= pool[index].weight;
            index++;
        }
        picked.push(pool[index].item);
        pool.splice(index, 1);
    }
    return picked;
}

/** @param {Date | undefined} date */
function time(date) {
    return date ? date.getTime() : 0;
}
