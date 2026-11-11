/** Canonical public URL of the web app. */
export const SITE_URL = 'https://swrl-list.com';

/**
 * Base URL for calls to our own server (server.js).
 *
 * In the browser / installed PWA the page is served by that server, so a
 * relative URL is right (and keeps localhost and preview deploys working).
 * Inside the Cordova apps the page is loaded from file://, so the request has
 * to be sent to the public site.
 *
 * @return {string}
 */
export const apiBase = () => {
    return window.location.protocol === 'http:' || window.location.protocol === 'https:'
        ? ''
        : SITE_URL;
}
