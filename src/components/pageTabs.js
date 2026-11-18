/**
 * The tab bar of the tab layout. It only draws the tabs and reports a choice;
 * the page decides which section each tab shows (see views/swrlFullPage.js).
 */

/**
 * Draws the tabs, replacing any already there.
 *
 * @param {HTMLElement} bar the element with role="tablist"
 * @param {{id: string, label: string}[]} tabs
 * @param {string} active the id of the open tab
 * @param {Object<string, number>} badges a count to show on a tab, by id; zero or missing shows none
 * @param {(id: string) => void} onSelect
 */
export function drawTabs(bar, tabs, active, badges, onSelect) {
    bar.replaceChildren();
    tabs.forEach(tab => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pageTab';
        button.id = `pageTab-${tab.id}`;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', `pageSection-${tab.id}`);
        button.dataset.tab = tab.id;
        button.appendChild(document.createTextNode(tab.label));
        const count = badges[tab.id];
        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'pageTabBadge';
            badge.textContent = String(count);
            badge.setAttribute('aria-label', `${count} to see`);
            button.appendChild(badge);
        }
        button.addEventListener('click', () => onSelect(tab.id));
        button.addEventListener('keydown', event => {
            const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
            if (step === 0) return;
            event.preventDefault();
            const index = tabs.findIndex(t => t.id === tab.id);
            const next = tabs[(index + step + tabs.length) % tabs.length];
            onSelect(next.id);
            /** @type {HTMLElement | null} */
            const nextButton = bar.querySelector(`[data-tab="${next.id}"]`);
            if (nextButton) nextButton.focus();
        });
        bar.appendChild(button);
    });
    markActiveTab(bar, active);
}

/**
 * Marks one tab as the open one.
 *
 * @param {HTMLElement} bar
 * @param {string} active
 */
export function markActiveTab(bar, active) {
    bar.querySelectorAll('[role="tab"]').forEach(button => {
        const on = button instanceof HTMLElement && button.dataset.tab === active;
        button.setAttribute('aria-selected', String(on));
        button.setAttribute('tabindex', on ? '0' : '-1');
    });
}
