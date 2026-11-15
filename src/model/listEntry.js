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
     */
    constructor(uid, swrlID, type, category, details, later, done, loved, deleted, added, updated, visibility, visibilityOverride) {
        this.uid = uid;
        this.swrlID = swrlID;
        this.type = type;
        this.category = category;
        this.details = details;
        this.later = later === true;
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
     * The entry as a Swrl, so the existing rendering code can show it. The
     * uid arrays hold only the owner, and only for the flags that are set.
     *
     * @return {Swrl}
     */
    toSwrl() {
        const mine = [this.uid];
        return new Swrl(this.type, this.category, this.swrlID, this.details, this.added,
            this.later ? mine : [], this.done ? mine : [], this.deleted ? mine : [], this.loved ? mine : [],
            this.updated, [], []);
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
            added, updated, visibilityFromId(json.visibility), json.visibilityOverride === true);
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
