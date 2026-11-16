import { doc, getDoc } from 'firebase/firestore';
import { Collection } from "../constants/Collection";

/**
 * 
 * @param {String} uid 
 * @param {import('firebase/firestore').Firestore} firestore 
 * @return {Promise<import('firebase/auth').User>}
 */
export const getSwrler = (uid, firestore) => {
    return new Promise((resolve, reject) => {
        getDoc(doc(firestore, Collection.SWRLERS, uid))
            .then(docRef => {
                if (docRef.exists()) {
                    // @ts-ignore
                    resolve(docRef.data());
                } else {
                    resolve(undefined);
                }
            })
            .catch(err => {
                console.error('Error getting swrler');
                console.error(err);
                resolve(undefined);
            })
    });
}

/** @type {Map<string, Promise<import('firebase/auth').User>>} */
const swrlerLookups = new Map();

/**
 * getSwrler, remembered for the life of the page: a list of cards asks for
 * the same few people again and again.
 *
 * @param {String} uid
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<import('firebase/auth').User>}
 */
export const getSwrlerCached = (uid, firestore) => {
    if (!swrlerLookups.has(uid)) {
        swrlerLookups.set(uid, getSwrler(uid, firestore).then(swrler => {
            // a failed or empty lookup is tried again next time
            if (!swrler) swrlerLookups.delete(uid);
            return swrler;
        }));
    }
    return swrlerLookups.get(uid);
}
