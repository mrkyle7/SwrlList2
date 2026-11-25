import { UIView } from './UIView';
import { StateController } from './stateController';
import { State } from '../model/state';
import { swrlUser } from '../firebase/login';
import { getDefaultVisibility, getHomeLayout, getPageLayout, getQuickAdd, whenListEntriesReady } from '../listeners/listEntries';
import { Visibility, visibilityFromId } from '../constants/Visibility';
import setDefaultVisibility from '../actions/setDefaultVisibility';
import setSwrlPageLayout from '../actions/setSwrlPageLayout';
import { PageLayout, pageLayoutFromId } from '../model/swrlPage';
import setHomeLayout from '../actions/setHomeLayout';
import { HomeLayout, homeLayoutFromId } from '../model/homeLayout';
import setQuickAdd from '../actions/setQuickAdd';
import { QuickAddMode, quickAddFromId } from '../model/quickAdd';
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
/** @type {NodeListOf<HTMLInputElement>} */
const layoutRadios = document.querySelectorAll('input[name="swrlPageLayout"]');
/** @type {NodeListOf<HTMLInputElement>} */
const homeRadios = document.querySelectorAll('input[name="homeLayout"]');
/** @type {NodeListOf<HTMLInputElement>} */
const quickRadios = document.querySelectorAll('input[name="quickAddButton"]');
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
    setLayoutRadios(undefined);
    setHomeRadios(undefined);
    setQuickRadios(undefined);
    quickRadios.forEach(radio => radio.disabled = true);
    radios.forEach(radio => radio.disabled = true);
    layoutRadios.forEach(radio => radio.disabled = true);
    homeRadios.forEach(radio => radio.disabled = true);
    whenListEntriesReady().then(() => {
        if (visit !== thisVisit) return;
        radios.forEach(radio => radio.disabled = false);
        layoutRadios.forEach(radio => radio.disabled = false);
        homeRadios.forEach(radio => radio.disabled = false);
        setRadios(getDefaultVisibility());
        setLayoutRadios(getPageLayout());
        setHomeRadios(getHomeLayout());
        quickRadios.forEach(radio => radio.disabled = false);
        setQuickRadios(getQuickAdd());
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
    layoutRadios.forEach(radio => radio.addEventListener('change', () => {
        if (!radio.checked) return;
        saveLayout(pageLayoutFromId(radio.value), firestore);
    }));
    homeRadios.forEach(radio => radio.addEventListener('change', () => {
        if (!radio.checked) return;
        saveHomeLayout(homeLayoutFromId(radio.value), firestore);
    }));
    quickRadios.forEach(radio => radio.addEventListener('change', () => {
        if (!radio.checked) return;
        saveQuickAdd(quickAddFromId(radio.value), firestore);
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
 * Saves the swrl page layout at once. On failure the radio goes back to what
 * is stored and the user is told.
 *
 * @param {PageLayout} layout
 * @param {import('firebase/firestore').Firestore} firestore
 */
function saveLayout(layout, firestore) {
    const thisVisit = visit;
    layoutRadios.forEach(radio => radio.disabled = true);
    setSwrlPageLayout(layout, firestore)
        .then(() => showToasterMessage(`Swrl pages now use the ${layout.label.toLowerCase()} layout`))
        .catch(error => {
            console.error('Could not change the swrl page layout');
            console.error(error);
            showToasterMessage("Couldn't change how swrl pages look");
        })
        .finally(() => {
            if (visit !== thisVisit) return;
            layoutRadios.forEach(radio => radio.disabled = false);
            setLayoutRadios(getPageLayout());
        });
}

/**
 * Saves the phone home layout at once. On failure the radio goes back to
 * what is stored and the user is told.
 *
 * @param {HomeLayout} layout
 * @param {import('firebase/firestore').Firestore} firestore
 */
function saveHomeLayout(layout, firestore) {
    const thisVisit = visit;
    homeRadios.forEach(radio => radio.disabled = true);
    setHomeLayout(layout, firestore)
        .then(() => showToasterMessage(`Home screen set to ${layout.label.toLowerCase()}`))
        .catch(error => {
            console.error('Could not change the home layout');
            console.error(error);
            showToasterMessage("Couldn't change your home screen");
        })
        .finally(() => {
            if (visit !== thisVisit) return;
            homeRadios.forEach(radio => radio.disabled = false);
            setHomeRadios(getHomeLayout());
        quickRadios.forEach(radio => radio.disabled = false);
        setQuickRadios(getQuickAdd());
        });
}

/**
 * Saves what the search button does. On failure the radio goes back to what
 * is stored and the user is told.
 *
 * @param {QuickAddMode} mode
 * @param {import('firebase/firestore').Firestore} firestore
 */
function saveQuickAdd(mode, firestore) {
    const thisVisit = visit;
    quickRadios.forEach(radio => radio.disabled = true);
    setQuickAdd(mode, firestore)
        .then(() => showToasterMessage(`Search button: ${mode.label.toLowerCase()}`))
        .catch(error => {
            console.error('Could not change the search button');
            console.error(error);
            showToasterMessage("Couldn't change the search button");
        })
        .finally(() => {
            if (visit !== thisVisit) return;
            quickRadios.forEach(radio => radio.disabled = false);
            setQuickRadios(getQuickAdd());
        });
}

/**
 * @param {QuickAddMode | undefined} mode the one to tick; undefined clears them all
 */
function setQuickRadios(mode) {
    quickRadios.forEach(radio => radio.checked = mode !== undefined && radio.value === mode.id);
}

/**
 * @param {HomeLayout | undefined} layout the one to tick; undefined clears them all
 */
function setHomeRadios(layout) {
    homeRadios.forEach(radio => radio.checked = layout !== undefined && radio.value === layout.id);
}

/**
 * @param {PageLayout | undefined} layout the one to tick; undefined clears them all
 */
function setLayoutRadios(layout) {
    layoutRadios.forEach(radio => radio.checked = layout !== undefined && radio.value === layout.id);
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
