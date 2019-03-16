export default { Category, Categories };
import { watchSearch } from '../search/watchSearch';
import { readSearch } from '../search/readSearch';
import { listenSearch } from '../search/listenSearch';
import { otherSearch } from '../search/otherSearch';

export var Category = {
    WATCH: 1,
    READ: 2,
    LISTEN: 3,
    OTHER: 4,
    properties: {
        1: {
            name: 'watch',
            noSwrlsMessage: 'Nothing to Watch :( Try Searching or Discover a TV Show or Movie!',
            noSwrlsDiscoverMessage: 'Nothing to Watch :( Try Searching for a TV Show or Movie!',
            searchMessage: 'Search for a TV Show or Movie',
            search: watchSearch
        },
        2: {
            name: 'read',
            noSwrlsMessage: 'Nothing to Read :( Try Searching or Discover a book!',
            noSwrlsDiscoverMessage: 'Nothing to Read :( Try Searching for a book!',
            searchMessage: 'Search for a book',            
            search: readSearch
        },
        3: {
            name: 'listen',
            noSwrlsMessage: 'Nothing to Watch :( Try Searching or Discover an album or podcast!',
            noSwrlsDiscoverMessage: 'Nothing to Watch :( Try Searching for an album or podcast!',
            searchMessage: 'Search for an album or podcast',
            search: listenSearch
        },
        4: {
            name: 'other',
            noSwrlsMessage: 'Nothing to see here :( Try Searching or Discover something to do!',
            noSwrlsDiscoverMessage: 'Nothing to see here :( Try Searching for something to do!',
            searchMessage: 'Search for a boardgame or video game',
            search: otherSearch
        },
    }
}
export var Categories = [Category.WATCH, Category.READ, Category.LISTEN, Category.OTHER];
Object.freeze(Category);
Object.freeze(Categories);