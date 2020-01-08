import { BOOK } from '../constants/Type';
import { READ } from '../constants/Category';
import { Search } from './search';
import { Swrl } from '../model/swrl';
import { Details } from '../model/details';
import { Link } from '../model/link';

export class ReadSearch extends Search {

    constructor() {
        super();
    }

    /**
     * @param {string} query
     * @param {AbortSignal} signal
     * @param {number} id
     * @return {Promise<{id: number, results: Swrl[]}>}      
     */
    run(query, signal, id) {
        return new Promise(async function (resolve, reject) {
            const encodedQuery = encodeURIComponent(query);
            const url = "https://openlibrary.org/search.json?q=" + encodedQuery;
            const response = await fetch(url, { signal });
            const data = await response.json();
            const results = [];
            const apiResults = data.docs;
            if (apiResults) {
                const maxResults = apiResults.length < 20 ? apiResults.length : 20;
                for (let index = 0; index < maxResults; index++) {
                    const result = apiResults[index];
                    if (!result.isbn) {
                        continue;
                    }
                    const isbn = result.isbn[0];
                    const url = "https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys=ISBN:" + isbn;
                    const response = await fetch(url, { signal });
                    const json = await response.json();
                    const data = json['ISBN:' + isbn];
                    const imageUrl = getImageUrl(data);
                    const title = result.title.replace(/'\r\n/g, ' ').replace(/\s\s*/g, ' ');
                    const links = [
                        new Link(data.url, 'Open Library', 'img/openlibrary-logo.svg')
                    ];
    
                    if (data.links !== undefined && data.links !== null) {
                        data.links.forEach(link => {
                            links.push(new Link(link.url, link.title, undefined));
                        })
                    }
                    results.push(
                        new Swrl(BOOK, READ, 'OPENLIBRARY-ISBN_' + isbn,
                            new Details(isbn, title || 'No title',
                                imageUrl || 'img/NoPoster.jpg',
                                undefined, result.author_name ? result.author_name[0] : 'Unknown',
                                releaseYear(data.first_air_date),
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
                                []))
                    );
                }
            }
            resolve({ id: id, results: results });
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

/**
 * @param {any} data
 * @return {string}
 */
function getImageUrl(data) {
    const covers = data.cover;
    if (covers) {
        return covers.large;
    } else {
        return undefined;
    }
}