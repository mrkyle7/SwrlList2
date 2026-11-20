export default { showToasterMessage };

/** @type {ReturnType<typeof setTimeout> | undefined} */
let timeout;

/**
 * A short message in a pill at the bottom of the screen, gone after a few seconds.
 *
 * With an action ("Undo") the toast carries a button for it and stays a
 * little longer; the button is the only part of the toast that takes taps.
 *
 * @param {string} message
 * @param {{kind?: 'warning', action?: {label: string, run: () => void}}} [options] a warning stays a little longer and carries an icon
 */
export function showToasterMessage(message, options = {}) {
    if (timeout) {
        clearTimeout(timeout);
    }
    const toaster = document.getElementById('toasterMessage');
    const toasterText = document.getElementById('toasterMessageText');
    const warning = options.kind === 'warning';

    toasterText.innerText = message;
    const actionButton = document.getElementById('toasterAction');
    const action = options.action;
    actionButton.classList.toggle('hidden', !action);
    actionButton.onclick = action ? () => {
        hide(toaster);
        action.run();
    } : null;
    if (action) actionButton.textContent = action.label;
    toaster.classList.toggle('warning', warning);
    toaster.setAttribute('role', warning ? 'alert' : 'status');
    // restart the entrance when a new message replaces one still showing
    toaster.classList.remove('show', 'leaving');
    void toaster.offsetWidth;
    toaster.classList.add('show');
    timeout = setTimeout(() => hide(toaster), warning || action ? 5000 : 3000);
};

/**
 * @param {HTMLElement} toaster
 */
function hide(toaster) {
    if (timeout) clearTimeout(timeout);
    toaster.classList.add('leaving');
    timeout = setTimeout(() => toaster.classList.remove('show', 'leaving'), 250);
}
