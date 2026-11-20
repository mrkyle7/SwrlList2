import { addHomeLayoutListener, getHomeLayout } from '../listeners/listEntries';
import { homeLayoutFromId, HomeLayout } from '../model/homeLayout';

/**
 * Puts the user's phone home layout on `<body data-home-layout>`, where the
 * stylesheet picks it up (phones and tablets only: under 1025px). The profile
 * is the source of truth; this device also remembers the last choice so the
 * first paint after a reload already has the right home screen, instead of
 * flashing the default layout until the profile has been read.
 */

const HINT_KEY = 'swrlHomeLayout';

/** Call once at start-up, before the first screen shows. */
export function initHomeLayout() {
    let hint;
    try {
        hint = window.localStorage.getItem(HINT_KEY);
    } catch (error) {
        hint = undefined; // private windows and blocked storage: just the default
    }
    show(hint ? homeLayoutFromId(hint) : getHomeLayout());
    addHomeLayoutListener(layout => {
        show(layout);
        try {
            window.localStorage.setItem(HINT_KEY, layout.id);
        } catch (error) {
            // the hint is only a convenience
        }
    });
}

/**
 * @param {HomeLayout} layout
 */
function show(layout) {
    document.body.dataset.homeLayout = layout.id;
}
