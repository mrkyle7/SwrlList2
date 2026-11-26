import { largeImage } from '../model/imageSize';

/**
 * A cover full screen: tap the poster on a swrl's page. It opens with the
 * image already on the page (no blank moment) and swaps in a sharper copy
 * once that has loaded. Closes with the close button, a tap anywhere, Esc or
 * the phone's back button.
 *
 * Back: opening adds a history entry, so back closes the viewer instead of
 * leaving the page. The app's own navigation also runs on history
 * (index.js `window.onpopstate`), so this listener is added when the module
 * loads, before that one, and keeps the popstate it handles from reaching it.
 */

/** @type {HTMLElement | undefined} */
let overlay;
/** @type {HTMLImageElement | undefined} */
let picture;
let open = false;
/** Closing from here (button, tap, Esc) pops our history entry: that popstate is ours too. */
let poppingOurEntry = false;
/** @type {Element | null} where focus was, to give it back */
let returnFocus = null;

window.addEventListener('popstate', (event) => {
    if (poppingOurEntry) {
        poppingOurEntry = false;
        event.stopImmediatePropagation();
        return;
    }
    if (open) {
        event.stopImmediatePropagation();
        hide();
    }
});

function build() {
    overlay = document.createElement('div');
    overlay.className = 'imageViewer';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Cover, full size');
    picture = document.createElement('img');
    picture.className = 'imageViewerPicture';
    picture.alt = '';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'imageViewerClose';
    close.setAttribute('aria-label', 'Close');
    close.title = 'Close';
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    overlay.append(picture, close);
    overlay.addEventListener('click', () => closeViewer());
    document.addEventListener('keydown', (event) => {
        if (open && event.key === 'Escape') {
            event.preventDefault();
            closeViewer();
        }
    });
    document.body.appendChild(overlay);
}

/**
 * Shows an image full screen.
 *
 * @param {string} shownUrl the image as it is on the page (shows at once)
 * @param {string} alt what it is, for screen readers
 */
export function showImageViewer(shownUrl, alt) {
    const sharper = largeImage(shownUrl);
    if (!sharper) return; // no real cover
    if (!overlay) build();
    picture.src = shownUrl;
    picture.alt = alt;
    if (sharper !== shownUrl) {
        const loader = new Image();
        loader.onload = () => { if (open && picture.src === shownUrl) picture.src = sharper; };
        loader.src = sharper;
    }
    returnFocus = document.activeElement;
    open = true;
    overlay.classList.add('open');
    document.body.classList.add('imageViewerOpen');
    history.pushState(Object.assign({}, history.state, { imageViewer: true }), '');
    /** @type {HTMLElement} */ (overlay.querySelector('.imageViewerClose')).focus();
}

/** Closes it from here: also takes back the history entry opening added. */
function closeViewer() {
    if (!open) return;
    hide();
    if (history.state && history.state.imageViewer) {
        poppingOurEntry = true;
        history.back();
    }
}

function hide() {
    open = false;
    if (overlay) overlay.classList.remove('open');
    document.body.classList.remove('imageViewerOpen');
    if (returnFocus instanceof HTMLElement) returnFocus.focus();
    returnFocus = null;
}

/**
 * Makes an image open full screen when tapped (or with Enter).
 *
 * @param {HTMLImageElement} image
 */
export function makeImageZoomable(image) {
    image.classList.add('zoomable');
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    const go = () => {
        if (!largeImage(image.currentSrc || image.src)) return;
        showImageViewer(image.currentSrc || image.src, image.alt);
    };
    image.addEventListener('click', (event) => {
        event.stopPropagation();
        go();
    });
    image.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            go();
        }
    });
}
