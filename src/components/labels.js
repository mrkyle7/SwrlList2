import { swrlUser } from '../firebase/login';
import { Swrl } from '../model/swrl';
import { MAX_LABEL_LENGTH, MAX_LABELS_PER_SWRL, addLabel, cleanLabel, hasLabel, removeLabel } from '../model/labels';
import { addLabelsChangeListener, getAllMyLabels, getLabelsFor } from '../listeners/labels';
import setSwrlLabels from '../actions/setSwrlLabels';
import { showToasterMessage } from './toaster';

const container = document.getElementById('swrlFullPageLabels');
/** @type {HTMLTemplateElement} */
// @ts-ignore
const cardTemplate = document.getElementById('labelsCard');
/** @type {HTMLTemplateElement} */
// @ts-ignore
const chipTemplate = document.getElementById('labelChip');

/** @type {() => void} */
let stopListening;

/**
 * Shows the signed-in user's private labels on a Swrl, which they can add to
 * and remove. Nothing is shown to anonymous users.
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 */
export function showLabels(swrl, firestore) {
    hideLabels();
    if (!swrlUser || swrlUser.isAnonymous) {
        return;
    }
    /** @type {HTMLElement} */
    // @ts-ignore
    const card = cardTemplate.content.cloneNode(true);
    /** @type {HTMLElement} */
    const chips = card.querySelector('.labelChips');
    /** @type {HTMLInputElement} */
    const input = card.querySelector('.labelInput');
    /** @type {HTMLFormElement} */
    const form = card.querySelector('.labelForm');
    const suggestions = card.querySelector('datalist');
    input.maxLength = MAX_LABEL_LENGTH;

    /** @param {string[]} labels */
    const save = (labels) => setSwrlLabels(swrl.swrlID, labels, firestore)
        .catch(err => {
            console.error('Could not save labels');
            console.error(err);
            showToasterMessage('Could not save your labels');
        });

    const render = () => {
        const labels = getLabelsFor(swrl.swrlID);
        while (chips.firstChild) chips.removeChild(chips.firstChild);
        labels.forEach(label => {
            /** @type {HTMLElement} */
            // @ts-ignore
            const chip = chipTemplate.content.cloneNode(true);
            // textContent, never innerHTML: this is whatever the user typed.
            chip.querySelector('.labelChipText').textContent = label;
            const remove = chip.querySelector('.labelChipRemove');
            remove.setAttribute('aria-label', `Remove label ${label}`);
            remove.addEventListener('click', () => save(removeLabel(getLabelsFor(swrl.swrlID), label)));
            chips.appendChild(chip);
        });
        chips.classList.toggle('hidden', labels.length === 0);
        while (suggestions.firstChild) suggestions.removeChild(suggestions.firstChild);
        getAllMyLabels().filter(label => !hasLabel(labels, label)).forEach(label => {
            const option = document.createElement('option');
            option.value = label;
            suggestions.appendChild(option);
        });
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const label = cleanLabel(input.value);
        if (!label) {
            return;
        }
        const current = getLabelsFor(swrl.swrlID);
        const next = addLabel(current, label);
        input.value = '';
        if (next) {
            save(next);
        } else if (!hasLabel(current, label)) {
            showToasterMessage(`A swrl can have ${MAX_LABELS_PER_SWRL} labels at most`);
        }
    });

    container.appendChild(card);
    render();
    stopListening = addLabelsChangeListener(render);
}

export function hideLabels() {
    if (stopListening) {
        stopListening();
        stopListening = undefined;
    }
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
}
