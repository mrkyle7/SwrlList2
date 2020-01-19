import { Category, categoryFromId } from "../constants/Category";

export class SavedSearch {
    /**
     * @param {string} searchText
     * @param {Category} category
     */
    constructor(searchText, category) {
        this.searchText = searchText;
        this.category = category;
    }

    /**
     * @param {Object} json
     * @return {SavedSearch}
     */
    static fromJson(json) {
        return new SavedSearch(
            json.searchText,
            categoryFromId(json.category)
        )
    }
}