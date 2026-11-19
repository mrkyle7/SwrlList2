import { Type, typeFromId } from "../constants/Type";
import { Category, categoryFromId } from "../constants/Category";
import { Visibility, visibilityFromId, DEFAULT_VISIBILITY } from "../constants/Visibility";
import { Details } from "./details";
import { Swrl } from "./swrl";
import { assertObjectHasDefinedProperty } from '../utils/propertyChecker'

/**
 * One user's state for one swrl: swrlers/{uid}/listEntries/{swrlID}.
 * The shared swrls/{swrlID} document no longer says who has what.
 */
export class ListEntry {
    /**
     * @param {string} uid owner of the entry
     * @param {string} swrlID
     * @param {Type} type
     * @param {Category} category
     * @param {Details} details denormalised copy so a list renders from entries alone
     * @param {boolean} [later]
     * @param {boolean} [done]
     * @param {boolean} [loved]
     * @param {boolean} [deleted]
     * @param {Date} [added]
     * @param {Date} [updated]
     * @param {Visibility} [visibility] the effective visibility; defaults to DEFAULT_VISIBILITY
     * @param {boolean} [visibilityOverride] true when the user chose it for this swrl
     * @param {boolean} [inProgress] started (watching, reading, ...); only while on the list
     */
    constructor(uid, swrlID, type, category, details, later, done, loved, deleted, added, updated, visibility, visibilityOverride, inProgress) {
        this.uid = uid;
        this.swrlID = swrlID;
        this.type = type;
        this.category = category;
        this.details = details;
        this.later = later === true;
        this.inProgress = inProgress === true;
        this.done = done === true;
        this.loved = loved === true;
        this.deleted = deleted === true;
        this.added = added;
        this.updated = updated;
        this.visibility = visibility || DEFAULT_VISIBILITY;
        this.visibilityOverride = visibilityOverride === true;
    }

    /**
     * The data for a write to the entry. `added` and `updated` are left to the
     * caller, who passes `serverTimestamp()` (this model does not import
     * Firebase). Leave `added` out on a merge write to an existing entry so
     * it keeps its original value.
     *
     * @param {any} [updated] normally serverTimestamp()
     * @param {any} [added] normally serverTimestamp(), only when creating
     * @return {Object}
     */
    toFirestoreData(updated, added) {
        const data = {
            swrlID: this.swrlID,
            uid: this.uid,
            type: this.type.id,
            category: this.category.id,
            details: this.details.toJSON(),
            later: this.later,
            inProgress: this.inProgress,
            done: this.done,
            loved: this.loved,
            deleted: this.deleted,
            visibility: this.visibility.id,
            visibilityOverride: this.visibilityOverride
        };
        if (added !== undefined) data.added = added;
        if (updated !== undefined) data.updated = updated;
        return data;
    }

    /**
     * Whether a viewer may see this entry, given the viewer's relationship to
     * the owner. Mirrors firestore.rules.
     *
     * @param {string | undefined} viewerUid undefined when not signed in
     * @param {boolean} isFriend whether the viewer is an accepted friend of the owner
     * @return {boolean}
     */
    isVisibleTo(viewerUid, isFriend) {
        const allowed = visibilitiesViewerMayQuery(viewerUid, this.uid, isFriend);
        return allowed === undefined || allowed.includes(this.visibility.id);
    }

    /**
     * The entry as a Swrl, so the existing rendering code can show it when
     * the shared document is missing. The counts only cover this owner's own
     * flags, since that is all the entry knows.
     *
     * @return {Swrl}
     */
    toSwrl() {
        return new Swrl(this.type, this.category, this.swrlID, this.details, this.added, this.updated, [],
            this.later ? 1 : 0, this.done ? 1 : 0, this.loved ? 1 : 0);
    }

    /**
     * @param {Object} json
     * @return {ListEntry}
     */
    static fromFirestore(json) {
        ['uid', 'swrlID', 'type', 'category', 'details'].forEach(p => assertObjectHasDefinedProperty(json, p));
        const type = typeFromId(json.type);
        const category = categoryFromId(json.category);
        const details = Details.fromJSON(json.details);
        const added = json.added !== undefined && json.added != null ? json.added.toDate() : undefined;
        const updated = json.updated !== undefined && json.updated != null ? json.updated.toDate() : undefined;
        return new ListEntry(json.uid, json.swrlID, type, category, details,
            json.later === true, json.done === true, json.loved === true, json.deleted === true,
            added, updated, visibilityFromId(json.visibility), json.visibilityOverride === true, json.inProgress === true);
    }
}

/**
 * The visibilities a viewer may ask for in a query on one owner's entries.
 * Firestore rules are not filters, so a query must carry a matching
 * `visibility in [...]` constraint or it is refused outright.
 *
 * @param {string | undefined} viewerUid undefined when not signed in
 * @param {string} ownerUid
 * @param {boolean} isFriend whether the viewer is an accepted friend of the owner
 * @return {string[] | undefined} stored visibility values, or undefined for
 *         all of them (the owner), meaning no constraint is needed
 */
export function visibilitiesViewerMayQuery(viewerUid, ownerUid, isFriend) {
    if (viewerUid && viewerUid === ownerUid) return undefined;
    if (viewerUid && isFriend) return ['public', 'friends'];
    return ['public'];
}

/**
 * The effective visibility to store on an entry: the user's own choice for
 * this swrl when they made one, otherwise their default.
 *
 * @param {Visibility} defaultVisibility the owner's default
 * @param {boolean} visibilityOverride whether the entry has its own choice
 * @param {Visibility} [current] the entry's stored visibility
 * @return {Visibility}
 */
export function effectiveVisibility(defaultVisibility, visibilityOverride, current) {
    return visibilityOverride && current ? current : (defaultVisibility || DEFAULT_VISIBILITY);
}


/**
 * The comparison value of an entry for a Sort column. Dates still waiting for
 * the server (a fresh local write) are undefined and count as newest.
 *
 * @param {ListEntry} entry
 * @param {string} column 'details.title', 'added' or 'updated' (see constants/Sort)
 * @return {string | number}
 */
function sortValue(entry, column) {
    if (column === 'details.title') return (entry.details.title || '').toLowerCase();
    const date = column === 'added' ? entry.added : entry.updated;
    return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

/**
 * Sorts entries on the client, the same way the old Firestore `orderBy` on
 * the shared swrls did, except titles compare case-insensitively. Returns a
 * new array; ties break on swrlID so the order is stable.
 *
 * @param {ListEntry[]} entries
 * @param {{column: string, direction: 'asc' | 'desc'}} sort
 * @return {ListEntry[]}
 */
export function sortListEntries(entries, sort) {
    const factor = sort.direction === 'desc' ? -1 : 1;
    return [...entries].sort((a, b) => {
        const left = sortValue(a, sort.column);
        const right = sortValue(b, sort.column);
        if (left < right) return -factor;
        if (left > right) return factor;
        return a.swrlID < b.swrlID ? -1 : a.swrlID > b.swrlID ? 1 : 0;
    });
}

/**
 * Combines entries from several sources (mine, public, later friends'),
 * keeping one entry per owner. The first source to mention a uid wins, so
 * pass the most trusted source first.
 *
 * @param {ListEntry[][]} sources
 * @return {ListEntry[]}
 */
export function mergeEntriesByUid(...sources) {
    /** @type {Map<string, ListEntry>} */
    const byUid = new Map();
    sources.forEach(entries => entries.forEach(entry => {
        if (!byUid.has(entry.uid)) byUid.set(entry.uid, entry);
    }));
    return [...byUid.values()];
}
