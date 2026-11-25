import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { Collection } from '../constants/Collection';
import { getListEntry } from '../listeners/listEntries';
import { myGenres } from '../model/myGenres';

/** Genres per swrl, from my entry's details or, failing that, the shared swrl's. */
const genresBySwrl = new Map();
/** Swrls whose shared doc has been asked for already. */
const looked = new Set();

/**
 * Makes sure the genres of these entries are known: from the details kept
 * on my entry, or, for something added straight from search results (which
 * carry no genres), from the shared swrl, read in batches of 30.
 *
 * @param {import('../model/listEntry').ListEntry[]} entries
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export async function ensureGenres(entries, firestore) {
    const missing = [];
    entries.forEach(entry => {
        const own = entry.details && entry.details.genres;
        if (own && own.length > 0) genresBySwrl.set(entry.swrlID, own);
        else if (!genresBySwrl.has(entry.swrlID) && !looked.has(entry.swrlID)) missing.push(entry.swrlID);
    });
    for (let i = 0; i < missing.length; i += 30) {
        const ids = missing.slice(i, i + 30);
        ids.forEach(id => looked.add(id));
        try {
            const snapshot = await getDocs(query(collection(firestore, Collection.SWRLS), where(documentId(), 'in', ids)));
            snapshot.forEach(docSnapshot => {
                const details = docSnapshot.data().details;
                if (details && Array.isArray(details.genres) && details.genres.length > 0) {
                    genresBySwrl.set(docSnapshot.id, details.genres);
                }
            });
        } catch (error) {
            ids.forEach(id => looked.delete(id));
            console.error(error);
        }
    }
}

/**
 * @param {string} swrlID
 * @return {string[]} its genres as far as they are known, with my own changes
 */
export function genresFor(swrlID) {
    return myGenres(genresBySwrl.get(swrlID) || [], getListEntry(swrlID));
}
