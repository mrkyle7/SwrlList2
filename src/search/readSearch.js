import { BOOK } from '../constants/Type';
import { READ } from '../constants/Category';
import { Search } from './search';
import { Swrl } from '../model/swrl';
import { Details } from '../model/details';

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
            var encodedQuery = encodeURIComponent(query);
            var url = "https://openlibrary.org/search.json?q=" + encodedQuery;
            var response = await fetch(url, { signal });
            var data = await response.json();
            var results = [];
            var apiResults = data.docs;
            if (apiResults) {
                var maxResults = apiResults.length < 20 ? apiResults.length : 20;
                for (var index = 0; index < maxResults; index++) {
                    var result = apiResults[index];
                    if (!result.isbn) {
                        continue;
                    }
                    var isbn = result.isbn[0];
                    var imageUrl = await getImageUrl(isbn, signal);
                    var title = result.title.replace(/'\r\n/g, ' ').replace(/\s\s*/g, ' ');
                    results.push(
                        new Swrl(BOOK, READ, 'OPENLIBRARY-ISBN_' + isbn,
                            new Details(isbn, title || 'No title', imageUrl || '/img/NoPoster.jpg',
                                undefined, result.author_name ? result.author_name[0] : 'Unknown',
                                undefined))
                    );
                }
            }
            resolve({ id: id, results: results });
        });
    }
}

/**
 * @param {string} isbn
 * @param {AbortSignal} signal
 */
async function getImageUrl(isbn, signal) {
    var url = "https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys=ISBN:" + isbn;
    var response = await fetch(url, { signal });
    var data = await response.json();
    var covers = data['ISBN:' + isbn].cover;
    if (covers) {
        return covers.large;
    } else {
        return undefined;
    }
}