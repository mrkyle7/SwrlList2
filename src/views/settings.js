import { UIView } from './UIView';
import { StateController } from './stateController';
import { swrlUser } from '../firebase/login';
import { getDefaultVisibility, whenListEntriesReady } from '../listeners/listEntries';
import { Visibility, visibilityFromId } from '../constants/Visibility';
import setDefaultVisibility from '../actions/setDefaultVisibility';
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
        bind(firestore);
        bound = true;
    }
    const signedIn = swrlUser && !swrlUser.isAnonymous;
    document.getElementById('settingsSignedOut').classList.toggle('hidden', !!signedIn);
    document.getElementById('settingsContent').classList.toggle('hidden', !signedIn);
    if (!signedIn) return;

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
}

/**
 * @param {import('firebase/firestore').Firestore} firestore
 */
function bind(firestore) {
    radios.forEach(radio => radio.addEventListener('change', () => {
        if (!radio.checked) return;
        saveDefault(visibilityFromId(radio.value), firestore);
    }));
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
