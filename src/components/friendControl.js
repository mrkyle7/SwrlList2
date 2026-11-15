import { swrlUser } from '../firebase/login';
import { getIncomingRequests, getRelationshipTo, isAccepting } from '../listeners/friends';
import { Relationship } from '../model/friendRequest';
import { showToasterMessage } from './toaster';
import showRequireLoginScreen from './requireLoginScreen';
import sendFriendRequest from '../actions/sendFriendRequest';
import acceptFriendRequest from '../actions/acceptFriendRequest';
import cancelFriendRequest from '../actions/cancelFriendRequest';

/**
 * Fills `container` with the friendship control for another user: "Add
 * friend", "Request sent" with Cancel, "Accept" (they asked me) or "Friends".
 * Nothing is shown for myself, or when nobody is signed in with a real
 * account. It does not update itself: call it again when the friends listener
 * reports a change.
 *
 * @param {HTMLElement} container
 * @param {string} uid the other user
 * @param {import('firebase/firestore').Firestore} firestore
 */
export function renderFriendControl(container, uid, firestore) {
    while (container.firstChild) container.removeChild(container.firstChild);
    const canFriend = swrlUser && !swrlUser.isAnonymous;
    const relationship = getRelationshipTo(uid);
    container.classList.toggle('hidden', !canFriend || relationship === Relationship.SELF);
    if (!canFriend || relationship === Relationship.SELF) return;

    switch (relationship) {
        case Relationship.FRIEND:
            container.appendChild(label('Friends', 'friendLabel friendLabelDone'));
            break;
        case Relationship.REQUEST_SENT:
            container.appendChild(label('Request sent', 'friendLabel'));
            container.appendChild(button('Cancel', 'friendButton friendButtonQuiet', () =>
                cancelFriendRequest(uid, firestore), 'Could not cancel the request'));
            break;
        case Relationship.REQUEST_RECEIVED:
            if (isAcceptedRequest(uid)) {
                container.appendChild(label(isAccepting(uid) ? 'Adding…' : 'Accepted, finishing up…', 'friendLabel'));
            } else {
                container.appendChild(button('Accept', 'friendButton', () =>
                    acceptFriendRequest(uid, firestore), 'Could not accept the request'));
            }
            break;
        default:
            container.appendChild(button('Add friend', 'friendButton', () =>
                sendFriendRequest(uid, firestore).then(() => showToasterMessage('Friend request sent')),
                'Could not send the request'));
    }
}

/**
 * Whether the request from this user is already accepted (the Cloud Function
 * has not made them friends yet), or I am accepting it right now.
 *
 * @param {string} uid
 * @return {boolean}
 */
function isAcceptedRequest(uid) {
    return isAccepting(uid) || getIncomingRequests().some(request => request.from === uid && request.isAccepted);
}

/**
 * @param {string} text
 * @param {string} className
 * @return {HTMLSpanElement}
 */
export function label(text, className) {
    const span = document.createElement('span');
    span.className = className;
    span.innerText = text;
    return span;
}

/**
 * A button that runs an action. It shows "…" and ignores further clicks
 * while the action runs; if it fails the control is put back and the user
 * told. On success the friends listener re-renders it.
 *
 * @param {string} text
 * @param {string} className
 * @param {() => Promise<any>} action
 * @param {string} failureMessage
 * @param {string} [confirmText] asked first; nothing happens unless confirmed
 * @return {HTMLButtonElement}
 */
export function button(text, className, action, failureMessage, confirmText) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = className;
    element.innerText = text;
    element.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!swrlUser || swrlUser.isAnonymous) {
            showRequireLoginScreen('to make friends');
            return;
        }
        if (confirmText && !window.confirm(confirmText)) return;
        element.disabled = true;
        element.innerText = '…';
        action().catch(error => {
            console.error(failureMessage);
            console.error(error);
            showToasterMessage(failureMessage);
            element.disabled = false;
            element.innerText = text;
        });
    });
    return element;
}
