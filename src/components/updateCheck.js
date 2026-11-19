import { shouldReload, shortVersion } from '../model/update';
import { showToasterMessage } from './toaster';

/**
 * Keeps an open or installed app on the live build. It asks the server which
 * build is live (dist/version.json, never cached) shortly after starting,
 * whenever the app comes back into view, and every 15 minutes while open.
 * When a newer one is live it reloads, but never while someone is typing or
 * has a sheet open: then it waits for the next quiet moment.
 */

const CHECK_EVERY_MS = 15 * 60 * 1000;
const FIRST_CHECK_MS = 10 * 1000;
const TRIED_KEY = 'swrlReloadedFor';

/** @type {string | undefined} a newer build is live and waiting for a quiet moment */
let pending;

/** @return {string | null} */
function triedFor() {
    try { return sessionStorage.getItem(TRIED_KEY); } catch { return null; }
}

/**
 * Typing, or a sheet or dialog open: a reload now would lose something.
 *
 * @return {boolean}
 */
function busy() {
    const typed = [...document.querySelectorAll('input[type="text"], input[type="search"], input:not([type]), textarea')]
        .some(field => {
            const input = /** @type {HTMLInputElement} */ (field);
            return input.value.trim() !== '' && input.offsetParent !== null;
        });
    const open = document.querySelector('#filters:not(.hidden), .bottomSheet:not(.hidden), #fade:not(.hidden)');
    return typed || open !== null;
}

/** @param {string} live */
function reloadTo(live) {
    try { sessionStorage.setItem(TRIED_KEY, live); } catch { /* reload anyway */ }
    showToasterMessage('Updating Swrl List to ' + shortVersion(live));
    const reload = () => window.location.reload();
    const worker = navigator.serviceWorker;
    setTimeout(() => {
        if (worker && worker.getRegistration) {
            worker.getRegistration().then(registration => registration ? registration.update() : undefined)
                .catch(() => undefined).finally(reload);
        } else {
            reload();
        }
    }, 1200);
}

/** Reloads now if there is a newer build waiting and nothing would be lost. */
function reloadIfQuiet() {
    if (pending && document.visibilityState === 'visible' && !busy()) reloadTo(pending);
}

async function check() {
    if (!navigator.onLine) return;
    try {
        const response = await fetch('/version.json', { cache: 'no-store' });
        if (!response.ok) return;
        const { version } = await response.json();
        if (shouldReload(APP_VERSION, version, triedFor())) {
            pending = version;
            reloadIfQuiet();
        }
    } catch (error) {
        // offline or the server is busy: try again later
    }
}

export function startUpdateCheck() {
    setTimeout(check, FIRST_CHECK_MS);
    setInterval(() => { if (document.visibilityState === 'visible') check(); }, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            if (pending) reloadIfQuiet(); else check();
        }
    });
    // a newer build found while typing: reload once the person has finished
    document.addEventListener('focusout', () => setTimeout(reloadIfQuiet, 2000));
    window.addEventListener('online', check);
}
