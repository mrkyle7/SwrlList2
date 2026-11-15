export const MAX_LABEL_LENGTH = 30;
export const MAX_LABELS_PER_SWRL = 20;

/**
 * A label as it will be stored: trimmed, inner whitespace collapsed, and
 * undefined when nothing is left or it is too long.
 *
 * @param {string} input
 * @return {string | undefined}
 */
export function cleanLabel(input) {
    const label = (input || '').trim().replace(/\s+/g, ' ');
    return label.length > 0 && label.length <= MAX_LABEL_LENGTH ? label : undefined;
}

/**
 * Labels compare without regard to case, so "Comedy" and "comedy" are one.
 * @param {string} label
 * @return {string}
 */
const key = (label) => label.toLocaleLowerCase();

/**
 * @param {string[]} labels
 * @param {string} label
 * @return {boolean}
 */
export function hasLabel(labels, label) {
    return labels.some(l => key(l) === key(label));
}

/**
 * @param {string[]} labels the swrl's labels
 * @param {string} label already cleaned
 * @return {string[] | undefined} the new list, or undefined when the label is
 *   already there or the swrl has as many labels as it may
 */
export function addLabel(labels, label) {
    if (hasLabel(labels, label) || labels.length >= MAX_LABELS_PER_SWRL) {
        return undefined;
    }
    return sortLabels([...labels, label]);
}

/**
 * @param {string[]} labels
 * @param {string} label
 * @return {string[]}
 */
export function removeLabel(labels, label) {
    return labels.filter(l => key(l) !== key(label));
}

/**
 * @param {string[]} labels
 * @return {string[]} a sorted copy, ignoring case
 */
export function sortLabels(labels) {
    return [...labels].sort((a, b) => key(a).localeCompare(key(b)));
}

/**
 * Every label used on any swrl, once each, sorted. Where two swrls spell a
 * label with different case, the first spelling met is kept.
 *
 * @param {Object<string, string[]>} labelsBySwrl
 * @return {string[]}
 */
export function allLabels(labelsBySwrl) {
    /** @type {Map<string, string>} */
    const found = new Map();
    Object.values(labelsBySwrl).forEach(labels => labels.forEach(label => {
        if (!found.has(key(label))) found.set(key(label), label);
    }));
    return sortLabels([...found.values()]);
}

/**
 * The label filter: a swrl matches when it carries every selected label.
 * No selection matches everything.
 *
 * @param {string[]} swrlLabels
 * @param {string[]} selected
 * @return {boolean}
 */
export function matchesLabels(swrlLabels, selected) {
    return selected.every(label => hasLabel(swrlLabels || [], label));
}

/**
 * Stored labels, tolerant of a missing or malformed field.
 * @param {Object} data
 * @return {string[]}
 */
export function labelsFromFirestore(data) {
    return data && Array.isArray(data.labels) ? data.labels.filter(l => typeof l === 'string' && l.length > 0) : [];
}

/**
 * What the label editor offers while the user types: my other labels that
 * contain the typed text (all of them when nothing is typed), and the typed
 * text itself as a new label when it is valid and not one I already have.
 *
 * @param {string[]} all every label I have used
 * @param {string[]} current the labels already on this swrl
 * @param {string} typed
 * @return {{existing: string[], create: string | undefined}}
 */
export function labelSuggestions(all, current, typed) {
    const cleaned = cleanLabel(typed);
    const needle = (typed || '').trim().toLocaleLowerCase();
    const existing = all.filter(label => !hasLabel(current, label)
        && key(label).includes(needle));
    const create = cleaned && !hasLabel(all, cleaned) && !hasLabel(current, cleaned) ? cleaned : undefined;
    return { existing, create };
}
