import { runProgressively } from './progressive';
import { Search } from './search';
import { WatchSearch } from './watchSearch';
import { ReadSearch } from './readSearch';
import { ListenSearch } from './listenSearch';
import { PlaySearch } from './playSearch';

/**
 * Searches every source at once (films, TV, books, albums, podcasts, board
 * and video games; not places to eat) and interleaves the results, for when we do not know what
 * kind of thing the user is after. A source that fails just adds nothing.
 */
export class AllSearch extends Search {
    constructor() {
        super();
        this.searches = [new WatchSearch(), new ReadSearch(), new ListenSearch(), new PlaySearch()];
        // not places to eat: each Google search costs, and Search everything
        // runs on every pause in typing
    }

    /**
     * @param {string} query
     * @param {AbortSignal} signal
     * @param {number} id
     * @param {(batch: import('../model/swrl').Swrl[], first: boolean) => void} [onBatch]
     *   results as they arrive (see runProgressively), so the fast sources show
     *   before the slow ones have answered
     * @return {Promise<{id: number, results: import('../model/swrl').Swrl[], failed: string[]}>}
     */
    async run(query, signal, id, onBatch) {
        const { results, failed } = await runProgressively(this.searches.map(search => () =>
            search.run(query, signal, id).catch(error => {
                console.error(error);
                return { id: id, results: [], failed: [] };
            })), onBatch);
        return { id: id, results, failed };
    }
}
