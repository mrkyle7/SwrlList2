import { BOOK } from '../constants/Type';
import { READ } from '../constants/Category';
import { Search } from './search';
import { Swrl } from '../model/swrl';
import { Details } from '../model/details';
import { Link } from '../model/link';

const MAX_RESULTS = 20;

export class ReadSearch extends Search {

    constructor() {
        super();
    }

    /**
     * @param {string} query
     * @param {AbortSignal} signal
     * @param {number} id
     * @return {Promise<{id: number, results: Swrl[], failed?: string[]}>}      
     */
    async run(query, signal, id) {
        try {
            return await this.search(query, signal, id);
        } catch (error) {
            if (signal && signal.aborted) return { id: id, results: [] };
            console.error(error);
            return { id: id, results: [], failed: ['books'] };
        }
    }

    /**
     * One request: Open Library's search answers with enough for a card
     * (title, author, year, cover, subjects), so there is no lookup per book.
     * The swrl page fetches the full details (OpenLibraryBookDetailGetter)
     * when it opens, as it does for every source.
     *
     * @param {string} query
     * @param {AbortSignal} signal
     * @param {number} id
     * @return {Promise<{id: number, results: Swrl[]}>}
     */
    async search(query, signal, id) {
        const encodedQuery = encodeURIComponent(query);
        // Open Library only returns the fields that are asked for, and isbn
        // is not one of the defaults.
        const url = `https://openlibrary.org/search.json?q=${encodedQuery}&fields=${SEARCH_FIELDS}&limit=${MAX_RESULTS}`;
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
        return { id: id, results: booksFromSearch(data.docs || []) };
    }
}

/** What the search asks Open Library for: enough to show a book's card. */
export const SEARCH_FIELDS = 'key,title,isbn,author_name,first_publish_year,cover_i,subject';
/** How many subjects a card keeps (the genre filter uses them). */
const SUBJECTS_KEPT = 10;

/**
 * Books from Open Library search results, keyed by ISBN as before (the
 * swrl id stays `OPENLIBRARY-ISBN_<isbn>`), so they match swrls already saved.
 * Results without an ISBN are left out: the details page needs one.
 *
 * @param {any[]} docs
 * @return {Swrl[]}
 */
export function booksFromSearch(docs) {
    return docs
        .filter(doc => doc && doc.isbn && doc.isbn.length > 0)
        .slice(0, MAX_RESULTS)
        .map(doc => {
            const isbn = String(doc.isbn[0]);
            const links = doc.key ? [new Link(`https://openlibrary.org${doc.key}`, 'Open Library', 'img/openlibrary-logo.svg')] : [];
            const details = new Details(isbn,
                (doc.title || '').replace(/\s\s+/g, ' ').trim() || 'No title',
                doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : 'img/NoPoster.jpg',
                undefined,
                doc.author_name && doc.author_name.length > 0 ? doc.author_name[0] : 'Unknown',
                doc.first_publish_year ? String(doc.first_publish_year) : undefined,
                (doc.subject || []).slice(0, SUBJECTS_KEPT),
                links,
                undefined, undefined, [], [], undefined, [], [], undefined,
                undefined, undefined, undefined, [], [], [], [], undefined, undefined, undefined);
            return new Swrl(BOOK, READ, 'OPENLIBRARY-ISBN_' + isbn, details);
        });
}
