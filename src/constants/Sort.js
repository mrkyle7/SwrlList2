import { Constant } from "./Constant";

export class Sort extends Constant {
    /**
     * @param {number} id
     * @param {string} column
     * @param {firebase.firestore.OrderByDirection} direction
     */
    constructor(id, column, direction) {
        super(id)
        this.column = column;
        this.direction = direction;
    }
}


export const alphabetical = new Sort(
    1,
    "details.title",
    "asc"
)

export const recentlyAdded = new Sort(
    2,
    "added",
    "desc"
)

export const recentlyUpdated = new Sort(
    3,
    "updated",
    "desc"
)

export const sorts = Object.freeze([recentlyAdded, recentlyUpdated, alphabetical])

export const sortFromId =
    /**
     * @param {number} id
     * @return {Sort}
     */
    (id) => {
        return sorts.find(f => f.id === id);
    }