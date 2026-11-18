/**
 * What to tell someone when part of a search failed: short, and only what
 * they need. Tested in test/searchFailure.test.js.
 *
 * @param {string[]} failed the sources that failed, named for people ("albums")
 * @return {string} empty when nothing failed
 */
export function searchFailureText(failed) {
    const names = [...new Set(failed)];
    if (names.length === 0) return '';
    const list = names.length === 1 ? names[0]
        : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
    return `Couldn't load ${list} right now`;
}
