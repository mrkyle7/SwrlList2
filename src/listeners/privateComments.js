import { collection, getDocs, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { swrlUser } from '../firebase/login';
import { privateCommentsPath } from '../constants/Collection';
import { PrivateComment } from '../model/privateComment';

/**
 * Watches the signed-in user's private comments on one Swrl, oldest first.
 *
 * @param {string} swrlID
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {(comments: PrivateComment[]) => void} onChange
 * @param {(error: Error) => void} onError
 * @return {() => void} call to stop watching
 */
export function listenToPrivateComments(swrlID, firestore, onChange, onError) {
    const [first, ...rest] = privateCommentsPath(swrlUser.uid, swrlID);
    return onSnapshot(query(collection(firestore, first, ...rest), orderBy('created')),
        // A comment just written has no server time yet; estimating it keeps
        // the new comment in the list, in order, straight away.
        querySnapshot => onChange(querySnapshot.docs.map(docSnapshot =>
            PrivateComment.fromFirestore(docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })))),
        onError);
}

/**
 * My latest note on each swrl, for the line on list cards. Filled one swrl at
 * a time (the notes live under each swrl, and the rules allow nothing wider)
 * and kept current by the swrl page, which watches a swrl's notes anyway.
 * Keyed by uid, so another sign-in in the same tab starts empty.
 *
 * @type {Map<string, Promise<string | undefined>>}
 */
const latestNotes = new Map();

/** @param {string} swrlID */
const noteKey = swrlID => `${swrlUser ? swrlUser.uid : ''}/${swrlID}`;

/**
 * My most recent note on a swrl, or undefined when I have none.
 *
 * @param {string} swrlID
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<string | undefined>}
 */
export function getLatestNote(swrlID, firestore) {
    const key = noteKey(swrlID);
    if (!latestNotes.has(key)) {
        const [first, ...rest] = privateCommentsPath(swrlUser.uid, swrlID);
        latestNotes.set(key, getDocs(query(collection(firestore, first, ...rest), orderBy('created', 'desc'), limit(1)))
            .then(snapshot => snapshot.empty ? undefined : String(snapshot.docs[0].data().text || '') || undefined)
            .catch(error => {
                console.error(`Could not read notes for ${swrlID}`);
                console.error(error);
                latestNotes.delete(key);
                return undefined;
            }));
    }
    return latestNotes.get(key);
}

/**
 * What the swrl page saw: my notes on a swrl, oldest first.
 *
 * @param {string} swrlID
 * @param {PrivateComment[]} comments
 */
export function rememberNotes(swrlID, comments) {
    const latest = comments.length > 0 ? comments[comments.length - 1].text : undefined;
    latestNotes.set(noteKey(swrlID), Promise.resolve(latest));
}
