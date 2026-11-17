import { collection, deleteDoc, doc, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore';
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

    const toggleText = document.createElement('span');
    toggleText.className = 'actionText repliesToggle';
    toggleText.setAttribute('role', 'button');
    toggleText.tabIndex = 0;
    const closedLabel = iAmSender ? 'Message' : 'Reply';
    if (hasUnreadReply(recommendation.id)) {
        toggleText.textContent = 'New reply';
        toggleText.classList.add('hasNew');
    } else {
        toggleText.textContent = closedLabel;
    }

    // In the inbox the card already has a row of actions (Dismiss, Mark as
    // read): Reply joins it. Sent cards have none, so it gets its own row.
    const actions = recommendationDiv.querySelector('.recommendationActions');
    if (actions) {
        actions.appendChild(toggleText);
    } else {
        const row = document.createElement('div');
        row.className = 'recommendationActions';
        row.appendChild(toggleText);
        recommendationDiv.appendChild(row);
    }

    const body = document.createElement('div');
    body.className = 'recommendationReplies hidden';
    recommendationDiv.appendChild(body);

    /** @type {(() => void) | undefined} */
    let cancel;
    const open = () => {
        body.classList.remove('hidden');
        toggleText.textContent = 'Hide replies';
        toggleText.classList.remove('hasNew');
        markRepliesRead(recommendation.id, firestore);
        cancel = listen(body, recommendation, threads, iAmSender, firestore);
    };
    const toggle = (/** @type {Event} */ e) => {
        e.stopPropagation();
        e.preventDefault();
        if (body.classList.contains('hidden')) {
            // put the cursor in the first box once it has been drawn
            body.dataset.focusThread = threads[0];
            open();
        } else {
            body.classList.add('hidden');
            toggleText.textContent = closedLabel;
            if (cancel) {
                cancel();
                cancel = undefined;
            }
        }
    };
    toggleText.addEventListener('click', toggle);
    toggleText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') toggle(e);
    });

    // when there is already a conversation, show it without a tap
    getDocs(query(repliesSource(recommendation, iAmSender, firestore), limit(1)))
        .then(found => {
            if (!found.empty && body.classList.contains('hidden')) open();
        })
        .catch(error => console.error('Could not check for replies', error));
}

/**
 * What I may read of a recommendation's replies: the sender reads them all; a
 * receiver's query must carry the constraint the rules check.
 *
 * @param {import('../model/recommendation').Recommendation} recommendation
 * @param {boolean} iAmSender
 * @param {import('firebase/firestore').Firestore} firestore
 */
function repliesSource(recommendation, iAmSender, firestore) {
    const repliesCollection = collection(firestore, Collection.RECOMMENDATIONS, recommendation.id, 'replies');
    return iAmSender ? repliesCollection : query(repliesCollection, where('thread', '==', swrlUser.uid));
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
    const source = repliesSource(recommendation, iAmSender, firestore);
    const names = {};
    const typed = {};
    /** @type {Object<string, RecommendationReply[]>} */
    let byThread = {};
    let failed = false;

    const draw = async () => {
        await Promise.all(threads.map(async uid => {
            if (!(uid in names)) {
                const swrler = await getSwrler(iAmSender ? uid : recommendation.from, firestore);
                names[uid] = swrler ? swrler.displayName : 'Someone';
            }
        }));
        // keep half-typed text, and the cursor, across re-renders
        body.querySelectorAll('textarea').forEach(box => typed[box.dataset.thread] = box.value);
        /** @type {HTMLElement} */
        // @ts-ignore
        const active = document.activeElement;
        const focusThread = active && body.contains(active) && active.dataset.thread
            ? active.dataset.thread : body.dataset.focusThread;
        delete body.dataset.focusThread;
        while (body.firstChild) body.removeChild(body.firstChild);
        if (failed) {
            const note = document.createElement('div');
            note.className = 'replyError';
            note.textContent = 'Could not load earlier replies. Try again later.';
            body.appendChild(note);
        }
        threads.forEach(uid => body.appendChild(
            renderThread(recommendation, uid, names[uid], byThread[uid] || [], typed[uid] || '', iAmSender, firestore)));
        if (focusThread) {
            /** @type {HTMLTextAreaElement} */
            const box = body.querySelector(`textarea[data-thread="${focusThread}"]`);
            if (box) {
                box.focus({ preventScroll: true });
                box.setSelectionRange(box.value.length, box.value.length);
            }
        }
    };

    // the box to type in shows at once, not only after the replies have loaded
    draw();
    const unsubscribe = onSnapshot(source, snapshot => {
        failed = false;
        byThread = repliesByThread(snapshot.docs.map(docSnapshot => RecommendationReply.fromFirestore(docSnapshot)));
        draw();
    }, error => {
        console.error('Could not load replies', error);
        failed = true;
        draw();
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
        heading.textContent = `With ${otherName}`;
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
    box.className = 'commentInput';
    box.dataset.thread = thread;
    box.rows = 1;
    box.setAttribute('aria-label', iAmSender ? `Message ${otherName}` : `Reply to ${otherName}`);
    box.maxLength = MAX_REPLY_LENGTH;
    box.placeholder = iAmSender ? `Message ${otherName}` : `Reply to ${otherName}`;
    box.value = draft;
    const send = document.createElement('button');
    send.type = 'submit';
    send.className = 'commentSend';
    send.textContent = 'Send';
    form.appendChild(box);
    form.appendChild(send);
    // one line to start, growing with what is typed (up to the CSS max-height)
    const fit = () => {
        box.style.height = 'auto';
        box.style.height = `${box.scrollHeight + 3}px`;
    };
    box.addEventListener('input', fit);
    // typing in the box must not open the swrl page behind the card
    box.addEventListener('click', e => e.stopPropagation());
    if (draft) requestAnimationFrame(fit);
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const text = box.value;
        if (!text.trim()) return;
        send.disabled = true;
        // cleared first: the local snapshot re-renders before the write is acknowledged
        box.value = '';
        box.style.height = '';
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
