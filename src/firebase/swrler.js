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