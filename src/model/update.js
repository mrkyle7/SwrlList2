/**
 * Whether a running app should reload to pick up a newer build. Tested in
 * test/update.test.js.
 *
 * @param {string} running the version this bundle was built as (APP_VERSION)
 * @param {string | undefined} live what the server says is live now
 * @param {string | null | undefined} alreadyTriedFor the live version we last reloaded for in
 *        this tab: never reload twice for the same one (a cache in the way would loop)
 * @return {boolean}
 */
export function shouldReload(running, live, alreadyTriedFor) {
    return typeof live === 'string' && live.length > 0 && live !== running && live !== alreadyTriedFor;
}

/**
 * The version for people: "v3.14.0" from "v3.14.0 · abc1234".
 *
 * @param {string} version
 * @return {string}
 */
export function shortVersion(version) {
    return version.split(' ')[0];
}
