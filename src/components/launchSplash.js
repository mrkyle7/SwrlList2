/**
 * The launch splash (#launchSplash in www/index.html): the logo on white from
 * the very first paint, matching the installed app's own splash screen, until
 * the screen being opened has been drawn underneath it. Then it fades away.
 *
 * It replaced a "Logging you in..." screen that, on a normal start, was not
 * logging anyone in: it only covered the moment it takes to read the saved
 * sign-in from the device. If start-up is slow (a first visit signing in for
 * the first time), the splash's own CSS adds a line after a moment.
 */

const FADE_MS = 200;

/** Fades the splash out, once. Safe to call more than once. */
export function hideLaunchSplash() {
    const splash = document.getElementById('launchSplash');
    if (!splash || splash.classList.contains('leaving')) return;
    // the screen underneath has just been drawn: fade on the next frame
    requestAnimationFrame(() => {
        splash.classList.add('leaving');
        setTimeout(() => splash.remove(), FADE_MS + 50);
    });
}
