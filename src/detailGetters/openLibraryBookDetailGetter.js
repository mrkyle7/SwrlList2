import { DetailGetter } from "./detailGetter";
import { Details } from "../model/details";
import { Link } from "../model/link";

export class OpenLibraryBookDetailGetter extends DetailGetter {
    constructor() {
        super();
    }

    /**
     * @param {string} id
     * @param {AbortSignal} signal
     * @param {number} searchId
     * @return {Promise<{id: number, details: Details}>}
     */
    get(id, signal, searchId) {
        // to be overidden
        return new Promise(async (resolve, reject) => {
            const url = "https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys=ISBN:" + id;

            try {
                const response = await fetch(url, { signal });
                const json = await response.json();
                const data = json['ISBN:' + id];

                const links = [
                    new Link(data.url, 'Open Library', 'img/openlibrary-logo.svg')
                ];

                if (data.links) {
                    data.links.forEach(link => {
                        links.push(new Link(link.url, link.title, undefined));
                    })
                }

                const title = data.title.replace(/'\r\n/g, ' ').replace(/\s\s*/g, ' ');

                resolve(
                    {
                        id: searchId,
                        details: new Details(id,
                            title || 'No title',
                            data.cover ? data.cover.large : 'img/NoPoster.jpg',
                            undefined,
                            data.authors ? data.authors[0].name : 'Unknown',
                            releaseYear(data.publish_date), 
                            data.subjects ? data.subjects.map(s => s.name) : [],
                            links,
                            data.subtitle,
                            undefined,
                            [],
                            undefined,
                            [],
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            [],
                            [],
                            [],
                            [],
                            undefined,
                            undefined,
                            undefined
                        )
                    }
                )
            } catch (err) {
                console.error('Error getting details from TMDB for movie ID: ' + id);
                console.error(err);
                reject(err);
            }
        });
    }
}

/**
* @param {string} releaseDate
*/
const releaseYear = (releaseDate) => {
    if (releaseDate !== undefined && releaseDate !== null && releaseDate.length > 4) {
        return releaseDate.substring(releaseDate.length - 4, releaseDate.length);
    } else {
        return releaseDate;
    }
}