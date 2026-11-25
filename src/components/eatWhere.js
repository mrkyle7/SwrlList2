/**
 * Where Eat searches: near me (the browser's location, asked for when "Near
 * me" is tapped), or in a town or city (London unless changed). The choice
 * and the town are remembered on this device; the location itself is only
 * kept in memory, and the server rounds it to about a kilometre.
 *
 * The control (#eatWhere in www/index.html) shows above the results on the
 * Eat search (Search everything does not search places to eat).
 */

const STORE_KEY = 'swrlEatWhere';
export const DEFAULT_TOWN = 'London';

/** @typedef {{mode: 'town' | 'near', town: string}} EatWhere */

/** @type {{lat: number, lon: number} | undefined} this visit's location, once known */
let position;

/** @return {EatWhere} */
export function getEatWhere() {
    try {
        const saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || '{}');
        return {
            mode: saved.mode === 'near' ? 'near' : 'town',
            town: typeof saved.town === 'string' && saved.town.trim() ? saved.town.trim() : DEFAULT_TOWN
        };
    } catch (error) {
        return { mode: 'town', town: DEFAULT_TOWN };
    }
}

/** @param {EatWhere} where */
function saveEatWhere(where) {
    try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(where));
    } catch (error) {
        // remembering is only a convenience
    }
}

/**
 * Asks the browser where we are (it asks the person the first time).
 *
 * @return {Promise<{lat: number, lon: number}>}
 */
function locate() {
    if (position) return Promise.resolve(position);
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('No location on this device'));
            return;
        }
        navigator.geolocation.getCurrentPosition(found => {
            position = { lat: found.coords.latitude, lon: found.coords.longitude };
            resolve(position);
        }, reject, { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 10000 });
    });
}

/**
 * What to send with a search: `near` ("51.51,-0.13") or `place` (a town),
 * and the point to sort by distance from. Near me falls back to the town
 * when the location cannot be had.
 *
 * @return {Promise<{params: {near?: string, place?: string}, near?: {lat: number, lon: number}, label: string}>}
 */
export async function eatSearchScope() {
    const where = getEatWhere();
    if (where.mode === 'near') {
        try {
            const here = await locate();
            return { params: { near: `${here.lat.toFixed(4)},${here.lon.toFixed(4)}` }, near: here, label: 'near you' };
        } catch (error) {
            // no location: search the town instead
        }
    }
    return { params: { place: where.town }, label: `in ${where.town}` };
}

/**
 * Wires the control up. Call once; `changed` re-runs the search.
 *
 * @param {() => void} changed
 */
export function initEatWhere(changed) {
    const control = document.getElementById('eatWhere');
    const nearButton = /** @type {HTMLButtonElement} */ (document.getElementById('eatNearMe'));
    const townButton = /** @type {HTMLButtonElement} */ (document.getElementById('eatInTown'));
    const townInput = /** @type {HTMLInputElement} */ (document.getElementById('eatTown'));
    const note = document.getElementById('eatWhereNote');

    const show = () => {
        const where = getEatWhere();
        nearButton.setAttribute('aria-pressed', String(where.mode === 'near'));
        townButton.setAttribute('aria-pressed', String(where.mode === 'town'));
        if (document.activeElement !== townInput) townInput.value = where.town;
    };

    nearButton.addEventListener('click', () => {
        note.textContent = '';
        // ask for the location inside the tap, so the browser shows its question
        locate().then(() => {
            saveEatWhere({ ...getEatWhere(), mode: 'near' });
            show();
            changed();
        }).catch(() => {
            note.textContent = "Couldn't get your location. Searching in your town instead.";
            saveEatWhere({ ...getEatWhere(), mode: 'town' });
            show();
        });
    });
    townButton.addEventListener('click', () => {
        saveEatWhere({ ...getEatWhere(), mode: 'town' });
        note.textContent = '';
        show();
        changed();
        townInput.focus();
    });
    const useTown = () => {
        const town = townInput.value.trim() || DEFAULT_TOWN;
        const before = getEatWhere();
        saveEatWhere({ mode: 'town', town });
        note.textContent = '';
        show();
        if (before.mode !== 'town' || before.town !== town) changed();
    };
    townInput.addEventListener('change', useTown);
    townInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            townInput.blur();
            useTown();
        }
    });
    control.addEventListener('focusin', show);
    show();
}

/**
 * Shows or hides the control (only on the Eat search).
 *
 * @param {boolean} visible
 */
export function showEatWhere(visible) {
    document.getElementById('eatWhere').classList.toggle('hidden', !visible);
}
