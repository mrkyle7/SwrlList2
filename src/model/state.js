import { Category } from "../constants/Category";
import { UIView } from "../views/UIView";
import { Swrl } from "./swrl";
import { alphabetical } from "../constants/Sort";
import { Filter } from "../constants/Filter";
import { WhereFilter } from "../constants/WhereFilter";

export class State {

    /** @type {number} */
    id;
    /** @type {UIView} */
    view;
    /** @type {Category} */
    selectedCategory;
    searchTerms = '';
    /** @type {Swrl} */
    swrl;
    numberOfSwrlsToDisplay = 20;
    sort = alphabetical;
    /** @type {Filter[]} */
    filters = [];
    /** @type {WhereFilter} */
    typeFilter = undefined;
    
    /** @type {firebase.User} */
    swrler;

    /**
     * @param {UIView} view
     */
    constructor(view) {
        this.view = view;
        this.id = Math.random()
    }
}