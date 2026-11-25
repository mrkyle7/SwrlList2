import { describe, it, expect } from 'vitest';
import { categoryWords } from '../src/model/categoryWords';
import { activityCaption } from '../src/model/activity';
import { progressWords } from '../src/model/progress';
import { shareText } from '../src/model/share';
import { homeTileCounts } from '../src/model/homeLayout';
import { EAT } from '../src/constants/Category';

describe('words for each category', () => {
    it('has every word for watch, read, listen, play and eat', () => {
        [1, 2, 3, 4, 6].forEach(id => {
            const words = categoryWords(id);
            ['verb', 'past', 'doneIt', 'doIt', 'now', 'start', 'caption', 'isStarted', 'areStarted', 'reminder', 'pickQuestion']
                .forEach(key => expect(words[key], `${id} ${key}`).toBeTruthy());
        });
        expect(categoryWords(99).verb).toBe('try');
    });

    it('talks about places to eat as places: booked, ate there, eat here', () => {
        expect(progressWords(6)).toEqual({ now: 'Booked', start: 'Mark as booked', caption: 'booked' });
        expect(activityCaption([{ name: 'Sam', loved: false, done: true }], 6)).toBe('Sam ate there');
        expect(activityCaption([{ name: 'Sam', loved: false, inProgress: true }], 6)).toBe('Sam has booked it');
        expect(activityCaption([{ name: 'Sam', loved: false }, { name: 'Ali', loved: false }], 6)).toBe('Sam and Ali want to eat there');
        expect(shareText({ title: 'Dishoom', category: 6 })).toBe('You should eat at Dishoom.');
        expect(categoryWords(6).pickQuestion).toBe('Where should you eat?');
        expect(homeTileCounts(3, 1, EAT)).toEqual({ onList: '3 on your list', started: '1 booked' });
    });

    it('keeps the words the other categories always had', () => {
        expect(activityCaption([{ name: 'Sam', loved: false, done: true }], 1)).toBe('Sam watched it');
        expect(activityCaption([{ name: 'Sam', loved: false, inProgress: true }], 3)).toBe('Sam is listening to it');
        expect(activityCaption([{ name: 'Sam', loved: false }], 4)).toBe('Sam wants to play it');
        expect(categoryWords(2).reminder).toBe('Carry on reading');
        expect(categoryWords(1).pickQuestion).toBe('What should you watch?');
    });
});
