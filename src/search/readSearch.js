import { BOOK } from '../constants/Type';
import { READ } from '../constants/Category';
import { Search } from './search';
import { Swrl } from '../model/swrl';
import { Details } from '../model/details';
import { Link } from '../model/link';
import { OpenLibraryBookDetailGetter } from '../detailGetters/openLibraryBookDetailGetter';

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
                const detailGetter = new OpenLibraryBookDetailGetter();
                const maxResults = apiResults.length < 20 ? apiResults.length : 20;
                for (let index = 0; index < maxResults; index++) {
                    const result = apiResults[index];
                    if (!result.isbn) {
                        continue;
                    }
                    const isbn = result.isbn[0];

                    const getterResponse = await detailGetter.get(isbn, signal, id);
                    const details = getterResponse.details;

                    results.push(
                        new Swrl(BOOK, READ, 'OPENLIBRARY-ISBN_' + isbn, details)
                    );
                }
            }
            resolve({ id: id, results: results });
        });
    }
}