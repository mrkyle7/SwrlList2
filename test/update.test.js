import { describe, it, expect } from 'vitest';
import { shouldReload, shortVersion } from '../src/model/update';

describe('picking up a new build', function () {
    it('reloads when a different build is live', function () {
        expect(shouldReload('v3.13.0', 'v3.14.0', null)).to.equal(true);
        expect(shouldReload('v3.13.0 · abc1234', 'v3.13.0 · def5678', null)).to.equal(true);
    });
    it('stays put when up to date, when it cannot tell, and after one try', function () {
        expect(shouldReload('v3.14.0', 'v3.14.0', null)).to.equal(false);
        expect(shouldReload('v3.13.0', undefined, null)).to.equal(false);
        expect(shouldReload('v3.13.0', '', null)).to.equal(false);
        expect(shouldReload('v3.13.0', 'v3.14.0', 'v3.14.0')).to.equal(false);
    });
    it('shows the short version', function () {
        expect(shortVersion('v3.14.0 · abc1234')).to.equal('v3.14.0');
    });
});
