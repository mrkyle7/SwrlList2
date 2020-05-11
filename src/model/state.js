import { Category } from "../constants/Category";
import { UIView } from "../views/UIView";
import { Swrl } from "./swrl";

export class State {

    /** @type {UIView} */
    view;
    /** @type {Category} */
    selectedCategory;
    searchTerms = '';
    /** @type {Swrl} */
    swrl;
    numberOfSwrlsToDisplay = 20;

    /**
     * @param {UIView} view
     */
    constructor(view) {
        this.view = view;
    }
}