import { loginWithGoogle } from '../firebase/login';

/**
 * Asks someone who is not logged in (or only anonymously) to log in before
 * doing what they tried to do, in a sheet with one clear button.
 *
 * @param {string} reason finishes "Log in ...", e.g. "to add a Swrl to your list"
 */
export default function showRequireLoginScreen(reason) {
    const sheet = document.getElementById('loginSheet');
    const backdrop = document.getElementById('loginSheetBackdrop');
    document.getElementById('loginSheetTitle').textContent = 'Log in ' + reason;
    const close = () => {
        sheet.classList.add('hidden');
        backdrop.classList.add('hidden');
        document.removeEventListener('keydown', onKey);
    };
    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
        if (e.key === 'Escape') close();
    };
    /** @type {HTMLButtonElement} */
    // @ts-ignore
    const go = document.getElementById('loginSheetGo');
    go.onclick = () => {
        close();
        loginWithGoogle();
    };
    document.getElementById('loginSheetCancel').onclick = close;
    backdrop.onclick = close;
    document.addEventListener('keydown', onKey);
    sheet.classList.remove('hidden');
    backdrop.classList.remove('hidden');
    go.focus();
}
