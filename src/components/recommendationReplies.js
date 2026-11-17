import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { Collection, unreadRepliesPath } from '../constants/Collection';
import { hasUnreadReply } from '../listeners/recommendations';
import { swrlUser } from '../firebase/login';
import { getSwrler } from '../firebase/swrler';
import replyToRecommendation from '../actions/replyToRecommendation';
import { showToasterMessage } from './toaster';
import {
    MAX_REPLY_LENGTH, RecommendationReply, repliesByThread, threadsVisibleTo
} from '../model/recommendationReply';

/** @type {(() => void)[]} unsubscribe functions of the open conversations */
let openListeners = [];

/** Stops every open conversation's listener; call when the recommendations screen goes away. */
export function cancelReplyListeners() {
    openListeners.forEach(cancel => cancel());
    openListeners = [];
}

/**
 * Adds a "Replies" toggle to a recommendation card. Opening it shows the
 * conversation(s) about the recommendation: the sender sees one per receiver
 * (and may start one before the receiver has said anything), a receiver sees
 * only their own with the sender. Listens to Firestore only while open.
 *
 * @param {HTMLElement} recommendationDiv the card
 * @param {import('../model/recommendation').Recommendation} recommendation
 * @param {import('firebase/firestore').Firestore} firestore
 */
export function addReplies(recommendationDiv, recommendation, firestore) {
    const me = swrlUser.uid;
    const threads = threadsVisibleTo(recommendation, me);
    if (threads.length === 0) return;
    const iAmSender = recommendation.from === me;

    const toggle = document.createElement('div');
    toggle.className = 'recommendationRepliesToggle';
    const toggleText = document.createElement('span');
    toggleText.className = 'actionText';
    toggleText.textContent = hasUnreadReply(recommendation.id) ? 'New replies' : 'Replies';
    toggle.appendChild(toggleText);

    const body = document.createElement('div');
    body.className = 'recommendationReplies hidden';
    recommendationDiv.appendChild(toggle);
    recommendationDiv.appendChild(body);

    /** @type {(() => void) | undefined} */
    let cancel;
    toggleText.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const opening = body.classList.contains('hidden');
        body.classList.toggle('hidden', !opening);
        if (opening) {
            toggleText.textContent = 'Replies';
            markRepliesRead(recommendation.id, firestore);
            cancel = listen(body, recommendation, threads, iAmSender, firestore);
        } else if (cancel) {
            cancel();
            cancel = undefined;
        }
    });
}

/**
 * @param {HTMLElement} body
 * @param {import('../model/recommendation').Recommendation} recommendation
 * @param {string[]} threads receiver uids to show
 * @param {boolean} iAmSender
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {() => void} stops listening
 */
function listen(body, recommendation, threads, iAmSender, firestore) {
    const repliesCollection = collection(firestore, Collection.RECOMMENDATIONS, recommendation.id, 'replies');
    // A receiver's query must carry the constraint the rules check; the sender reads them all.
    const source = iAmSender ? repliesCollection : query(repliesCollection, where('thread', '==', swrlUser.uid));
    const names = {};
    const typed = {};

    const unsubscribe = onSnapshot(source, snapshot => {
        const replies = snapshot.docs.map(docSnapshot => RecommendationReply.fromFirestore(docSnapshot));
        const byThread = repliesByThread(replies);
        Promise.all(threads.map(async uid => {
            if (!(uid in names)) {
                const swrler = iAmSender ? await getSwrler(uid, firestore) : await getSwrler(recommendation.from, firestore);
                names[uid] = swrler ? swrler.displayName : 'Someone';
            }
        })).then(() => {
            // keep half-typed text across re-renders
            body.querySelectorAll('textarea').forEach(box => typed[box.dataset.thread] = box.value);
            while (body.firstChild) body.removeChild(body.firstChild);
            threads.forEach(uid => body.appendChild(
                renderThread(recommendation, uid, names[uid], byThread[uid] || [], typed[uid] || '', iAmSender, firestore)));
        });
    }, error => {
        console.error('Could not load replies', error);
    });
    openListeners.push(unsubscribe);
    return () => {
        unsubscribe();
        openListeners = openListeners.filter(cancel => cancel !== unsubscribe);
    };
}

/**
 * @param {import('../model/recommendation').Recommendation} recommendation
 * @param {string} thread receiver uid
 * @param {string} otherName who I am talking to
 * @param {RecommendationReply[]} replies oldest first
 * @param {string} draft
 * @param {boolean} iAmSender
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {HTMLElement}
 */
function renderThread(recommendation, thread, otherName, replies, draft, iAmSender, firestore) {
    const section = document.createElement('div');
    section.className = 'replyThread';

    // only the sender has several conversations, so only they need a name on each
    if (iAmSender) {
        const heading = document.createElement('div');
        heading.className = 'replyThreadName';
        heading.textContent = `To ${otherName}`;
        section.appendChild(heading);
    }

    replies.forEach(reply => {
        const line = document.createElement('div');
        line.className = reply.from === swrlUser.uid ? 'reply mine' : 'reply theirs';
        line.textContent = reply.text;
        line.title = reply.created.toLocaleString();
        section.appendChild(line);
    });

    const form = document.createElement('form');
    form.className = 'replyForm';
    const box = document.createElement('textarea');
    box.dataset.thread = thread;
    box.rows = 1;
    box.maxLength = MAX_REPLY_LENGTH;
    box.placeholder = iAmSender ? `Message ${otherName}` : `Reply to ${otherName}`;
    box.value = draft;
    const send = document.createElement('button');
    send.type = 'submit';
    send.textContent = 'Send';
    form.appendChild(box);
    form.appendChild(send);
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const text = box.value;
        if (!text.trim()) return;
        send.disabled = true;
        // cleared first: the local snapshot re-renders before the write is acknowledged
        box.value = '';
        try {
            await replyToRecommendation(recommendation.id, thread, text, firestore);
        } catch (error) {
            console.error('Could not send reply', error);
            box.value = text;
            showToasterMessage('Could not send your reply');
        } finally {
            send.disabled = false;
        }
    });
    section.appendChild(form);
    return section;
}

/**
 * Clears my "unread reply" marker for a recommendation (a no-op when there is none).
 *
 * @param {string} recommendationID
 * @param {import('firebase/firestore').Firestore} firestore
 */
function markRepliesRead(recommendationID, firestore) {
    if (!hasUnreadReply(recommendationID)) return;
    deleteDoc(doc(firestore, unreadRepliesPath(swrlUser.uid).join('/'), recommendationID))
        .catch(error => console.error('Could not mark replies as read', error));
}
