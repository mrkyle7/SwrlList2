export default { showToasterMessage };

/** @type {ReturnType<typeof setTimeout> | undefined} */
let timeout;

/**
 * A short message in a pill at the bottom of the screen, gone after a few seconds.
 *
 * @param {string} message
 * @param {{kind?: 'warning'}} [options] a warning stays a little longer and carries an icon
 */
export function showToasterMessage(message, options = {}) {
    if (timeout) {
        clearTimeout(timeout);
    }
    const toaster = document.getElementById('toasterMessage');
    const toasterText = document.getElementById('toasterMessageText');
    const warning = options.kind === 'warning';

    toasterText.innerText = message;
    toaster.classList.toggle('warning', warning);
    toaster.setAttribute('role', warning ? 'alert' : 'status');
    // restart the entrance when a new message replaces one still showing
    toaster.classList.remove('show', 'leaving');
    void toaster.offsetWidth;
    toaster.classList.add('show');
    timeout = setTimeout(() => {
        toaster.classList.add('leaving');
        timeout = setTimeout(() => toaster.classList.remove('show', 'leaving'), 250);
    }, warning ? 4500 : 3000);
};
