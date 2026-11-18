import { Details } from './details';
import { metaLine } from './swrlPage';

/**
 * Pure logic behind how lists of swrls are shown: compact rows or detailed
 * cards (the switch in the toolbar under the tabs), and the text on a card.
 */

/** How a list of swrls is shown. The stored string goes on the user's profile (`listView`). */
export class ListView {
    /**
     * @param {'compact' | 'detailed'} id the stored value
     * @param {string} label shown on the switch
     */
    constructor(id, label) {
        this.id = id;
        this.label = label;
    }
}

export const COMPACT = new ListView('compact', 'Compact');
export const DETAILED = new ListView('detailed', 'Detailed');

export const listViews = Object.freeze([COMPACT, DETAILED]);

/** What everyone gets until they choose otherwise: closest to the old list. */
export const DEFAULT_LIST_VIEW = COMPACT;

/**
 * Looks up a list view from its stored value. Unknown or missing values give
 * the default, so a hand-edited profile never breaks a list.
 *
 * @param {string} [id]
 * @return {ListView}
 */
export function listViewFromId(id) {
    return listViews.find(view => view.id === id) || DEFAULT_LIST_VIEW;
}

/**
 * The line under a card's title: the kind, then who made it, when and how long.
 *
 * @param {string} kind the type's label, e.g. "Film"
 * @param {Details} details
 * @return {string}
 */
export function cardMeta(kind, details) {
    const rest = metaLine(details);
    return rest ? `${kind} · ${rest}` : kind;
}

/**
 * The counts on a detailed card in words, leaving out any that are zero.
 *
 * @param {{listCount: number, recommendedCount: number, lovedCount: number}} stats
 * @return {string} empty when every count is zero
 */
export function statsSentence(stats) {
    const parts = [];
    if (stats.listCount > 0) {
        parts.push(stats.listCount === 1 ? 'On 1 list' : `On ${stats.listCount} lists`);
    }
    if (stats.recommendedCount > 0) {
        parts.push(stats.recommendedCount === 1 ? 'Swrled once' : `Swrled ${stats.recommendedCount} times`);
    }
    if (stats.lovedCount > 0) {
        parts.push(stats.lovedCount === 1 ? '1 loves it' : `${stats.lovedCount} love it`);
    }
    return parts.join(' · ');
}

/**
 * How many filters are on, for the count on the Filter button.
 *
 * @param {{typeFilter?: unknown, filters: unknown[], labelFilters: unknown[], genreFilters: unknown[]}} state
 * @return {number}
 */
export function activeFilterCount(state) {
    return (state.typeFilter ? 1 : 0) + state.filters.length + state.labelFilters.length + state.genreFilters.length;
}

/**
 * How many swrls are on my list in each category, for the home screen's
 * tiles: entries marked later, not dismissed.
 *
 * @param {{later: boolean, deleted: boolean, category: {name: string}}[]} entries
 * @return {Object<string, number>} by category name
 */
export function countsByCategory(entries) {
    /** @type {Object<string, number>} */
    const counts = {};
    entries.forEach(entry => {
        if (!entry.later || entry.deleted || !entry.category) return;
        counts[entry.category.name] = (counts[entry.category.name] || 0) + 1;
    });
    return counts;
}

/**
 * The newest recommendations sent to me, one per swrl, for the home screen.
 *
 * @param {{swrlID: string, created?: Date}[]} recommendations
 * @param {number} limit
 * @return {string[]} swrl ids, newest first
 */
export function latestRecommendedSwrls(recommendations, limit) {
    const sorted = [...recommendations].sort((a, b) =>
        (b.created ? b.created.getTime() : 0) - (a.created ? a.created.getTime() : 0));
    /** @type {string[]} */
    const ids = [];
    sorted.forEach(recommendation => {
        if (ids.length < limit && !ids.includes(recommendation.swrlID)) ids.push(recommendation.swrlID);
    });
    return ids;
}
