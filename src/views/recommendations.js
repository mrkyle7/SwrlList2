import { INBOX, SENT } from '../constants/View';
import { recommendationsInboxCache, recommendationsSentCache, inboxReady, hasUnreadReply } from '../listeners/recommendations';
import { Collection } from '../constants/Collection';
import { renderRecommendation } from '../components/recommendation';
import { cancelReplyListeners } from '../components/recommendationReplies';
import { swrlUser } from '../firebase/login';
import { Constant } from '../constants/Constant';
import { State } from '../model/state';
import { Recommendation, myStateOfSwrl, showInboxRecommendation, sendersOf, fromSender, hiddenByInboxFilters, emptyInboxMessage } from '../model/recommendation';
import { getSwrlerCached } from '../firebase/swrler';
import { getListEntry, whenListEntriesReady } from '../listeners/listEntries';
import { UIView } from './UIView';
import { StateController } from './stateController';

export class InboxRecommendations extends UIView {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.recommendationsScreen);
    }

    show() {
        inboxController = this.stateController;
        showRecommendations(this.stateController, INBOX, this.firestore);
    }

    destroy() {
        destroyRecommendations();
    }

}

export class SentRecommendations extends UIView {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.recommendationsScreen);
    }

    show() {
        showRecommendations(this.stateController, SENT, this.firestore);
    }

    destroy() {
        destroyRecommendations();
    }
}

const loadingSpinner = document.getElementById('loadingSpinner');
const inboxTab = document.getElementById('inboxTab');
const sentTab = document.getElementById('sentTab');

/** @type {HTMLDivElement} */
// @ts-ignore
const recommendationList = document.getElementById('recommendationList');
const recommendationTabs = document.getElementById('recommendationTabs');

const filtersDiv = document.getElementById('recommendationFilters');
/** @type {HTMLInputElement} */
// @ts-ignore
const showDoneBox = document.getElementById('showDoneRecommendations');
/** @type {HTMLInputElement} */
// @ts-ignore
const showOnListBox = document.getElementById('showOnListRecommendations');
/** @type {HTMLSelectElement} */
// @ts-ignore
const senderSelect = document.getElementById('recommendationSender');

/** @type {StateController} set while the inbox is showing, so a filter change can re-render it */
let inboxController;

/** @type {number} */
export let currentRenderID;

/**
 * @param {StateController} stateController
 * @param {Constant} view 
 * @param {import('firebase/firestore').Firestore} firestore 
 */
const showRecommendations = async (stateController, view, firestore) => {
    recommendationTabs.classList.remove('hidden');
    recommendationList.classList.remove('hidden');
    currentRenderID = Math.random();
    clearList();
    loadingSpinner.classList.remove('hidden');
    while (swrlUser && !swrlUser.isAnonymous && !inboxReady) {
        console.log('waiting for inbox...')
        await new Promise(resolve => setTimeout(resolve, 300))
    }
    // the filters are about my own list, so they belong to what I was sent
    filtersDiv.classList.toggle('hidden', view !== INBOX);
    recommendationList.classList.toggle('withFilters', view === INBOX);
    if (view === INBOX) {
        inboxTab.classList.add('selected');
        sentTab.classList.remove('selected');
        showInboxFromCache(stateController, view, firestore, currentRenderID);
    } else {
        inboxTab.classList.remove('selected');
        sentTab.classList.add('selected');
        showSentFromCache(stateController, view, firestore, currentRenderID);
    }
}

const destroyRecommendations = () => {
    cancelReplyListeners();
    recommendationTabs.classList.add('hidden');
    filtersDiv.classList.add('hidden');
    recommendationList.classList.remove('withFilters');
    recommendationList.classList.add('hidden');
    loadingSpinner.classList.add('hidden');
}

const clearList = () => {
    cancelReplyListeners();
    while (recommendationList.firstChild) {
        recommendationList.removeChild(recommendationList.firstChild);
    }
}

/**
 * 
 * @param {StateController} stateController
 * @param {Constant} view
 * @param {import('firebase/firestore').Firestore} firestore 
 * @param {number} renderID
 */
/**
 * Lists the people who sent me something in the "From" menu, by name, keeping
 * the current choice. Names arrive after the first draw, so it is refilled.
 *
 * @param {Recommendation[]} recommendations everything in my inbox
 * @param {import('firebase/firestore').Firestore} firestore
 */
const fillSenders = (recommendations, firestore) => {
    const chosen = senderSelect.value;
    Promise.all(sendersOf(recommendations).map(async uid => {
        const swrler = await getSwrlerCached(uid, firestore);
        return { uid, name: swrler ? swrler.displayName : 'Someone' };
    })).then(senders => {
        senders.sort((a, b) => a.name.localeCompare(b.name));
        while (senderSelect.options.length > 1) senderSelect.remove(1);
        senders.forEach(sender => senderSelect.add(new Option(sender.name, sender.uid)));
        // a sender who has since gone leaves "Everyone"
        senderSelect.value = senders.some(sender => sender.uid === chosen) ? chosen : '';
    });
}

