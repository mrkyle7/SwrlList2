/**
 * Keyboard access for things that are not real buttons or links: the tabs
 * (divs holding an <a> with no href), cards that open a page, and the "Skip
 * to content" link. Tab reaches them, Enter or Space uses them.
 */

/**
 * Makes an element reachable with Tab and usable with Enter (and Space), by
 * clicking it. Keys pressed on a button inside it are left to that button.
 *
 * @param {HTMLElement} element
 * @param {string} [role]
 */
export function makeKeyboardClickable(element, role) {
    element.tabIndex = 0;
    if (role) element.setAttribute('role', role);
    element.addEventListener('keydown', (e) => {
        if (e.target !== element) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            element.click();
        }
    });
}

/** Tabs: each `.tabs > div` becomes a tab you can reach and choose with the keyboard. */
function setUpTabs() {
    document.querySelectorAll('.tabs').forEach(tabs => {
        tabs.setAttribute('role', 'tablist');
        tabs.querySelectorAll(':scope > div').forEach(tab => {
            const div = /** @type {HTMLElement} */ (tab);
            makeKeyboardClickable(div, 'tab');
            const sync = () => div.setAttribute('aria-selected', String(div.classList.contains('selected')));
            sync();
            new MutationObserver(sync).observe(div, { attributes: true, attributeFilter: ['class'] });
        });
    });
}

/** "Skip to content": the first thing Tab reaches, before the sidebar or the header. */
function setUpSkipLink() {
    const link = document.getElementById('skipLink');
    const main = document.getElementById('centre');
    if (!link || !main) return;
    main.tabIndex = -1;
    link.addEventListener('click', (e) => {
        e.preventDefault();
        main.focus();
    });
}

export function setUpKeyboardAccess() {
    setUpTabs();
    setUpSkipLink();
}
