/**
 * The search button at the bottom right of phones (components/quickAdd.js):
 * what it does, chosen on Settings and kept on my profile (`quickAddButton`),
 * and the geometry of the swirl. Pure; tested in test/quickAdd.test.js.
 */

/** What the search button does. */
export class QuickAddMode {
    /**
     * @param {'search' | 'menu' | 'wheel'} id the stored value
     * @param {string} label on Settings
     * @param {string} hint on Settings
     */
    constructor(id, label, hint) {
        this.id = id;
        this.label = label;
        this.hint = hint;
        Object.freeze(this);
    }
}

export const QUICK_SEARCH = new QuickAddMode('search', 'Search everything', 'Goes straight to Search everything');
export const QUICK_MENU = new QuickAddMode('menu', 'Choose a category', 'Shows each category to search in, then you tap one');
export const QUICK_WHEEL = new QuickAddMode('wheel', 'Swirl', 'Hold and slide to a category, or let go on the button for everything');

export const quickAddModes = Object.freeze([QUICK_SEARCH, QUICK_MENU, QUICK_WHEEL]);

/** Until I choose: the categories, so one more tap lands on the right search. */
export const DEFAULT_QUICK_ADD = QUICK_MENU;

/**
 * @param {any} [id]
 * @return {QuickAddMode}
 */
export function quickAddFromId(id) {
    return quickAddModes.find(mode => mode.id === id) || DEFAULT_QUICK_ADD;
}

/**
 * Where the swirl's options sit, around the button's centre: on an arc from
 * straight left (180°) round to straight up (90°), as offsets in pixels
 * (x to the right, y down, as on screen).
 *
 * @param {number} count
 * @param {number} radius
 * @param {number} [fromDegrees] the first option's angle (0 is right, 90 up)
 * @param {number} [toDegrees] the last option's angle
 * @return {{x: number, y: number, angle: number}[]}
 */
export function wheelPositions(count, radius, fromDegrees = 180, toDegrees = 90) {
    if (count <= 0) return [];
    return Array.from({ length: count }, (_, i) => {
        const angle = count === 1 ? fromDegrees : fromDegrees + (toDegrees - fromDegrees) * i / (count - 1);
        const radians = angle * Math.PI / 180;
        return {
            x: Math.round(radius * Math.cos(radians) * 100) / 100,
            y: Math.round(-radius * Math.sin(radians) * 100) / 100,
            angle
        };
    });
}

/**
 * Which swirl option a finger at (dx, dy) from the button's centre is over:
 * 'centre' close to the button (search everything), an option's index when
 * it is out along an option's direction, or undefined in between or off to
 * the side (letting go there does nothing).
 *
 * @param {number} dx
 * @param {number} dy
 * @param {{angle: number}[]} positions
 * @param {{centre?: number, near?: number, slack?: number}} [sizes] centre: the button's
 *   reach; near: how far out an option starts to count; slack: degrees either side of one
 * @return {number | 'centre' | undefined}
 */
export function pickOption(dx, dy, positions, sizes = {}) {
    const { centre = 36, near = 64, slack = 14 } = sizes;
    const distance = Math.hypot(dx, dy);
    if (distance <= centre) return 'centre';
    if (distance < near || positions.length === 0) return undefined;
    const angle = (Math.atan2(-dy, dx) * 180 / Math.PI + 360) % 360;
    let best;
    let bestGap = Infinity;
    positions.forEach((position, i) => {
        const gap = Math.abs(((angle - position.angle + 540) % 360) - 180);
        if (gap < bestGap) {
            best = i;
            bestGap = gap;
        }
    });
    return bestGap <= slack + (positions.length > 1 ? Math.abs(positions[1].angle - positions[0].angle) / 2 : 45) ? best : undefined;
}
