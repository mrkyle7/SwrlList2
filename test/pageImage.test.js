import { describe, it, expect } from 'vitest';
// @ts-ignore CommonJS module shared with server.js
import pageImage from '../serverlib/pageImage.js';

const { normalizePageUrl, isPublicAddress, metaContent, pageImageFromHtml } = pageImage;

describe('a restaurant website\'s picture', () => {
    it('only fetches ordinary web addresses', () => {
        expect(normalizePageUrl('www.dishoom.com')?.toString()).toBe('https://www.dishoom.com/');
        expect(normalizePageUrl('http://example.com/menu')?.toString()).toBe('http://example.com/menu');
        expect(normalizePageUrl('ftp://example.com')).toBeNull();
        expect(normalizePageUrl('https://user:pw@example.com')).toBeNull();
        expect(normalizePageUrl('https://example.com:8080')).toBeNull();
        expect(normalizePageUrl('http://localhost')).toBeNull();
        expect(normalizePageUrl('http://metadata.google.internal')).toBeNull();
        expect(normalizePageUrl('')).toBeNull();
    });

    it('refuses addresses that are not on the public internet', () => {
        ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0',
            '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:169.254.169.254', 'not an ip']
            .forEach(address => expect(isPublicAddress(address), address).toBe(false));
        ['8.8.8.8', '151.101.1.69', '2a04:4e42::81', '::ffff:8.8.8.8'].forEach(address => expect(isPublicAddress(address), address).toBe(true));
    });

    it('reads og:image, whatever the attribute order, and makes it absolute', () => {
        const base = new URL('https://www.example.com/restaurants/soho');
        expect(pageImageFromHtml('<html><head><meta content="/img/hero.jpg" property="og:image"></head></html>', base))
            .toBe('https://www.example.com/img/hero.jpg');
        expect(pageImageFromHtml('<head><meta property="og:image" content="https://cdn.example.com/a.jpg?x=1&amp;y=2"/></head>', base))
            .toBe('https://cdn.example.com/a.jpg?x=1&y=2');
    });

    it('falls back to twitter:image, and ignores data: and missing pictures', () => {
        const base = new URL('https://example.com/');
        expect(pageImageFromHtml('<head><meta name="twitter:image" content="https://example.com/t.png"></head>', base)).toBe('https://example.com/t.png');
        expect(pageImageFromHtml('<head><meta property="og:image" content="data:image/png;base64,AAA"></head>', base)).toBeNull();
        expect(pageImageFromHtml('<head><title>No picture</title></head>', base)).toBeNull();
    });

    it('only reads the head when there is one', () => {
        expect(metaContent('<head></head><body><meta property="og:image" content="x.jpg"></body>', 'property', 'og:image')).toBeNull();
    });
});
