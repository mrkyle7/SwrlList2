import { Category } from "../constants/Category";
import { UIView } from "../views/UIView";
import { Swrl } from "./swrl";
import { recentlyUpdated } from "../constants/Sort";
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
    sort = recentlyUpdated;
    /** @type {Filter[]} */
    filters = [];
    /** @type {WhereFilter} */
    typeFilter = undefined;
    /** My private labels to filter my list by; a swrl must have them all.
     * @type {string[]} */
    labelFilters = [];
    /** Genres to filter my list by; a swrl needs at least one of them.
     * @type {string[]} */
    genreFilters = [];
    /** Which part of my list a category's Your list shows (model/listStates.js).
     * @type {import('./listStates').ListStateID} */
    listState = 'later';
    
    /** @type {import('firebase/auth').User} */
    swrler;

    /** When a swrl was opened from a link someone shared: who sent it and what they said.
     * @type {{fromName: string, message: string} | undefined} */
    share = undefined;

    /**
     * @param {UIView} view
     */
    constructor(view) {
        this.view = view;
        this.id = Math.random()
    }
}