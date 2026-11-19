/**
 * Colour contrast (WCAG 2), for choosing text colours on the app's coloured
 * bars. Tested in test/contrast.test.js.
 */

/** @param {string} hex like "#3EB283" */
function luminance(hex) {
    const value = hex.replace('#', '');
    const channels = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255)
        .map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * @param {string} a hex colour
 * @param {string} b hex colour
 * @return {number} e.g. 4.5 for 4.5:1
 */
export function contrastRatio(a, b) {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
}

/** The app's dark text colour. */
export const DARK_TEXT = '#222222';

/**
 * Whether the header's title and icons should be white or dark on a bar of
 * this colour. The title is large (24px bold), so white needs 3:1; below that
 * (the green, light blue and orange categories) dark reads far better.
 *
 * @param {string} background hex colour
 * @return {'light' | 'dark'} 'light' means white text
 */
export function headerTone(background) {
    return contrastRatio('#ffffff', background) >= 3 ? 'light' : 'dark';
}
