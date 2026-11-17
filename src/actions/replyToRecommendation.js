import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Collection } from '../constants/Collection';
import { swrlUser } from '../firebase/login';
import { cleanReplyText } from '../model/recommendationReply';

/**
 * Adds a message to the conversation about a recommendation with one receiver.
 * The sender may write to any receiver's thread (even before they have
 * replied); a receiver only to their own.
 *
 * @param {string} recommendationID
 * @param {string} thread uid of the receiver the conversation is with
 * @param {string} text
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default async function replyToRecommendation(recommendationID, thread, text, firestore) {
    const cleaned = cleanReplyText(text);
    if (!cleaned) {
        throw new Error('A reply needs some text');
    }
    await addDoc(collection(firestore, Collection.RECOMMENDATIONS, recommendationID, 'replies'), {
        from: swrlUser.uid,
        thread: thread,
        text: cleaned,
        created: serverTimestamp()
    });
}
