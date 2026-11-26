import { ListEntry } from './listEntry';

/**
 * What the app saves on the device to open instantly next time, before
 * Firebase has started (see firebase/bootCache.js): who is signed in, their
 * settings and their list entries. Pure, so tested in test/bootData.test.js.
 *
 * Bump BOOT_VERSION when the shape changes: an older saved copy is ignored.
 */
export const BOOT_VERSION = 1;

/**
 * @typedef {{uid: string, displayName: string | null, photoURL: string | null}} BootUser
 * @typedef {{version: number, savedAt: number, user: BootUser, settings: Object<string, any>, entries: Object[]}} BootData
 */

/**
 * A list entry as plain data (dates as milliseconds), safe to store.
 *
 * @param {ListEntry} entry
 * @return {Object}
 */
export function entryToBoot(entry) {
    return entry.toFirestoreData(
        entry.updated ? entry.updated.getTime() : undefined,
        entry.added ? entry.added.getTime() : undefined);
}

/**
 * The entry back, or undefined when the saved copy is unreadable.
 *
 * @param {Object} raw
 * @return {ListEntry | undefined}
 */
export function entryFromBoot(raw) {
    try {
        const asDate = (/** @type {any} */ ms) => typeof ms === 'number' ? { toDate: () => new Date(ms) } : undefined;
        return ListEntry.fromFirestore(Object.assign({}, raw, { added: asDate(raw['added']), updated: asDate(raw['updated']) }));
    } catch (error) {
        return undefined;
    }
}

/**
 * The saved copy to open from, or undefined when there is none worth using:
 * missing, an older shape, or for nobody.
 *
 * @param {any} data
 * @return {BootData | undefined}
 */
export function usableBoot(data) {
    if (!data || data.version !== BOOT_VERSION) return undefined;
    if (!data.user || typeof data.user.uid !== 'string' || !data.user.uid) return undefined;
    if (!Array.isArray(data.entries)) return undefined;
    return data;
}
