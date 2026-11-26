import { describe, it, expect } from 'vitest';
import { compareVersions, updateAction } from '../src/model/update';

describe('picking up a new build without a reset', () => {
    it('compares versions, ignoring the commit', () => {
        expect(compareVersions('v3.30.0', 'v3.31.0')).toBeLessThan(0);
        expect(compareVersions('v3.31.0 · abc1234', '3.31.0')).toBe(0);
        expect(compareVersions('v3.40.1', 'v3.31.9')).toBeGreaterThan(0);
        expect(compareVersions('v4.0.0', 'v3.99.99')).toBeGreaterThan(0);
    });
    it('does nothing when this is the live build or it cannot tell', () => {
        expect(updateAction('v3.31.0', { version: 'v3.31.0' })).toBe('none');
        expect(updateAction('v3.31.0', {})).toBe('none');
        expect(updateAction('v3.31.0', undefined)).toBe('none');
    });
    it('takes an ordinary new build quietly, for next time', () => {
        expect(updateAction('v3.30.0', { version: 'v3.31.0' })).toBe('quiet');
        expect(updateAction('v3.31.0', { version: 'v3.31.1', notice: { version: '3.31.0', text: 'New look' } })).toBe('quiet');
    });
    it('asks first when a release this app has not got changes how it looks or works', () => {
        expect(updateAction('v3.30.0', { version: 'v3.31.0', notice: { version: '3.31.0', text: 'New look' } })).toBe('ask');
        // skipped the release with the notice: still asked
        expect(updateAction('v3.29.0', { version: 'v3.33.2', notice: { version: '3.31.0', text: 'New look' } })).toBe('ask');
        expect(updateAction('v3.30.0', { version: 'v3.31.0', notice: { version: '3.31.0', text: '' } })).toBe('quiet');
    });
});
