import { describe, it, expect } from 'vitest';
import { DeleteError, classifyDeleteError } from '../src/model/accountDeletion';

describe('classifyDeleteError', () => {
    it('asks for a fresh sign-in when Firebase says so', () => {
        expect(classifyDeleteError({ code: 'auth/requires-recent-login' })).toBe(DeleteError.NEEDS_RECENT_LOGIN);
    });
    it('treats a closed popup as the user changing their mind', () => {
        for (const code of ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']) {
            expect(classifyDeleteError({ code })).toBe(DeleteError.CANCELLED);
        }
    });
    it('everything else is a failure', () => {
        expect(classifyDeleteError({ code: 'auth/network-request-failed' })).toBe(DeleteError.FAILED);
        expect(classifyDeleteError(new Error('boom'))).toBe(DeleteError.FAILED);
        expect(classifyDeleteError(undefined)).toBe(DeleteError.FAILED);
    });
});
