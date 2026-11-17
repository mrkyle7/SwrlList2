import { collection, getDocs } from 'firebase/firestore';
import { UIView } from './UIView';
import { StateController } from './stateController';
import { friendEntries } from '../firebase/friendEntries';
import { getAllListEntries, whenListEntriesReady } from '../listeners/listEntries';
import { tasteLine, tasteOverlap } from '../model/taste';
import { Collection } from '../constants/Collection';
import { swrlUser } from '../firebase/login';
import { getSwrler } from '../firebase/swrler';
import {
    addFriendsChangeListener, getFriends, getIncomingRequests, getSentRequests, isAccepting, isFriend, isFriendsReady,
    whenFriendsReady
} from '../listeners/friends';
import { MAX_SEARCH_RESULTS, MIN_SEARCH_LENGTH, findSwrlersByName } from '../model/friendRequest';
import { State } from '../model/state';
import { button, label, renderFriendControl } from '../components/friendControl';
import acceptFriendRequest from '../actions/acceptFriendRequest';
import declineFriendRequest from '../actions/declineFriendRequest';
import cancelFriendRequest from '../actions/cancelFriendRequest';
import removeFriend from '../actions/removeFriend';

export class Friends extends UIView {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.friendsScreen);
    }

    show() {
        showFriends(this.firestore, this.stateController);
    }

    destroy() {
        destroyFriends();
    }
}

const friendsView = document.getElementById('friendsView');
/** @type {HTMLInputElement} */
// @ts-ignore
const searchInput = document.getElementById('friendSearch');
/** @type {HTMLTemplateElement} */
// @ts-ignore
const rowTemplate = document.getElementById('friendRow');

/** Profiles (swrlers docs) by uid: everyone loaded for the search, plus any fetched singly. */
/** @type {Object<string, any>} */
const profiles = {};
/** @type {any[]} */
let allSwrlers = [];
/** @type {Set<string>} */
const fetching = new Set();
let searchLoadFailed = false;
let unsubscribe;
/** Bumped on every show/destroy so late answers for an old visit are dropped. */
let visit = 0;
let searchBound = false;

/**
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 */
function showFriends(firestore, stateController) {
    friendsView.classList.remove('hidden');
    const thisVisit = ++visit;
    searchInput.value = '';
    searchLoadFailed = false;
    if (!searchBound) {
        searchInput.addEventListener('input', () => renderSearch(firestore, stateController));
        document.getElementById('friendSearchForm').addEventListener('submit', e => e.preventDefault());
        searchBound = true;
    }

    const loading = document.getElementById('friendsLoading');
    loading.classList.toggle('hidden', isFriendsReady());
    const render = () => renderAll(firestore, stateController);
    unsubscribe = addFriendsChangeListener(render);
    render();
    whenFriendsReady().then(() => {
        if (visit !== thisVisit) return;
        loading.classList.add('hidden');
        render();
    });

    // Same approach as the recommend screen: load the swrlers once, filter here.
    getDocs(collection(firestore, Collection.SWRLERS))
        .then(querySnapshot => {
            if (visit !== thisVisit) return;
            allSwrlers = [];
            querySnapshot.forEach(docSnapshot => {
                const swrler = docSnapshot.data();
                const profile = { ...swrler, uid: swrler.uid || docSnapshot.id };
                profiles[profile.uid] = profile;
                allSwrlers.push(profile);
            });
            render();
        })
        .catch(error => {
            console.error('Could not load swrlers to search');
            console.error(error);
            searchLoadFailed = true;
            if (visit === thisVisit) render();
        });
}

function destroyFriends() {
    visit++;
    friendsView.classList.add('hidden');
    if (unsubscribe) unsubscribe();
    unsubscribe = undefined;
    ['friendRequestsList', 'friendsList', 'friendSearchResults', 'friendSentList'].forEach(clear);
}

/**
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 */
function renderAll(firestore, stateController) {
    if (!swrlUser) return;
    renderRequests(firestore, stateController);
    renderFriends(firestore, stateController);
    renderSent(firestore, stateController);
    renderSearch(firestore, stateController);
}

/**
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 */
function renderRequests(firestore, stateController) {
    // an accepted request whose sender is already a friend is just waiting to be deleted
    const requests = getIncomingRequests().filter(request => !isFriend(request.from));
    const list = clear('friendRequestsList');
    document.getElementById('friendRequestsSection').classList.toggle('hidden', requests.length === 0);
    requests.forEach(request => {
        const { row, actions } = makeRow(request.from, firestore, stateController);
        if (request.isAccepted || isAccepting(request.from)) {
            // The accept is completed by a Cloud Function; don't look stuck if it is slow.
            actions.appendChild(label(isAccepting(request.from) ? 'Adding…' : 'Accepted, finishing up…', 'friendLabel'));
        } else {
            actions.appendChild(button('Accept', 'friendButton', () => acceptFriendRequest(request.from, firestore),
                'Could not accept the request'));
            actions.appendChild(button('Decline', 'friendButton friendButtonQuiet', () => declineFriendRequest(request.from, firestore),
                'Could not decline the request'));
        }
        list.appendChild(row);
    });
}

