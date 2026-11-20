import { describe, it, expect } from 'vitest';
import { TILES, CARDS, DEFAULT_HOME_LAYOUT, homeLayoutFromId, homeLayouts, homeTileCounts } from '../src/model/homeLayout';
import { WATCH, READ, LISTEN, PLAY } from '../src/constants/Category';

describe('home layout', () => {
    it('gives the cards until the user chooses', () => {
        expect(DEFAULT_HOME_LAYOUT).toBe(CARDS);
        expect(homeLayoutFromId(undefined)).toBe(CARDS);
    });
    it('reads the stored values back', () => {
        expect(homeLayoutFromId('tiles')).toBe(TILES);
        expect(homeLayoutFromId('cards')).toBe(CARDS);
    });
    it('falls back to the default, cards, for anything unknown', () => {
        expect(homeLayoutFromId('grid')).toBe(CARDS);
        expect(homeLayoutFromId('')).toBe(CARDS);
        expect(homeLayoutFromId(42)).toBe(CARDS);
        expect(homeLayoutFromId(null)).toBe(CARDS);
    });
    it('offers cards then tiles on Settings, matching the radios', () => {
        expect(homeLayouts.map(layout => layout.id)).toEqual(['cards', 'tiles']);
    });
});

describe('home tile counts', () => {
    it('says so when nothing is on the list', () => {
        expect(homeTileCounts(0, 0, WATCH)).toEqual({ onList: 'Nothing on your list yet', started: '' });
    });
    it('leaves out the started count when nothing is started', () => {
        expect(homeTileCounts(3, 0, WATCH)).toEqual({ onList: '3 on your list', started: '' });
    });
    it('uses the category verb for what is started', () => {
        expect(homeTileCounts(3, 2, WATCH).started).toBe('2 watching');
        expect(homeTileCounts(2, 1, READ).started).toBe('1 reading');
        expect(homeTileCounts(2, 1, LISTEN).started).toBe('1 listening');
        expect(homeTileCounts(1, 1, PLAY).started).toBe('1 playing');
    });
    it('shows only the list count without a category', () => {
        expect(homeTileCounts(4, 2)).toEqual({ onList: '4 on your list', started: '' });
    });
});