const showInboxFromCache = (stateController, view, firestore, renderID) => {
    //Object.values wasn't supported in the old Cordova browser
    const recommendations = [];
    Object.keys(recommendationsInboxCache).forEach(i => recommendations.push(recommendationsInboxCache[i]));

    // my own entries must have loaded, or everything would look as if it were neither done nor on my list
    whenListEntriesReady().then(() => {
        if (renderID !== currentRenderID) return;
        const filters = { showDone: showDoneBox.checked, showOnList: showOnListBox.checked };
        fillSenders(recommendations, firestore);
        // dismissed ones are never drawn (unless a reply is waiting), so they are not "hidden by a filter" either
        const candidates = fromSender(recommendations, senderSelect.value).filter(recommendation =>
            !recommendation.dismissed.includes(swrlUser.uid) || hasUnreadReply(recommendation.id));
        const stateOf = recommendation => ({
            unread: !recommendation.read.includes(swrlUser.uid),
            hasUnreadReply: hasUnreadReply(recommendation.id),
            ...myStateOfSwrl(getListEntry(recommendation.swrlID))
        });
        const shown = candidates.filter(recommendation => showInboxRecommendation(stateOf(recommendation), filters));
        const hidden = hiddenByInboxFilters(candidates.map(stateOf), filters);
        const senderName = senderSelect.value && senderSelect.selectedOptions[0] ? senderSelect.selectedOptions[0].text : undefined;
        renderRecommendations(stateController, shown, view, firestore, renderID,
            () => emptyInboxView(emptyInboxMessage(hidden, senderName)));
    });
}

/**
 * 
 * @param {StateController} stateController
 * @param {Constant} view  
 * @param {import('firebase/firestore').Firestore} firestore 
 * @param {number} renderID
 */
const showSentFromCache = (stateController, view, firestore, renderID) => {
     //Object.values wasn't supported in the old Cordova browser
     const recommendations = [];
     Object.keys(recommendationsSentCache).forEach(i => recommendations.push(recommendationsSentCache[i]));
     renderRecommendations(stateController, recommendations, view, firestore, renderID, () => emptyInboxView({
         message: "You haven't swrled anything to a friend yet. Open a swrl and choose \"Swrl to a friend\".",
         actions: []
     }));
 
}

/**
 * 
 * @param {StateController} stateController
 * @param {Recommendation[]} recommendations 
 * @param {Constant} view  
 * @param {import('firebase/firestore').Firestore} firestore 
 * @param {number} renderID
 * @param {() => HTMLElement} [whenEmpty] what to show when nothing is drawn
 */
const renderRecommendations = async (stateController, recommendations, view, firestore, renderID, whenEmpty) => {
    const elements = [];
    recommendations
        .sort((a, b) => {
            //sort by created date, showing latest first
            if (a.created === undefined) return 1;
            if (b.created === undefined) return -1;
            if (a.created > b.created) return -1;
            if (b.created > a.created) return 1;
            return 0;
        })
        .forEach(recommendation => {
            elements.push(renderRecommendation(stateController, view, recommendation, firestore, recommendationList))
        });
    Promise.all(elements).then((element) => {
        if (renderID === currentRenderID) {
            loadingSpinner.classList.add('hidden');
            const drawn = element.filter(recommendationHTML => recommendationHTML !== undefined);
            drawn.forEach(recommendationHTML => recommendationList.appendChild(recommendationHTML));
            if (drawn.length === 0 && whenEmpty) recommendationList.appendChild(whenEmpty());
        } else {
            console.log('Recommendation view changed when about to add elements');
        }
    });
}
/**
 * The empty "For you" (or "From you") screen: a sentence, and a button per
 * filter that is hiding something ("Show 3 on your list") which ticks that
 * filter's box, as ticking it by hand does.
 *
 * @param {{message: string, actions: {filter: 'showOnList' | 'showDone', label: string}[]}} empty
 * @return {HTMLElement}
 */
function emptyInboxView(empty) {
    const box = document.createElement('div');
    box.className = 'inboxEmpty';
    const text = document.createElement('p');
    text.className = 'inboxEmptyText';
    text.textContent = empty.message;
    box.appendChild(text);
    if (empty.actions.length > 0) {
        const buttons = document.createElement('div');
        buttons.className = 'inboxEmptyActions';
        empty.actions.forEach((action, i) => {
            const button = document.createElement('button');
            button.type = 'button';
            // one filled main action, the rest quiet
            button.className = i === 0 ? 'inboxEmptyButton' : 'inboxEmptyButton inboxEmptyButtonQuiet';
            button.textContent = action.label;
            button.addEventListener('click', () => {
                const filterBox = action.filter === 'showOnList' ? showOnListBox : showDoneBox;
                filterBox.checked = true;
                filterBox.dispatchEvent(new Event('change'));
            });
            buttons.appendChild(button);
        });
        box.appendChild(buttons);
    }
    return box;
}

[showDoneBox, showOnListBox, senderSelect].forEach(box => box.addEventListener('change', () => {
    if (inboxController) inboxController.changeState(new State(inboxController.inboxView));
}));
