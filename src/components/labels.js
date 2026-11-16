import { swrlUser } from '../firebase/login';
import { Swrl } from '../model/swrl';
import {
    MAX_LABEL_LENGTH, MAX_LABELS_PER_SWRL, addLabel, cleanLabel, hasLabel, labelSuggestions, removeLabel
} from '../model/labels';
import { addLabelsChangeListener, getAllMyLabels, getLabelsFor } from '../listeners/labels';
import setSwrlLabels from '../actions/setSwrlLabels';
import { showToasterMessage } from './toaster';

const container = document.getElementById('swrlFullPageLabels');
/** @type {HTMLTemplateElement} */
// @ts-ignore
const rowTemplate = document.getElementById('labelsRow');
/** @type {HTMLTemplateElement} */
// @ts-ignore
const chipTemplate = document.getElementById('labelChip');

/** Undoes everything showLabels set up.
 * @type {(() => void) | undefined} */
let tearDown;

/**
 * Shows the signed-in user's private labels on a Swrl as a row of lozenges
 * under the action buttons. The "+" lozenge opens an inline editor: a text
 * field with the user's other labels listed beneath it, narrowed as they
 * type; adding a label closes the editor. Nothing is shown to anonymous users.
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
    const fragment = rowTemplate.content.cloneNode(true);
    /** @type {HTMLElement} */
    const root = fragment.querySelector('.labels');
    /** @type {HTMLElement} */
    const chips = root.querySelector('.labelChips');
    /** @type {HTMLButtonElement} */
    const addButton = root.querySelector('.labelAddButton');
    /** @type {HTMLFormElement} */
    const editor = root.querySelector('.labelEditor');
    /** @type {HTMLInputElement} */
    const input = root.querySelector('.labelInput');
    /** @type {HTMLElement} */
    const options = root.querySelector('.labelOptions');
    input.maxLength = MAX_LABEL_LENGTH;

    /** What the option list currently offers, in order.
     * @type {string[]} */
    let offered = [];
    /** Index into `offered` of the highlighted option. */
    let active = 0;

    /** @param {string[]} labels */
    const save = (labels) => setSwrlLabels(swrl.swrlID, labels, firestore)
        .catch(err => {
            console.error('Could not save labels');
            console.error(err);
            showToasterMessage('Could not save your labels');
        });

    /** @param {string} label */
    const add = (label) => {
        const current = getLabelsFor(swrl.swrlID);
        const next = addLabel(current, label);
        input.value = '';
        if (next) {
            save(next);
        } else if (!hasLabel(current, label)) {
            showToasterMessage(`A swrl can have ${MAX_LABELS_PER_SWRL} labels at most`);
        }
        // One label at a time: put the editor away, leaving the "+" focused
        // so another can be added straight away.
        close();
        addButton.focus();
    };

    const renderChips = () => {
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
        // With labels the button is just a "+"; alone it says what it is for.
        root.classList.toggle('hasLabels', labels.length > 0);
    };

    const renderOptions = () => {
        const { existing, create } = labelSuggestions(getAllMyLabels(), getLabelsFor(swrl.swrlID), input.value);
        offered = create ? [create, ...existing] : existing;
        active = Math.min(active, Math.max(offered.length - 1, 0));
        while (options.firstChild) options.removeChild(options.firstChild);
        offered.forEach((label, i) => {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'labelOption';
            option.id = 'labelOption' + i;
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', String(i === active));
            if (create && i === 0) {
                option.classList.add('labelOptionCreate');
                const verb = document.createElement('span');
                verb.className = 'labelOptionVerb';
                verb.textContent = 'Create';
                option.appendChild(verb);
            }
            const text = document.createElement('span');
            text.className = 'labelOptionText';
            text.textContent = label;
            option.appendChild(text);
            // mousedown would take focus from the input and close the editor
            option.addEventListener('mousedown', e => e.preventDefault());
            option.addEventListener('click', () => add(label));
            options.appendChild(option);
        });
        if (offered.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'labelOptionsEmpty';
            empty.textContent = input.value.trim() === ''
                ? 'Type a name and press Enter to make your first label.'
                : cleanLabel(input.value) ? 'Already on this swrl.' : `Labels can be ${MAX_LABEL_LENGTH} characters at most.`;
            options.appendChild(empty);
        }
        if (offered.length > 0) {
            input.setAttribute('aria-activedescendant', 'labelOption' + active);
        } else {
            input.removeAttribute('aria-activedescendant');
        }
    };

    const open = () => {
        root.classList.add('editing');
        editor.classList.remove('hidden');
        addButton.setAttribute('aria-expanded', 'true');
        active = 0;
        renderOptions();
        input.focus();
    };
    const close = () => {
        root.classList.remove('editing');
        editor.classList.add('hidden');
        addButton.setAttribute('aria-expanded', 'false');
        input.value = '';
    };

    addButton.addEventListener('click', open);
    root.querySelector('.labelEditorClose').addEventListener('click', () => {
        close();
        addButton.focus();
    });
    input.addEventListener('input', () => {
        active = 0;
        renderOptions();
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (offered.length > 0) {
                active = (active + (e.key === 'ArrowDown' ? 1 : offered.length - 1)) % offered.length;
                renderOptions();
                const element = options.querySelector('[aria-selected="true"]');
                if (element) element.scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
            addButton.focus();
        }
    });
    editor.addEventListener('submit', (e) => {
        e.preventDefault();
        if (offered.length > 0) {
            add(offered[active]);
        }
    });
    // A tap anywhere else puts the editor away.
    const onOutside = (/** @type {Event} */ e) => {
        // @ts-ignore
        if (root.classList.contains('editing') && !root.contains(e.target)) close();
    };
    document.addEventListener('pointerdown', onOutside);

    container.appendChild(fragment);
    renderChips();
    const stopListening = addLabelsChangeListener(() => {
        renderChips();
        if (root.classList.contains('editing')) renderOptions();
    });
    tearDown = () => {
        stopListening();
        document.removeEventListener('pointerdown', onOutside);
    };
}

export function hideLabels() {
    if (tearDown) {
        tearDown();
        tearDown = undefined;
    }
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
}
