import { describe, it, expect } from 'vitest';
import { shortVersion } from '../src/model/update';

describe('the version for people', function () {
    it('shows the short version', function () {
        expect(shortVersion('v3.14.0 · abc1234')).to.equal('v3.14.0');
    });
});
