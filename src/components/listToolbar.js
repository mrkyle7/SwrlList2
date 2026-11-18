import { getListView } from '../listeners/listEntries';

/**
 * The row under the tabs on every list of swrls: the Filter button (with how
 * many filters are on) and the Compact / Detailed switch. There is one
 * toolbar; each list moves it to its own top when it shows (mountListToolbar).
 *
 * Compact or detailed is one attribute on the main area (data-list-view),
 * which the stylesheet follows, so flipping the switch redraws nothing.
 */

const toolbar = document.getElementById('listToolbar');
const filterButton = document.getElementById('listFilterButton');
const filterCount = document.getElementById('listFilterCount');
const main = document.getElementById('centre');

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
