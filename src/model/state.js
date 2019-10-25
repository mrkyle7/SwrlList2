import { Category } from "../constants/Category";
import { View } from "../views/View";
import { Swrl } from "./swrl";

export class State {
    /**
     * @param {View} view
     * @param {Category} selectedCategory
     * @param {string} searchTerms
     * @param {Swrl} swrl
     */
    constructor(view, selectedCategory, searchTerms, swrl) {
        this.view = view;
        this.selectedCategory = selectedCategory;
        this.searchTerms = searchTerms;
        this.swrl = swrl;
    }
}