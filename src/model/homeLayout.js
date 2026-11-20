import { Category } from '../constants/Category';
import { progressWords } from './progress';

/**
 * How the home screen looks on phones and tablets (under 1025px; computers
 * always get the desktop home). The stored string goes on the user's profile
 * (`homeLayout`).
 */
export class HomeLayout {
    /**
     * @param {'tiles' | 'cards'} id the stored value
     * @param {string} label name shown on the Settings screen
     * @param {string} hint one line under the label
     */
    constructor(id, label, hint) {
        this.id = id;
        this.label = label;
        this.hint = hint;
        Object.freeze(this);
    }
}

export const TILES = new HomeLayout('tiles', 'Tiles',
    'Four big category buttons that fill the screen');
export const CARDS = new HomeLayout('cards', 'Cards',
    "What's on your list, swrls sent to you, and a bar at the bottom to switch category");

export const homeLayouts = Object.freeze([TILES, CARDS]);

/** What everyone gets until they choose otherwise: the original look. */
export const DEFAULT_HOME_LAYOUT = TILES;

/**
 * Looks up a layout from its stored value. Unknown or missing values give the
 * default, so a hand-edited profile never breaks the home screen.
 *
 * @param {any} [id]
 * @return {HomeLayout}
 */
export function homeLayoutFromId(id) {
    return homeLayouts.find(layout => layout.id === id) || DEFAULT_HOME_LAYOUT;
}

/**
 * What a home tile says about one category: how many swrls are on my list
 * and how many of them I have started ("2 watching"). Shared by the desktop
 * home and the phone cards.
 *
 * @param {number} onList
 * @param {number} started
 * @param {Category} [category]
 * @return {{onList: string, started: string}} started is '' when nothing is started
 */
export function homeTileCounts(onList, started, category) {
    if (!onList) return { onList: 'Nothing on your list yet', started: '' };
    const verb = category ? progressWords(category.id).caption.split(' ')[0] : '';
    return {
        onList: `${onList} on your list`,
        started: started > 0 && verb ? `${started} ${verb}` : ''
    };
}
