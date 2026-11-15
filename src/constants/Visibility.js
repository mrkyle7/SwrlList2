/**
 * Who can see one of a user's swrls. The stored string is what goes into
 * Firestore (`visibility` on a list entry, `defaultVisibility` on a swrler),
 * so never change a value once it is in use.
 */
export class Visibility {
    /**
     * @param {'private' | 'friends' | 'public'} id the stored value
     * @param {string} label human readable name
     */
    constructor(id, label) {
        this.id = id;
        this.label = label;
    }
}

export const PRIVATE = new Visibility('private', 'Private');
export const FRIENDS = new Visibility('friends', 'Friends');
export const PUBLIC = new Visibility('public', 'Public');

/** Least visible first. */
export const visibilities = Object.freeze([PRIVATE, FRIENDS, PUBLIC]);

/** What everyone gets until they choose otherwise. */
export const DEFAULT_VISIBILITY = FRIENDS;

export const visibilityFromId =
    /**
     * Looks up a visibility from its stored value. Unknown, missing or
     * malformed values give the default rather than an error, so old or
     * hand-edited data never breaks a list.
     *
     * @param {string} [id]
     * @return {Visibility}
     */
    (id) => {
        return visibilities.find(v => v.id === id) || DEFAULT_VISIBILITY;
    }
