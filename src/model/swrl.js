import { Type, typeFromId } from "../constants/Type";
import { Category, categoryFromId } from "../constants/Category";
import { Details } from "./details";
import { assertObjectHasDefinedProperty } from '../utils/propertyChecker'

/**
 * How many entries a legacy uid array on a pre-migration swrl document holds.
 * Used ONLY as the fallback for a missing count field; never for membership.
 *
 * @param {any} legacyArray
 * @return {number}
 */
export function legacyArrayLength(legacyArray) {
    return Array.isArray(legacyArray) ? legacyArray.length : 0;
}

/**
 * A count field from the shared document, or when it is missing (a document
 * the migration has not reached yet) the length of the legacy uid array.
 *
 * @param {any} count the `xCount` field
 * @param {any} legacyArray the old `x` uid array
 * @return {number}
 */
export function countOrLegacy(count, legacyArray) {
    return typeof count === 'number' ? count : legacyArrayLength(legacyArray);
}

/**
 * The shared swrl: details plus anonymous counts. Who has it on a list, done,
 * loved or deleted lives in the user's own list entries (see ListEntry), never here.
 */
export class Swrl {
    /**
     * @param {Type} type
     * @param {Category} category
     * @param {string} swrlID
     * @param {Details} details
     * @param {Date} [added]
     * @param {Date} [updated]
     * @param {string[]} [recommendations] recommendation doc ids
     * @param {number} [laterCount] how many users have it on their list
     * @param {number} [doneCount] how many users have done it
     * @param {number} [lovedCount] how many users love it
     */
    constructor(type, category, swrlID, details, added, updated, recommendations, laterCount, doneCount, lovedCount) {
        this.type = type;
        this.category = category;
        this.swrlID = swrlID;
        this.details = details;
        this.added = added;
        this.updated = updated;
        this.recommendations = recommendations || [];
        this.laterCount = laterCount || 0;
        this.doneCount = doneCount || 0;
        this.lovedCount = lovedCount || 0;
    }

    /**
     * The details written to the shared document. No counts and no uid arrays:
     * the rules refuse them from clients.
     *
     * @return {Object}
     */
    toPartialFireStoreData() {
        return {
            type: this.type.id,
            category: this.category.id,
            swrlID: this.swrlID,
            details: this.details.toJSON()
        };
    }

    /**
     * @param {Object} json
     * @return {Swrl}
     */
    static fromFirestore(json) {
        ['type', 'category', 'swrlID', 'details'].forEach(p => assertObjectHasDefinedProperty(json, p));
        const type = typeFromId(json.type);
        const category = categoryFromId(json.category);
        const details = Details.fromJSON(json.details);
        const added = json.added !== undefined && json.added != null ? json.added.toDate() : undefined;
        const updated = json.updated !== undefined && json.updated != null  ? json.updated.toDate() : undefined;
        return new Swrl(type, category, json.swrlID, details, added, updated, json.recommendations || [],
            countOrLegacy(json.laterCount, json.later),
            countOrLegacy(json.doneCount, json.done),
            countOrLegacy(json.lovedCount, json.loved));
    }
}
