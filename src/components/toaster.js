export default { showToasterMessage };

let timeout;

export function showToasterMessage(message) {
    if (timeout) {
        clearTimeout(timeout);
    }
    const toaster = document.getElementById('toasterMessage');
    const toasterText = document.getElementById('toasterMessageText');

    toaster.classList.add('show');
    toasterText.innerText = message;
    timeout = setTimeout(() => toaster.classList.remove('show'), 3000);
};