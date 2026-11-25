import { describe, it, expect } from 'vitest';
import { quickAddFromId, quickAddModes, DEFAULT_QUICK_ADD, QUICK_SEARCH, QUICK_MENU, QUICK_WHEEL, wheelPositions, pickOption } from '../src/model/quickAdd';

describe('the search button', () => {
    it('shows the categories until I choose', () => {
        expect(DEFAULT_QUICK_ADD).toBe(QUICK_MENU);
        expect(quickAddFromId(undefined)).toBe(QUICK_MENU);
        expect(quickAddFromId('search')).toBe(QUICK_SEARCH);
        expect(quickAddFromId('menu')).toBe(QUICK_MENU);
        expect(quickAddFromId('wheel')).toBe(QUICK_WHEEL);
        expect(quickAddFromId('spin')).toBe(QUICK_MENU);
        expect(quickAddModes.map(mode => mode.id)).toEqual(['search', 'menu', 'wheel']);
    });

    it('puts the swirl\'s options on an arc from left round to up', () => {
        const positions = wheelPositions(5, 150);
        expect(positions.map(p => p.angle)).toEqual([180, 157.5, 135, 112.5, 90]);
        expect(positions[0]).toMatchObject({ x: -150, y: -0 });
        expect(positions[4].x).toBeCloseTo(0);
        expect(positions[4].y).toBe(-150);
        expect(wheelPositions(0, 150)).toEqual([]);
    });

    it('knows which option a finger is over', () => {
        const positions = wheelPositions(5, 150);
        expect(pickOption(5, -5, positions)).toBe('centre'); // still on the button
        expect(pickOption(-50, 0, positions)).toBeUndefined(); // between button and options
        expect(pickOption(-150, 0, positions)).toBe(0); // straight left
        expect(pickOption(0, -160, positions)).toBe(4); // straight up
        expect(pickOption(-106, -106, positions)).toBe(2); // up-left, the middle one
        expect(pickOption(120, 0, positions)).toBeUndefined(); // off to the right: nothing
        expect(pickOption(0, 120, positions)).toBeUndefined(); // down: nothing
    });
});
