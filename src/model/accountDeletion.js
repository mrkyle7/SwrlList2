/**
 * Pure helpers for deleting my account: what an auth error means for the
 * flow. No Firebase here, so it is unit tested.
 */

/** The outcome of a failed delete or re-authentication attempt. */
export const DeleteError = Object.freeze({
    /** Firebase wants a fresh sign-in first. */
    NEEDS_RECENT_LOGIN: 'needs-recent-login',
    /** The user closed the sign-in popup (or asked for another): they changed their mind. */
    CANCELLED: 'cancelled',
    /** Anything else. */
    FAILED: 'failed'
});

/**
 * @param {any} error an error thrown by `deleteUser` or `reauthenticateWithPopup`
 * @return {string} one of DeleteError
 */
export function classifyDeleteError(error) {
    const code = error && error.code;
    if (code === 'auth/requires-recent-login') return DeleteError.NEEDS_RECENT_LOGIN;
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
        || code === 'auth/user-cancelled') {
        return DeleteError.CANCELLED;
    }
    return DeleteError.FAILED;
}
