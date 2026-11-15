import { swrlUser } from '../firebase/login';
import { Swrl } from '../model/swrl';
import { visibilities, visibilityFromId } from '../constants/Visibility';
import {
    addListEntriesChangeListener, getDefaultVisibility, getListEntry, whenListEntriesReady
} from '../listeners/listEntries';
import setSwrlVisibility from '../actions/setSwrlVisibility';
import { USE_DEFAULT, currentChoice, defaultOptionLabel } from '../model/visibilitySettings';
import { showToasterMessage } from './toaster';

const container = document.getElementById('swrlFullPageVisibility');
/** @type {HTMLSelectElement} */
// @ts-ignore
const select = document.getElementById('swrlVisibilitySelect');

/** @type {(() => void) | undefined} */
let stopListening;
/** Changes on every show/hide so a late answer is not applied to another swrl's page. */
let visit = 0;

/**
 * The "Visible to" control on the swrl's full page: how I share my own entry
 * for this swrl (my default, or private / friends / public for this swrl
 * only). It is only shown while the swrl is on one of my lists (later, done
 * or loved), and follows my entry live, so it appears when I add the swrl
 * and goes when I remove it. Not shown to anonymous users.
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 */
export function showSwrlVisibility(swrl, firestore) {
    hideSwrlVisibility();
    if (!swrlUser || swrlUser.isAnonymous) return;
    const thisVisit = ++visit;
    select.onchange = () => {
        const value = select.value;
        const choice = value === USE_DEFAULT ? USE_DEFAULT : visibilityFromId(value);
        select.disabled = true;
        setSwrlVisibility(swrl.swrlID, choice, firestore)
            .then(() => showToasterMessage('Visibility saved'))
            .catch(error => {
                console.error('Could not change the visibility of this swrl');
                console.error(error);
                showToasterMessage("Couldn't change who can see this swrl");
            })
            .finally(() => {
                if (visit !== thisVisit) return;
                select.disabled = false;
                update(swrl);
            });
    };
    stopListening = addListEntriesChangeListener(() => {
        if (visit === thisVisit && !select.disabled) update(swrl);
    });
    whenListEntriesReady().then(() => {
        if (visit === thisVisit) update(swrl);
    });
}

/** Hides the control and stops following my entry. */
export function hideSwrlVisibility() {
    visit++;
    if (stopListening) stopListening();
    stopListening = undefined;
    select.onchange = null;
    select.disabled = false;
    container.classList.add('hidden');
}

/**
 * Shows or hides the control and sets it from my entry.
 *
 * @param {Swrl} swrl
 */
function update(swrl) {
    const entry = getListEntry(swrl.swrlID);
    const onAList = entry !== undefined && (entry.later || entry.done || entry.loved);
    container.classList.toggle('hidden', !onAList);
    if (!onAList) return;
    // rebuilt each time: the first option's label follows my current default
    while (select.firstChild) select.removeChild(select.firstChild);
    select.appendChild(option(USE_DEFAULT, defaultOptionLabel(getDefaultVisibility())));
    visibilities.forEach(visibility => select.appendChild(option(visibility.id, visibility.label)));
    const choice = currentChoice(entry);
    select.value = choice === USE_DEFAULT ? USE_DEFAULT : choice.id;
}

/**
 * @param {string} value
 * @param {string} text
 * @return {HTMLOptionElement}
 */
function option(value, text) {
    const element = document.createElement('option');
    element.value = value;
    element.textContent = text;
    return element;
}
