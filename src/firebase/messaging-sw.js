// Push notifications while the app is closed. Built by webpack into
// /firebase-messaging-sw.js and loaded into the app's own worker (www/sw.js,
// scope /) with importScripts, so a notification belongs to the installed app
// and tapping it opens the app, not a browser tab. (Registered under Firebase's
// own scope, as before 3.30.0, Android opened taps in Chrome.)
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging/sw';
import { firebaseConfig } from './config';

/** This file runs in a service worker; the type-check knows the page's globals. @type {any} */
const worker = self;

/**
 * Where a tapped notification goes: the path of its link (functions/messages.js
 * sends fcmOptions.link), on this worker's own site, so it is always the
 * installed app's address whatever host the link names.
 *
 * @param {any} data the notification's data; Firebase keeps the message in FCM_MSG
 * @return {string}
 */
function tappedUrl(data) {
    const message = data && data.FCM_MSG;
    const link = (message && message.fcmOptions && message.fcmOptions.link)
        || (message && message.notification && message.notification.click_action)
        || '/';
    try {
        const url = new URL(link, self.location.origin);
        return self.location.origin + url.pathname + url.search;
    } catch {
        return self.location.origin + '/';
    }
}

// Added before Firebase's own listener, and stops it: the app is focused and
// sent to the page if it is open, opened there if not.
worker.addEventListener('notificationclick', (/** @type {any} */ event) => {
    event.stopImmediatePropagation();
    event.notification.close();
    const url = tappedUrl(event.notification.data);
    event.waitUntil(worker.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
        const open = windows.find((/** @type {any} */ client) => new URL(client.url).origin === self.location.origin);
        if (open) {
            let focused;
            try {
                focused = await open.focus();
            } catch {
                await worker.clients.openWindow(url);
                return;
            }
            if (open.url !== url && 'navigate' in focused) {
                try {
                    await focused.navigate(url);
                } catch {
                    // a window this worker does not control cannot be sent elsewhere
                }
            }
            return;
        }
        await worker.clients.openWindow(url);
    }));
});

// Messages sent with a "notification" payload (see functions/messages.js) are
// displayed by the SDK itself; creating the instance is all that is needed.
getMessaging(initializeApp(firebaseConfig));
