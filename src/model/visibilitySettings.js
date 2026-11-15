import { Visibility, visibilities, DEFAULT_VISIBILITY } from '../constants/Visibility';

/**
 * Pure logic behind the visibility settings: which entries a change of default
 * rewrites, in which order the writes go, what a per-swrl choice stores and
 * the words on the swrler page. No Firebase here, so it is unit tested.
 */

/** Firestore allows 500 writes per batch; stay clear of it. */
export const MAX_BATCH_WRITES = 400;

/** The per-swrl choice that follows my default instead of fixing a value. */
export const USE_DEFAULT = 'default';

/**
 * @template T
 * @param {T[]} items
 * @param {number} [size]
 * @return {T[][]} consecutive slices of at most `size` items
 */
export function chunk(items, size = MAX_BATCH_WRITES) {
    /** @type {T[][]} */
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

/**
 * The entries that follow the default (no override of their own) and do not
 * yet carry the new default. Entries already at the target are left alone, so
 * running the same change again after a failure only does what is still left.
 *
 * @param {{swrlID: string, visibility: Visibility, visibilityOverride: boolean}[]} entries
 * @param {Visibility} target the new default
 * @return {string[]} swrlIDs to rewrite
 */
export function entriesToRewrite(entries, target) {
    return entries
        .filter(entry => !entry.visibilityOverride && entry.visibility.id !== target.id)
        .map(entry => entry.swrlID);
}

/**
 * Which write goes first when the default changes, chosen so a failure part
 * way never exposes more than the user asked for, and re-running the same
 * choice always finishes the job.
 *
 * - Making things more private (or no less private): rewrite the entries
 *   first, then the profile. A failure leaves some entries more private than
 *   the stored default says.
 * - Making things less private: write the profile first, then the entries. A
 *   failure leaves entries as private as they were, never more visible than
 *   the new default.
 *
 * @param {Visibility} from the current default
 * @param {Visibility} to the new default
 * @return {'entriesFirst' | 'profileFirst'}
 */
export function writeOrder(from, to) {
    return rank(to) <= rank(from) ? 'entriesFirst' : 'profileFirst';
}

/**
 * @param {Visibility} visibility
 * @return {number} 0 for the most private
 */
function rank(visibility) {
    return visibilities.findIndex(v => v.id === visibility.id);
}

/**
 * The fields to write on an entry for a per-swrl choice. Never includes
 * `updated`: choosing who sees a swrl must not move it in the list order.
 *
 * @param {Visibility | 'default'} choice a visibility, or USE_DEFAULT
 * @param {Visibility} defaultVisibility my current default
 * @return {{visibility: string, visibilityOverride: boolean}}
 */
export function entryVisibilityData(choice, defaultVisibility) {
    if (choice === USE_DEFAULT) {
        return { visibility: (defaultVisibility || DEFAULT_VISIBILITY).id, visibilityOverride: false };
    }
    return { visibility: choice.id, visibilityOverride: true };
}

/**
 * What the per-swrl control should show for an entry.
 *
 * @param {{visibility: Visibility, visibilityOverride: boolean}} entry
 * @return {Visibility | 'default'}
 */
export function currentChoice(entry) {
    return entry.visibilityOverride ? entry.visibility : USE_DEFAULT;
}

/**
 * @param {Visibility} defaultVisibility
 * @return {string} the label of the "use my default" option, e.g. "Default (Friends)"
 */
export function defaultOptionLabel(defaultVisibility) {
    return `Default (${(defaultVisibility || DEFAULT_VISIBILITY).label})`;
}

/**
 * The friendly line when a swrler's page has nothing for this viewer. It must
 * not hint whether hidden entries exist.
 *
 * @param {string | undefined} viewerUid undefined when nobody is signed in
 * @param {string} ownerUid
 * @param {string | undefined} ownerName
 * @param {boolean} isFriend whether the viewer is an accepted friend of the owner
 * @return {string}
 */
export function emptySwrlerMessage(viewerUid, ownerUid, ownerName, isFriend) {
    if (viewerUid && viewerUid === ownerUid) return 'No Swrls to see here :(';
    if (viewerUid && isFriend) return 'Nothing here yet.';
    return `${ownerName || 'This swrler'} only shares swrls with friends, or has nothing public here.`;
}
