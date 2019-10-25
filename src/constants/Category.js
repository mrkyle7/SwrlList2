import { WatchSearch } from '../search/watchSearch';
import { ReadSearch } from '../search/readSearch';
import { ListenSearch } from '../search/listenSearch';
import { PlaySearch } from '../search/playSearch';
import { Constant } from './Constant';
import { Search } from '../search/search';

export class Category extends Constant {
    /**
     * @param {number} id
     * @param {string} name
     * @param {string} displayName
     * @param {string} noSwrlsMessage
     * @param {string} noSwrlsDiscoverMessage
     * @param {string} searchMessage
     * @param {string} searchPlaceholder
     * @param {Search} search
     * @param {string} colour
     */
    constructor(id, name, displayName, noSwrlsMessage, noSwrlsDiscoverMessage, searchMessage, searchPlaceholder, search, colour) {
        super(id);
        this.name = name;
        this.displayName = displayName;
        this.noSwrlsMessage = noSwrlsMessage;
        this.noSwrlsDiscoverMessage = noSwrlsDiscoverMessage;
        this.searchMessage = searchMessage;
        this.searchPlaceholder = searchPlaceholder;
        this.search = search;
        this.colour = colour;
        Object.freeze(this);
    }
}

export const WATCH = new Category(
    1,
    'watch',
    'Watch',
    'Nothing to watch :( Try searching or discover a TV show or movie!',
    'Nothing to watch :( Try searching for a TV show or movie!',
    'Search for a TV show or movie',
    'Search by title',
    new WatchSearch(),
    '#3EB283');

export const READ = new Category(
    2,
    'read',
    'Read',
    'Nothing to read :( Try searching or discover a book!',
    'Nothing to read :( Try searching for a book!',
    'Search for a book',
    'Search by title or author',
    new ReadSearch(),
    '#F6A900');

export const LISTEN = new Category(
    3,
    'listen',
    'Listen',
    'Nothing to listen to :( Try searching or discover an album or podcast!',
    'Nothing to listen to :( Try searching for an album or podcast!',
    'Search for an album or podcast',
    'Search by title or artist',
    new ListenSearch(),
    '#b042f4');

export const PLAY = new Category(
    4,
    'play',
    'Play',
    'Nothing to play :( Try searching or discover a boardgame or video game!',
    'Nothing to play :( Try searching for a boardgame or video game!',
    'Search for a boardgame or video game',
    'Search by title',
    new PlaySearch(),
    '#71A8D6');

export const Categories = Object.freeze([WATCH, READ, LISTEN, PLAY]);

export const categoryFromId =
    /**
     * @param {number} id
     * @return {Category}
     */
    (id) => {
        return Categories.find(c => c.id === id);
    }