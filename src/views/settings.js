import { UIView } from './UIView';
import { StateController } from './stateController';
import { State } from '../model/state';
import { swrlUser } from '../firebase/login';
import { getDefaultVisibility, whenListEntriesReady } from '../listeners/listEntries';
import { Visibility, visibilityFromId } from '../constants/Visibility';
import setDefaultVisibility from '../actions/setDefaultVisibility';
import deleteAccount from '../actions/deleteAccount';
import { showToasterMessage } from '../components/toaster';

export class Settings extends UIView {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.settingsScreen);
    }

    show() {
        showSettings(this.firestore, this.stateController);
    }

    destroy() {
        destroySettings();
    }
}

const settingsView = document.getElementById('settingsView');
/** @type {NodeListOf<HTMLInputElement>} */
const radios = document.querySelectorAll('input[name="defaultVisibility"]');
/** @type {HTMLButtonElement} */
// @ts-ignore
const deleteStart = document.getElementById('deleteAccountStart');
/** @type {HTMLButtonElement} */
// @ts-ignore
const deleteConfirmButton = document.getElementById('deleteAccountConfirmButton');
/** @type {HTMLButtonElement} */
// @ts-ignore
const deleteCancel = document.getElementById('deleteAccountCancel');
const deleteConfirm = document.getElementById('deleteAccountConfirm');

let bound = false;
/** Bumped on every show/destroy so a late answer for an old visit is dropped. */
let visit = 0;

/**
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 */
function showSettings(firestore, stateController) {
    settingsView.classList.remove('hidden');
    const thisVisit = ++visit;
    if (!bound) {
        bind(firestore, stateController);
        bound = true;
    }
    const signedIn = swrlUser && !swrlUser.isAnonymous;
    document.getElementById('settingsSignedOut').classList.toggle('hidden', !!signedIn);
    document.getElementById('settingsContent').classList.toggle('hidden', !signedIn);
    if (!signedIn) return;

    hideConfirmation();
    // the default is read with my entries; wait so the radio is not shown wrongly
    setRadios(undefined);
    radios.forEach(radio => radio.disabled = true);
    whenListEntriesReady().then(() => {
        if (visit !== thisVisit) return;
        radios.forEach(radio => radio.disabled = false);
        setRadios(getDefaultVisibility());
    });
}

function destroySettings() {
    visit++;
    settingsView.classList.add('hidden');
    hideConfirmation();
}

/**
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 */
function bind(firestore, stateController) {
    radios.forEach(radio => radio.addEventListener('change', () => {
        if (!radio.checked) return;
        saveDefault(visibilityFromId(radio.value), firestore);
    }));
    deleteStart.addEventListener('click', () => {
        deleteConfirm.classList.remove('hidden');
        deleteStart.classList.add('hidden');
    });
    deleteCancel.addEventListener('click', hideConfirmation);
    deleteConfirmButton.addEventListener('click', () => removeAccount(firestore, stateController));
}

/**
 * Saves a new default at once. On failure the radio goes back to what is
 * stored and the user is told.
 *
 * @param {Visibility} visibility
 * @param {import('firebase/firestore').Firestore} firestore
 */
function saveDefault(visibility, firestore) {
    const thisVisit = visit;
    radios.forEach(radio => radio.disabled = true);
    setDefaultVisibility(visibility, firestore)
        .then(() => showToasterMessage(`Your swrls are now visible to: ${visibility.label}`))
        .catch(error => {
            console.error('Could not change the default visibility');
            console.error(error);
            showToasterMessage("Couldn't change who can see your swrls");
        })
        .finally(() => {
            if (visit !== thisVisit) return;
            radios.forEach(radio => radio.disabled = false);
            // the in-memory default only changes when everything was written
            setRadios(getDefaultVisibility());
        });
}

/**
 * @param {Visibility | undefined} visibility the one to tick; undefined clears them all
 */
function setRadios(visibility) {
    radios.forEach(radio => radio.checked = visibility !== undefined && radio.value === visibility.id);
}

function hideConfirmation() {
    deleteConfirm.classList.add('hidden');
    deleteStart.classList.remove('hidden');
    deleteStart.disabled = false;
    deleteConfirmButton.disabled = false;
    deleteCancel.disabled = false;
}

/**
 * The second step of "Delete my account": the user has confirmed.
 *
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 */
async function removeAccount(firestore, stateController) {
    deleteConfirmButton.disabled = true;
    deleteCancel.disabled = true;
    try {
        const deleted = await deleteAccount(firestore);
        if (deleted) {
            // back to the home screen with nothing of the old account to go back to
            stateController.changeState(new State(stateController.homeView));
            stateController.previousStates.length = 0;
            showToasterMessage('Your account was deleted');
        } else {
            hideConfirmation();
            showToasterMessage('Your account was not deleted');
        }
    } catch (error) {
        console.error('Could not delete the account');
        console.error(error);
        hideConfirmation();
        showToasterMessage("Couldn't delete your account. Please try again.");
    }
}