/**
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 */
function renderFriends(firestore, stateController) {
    const list = clear('friendsList');
    const friends = getFriends()
        .map(friend => ({ uid: friend.uid, name: displayName(friend.uid, firestore, stateController) }))
        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    document.getElementById('friendsEmpty').classList.toggle('hidden', friends.length > 0 || !isFriendsReady());
    friends.forEach(friend => {
        const { row, actions } = makeRow(friend.uid, firestore, stateController);
        actions.appendChild(button('Remove', 'friendButton friendButtonQuiet', () => removeFriend(friend.uid, firestore),
            'Could not remove the friend', `Remove ${friend.name} from your friends?`));
        list.appendChild(row);
        showTaste(row, friend.uid, firestore);
    });
}

/**
 * Adds "You both loved 4 things" under a friend's name, once their entries
 * have loaded. Nothing in common yet: nothing is added.
 *
 * @param {HTMLElement} row
 * @param {string} uid
 * @param {import('firebase/firestore').Firestore} firestore
 */
function showTaste(row, uid, firestore) {
    whenListEntriesReady()
        .then(() => friendEntries(uid, firestore))
        .then(theirs => {
            const line = tasteLine(tasteOverlap(getAllListEntries(), theirs));
            if (!line || !row.isConnected) return;
            const taste = document.createElement('span');
            taste.className = 'friendRowTaste';
            taste.textContent = line;
            row.querySelector('.friendRowText').appendChild(taste);
        })
        .catch(error => console.error(error));
}

/**
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 */
function renderSent(firestore, stateController) {
    const requests = getSentRequests().filter(request => !isFriend(request.to));
    const list = clear('friendSentList');
    document.getElementById('friendSentSection').classList.toggle('hidden', requests.length === 0);
    requests.forEach(request => {
        const { row, actions } = makeRow(request.to, firestore, stateController);
        if (request.isAccepted) {
            actions.appendChild(label('Accepted, finishing up…', 'friendLabel'));
        } else {
            actions.appendChild(button('Cancel', 'friendButton friendButtonQuiet', () => cancelFriendRequest(request.to, firestore),
                'Could not cancel the request'));
        }
        list.appendChild(row);
    });
}

/**
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 */
function renderSearch(firestore, stateController) {
    const list = clear('friendSearchResults');
    const hint = document.getElementById('friendSearchHint');
    const text = searchInput.value.trim();
    if (searchLoadFailed) {
        hint.innerText = "Couldn't load people to search. Try again later.";
        return;
    }
    if (text.length < MIN_SEARCH_LENGTH) {
        hint.innerText = `Type at least ${MIN_SEARCH_LENGTH} letters of their name.`;
        return;
    }
    const { matches, total } = findSwrlersByName(allSwrlers, text, swrlUser.uid);
    if (matches.length === 0) {
        hint.innerText = 'Nobody found with that name.';
        return;
    }
    hint.innerText = total > matches.length
        ? `Showing ${MAX_SEARCH_RESULTS} of ${total} people. Type more of the name to narrow it down.`
        : '';
    matches.forEach(swrler => {
        const { row, actions } = makeRow(swrler.uid, firestore, stateController);
        renderFriendControl(actions, swrler.uid, firestore);
        list.appendChild(row);
    });
}

/**
 * A row for one user: photo and name (tap to open their list), plus an empty
 * actions area for the caller.
 *
 * @param {string} uid
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 * @return {{row: HTMLElement, actions: HTMLElement}}
 */
function makeRow(uid, firestore, stateController) {
    /** @type {HTMLElement} */
    // @ts-ignore
    const row = rowTemplate.content.cloneNode(true).querySelector('.friendRow');
    const profile = profiles[uid];
    /** @type {HTMLImageElement} */
    const image = row.querySelector('.friendRowImage');
    if (profile && profile.photoURL) image.src = profile.photoURL;
    image.addEventListener('error', () => { image.src = 'img/emoji_people-24px.svg'; });
    /** @type {HTMLElement} */
    const nameElement = row.querySelector('.friendRowName');
    nameElement.innerText = displayName(uid, firestore, stateController);
    row.querySelector('.friendRowMain').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openSwrler(uid, firestore, stateController);
    });
    return { row, actions: row.querySelector('.friendRowActions') };
}

/**
 * The name to show, from the profiles loaded so far. A missing profile is
 * fetched and the screen rendered again when it arrives.
 *
 * @param {string} uid
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 * @return {string}
 */
function displayName(uid, firestore, stateController) {
    const profile = profiles[uid];
    if (profile) return profile.displayName || 'Mystery Swrler';
    if (!fetching.has(uid)) {
        fetching.add(uid);
        const thisVisit = visit;
        getSwrler(uid, firestore).then(swrler => {
            fetching.delete(uid);
            profiles[uid] = swrler || { uid, displayName: 'Mystery Swrler' };
            if (visit === thisVisit && unsubscribe) renderAll(firestore, stateController);
        });
    }
    return '…';
}

/**
 * Opens a swrler's list, the same way the name links on the full page do.
 *
 * @param {string} uid
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 */
async function openSwrler(uid, firestore, stateController) {
    const swrler = profiles[uid] || await getSwrler(uid, firestore);
    if (!swrler) return;
    const swrlerList = new State(stateController.swrlerLaterView);
    swrlerList.swrler = swrler;
    stateController.changeState(swrlerList);
}

/**
 * @param {string} id
 * @return {HTMLElement} the emptied element
 */
function clear(id) {
    const element = document.getElementById(id);
    while (element.firstChild) element.removeChild(element.firstChild);
    return element;
}
