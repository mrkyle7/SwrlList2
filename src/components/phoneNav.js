/**
 * The bar at the bottom of phones and tablets with the cards home layout:
 * Home, Search everything and the four categories, the phone's version of
 * the desktop sidebar.
 * The stylesheet shows it only under 1025px, with `data-home-layout="cards"`,
 * on the home screen and the category lists.
 */

const nav = document.getElementById('phoneNav');

/**
 * Wires the bar up. Call once.
 *
 * @param {{home: () => void, search: () => void, category: (name: string) => void}} go
 */
export function initPhoneNav(go) {
    nav.querySelectorAll('[data-nav]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const key = /** @type {HTMLElement} */ (item).dataset.nav;
            if (key === 'home') {
                go.home();
            } else if (key === 'search') {
                go.search();
            } else {
                go.category(key);
            }
        });
    });
}

/**
 * Marks the item for the screen showing.
 *
 * @param {string | undefined} key home, search or a category's name
 */
export function setActivePhoneNavItem(key) {
    nav.querySelectorAll('[data-nav]').forEach(item => {
        const on = /** @type {HTMLElement} */ (item).dataset.nav === key;
        item.classList.toggle('on', on);
        if (on) {
            item.setAttribute('aria-current', 'page');
        } else {
            item.removeAttribute('aria-current');
        }
    });
}
