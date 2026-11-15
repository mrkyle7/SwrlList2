import { collection, onSnapshot } from 'firebase/firestore';
import { labelsPath } from '../constants/Collection';
import { swrlUser } from '../firebase/login';
import { allLabels, labelsFromFirestore } from '../model/labels';

/**
 * My private labels (swrlers/{uid}/labels), keyed by swrlID. Only I can read
 * them. Read through getLabelsFor / getAllMyLabels.
 *
 * @type {Object<string, string[]>}
 */
let labelsCache = {};

/** @type {() => void} */
let currentListener;
let listeningUid;
/** @type {Set<() => void>} */
const changeListeners = new Set();

export default { setUpLabelsListener, cancelLabelsListener };

/**
 * Starts listening to the signed-in user's labels. Safe to call again for the
 * same user; does nothing then. Not for anonymous users.
 *
 * @param {import('firebase/firestore').Firestore} firestore
 */
export function setUpLabelsListener(firestore) {
    if (!swrlUser || swrlUser.isAnonymous) return;
    if (listeningUid === swrlUser.uid) return;
    cancelLabelsListener();
    const uid = swrlUser.uid;
    listeningUid = uid;
    currentListener = onSnapshot(collection(firestore, labelsPath(uid).join('/')),
        querySnapshot => {
            /** @type {Object<string, string[]>} */
            const next = {};
            querySnapshot.forEach(docSnapshot => {
                const labels = labelsFromFirestore(docSnapshot.data());
                if (labels.length > 0) next[docSnapshot.id] = labels;
            });
            labelsCache = next;
            notify();
        },
        error => {
            // Labels are an extra: without them the lists still work, so do
            // not retry in a loop (e.g. when the rules do not allow them yet).
            console.error('Could not load labels');
            console.error(error);
        });
}

export function cancelLabelsListener() {
    if (currentListener) currentListener();
    currentListener = undefined;
    listeningUid = undefined;
    labelsCache = {};
    notify();
}

function notify() {
    changeListeners.forEach(listener => {
        try {
            listener();
        } catch (error) {
            console.error(error);
        }
    });
}

/**
 * @param {string} swrlID
 * @return {string[]} my labels on that swrl, sorted; empty when none
 */
export function getLabelsFor(swrlID) {
    return labelsCache[swrlID] || [];
}

/**
 * @return {string[]} every label I have used, once each, sorted
 */
export function getAllMyLabels() {
    return allLabels(labelsCache);
}

/**
 * @param {() => void} listener called whenever my labels change
 * @return {() => void} call to stop being told
 */
export function addLabelsChangeListener(listener) {
    changeListeners.add(listener);
    return () => changeListeners.delete(listener);
}
