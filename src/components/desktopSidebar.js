/**
 * The sidebar on screens at least 1025px wide (www/css/index.css hides it
 * below that, where the menu button and slide-out menu stay).
 *
 * It mirrors the slide-out menu instead of duplicating its logic: which
 * items show (signed in or not), the name and photo, the inbox count and the
 * app version are copied from those elements whenever they change, and its
 * Friends, Saved searches, Settings, About, Log in and Log out items click
 * the menu's own items, which already check who is signed in.
 */

const sidebar = document.getElementById('desktopSidebar');

/** Which menu item each mirrored sidebar item stands for. */
const MIRRORED = {
    saved: 'savedSearchesMenu',
    friends: 'friendsMenu',
    settings: 'settingsMenu',
    about: 'aboutMenu',
    logout: 'logout'
};

/**
 * Wires the sidebar up. Call once.
 *
 * @param {{home: () => void, category: (name: string) => void, inbox: () => void}} go
 */
export function initDesktopSidebar(go) {
    sidebar.querySelectorAll('[data-nav]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const nav = /** @type {HTMLElement} */ (item).dataset.nav;
            if (nav === 'home') {
                go.home();
            } else if (nav === 'swrls') {
                go.inbox();
            } else if (nav === 'login') {
                document.getElementById('login').click();
            } else if (MIRRORED[nav]) {
                document.getElementById(MIRRORED[nav]).click();
            } else {
                go.category(nav);
            }
        });
    });
    const sync = () => syncFromMenu();
    const watch = { attributes: true, attributeFilter: ['class', 'src'], childList: true, characterData: true, subtree: true };
    new MutationObserver(sync).observe(document.getElementById('sidebarMenu'), watch);
    new MutationObserver(sync).observe(document.getElementById('inboxDisplay'), watch);
    new MutationObserver(sync).observe(document.getElementById('login'), watch);
    sync();
}

/** Copies what the slide-out menu shows into the sidebar. */
function syncFromMenu() {
    const signedIn = !document.getElementById('logout').classList.contains('hidden');
    Object.keys(MIRRORED).forEach(nav => {
        const item = sidebar.querySelector(`[data-nav="${nav}"]`);
        if (item) item.classList.toggle('hidden', document.getElementById(MIRRORED[nav]).classList.contains('hidden'));
    });
    sidebar.querySelector('[data-nav="swrls"]').classList.toggle('hidden', !signedIn);
    sidebar.querySelector('[data-nav="login"]').classList.toggle('hidden', signedIn);
    const count = Number(document.getElementById('inboxCount').textContent) || 0;
    const badge = sidebar.querySelector('.sideCount');
    badge.textContent = String(count);
    badge.classList.toggle('hidden', count === 0);
    sidebar.querySelector('.sideName').textContent = document.getElementById('loginStatus').textContent;
    /** @type {HTMLImageElement} */
    const menuPhoto = /** @type {HTMLImageElement} */ (document.getElementById('userPhoto'));
    /** @type {HTMLImageElement} */
    const photo = sidebar.querySelector('.sidePhoto');
    const hasPhoto = !menuPhoto.classList.contains('hidden') && Boolean(menuPhoto.getAttribute('src'));
    if (hasPhoto && photo.src !== menuPhoto.src) photo.src = menuPhoto.src;
    photo.classList.toggle('hidden', !hasPhoto);
    sidebar.querySelector('.sideVersion').textContent = document.getElementById('appVersion').textContent;
}

/**
 * Marks the item for the screen showing.
 *
 * @param {string | undefined} key home, a category's name, swrls, friends, saved or settings
 */
export function setActiveSidebarItem(key) {
    sidebar.querySelectorAll('[data-nav]').forEach(item => {
        const on = /** @type {HTMLElement} */ (item).dataset.nav === key;
        item.classList.toggle('on', on);
        if (on) {
            item.setAttribute('aria-current', 'page');
        } else {
            item.removeAttribute('aria-current');
        }
    });
}
