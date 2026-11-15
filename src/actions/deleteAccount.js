import { GoogleAuthProvider, deleteUser, getAuth, reauthenticateWithPopup } from 'firebase/auth';
import { handleLogout, pauseUserListeners, resumeUserListeners } from '../firebase/login';
import { DeleteError, classifyDeleteError } from '../model/accountDeletion';

/**
 * Deletes my Firebase Auth account. Nothing is deleted from Firestore here:
 * the `userDeleted` Cloud Function removes the data when the account goes
 * (also when it is deleted from the Firebase console), so nothing is left
 * half done if this tab is closed.
 *
 * If Firebase asks for a recent sign-in, I sign in again with the Google popup
 * (the provider the app signs in with) and the delete is retried once. If the
 * popup is closed this stops cleanly with `false` and nothing is deleted.
 *
 * My Firestore listeners are stopped first: once the account is gone they
 * would only fail with permission errors. They are started again if the
 * account was not deleted.
 *
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<boolean>} true when the account was deleted, false when I
 *         closed the sign-in popup; rejects when it could not be deleted
 */
export default async function deleteAccount(firestore) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
        throw new Error('Not signed in with an account');
    }
    pauseUserListeners();
    try {
        try {
            await deleteUser(user);
        } catch (error) {
            if (classifyDeleteError(error) !== DeleteError.NEEDS_RECENT_LOGIN) throw error;
            await reauthenticateWithPopup(user, new GoogleAuthProvider());
            await deleteUser(user);
        }
    } catch (error) {
        resumeUserListeners(firestore);
        if (classifyDeleteError(error) === DeleteError.CANCELLED) return false;
        throw error;
    }
    // the auth state change does the same; doing it now closes the gap
    handleLogout();
    return true;
}
