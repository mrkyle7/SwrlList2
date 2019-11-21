import { Collection } from "../constants/Collection";

/**
 * 
 * @param {String} uid 
 * @param {firebase.firestore.Firestore} firestore 
 * @return {Promise<firebase.User>}
 */
export const getSwrler = (uid, firestore) => {
    return new Promise((resolve, reject) => {
        firestore.collection(Collection.SWRLERS)
            .doc(uid)
            .get()
            .then(docRef => {
                if (docRef.exists) {
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