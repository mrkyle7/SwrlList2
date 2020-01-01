import { Type, typeFromId } from "../constants/Type";
import { Category, categoryFromId } from "../constants/Category";
import { Details } from "./details";
import { assertObjectHasDefinedProperty } from '../utils/propertyChecker'

export class Swrl {
    /**
     * @param {Type} type
     * @param {Category} category
     * @param {string} swrlID
     * @param {Details} details
     * @param {Date} [added]
     * @param {string[]} [later]
     * @param {string[]} [done]
     * @param {string[]} [deleted]
     * @param {string[]} [loved]
     * @param {Date} [updated]
     * @param {string[]} [isRecommended]
     * @param {string[]} [recommendations]
     */
    constructor(type, category, swrlID, details, added, later, done, deleted, loved, updated, isRecommended, recommendations) {
        this.type = type;
        this.category = category;
        this.swrlID = swrlID;
        this.details = details;
        this.added = added;
        this.later = later || [];
        this.done = done || [];
        this.deleted = deleted || [];
        this.loved = loved || [];
        this.updated = updated;
        this.isRecommended = isRecommended || [];
        this.recommendations = recommendations || [];
    }

    /**
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
        return new Swrl(type, category, json.swrlID, details, added,
            json.later || [], json.done || [], json.deleted || [], json.loved || [], updated,
            json.isRecommended || [], json.recommendations || []);
    }
}