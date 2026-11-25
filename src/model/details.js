import { assertObjectHasDefinedProperty } from "../utils/propertyChecker";
import { Link } from "./link";
import { Rating } from "./rating";
import { Network } from "./network";
import { TmdbPerson } from "./tmdbPerson";

/**
 * What a place to eat has that nothing else does (Eat, from Google Places).
 * Every field is optional.
 *
 * @typedef {Object} PlaceInfo
 * @property {string} [kind] "Restaurant", "Café", "Pub", ...
 * @property {string} [area] the neighbourhood or town, for cards
 * @property {string} [address] one line
 * @property {string} [openingHours] as written ("Mo-Su 12:00-23:00"); not asked of Google
 * @property {string} [phone]
 * @property {string} [website]
 * @property {number} [lat]
 * @property {number} [lon]
 * @property {string} [photoBy] who took the photo (Google asks us to say)
 * @property {string} [photoByUrl]
 */

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
     * @param {TmdbPerson[]} tMDBActors
     * @param {string} director
     * @param {TmdbPerson[]} tMDBDirectors
     * @param {Rating[]} ratings
     * @param {string} runtime
     * @param {number} numberOfSeasons
     * @param {string} averageEpisodeLength
     * @param {string} lastAirDate
     * @param {Network[]} networks
     * @param {string[]} designers
     * @param {string[]} platforms
     * @param {string[]} publishers
     * @param {string} playerCount
     * @param {string} twoPlayerRecommendation
     * @param {string} playingTime
     * 
     */
    constructor(id, title, imageUrl, artist, author, releaseYear,
        genres, links, tagline, overview, actors, tMDBActors, director, tMDBDirectors, ratings, runtime,
        numberOfSeasons, averageEpisodeLength, lastAirDate, networks,
        designers, platforms, publishers, playerCount, twoPlayerRecommendation, playingTime) {
        this.id = id;
        this.title = title;
        this.imageUrl = imageUrl;
        this.artist = artist;
        this.author = author;
        this.releaseYear = releaseYear;
        this.genres = genres || [];
        this.links = links || [];
        this.tagline = tagline;
        this.overview = overview;
        this.actors = actors || [];
        this.tMDBActors = tMDBActors || [];
        this.director = director;
        this.tMDBDirectors = tMDBDirectors || [];
        this.ratings = ratings || [];
        this.runtime = runtime;
        this.numberOfSeasons = numberOfSeasons;
        this.averageEpisodeLength = averageEpisodeLength;
        this.lastAirDate = lastAirDate;
        this.networks = networks || [];
        this.designers = designers || [];
        this.platforms = platforms || [];
        this.publishers = publishers || [];
        this.playerCount = playerCount;
        this.twoPlayerRecommendation = twoPlayerRecommendation;
        this.playingTime = playingTime;
        /** Only for places to eat. @type {PlaceInfo | undefined} */
        this.place = undefined;
    }

    /**
     * @return {Object}
     */
    toJSON() {
        const json = {};
        Object.keys(this).forEach(key => {
            if (key === 'place') {
                // Firestore refuses undefined inside a map: keep only what is there
                if (this.place) {
                    const place = {};
                    Object.keys(this.place).forEach(field => {
                        if (this.place[field] !== undefined && this.place[field] !== null) place[field] = this.place[field];
                    });
                    if (Object.keys(place).length > 0) json[key] = place;
                }
            } else if (key === 'links' || key === 'ratings' || key === 'networks'
                || key === 'tMDBActors' || key === 'tMDBDirectors') {
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
        const tMDBActors = [];
        if (json.tMDBActors !== undefined) {
            json.tMDBActors.forEach(person => {
                tMDBActors.push(new TmdbPerson(person.name, person.id, person.imageUrl))
            })
        }
        const tMDBDirectors = [];
        if (json.tMDBDirectors !== undefined) {
            json.tMDBDirectors.forEach(person => {
                tMDBDirectors.push(new TmdbPerson(person.name, person.id, person.imageUrl))
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
        const networks = [];
        if (json.networks !== undefined) {
            json.networks.forEach(
                /**
                  * @param {{ name: string; logo: string; }} network
                */
                network => {
                    networks.push(new Network(network.name, network.logo))
                }
            )
        }
        const details = new Details(json.id, json.title, json.imageUrl, json.artist, json.author, json.releaseYear,
            json.genres || [],
            links, json.tagline, json.overview,
            json.actors || [], tMDBActors, json.director, tMDBDirectors, ratings, json.runtime,
            json.numberOfSeasons, json.averageEpisodeLength, json.lastAirDate, networks,
            json.designers || [], json.platforms || [], json.publishers || [],
            json.playerCount, json.twoPlayerRecommendation, json.playingTime);
        if (json.place && typeof json.place === 'object') details.place = { ...json.place };
        return details;
    }

    /** @return {string} */
    getFullTitle() {
        return this.releaseYear !== undefined ?
            `${this.title} (${this.releaseYear})` : this.title;
    }
}