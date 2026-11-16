import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { swrlUser } from '../firebase/login';
import { Collection } from '../constants/Collection';
import { MAX_SHARE_MESSAGE, shareText, shareUrl } from '../model/share';
import { buildSharedSwrlWrite } from '../model/listEntryWrite';
import { showToasterMessage } from '../components/toaster';
import { Swrl } from '../model/swrl';

/**
 * Shares a swrl outside the app: the phone's share sheet (WhatsApp, Messages
 * and so on), or copies the link where there is none.
 *
 * Signed in, it stores a share (shares/{id}: my name, my message, the swrl)
 * so the link's page and its preview can say who sent it. The id is made
 * here, without waiting for the network, because a browser only opens the
 * share sheet straight after a tap; the write goes in the background. If it
 * fails (offline for good, or rules not yet published), the link still opens
 * the swrl, just without my name on it.
 *
 * Must be called from a tap.
 *
 * @param {Swrl} swrl
 * @param {string} message what I want to say about it (may be empty)
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<boolean>} whether it was shared or copied
 */
export default async function shareSwrl(swrl, message, firestore) {
    const words = (message || '').trim().substring(0, MAX_SHARE_MESSAGE);
    const signedIn = swrlUser && !swrlUser.isAnonymous;
    const fromName = signedIn && swrlUser.displayName ? swrlUser.displayName.substring(0, 100) : undefined;
    let shareID;
    if (signedIn && fromName) {
        const shareRef = doc(collection(firestore, Collection.SHARES));
        shareID = shareRef.id;
        const batch = writeBatch(firestore);
        // the link's page needs the swrl's details even if nobody has saved it yet
        batch.set(doc(firestore, Collection.SWRLS, swrl.swrlID), buildSharedSwrlWrite(swrl, {}, serverTimestamp()), { merge: true });
        batch.set(shareRef, { from: swrlUser.uid, fromName, message: words, swrlID: swrl.swrlID, created: serverTimestamp() });
        batch.commit().catch(error => {
            console.error('Could not store the share; the link opens the swrl without a name');
            console.error(error);
        });
    }
    const url = shareUrl(window.location.origin, swrl.swrlID, shareID);
    const text = shareText({ title: swrl.details.title, category: swrl.category.id, fromName, message: words });
    if (navigator.share) {
        try {
            await navigator.share({ title: swrl.details.title, text, url });
            return true;
        } catch (error) {
            // the person closed the share sheet
            if (error && error.name === 'AbortError') return false;
            console.error(error);
        }
    }
    try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        showToasterMessage('Link copied. Paste it into WhatsApp or a message.');
        return true;
    } catch (error) {
        console.error(error);
        window.prompt('Copy this link and send it:', url);
        return true;
    }
}
