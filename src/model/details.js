import { assertObjectHasDefinedProperty } from "../utils/propertyChecker";
import { Link } from "./link";
import { Rating } from "./rating";

export class Details {
    /**
     * @param {string} id
     * @param {string} title
     * @param {string} imageUrl
     * @param {string} artist
     * @param {string} author
     * @param {string} releaseYear
     * @param {string[]} genres
     * @param {Link[]} links
     * @param {string} tagline
     * @param {string} overview
     * @param {string[]} actors
     * @param {string} director
     * @param {Rating[]} ratings
     * @param {string} runtime
     * 
     */
    constructor(id, title, imageUrl, artist, author, releaseYear,
        genres, links, tagline, overview, actors, director, ratings, runtime) {
        this.id = id;
        this.title = title;
        this.imageUrl = imageUrl;
        this.artist = artist;
        this.author = author;
        this.releaseYear = releaseYear;
        this.genres = genres
        this.links = links;
        this.tagline = tagline;
        this.overview = overview;
        this.actors = actors;
        this.director = director;
        this.ratings = ratings;
        this.runtime = runtime;
    }

    /**
     * @return {Object}
     */
    toJSON() {
        const json = {};
        Object.keys(this).forEach(key => {
            if (key === 'links' || key === 'ratings') {
                const specialArray = [];
                this[key].forEach(obj => {
                    const special = {};
                    Object.keys(obj).forEach(key => {
                        if (!(obj[key] instanceof Function)
                            && obj[key] !== undefined
                            && obj[key] !== null) {
                            special[key] = obj[key];
                        }
                    })
                    specialArray.push(special);
                });
                json[key] = specialArray;
            }
            else if (!(this[key] instanceof Function)
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
        const links = [];
        if (json.links !== undefined) {
            json.links.forEach(
                /**
                  * @param {{ url: string; name: string; logo: string; }} link
                */
                link => {
                    links.push(new Link(link.url, link.name, link.logo));
                })
        }
        const ratings = [];
        if (json.ratings !== undefined) {
            json.ratings.forEach(
                /**
                  * @param {{ source: string; rating: string; logo: string; }} rating
                */
                rating => {
                    ratings.push(new Rating(rating.source, rating.rating, rating.logo))
                }
            )
        }
        return new Details(json.id, json.title, json.imageUrl, json.artist, json.author, json.releaseYear,
            json.genres || [],
            links, json.tagline, json.overview,
            json.actors || [], json.director, ratings, json.runtime);
    }

    /** @return {string} */
    getFullTitle() {
        return this.releaseYear !== undefined ?
            `${this.title} (${this.releaseYear})` : this.title;
    }
}