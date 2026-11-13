import { swrlUser } from '../firebase/login';
import { Swrl } from '../model/swrl';
import { MAX_PRIVATE_COMMENT_LENGTH, PrivateComment } from '../model/privateComment';
import { listenToPrivateComments } from '../listeners/privateComments';
import addPrivateComment from '../actions/addPrivateComment';
import deletePrivateComment from '../actions/deletePrivateComment';
import editPrivateComment from '../actions/editPrivateComment';
import { showToasterMessage } from './toaster';

const container = document.getElementById('swrlFullPagePrivateComments');
/** @type {HTMLTemplateElement} */
// @ts-ignore
const cardTemplate = document.getElementById('privateCommentsCard');
/** @type {HTMLTemplateElement} */
// @ts-ignore
const commentTemplate = document.getElementById('privateComment');

/** @type {() => void} */
let stopListening;
/** The comment being edited, and what has been typed so far.
 * @type {{id: string, draft: string} | undefined} */
let editing;

/**
 * Shows the signed-in user's private comments about a Swrl, which they can
 * add to, edit and delete. Nothing is shown to anonymous users.
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 */
export function showPrivateComments(swrl, firestore) {
    hidePrivateComments();
    if (!swrlUser || swrlUser.isAnonymous) {
        return;
    }
    /** @type {HTMLElement} */
    // @ts-ignore
    const card = cardTemplate.content.cloneNode(true);
    const list = card.querySelector('.privateCommentList');
    /** @type {HTMLTextAreaElement} */
    const input = card.querySelector('.privateCommentInput');
    /** @type {HTMLFormElement} */
    const form = card.querySelector('.privateCommentForm');
    const status = card.querySelector('.privateCommentStatus');
    input.maxLength = MAX_PRIVATE_COMMENT_LENGTH;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = PrivateComment.clean(input.value);
        input.value = '';
        if (!text) {
            return;
        }
        addPrivateComment(swrl, text, firestore)
            .catch(err => {
                console.error('Could not save private comment');
                console.error(err);
                // Give the words back rather than lose them.
                if (!input.value) {
                    input.value = text;
                }
                showToasterMessage('Could not save your comment');
            });
    });

    container.appendChild(card);

    stopListening = listenToPrivateComments(swrl.swrlID, firestore,
        comments => {
            status.classList.add('hidden');
            while (list.firstChild) {
                list.removeChild(list.firstChild);
            }
            comments.forEach(comment => list.appendChild(renderComment(swrl, comment, firestore)));
        },
        err => {
            console.error('Could not load private comments');
            console.error(err);
            status.textContent = 'Could not load your comments.';
            status.classList.remove('hidden');
        });
}

export function hidePrivateComments() {
    if (stopListening) {
        stopListening();
        stopListening = undefined;
    }
    editing = undefined;
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
}

/**
 * @param {Swrl} swrl
 * @param {PrivateComment} comment
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Node}
 */
function renderComment(swrl, comment, firestore) {
    /** @type {HTMLElement} */
    // @ts-ignore
    const fragment = commentTemplate.content.cloneNode(true);
    /** @type {HTMLElement} */
    const text = fragment.querySelector('.privateCommentText');
    /** @type {HTMLFormElement} */
    const editForm = fragment.querySelector('.privateCommentEditForm');
    /** @type {HTMLTextAreaElement} */
    const editInput = fragment.querySelector('.privateCommentEditInput');
    /** @type {HTMLElement} */
    const actions = fragment.querySelector('.privateCommentActions');
    editInput.maxLength = MAX_PRIVATE_COMMENT_LENGTH;

    // textContent, never innerHTML: this is whatever the user typed.
    text.textContent = comment.text;
    fragment.querySelector('.privateCommentDate').textContent = comment.created
        ? comment.created.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
        : '';

    const startEditing = () => {
        text.classList.add('hidden');
        actions.classList.add('hidden');
        editForm.classList.remove('hidden');
    };
    const stopEditing = () => {
        editing = undefined;
        editForm.classList.add('hidden');
        text.classList.remove('hidden');
        actions.classList.remove('hidden');
    };

    // The list is redrawn whenever the comments change (in this tab or
    // another), so an edit in progress is carried over the redraw.
    if (editing && editing.id === comment.id) {
        editInput.value = editing.draft;
        startEditing();
    }
    editInput.addEventListener('input', () => {
        if (editing) {
            editing.draft = editInput.value;
        }
    });

    fragment.querySelector('.privateCommentEdit').addEventListener('click', () => {
        editing = { id: comment.id, draft: comment.text };
        editInput.value = comment.text;
        startEditing();
        editInput.focus();
    });
    fragment.querySelector('.privateCommentCancel').addEventListener('click', stopEditing);
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newText = PrivateComment.clean(editInput.value);
        if (!newText) {
            // Emptying a comment is not a delete; leave the box open.
            editInput.focus();
            return;
        }
        stopEditing();
        if (newText === comment.text) {
            return;
        }
        text.textContent = newText;
        editPrivateComment(swrl, comment.id, newText, firestore)
            .catch(err => {
                console.error('Could not save private comment');
                console.error(err);
                text.textContent = comment.text;
                showToasterMessage('Could not save your comment');
            });
    });

    fragment.querySelector('.privateCommentDelete').addEventListener('click', () => {
        deletePrivateComment(swrl, comment.id, firestore)
            .catch(err => {
                console.error('Could not delete private comment');
                console.error(err);
                showToasterMessage('Could not delete your comment');
            });
    });
    return fragment;
}
