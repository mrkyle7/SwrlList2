import { zip } from '../utils/zip';
import { Search } from './search';
import { WatchSearch } from './watchSearch';
import { ReadSearch } from './readSearch';
import { ListenSearch } from './listenSearch';
import { PlaySearch } from './playSearch';

/**
 * Searches every source at once (films, TV, books, albums, podcasts, board
 * and video games) and interleaves the results, for when we do not know what
 * kind of thing the user is after. A source that fails just adds nothing.
 */
export class AllSearch extends Search {
    constructor() {
        super();
        this.searches = [new WatchSearch(), new ReadSearch(), new ListenSearch(), new PlaySearch()];
    }

    /**
     * @param {string} query
     * @param {AbortSignal} signal
     * @param {number} id
     * @return {Promise<{id: number, results: import('../model/swrl').Swrl[]}>}
     */
    async run(query, signal, id) {
        const all = await Promise.all(this.searches.map(search =>
            search.run(query, signal, id)
                .then(found => found.results)
                .catch(error => {
                    console.error(error);
                    return [];
                })));
        return { id: id, results: zip(...all) };
    }
}
