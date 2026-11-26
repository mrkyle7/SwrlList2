import { describe, it, expect } from 'vitest';
import { largeImage } from '../src/model/imageSize';

describe('a sharper cover for the full-screen view', () => {
    it('asks each source for a bigger copy', () => {
        expect(largeImage('https://image.tmdb.org/t/p/w500/abc.jpg')).toBe('https://image.tmdb.org/t/p/w780/abc.jpg');
        expect(largeImage('https://is1-ssl.mzstatic.com/image/thumb/Music/x/600x600bb.jpg')).toBe('https://is1-ssl.mzstatic.com/image/thumb/Music/x/1200x1200bb.jpg');
        expect(largeImage('https://is1-ssl.mzstatic.com/image/thumb/x/600x600.jpg')).toBe('https://is1-ssl.mzstatic.com/image/thumb/x/1200x1200bb.jpg');
        expect(largeImage('https://covers.openlibrary.org/b/id/123-M.jpg')).toBe('https://covers.openlibrary.org/b/id/123-L.jpg');
    });
    it('keeps a URL it does not know, and has nothing for no cover', () => {
        expect(largeImage('https://cf.geekdo-images.com/x.jpg')).toBe('https://cf.geekdo-images.com/x.jpg');
        expect(largeImage('img/NoPoster.jpg')).toBeUndefined();
        expect(largeImage(undefined)).toBeUndefined();
    });
});
