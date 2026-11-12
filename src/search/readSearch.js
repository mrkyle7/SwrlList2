import { BOOK } from '../constants/Type';
import { READ } from '../constants/Category';
import { Search } from './search';
import { Swrl } from '../model/swrl';
import { OpenLibraryBookDetailGetter } from '../detailGetters/openLibraryBookDetailGetter';

const MAX_RESULTS = 20;

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
    async run(query, signal, id) {
        const encodedQuery = encodeURIComponent(query);
        // Open Library only returns the fields that are asked for, and isbn
        // is not one of the defaults.
        const url = `https://openlibrary.org/search.json?q=${encodedQuery}&fields=key,title,isbn&limit=${MAX_RESULTS}`;
        let response;
        try {
            response = await fetch(url, { signal });
        } catch (err) {
            if (signal && signal.aborted) {
                // Superseded by a newer search; the caller ignores stale ids.
                return { id: id, results: [] };
            }
            throw err;
        }
        if (!response.ok) {
            throw new Error(`Open Library search failed with HTTP ${response.status}`);
        }
        const data = await response.json();
        /** @type {string[]} */
        const isbns = (data.docs || [])
            .filter(doc => doc.isbn && doc.isbn.length > 0)
            .slice(0, MAX_RESULTS)
            .map(doc => doc.isbn[0]);

        const detailGetter = new OpenLibraryBookDetailGetter();
        // Look the books up in parallel; a book Open Library has no details
        // for is dropped rather than failing the whole search.
        const swrls = await Promise.all(isbns.map(isbn =>
            detailGetter.get(isbn, signal, id)
                .then(getterResponse => new Swrl(BOOK, READ, 'OPENLIBRARY-ISBN_' + isbn, getterResponse.details))
                .catch(() => undefined)));

        return { id: id, results: swrls.filter(swrl => swrl !== undefined) };
    }
}
