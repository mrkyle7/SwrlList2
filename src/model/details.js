import { assertObjectHasDefinedProperty } from "../utils/propertyChecker";

export class Details {
    /**
     * @param {string} id
     * @param {string} title
     * @param {string} imageUrl
     * @param {string} artist
     * @param {string} author
     * @param {string} releaseYear
     */
    constructor(id, title, imageUrl, artist, author, releaseYear) {
        this.id = id;
        this.title = title;
        this.imageUrl = imageUrl;
        this.artist = artist;
        this.author = author;
        this.releaseYear = releaseYear;
    }

    /**
     * @param {Details} other
     * @return {boolean}
     */
    equals(other) {
        if (!(other instanceof Details)) return false;
        return this.id === other.id
            && this.title === other.title
            && this.imageUrl === other.imageUrl
            && this.artist === other.artist
            && this.author === other.author
            && this.releaseYear === other.releaseYear
    }

    /**
     * @return {Object}
     */
    toJSON() {
        const json = {};
        Object.keys(this).forEach(key => {
            if (!(this[key] instanceof Function)
                && this[key] !== undefined
                && this[key] !== null) {
                json[key] = this[key];
            }
        });
        return json;
    }

    /**
     * @param {Object} json
     * @return {Details}
     */
    static fromJSON(json) {
        ['id', 'title', 'imageUrl'].forEach(p => assertObjectHasDefinedProperty(json, p));
        return new Details(json.id, json.title, json.imageUrl, json.artist, json.author, json.releaseYear);
    }
}