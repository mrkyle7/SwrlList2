import { getListView } from '../listeners/listEntries';
import { listStateOptions } from '../model/listStates';

/**
 * The row under the tabs on every list of swrls: the Filter button (with how
 * many filters are on) and the Compact / Detailed switch. On a category's
 * Your list it also starts with the Later / Watching / Done switch
 * (showListStates), with how many are in each part; to keep that one row
 * on a phone, Filter and Compact / Detailed then drop their words and keep
 * their icons, and Compact / Detailed shows only the view not on show, as one
 * button that switches to it (.withStates). There is one
 * toolbar; each list moves it to its own top when it shows (mountListToolbar).
 *
 * Compact or detailed is one attribute on the main area (data-list-view),
 * which the stylesheet follows, so flipping the switch redraws nothing.
 */

const toolbar = document.getElementById('listToolbar');
const filterButton = document.getElementById('listFilterButton');
const filterCount = document.getElementById('listFilterCount');
const main = document.getElementById('centre');
const states = document.getElementById('listStates');
/** A pick from the switch had the focus: give it back once the switch is redrawn. */
let refocusStates = false;

/**
 * Wires the buttons up. Call once.
 *
 * @param {() => void} onFilter opens the filter and sort sheet
 * @param {(id: string) => void} onView the user picked a list view, by id
 */
export function bindListToolbar(onFilter, onView) {
    filterButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onFilter();
    });
    toolbar.querySelectorAll('[data-list-view]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            onView(/** @type {HTMLElement} */ (button).dataset.listView);
        });
    });
}

/**
 * Puts the toolbar at the top of a list and shows it.
 *
 * @param {HTMLElement} container the list's scrolling element
 * @param {Element} [after] an element that stays above it (a friend's bar)
 */
export function mountListToolbar(container, after) {
    if (after && after.parentElement === container) {
        after.after(toolbar);
    } else {
        container.prepend(toolbar);
    }
    toolbar.classList.remove('hidden');
    applyListView();
}

/** Takes the toolbar off the screen (the list is going away). */
export function unmountListToolbar() {
    toolbar.classList.add('hidden');
    hideListStates();
}

/**
 * The Later / Watching / Done switch at the start of the toolbar, on Your list.
 *
 * @param {number} categoryID for its words ("Watching", "Booked", ...)
 * @param {import('../model/listStates').ListStateID} current the part on show
 * @param {Record<import('../model/listStates').ListStateID, number>} counts how many in each part
 * @param {(id: import('../model/listStates').ListStateID) => void} onPick
 */
export function showListStates(categoryID, current, counts, onPick) {
    // the list is drawn again on every pick: keep the keyboard on the switch
    const hadFocus = refocusStates;
    refocusStates = false;
    states.replaceChildren(...listStateOptions(categoryID).map(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'listStateOption';
        button.dataset.listState = option.id;
        const count = document.createElement('span');
        count.className = 'listStateCount';
        count.textContent = String(counts[option.id]);
        button.append(option.label, count);
        button.setAttribute('aria-label', `${option.label}, ${counts[option.id]}`);
        button.setAttribute('aria-pressed', String(option.id === current));
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (option.id === current) return;
            refocusStates = document.activeElement === button;
            onPick(option.id);
        });
        return button;
    }));
    states.classList.remove('hidden');
    toolbar.classList.add('withStates');
    if (hadFocus) {
        // next frame: the list is still hidden while it is drawn
        requestAnimationFrame(() => {
            const pressed = /** @type {HTMLElement | null} */ (states.querySelector('[aria-pressed="true"]'));
            if (pressed) pressed.focus();
        });
    }
}

/**
 * New numbers on the switch, in place (my list may still have been loading
 * when it was drawn).
 *
 * @param {Record<import('../model/listStates').ListStateID, number>} counts
 */
export function updateListStateCounts(counts) {
    states.querySelectorAll('.listStateOption').forEach(node => {
        const button = /** @type {HTMLElement} */ (node);
        const id = /** @type {import('../model/listStates').ListStateID} */ (button.dataset.listState);
        const count = button.querySelector('.listStateCount');
        if (count) count.textContent = String(counts[id]);
        button.setAttribute('aria-label', `${button.firstChild.textContent}, ${counts[id]}`);
    });
}

/** Takes the switch away (any list but Your list). */
export function hideListStates() {
    states.classList.add('hidden');
    states.replaceChildren();
    toolbar.classList.remove('withStates');
}

/**
 * Shows how many filters are on.
 *
 * @param {number} count
 */
export function setFilterCount(count) {
    filterCount.textContent = String(count);
    filterCount.classList.toggle('hidden', count === 0);
    filterButton.setAttribute('aria-label',
        count === 0 ? 'Filter and sort' : `Filter and sort, ${count} ${count === 1 ? 'filter' : 'filters'} on`);
}

/** Shows the user's list view: on the switch, and on the lists (through the stylesheet). */
export function applyListView() {
    const id = getListView().id;
    main.dataset.listView = id;
    toolbar.querySelectorAll('[data-list-view]').forEach(button =>
        button.setAttribute('aria-pressed', String(/** @type {HTMLElement} */ (button).dataset.listView === id)));
}
