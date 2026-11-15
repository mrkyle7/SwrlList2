import { collectionGroup, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { LIST_ENTRIES, listEntryPath } from '../constants/Collection';
import { getFriends, whenFriendsReady } from '../listeners/friends';
import { getListEntry, whenListEntriesReady } from '../listeners/listEntries';
import { ListEntry, mergeEntriesByUid } from '../model/listEntry';

/**
 * A source of entries for one swrl: who has it on later, done or loved,
 * restricted to what the signed-in viewer may read.
 *
 * @typedef {(swrlID: string, firestore: import('firebase/firestore').Firestore) => Promise<ListEntry[]>} EntrySource
 */

/**
 * My own entry, from the own-entries cache.
 *
 * @type {EntrySource}
 */
export const myEntrySource = async (swrlID) => {
    await whenListEntriesReady();
    const entry = getListEntry(swrlID);
    return entry ? [entry] : [];
};

/**
 * Everyone's public entries for the swrl: a collection group query, which the
 * rules allow only with the visibility constraint.
 *
 * @type {EntrySource}
 */
export const publicEntriesSource = async (swrlID, firestore) => {
    const querySnapshot = await getDocs(query(collectionGroup(firestore, LIST_ENTRIES),
        where('swrlID', '==', swrlID), where('visibility', '==', 'public')));
    /** @type {ListEntry[]} */
    const entries = [];
    querySnapshot.forEach(docSnapshot => {
        try {
            entries.push(ListEntry.fromFirestore(docSnapshot.data()));
        } catch (error) {
            console.error(`Cannot get list entry ${docSnapshot.ref.path}`);
            console.error(error);
        }
    });
    return entries;
};

/**
 * My friends' entries for the swrl: one getDoc per friend. A friend's
 * `private` entry (or no entry at all: the rules cannot tell the two apart)
 * is refused with permission-denied; that is expected and swallowed quietly.
 * Anything else is logged and that friend skipped.
 *
 * @type {EntrySource}
 */
export const friendsEntriesSource = async (swrlID, firestore) => {
    await whenFriendsReady();
    const found = await Promise.all(getFriends().map(async friend => {
        try {
            const docSnapshot = await getDoc(doc(firestore, listEntryPath(friend.uid, swrlID).join('/')));
            return docSnapshot.exists() ? ListEntry.fromFirestore(docSnapshot.data()) : undefined;
        } catch (error) {
            if (error && error.code !== 'permission-denied') {
                console.error(`Cannot get list entry of friend ${friend.uid}`);
                console.error(error);
            }
            return undefined;
        }
    }));
    return found.filter(entry => entry !== undefined);
};

/**
 * The sources used by the full page's Swrlers card, most trusted first (the
 * merge keeps the first entry for a uid): me, my friends, then everyone public.
 *
 * @type {EntrySource[]}
 */
export const swrlersCardSources = [myEntrySource, friendsEntriesSource, publicEntriesSource];

/**
 * Entries for one swrl from several sources, one per owner. A source that
 * fails (say, a denied read) is logged and skipped, not fatal.
 *
 * @param {string} swrlID
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {EntrySource[]} [sources]
 * @return {Promise<ListEntry[]>}
 */
export async function getEntriesForSwrl(swrlID, firestore, sources = swrlersCardSources) {
    const results = await Promise.all(sources.map(source => source(swrlID, firestore).catch(error => {
        console.error('Could not read entries from a source');
        console.error(error);
        return /** @type {ListEntry[]} */ ([]);
    })));
    return mergeEntriesByUid(...results);
}
