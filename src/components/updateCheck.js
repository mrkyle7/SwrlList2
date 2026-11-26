import { shortVersion, updateAction } from '../model/update';
import { showToasterMessage } from './toaster';

/**
 * Keeps an open or installed app current without ever pulling the screen out
 * from under anyone. It asks the server which build is live
 * (dist/version.json, never cached) shortly after starting, whenever the app
 * comes back into view, and every 15 minutes while open.
 *
 * - An ordinary new build (model/update.js `updateAction` 'quiet'): the
 *   service worker downloads it in the background and the app opens it the
 *   next time it starts. Nothing reloads, nothing resets now.
 * - A build with a change worth knowing about (`updateNotice` in package.json,
 *   'ask'): a toast says what changed, with an Update button. Only that tap
 *   reloads (at a quiet moment: never over typing or an open sheet), and the
 *   reload comes back to the same screen (the address is kept). Ignored, it
 *   asks again at most every 10 minutes.
 */

const CHECK_EVERY_MS = 15 * 60 * 1000;
const FIRST_CHECK_MS = 10 * 1000;
const ASK_AGAIN_MS = 10 * 60 * 1000;
const TRIED_KEY = 'swrlReloadedFor';

/** @type {string | undefined} a newer build is downloading or ready, for next start */
let prepared;
/** When the update toast was last shown. */
let askedAt = 0;

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

/**
 * The new build into the service worker's cache, in the background, so the
 * next start opens it (www/sw.js). No reload.
 *
 * @param {string} live
 */
function prepare(live) {
    if (prepared === live) return;
    prepared = live;
    const worker = navigator.serviceWorker;
    if (!worker || !worker.getRegistration) return;
    worker.getRegistration()
        .then(registration => registration ? registration.update() : undefined)
        .catch(() => undefined);
}

/**
 * Asks whether to switch now, saying what changed.
 *
 * @param {string} live
 * @param {string} text what changed, from the release's notice
 */
function ask(live, text) {
    if (triedFor() === live) return; // reloaded for it already: a cache is in the way, do not loop
    if (Date.now() - askedAt < ASK_AGAIN_MS) return;
    askedAt = Date.now();
    showToasterMessage(text, {
        long: true,
        action: { label: 'Update', run: () => reloadWhenQuiet(live) }
    });
}

/**
 * Switches to the new build once nothing would be lost: never over typing
 * or an open sheet. The reload keeps the address, so it opens the same screen.
 *
 * @param {string} live
 */
function reloadWhenQuiet(live) {
    if (busy()) {
        setTimeout(() => reloadWhenQuiet(live), 2000);
        return;
    }
    try { sessionStorage.setItem(TRIED_KEY, live); } catch { /* reload anyway */ }
    showToasterMessage('Updating Swrl List to ' + shortVersion(live));
    newWorkerReady().catch(() => undefined).finally(() => window.location.reload());
}

/** How long to wait for a new service worker before reloading anyway. */
const WORKER_WAIT_MS = 15 * 1000;

/**
 * The app opens from the service worker's cache, one cache per build
 * (www/sw.js), so reloading before the new worker has downloaded the new
 * build and taken over would just open the old build again. Asks for the new
 * worker and waits until it is active (or gives up after a while).
 *
 * @return {Promise<void>}
 */
async function newWorkerReady() {
    const worker = navigator.serviceWorker;
    if (!worker || !worker.getRegistration) return;
    const registration = await worker.getRegistration();
    if (!registration) return;
    await registration.update().catch(() => undefined);
    const incoming = registration.installing || registration.waiting;
    if (!incoming) return;
    await new Promise(resolve => {
        const timer = setTimeout(resolve, WORKER_WAIT_MS);
        const settled = () => {
            if (incoming.state === 'activated' || incoming.state === 'redundant') {
                clearTimeout(timer);
                resolve(undefined);
            }
        };
        incoming.addEventListener('statechange', settled);
        settled();
    });
}

async function check() {
    if (!navigator.onLine) return;
    try {
        const response = await fetch('/version.json', { cache: 'no-store' });
        if (!response.ok) return;
        const live = await response.json();
        const action = updateAction(APP_VERSION, live);
        if (action === 'none') return;
        prepare(live.version);
        if (action === 'ask') ask(live.version, live.notice.text);
    } catch (error) {
        // offline or the server is busy: try again later
    }
}

export function startUpdateCheck() {
    setTimeout(check, FIRST_CHECK_MS);
    setInterval(() => { if (document.visibilityState === 'visible') check(); }, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
    });
    window.addEventListener('online', check);
}
