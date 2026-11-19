import { describe, it, expect } from 'vitest';
import { contrastRatio, headerTone } from '../src/model/contrast';

describe('contrast', function () {
    it('measures like WCAG', function () {
        expect(contrastRatio('#ffffff', '#000000')).to.be.closeTo(21, 0.01);
        expect(contrastRatio('#ffffff', '#FF2E63')).to.be.closeTo(3.61, 0.01);
        expect(contrastRatio('#ffffff', '#d81b4f')).to.be.closeTo(5.01, 0.01);
    });
    it('puts dark titles on the light category colours only', function () {
        expect(headerTone('#3EB283')).to.equal('dark');   // watch
        expect(headerTone('#F6A900')).to.equal('dark');   // read
        expect(headerTone('#71A8D6')).to.equal('dark');   // play
        expect(headerTone('#b042f4')).to.equal('light');  // listen
        expect(headerTone('#FF2E63')).to.equal('light');  // home
        expect(headerTone('#4990E2')).to.equal('light');  // swrls, friends, settings
    });
});
