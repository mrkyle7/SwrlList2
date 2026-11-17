import { collection, getDocs, query, where } from 'firebase/firestore';
import { listEntriesPath } from '../constants/Collection';
import { ListEntry } from '../model/listEntry';

const CACHE_MILLIS = 5 * 60 * 1000;
/** @type {Map<string, {at: number, entries: Promise<ListEntry[]>}>} */
const lookups = new Map();

/**
 * A friend's list entries that I may see (the rules need the visibility
 * constraint in the query), in one category or all of them. Remembered for a
 * few minutes; a failed read gives an empty list and is tried again next time.
 *
 * @param {string} uid
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {number} [categoryID]
 * @return {Promise<ListEntry[]>}
 */
export function friendEntries(uid, firestore, categoryID) {
    const key = uid + '/' + (categoryID === undefined ? 'all' : categoryID);
    const cached = lookups.get(key);
    if (cached && Date.now() - cached.at < CACHE_MILLIS) return cached.entries;
    const constraints = [where('visibility', 'in', ['public', 'friends'])];
    if (categoryID !== undefined) constraints.unshift(where('category', '==', categoryID));
    const entries = getDocs(query(collection(firestore, listEntriesPath(uid).join('/')), ...constraints))
        .then(snapshot => {
            /** @type {ListEntry[]} */
            const found = [];
            snapshot.forEach(docSnapshot => {
                try {
                    found.push(ListEntry.fromFirestore(docSnapshot.data()));
                } catch (error) {
                    console.error(error);
                }
            });
            return found;
        })
        .catch(error => {
            lookups.delete(key);
            console.error(error);
            return [];
        });
    lookups.set(key, { at: Date.now(), entries });
    return entries;
}
