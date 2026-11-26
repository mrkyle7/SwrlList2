/**
 * The version for people: "v3.14.0" from "v3.14.0 · abc1234".
 *
 * @param {string} version
 * @return {string}
 */
export function shortVersion(version) {
    return version.split(' ')[0];
}

/**
 * Compares two versions ("v3.14.0", "3.14.0 · abc1234"): negative when a is
 * older than b, 0 when the same release, positive when newer.
 *
 * @param {string} a
 * @param {string} b
 * @return {number}
 */
export function compareVersions(a, b) {
    const parts = (/** @type {string} */ v) => shortVersion(String(v)).replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
    const [x, y] = [parts(a), parts(b)];
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
        const d = (x[i] || 0) - (y[i] || 0);
        if (d !== 0) return d;
    }
    return 0;
}

/**
 * @typedef {{version: string, text: string}} UpdateNotice a release that changes
 *          how the app looks or works enough to ask before switching to it
 */

/**
 * What to do about the build that is live now:
 * - 'none': this is it (or we cannot tell);
 * - 'quiet': a newer build, fetched in the background and opened next time the
 *   app starts, with no reload or reset now;
 * - 'ask': a newer build with a change worth knowing about (its notice names
 *   the release that brought it, and this app is older): ask before reloading.
 *
 * @param {string} running APP_VERSION
 * @param {{version?: string, notice?: UpdateNotice}} live dist/version.json
 * @return {'none' | 'quiet' | 'ask'}
 */
export function updateAction(running, live) {
    if (!live || typeof live.version !== 'string' || !live.version || live.version === running) return 'none';
    const notice = live.notice;
    if (notice && notice.version && notice.text && compareVersions(running, notice.version) < 0) return 'ask';
    return 'quiet';
}
