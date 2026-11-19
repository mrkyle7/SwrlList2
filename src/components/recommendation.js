import { doc, getDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { INBOX, SENT } from '../constants/View';
import { swrlUser } from '../firebase/login';
import { addStats } from './stats';
import { addLoveButton, addAddButton, addRecommendButton, addDoneButton, addProgressBadge } from './buttons';
import { Collection } from '../constants/Collection';
import { markRecommendationAsRead } from '../actions/markRecommendationAsRead';
import { showToasterMessage } from './toaster';
import { Constant } from '../constants/Constant';
import { Recommendation } from '../model/recommendation';
import { StateController } from '../views/stateController';
import { getSwrler } from '../firebase/swrler';
import { State } from '../model/state';
import { Swrl } from '../model/swrl';
import { typeLabel } from '../constants/Type';
import { whenListEntriesReady } from '../listeners/listEntries';
import { addReplies } from './recommendationReplies';
import { hasUnreadReply } from '../listeners/recommendations';
import { addDetailedParts } from './swrl';
import { makeKeyboardClickable } from './keyboard';
import { cardMeta } from '../model/listView';
import { recommendationReason } from '../model/recommendation';
import { nameList } from '../model/activity';

/**
 * 
 * @param {StateController} stateController
 * @param {Constant} view 
 * @param {Recommendation} recommendation 
 * @param {import('firebase/firestore').Firestore} firestore 
 * @param {HTMLElement} container 
 * @return {Promise<DocumentFragment | undefined>} undefined for one I dismissed
 */
export const renderRecommendation = async (stateController, view, recommendation, firestore, container) => {
    if (recommendation.dismissed && recommendation.dismissed.indexOf(swrlUser.uid) !== -1 && !hasUnreadReply(recommendation.id)) {
        return undefined;
    }
    if (!recommendation.swrl) {
        const swrlDoc = await getDoc(doc(firestore, Collection.SWRLS, recommendation.swrlID));
        recommendation.swrl = Swrl.fromFirestore(swrlDoc.data());
    }
    const swrl = recommendation.swrl;

    // the same card as every list (the #swrl template and its styles), plus
    // who sent it and what they said, and a footer with the inbox's actions
    /** @type {HTMLTemplateElement} */
    // @ts-ignore
    const swrlTemplate = document.getElementById('swrl');
    /** @type {DocumentFragment} */
    // @ts-ignore
    const fragment = swrlTemplate.content.cloneNode(true);
    const card = /** @type {HTMLElement} */ (fragment.querySelector('.swrl'));
    card.classList.add('recommendationCard');
    const $ = (/** @type {string} */ selector) => /** @type {HTMLElement} */ (card.querySelector(selector));

    const image = /** @type {HTMLImageElement} */ ($('.swrlImage'));
    image.src = swrl.details.imageUrl;
    image.addEventListener('error', () => { image.src = 'img/NoPoster.jpg'; }, { once: true });
    $('.swrlTitle').textContent = swrl.details.title;
    $('.swrlMeta').textContent = cardMeta(typeLabel(swrl.type), swrl.details);
    $('.swrlType').textContent = typeLabel(swrl.type);
    addDetailedParts(card, swrl);

    // "New" while unread, in the same pill as "Watching"
    const unreadPill = document.createElement('p');
    unreadPill.className = 'swrlProgress recommendationNew hidden';
    unreadPill.textContent = 'New';
    $('.swrlMeta').after(unreadPill);

    /** @type {HTMLTemplateElement} */
    // @ts-ignore
    const swrlButtonsTemplate = document.getElementById('swrlButtons');
    $('.swrlButtons').appendChild(swrlButtonsTemplate.content.cloneNode(true));

    // my own entries must have loaded, or the buttons would all say "not on my list"
    await whenListEntriesReady();
    addStats(card, swrl);
    addLoveButton(view, swrl, card, firestore, recommendation);
    addAddButton(view, card, swrl, firestore, null, recommendation);
    addRecommendButton(card, swrl, stateController);
    addDoneButton(card, swrl, firestore, null, view);
    addProgressBadge(card, swrl);

    const openSwrl = () => {
        const swrlFullPage = new State(stateController.swrlView);
        swrlFullPage.swrl = swrl;
        swrlFullPage.selectedCategory = stateController.currentState.selectedCategory;
        stateController.changeState(swrlFullPage);
    };
    makeKeyboardClickable(card, 'link');
    card.setAttribute('aria-label', swrl.details.title);
    card.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        openSwrl();
    });

    // who and what: "Bobby Baker: “You will cry”" on a card I was sent; "To Alice and Bob: “...”" on one I sent
    const reason = $('.swrlReason');
    const reasonText = $('.swrlReasonText');
    if (view === INBOX) {
        if (!recommendation.fromSwrler) recommendation.fromSwrler = await getSwrler(recommendation.from, firestore);
        const sender = recommendation.fromSwrler;
        reasonText.textContent = recommendationReason([sender ? sender.displayName : ''], recommendation.message)
            || recommendation.message || '';
        if (sender) {
            const face = /** @type {HTMLImageElement} */ (reason.querySelector('.swrlMiniIcon'));
            face.src = sender.photoURL || 'img/emoji_people-24px.svg';
            face.classList.add('recommendationFace');
            face.addEventListener('error', () => { face.src = 'img/emoji_people-24px.svg'; }, { once: true });
            reason.classList.add('recommendationFrom');
            reason.title = `See ${sender.displayName}'s list`;
            reason.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const swrlerList = new State(stateController.swrlerLaterView);
                swrlerList.swrler = sender;
                stateController.changeState(swrlerList);
            });
        }
    } else if (view === SENT) {
        if (!recommendation.toSwrlers) {
            recommendation.toSwrlers = await Promise.all(recommendation.to.map(async uid => {
                const swrler = await getSwrler(uid, firestore);
                return swrler ? swrler.displayName : undefined;
            }));
        }
        const names = nameList(recommendation.toSwrlers.filter(name => name !== undefined));
        const words = (recommendation.message || '').trim();
        reasonText.textContent = names ? `To ${names}` + (words ? `: \u201c${words}\u201d` : '') : words;
    }
    reason.classList.toggle('hidden', !reasonText.textContent);

    // the footer: when it came, then the actions
    const footer = document.createElement('div');
    footer.className = 'recommendationActions';
    if (recommendation.created) {
        const when = document.createElement('span');
        when.className = 'recommendationDate';
        when.textContent = recommendation.created.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
        footer.appendChild(when);
    }
    if (view === INBOX) {
        const action = (/** @type {string} */ className, /** @type {string} */ text) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'recommendationAction ' + className;
            button.textContent = text;
            footer.appendChild(button);
            return button;
        };
        action('markRead hidden', 'Mark as read').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            markRecommendationAsRead(card, recommendation, firestore);
            unreadPill.classList.add('hidden');
            showToasterMessage('Marked ' + swrl.details.title + ' as read');
        });
        action('markUnRead hidden', 'Mark as unread').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            setDoc(doc(firestore, Collection.RECOMMENDATIONS, recommendation.id), {
                read: arrayRemove(swrlUser.uid)
            }, { merge: true });
            card.classList.add('unread');
            unreadPill.classList.remove('hidden');
            $('.markRead').classList.remove('hidden');
            $('.markUnRead').classList.add('hidden');
        });
        action('dismiss', 'Dismiss').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            setDoc(doc(firestore, Collection.RECOMMENDATIONS, recommendation.id), {
                dismissed: arrayUnion(swrlUser.uid)
            }, { merge: true });
            if (card.parentNode === container) container.removeChild(card);
            showToasterMessage('Dismissed ' + swrl.details.title);
        });
    }
    card.appendChild(footer);
    // clicks in the footer (and the replies under it) never open the swrl
    footer.addEventListener('click', e => e.stopPropagation());
    addReplies(card, recommendation, firestore);
    // Reply first among the actions (it is added last): reading and Tab order match what you see
    const reply = footer.querySelector('.repliesToggle');
    const firstAction = footer.querySelector('.recommendationAction');
    if (reply && firstAction) footer.insertBefore(reply, firstAction);
    const replies = card.querySelector('.recommendationReplies');
    if (replies) replies.addEventListener('click', e => e.stopPropagation());
    showRead(view, recommendation, card);
    unreadPill.classList.toggle('hidden', !card.classList.contains('unread'));
    return fragment;
}

/**
 * 
 * @param {Constant} view 
 * @param {Recommendation} recommendation 
 * @param {HTMLElement} recommendationDiv 
 */
const showRead = (view, recommendation, recommendationDiv) => {
    if (view === SENT) {
        recommendationDiv.classList.remove('unread');
    } else if (recommendation.read && recommendation.read.indexOf(swrlUser.uid) !== -1) {
        recommendationDiv.classList.remove('unread');

        recommendationDiv.querySelector('.markRead').classList.add('hidden');
        recommendationDiv.querySelector('.markUnRead').classList.remove('hidden');
    } else {
        recommendationDiv.classList.add('unread');
        recommendationDiv.querySelector('.markRead').classList.remove('hidden');
        recommendationDiv.querySelector('.markUnRead').classList.add('hidden');
    }
}