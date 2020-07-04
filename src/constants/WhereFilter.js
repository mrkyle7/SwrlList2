import { Constant } from "./Constant";
import { FILM, ALBUM, BOOK, TV, PODCAST, BOARDGAME, VIDEOGAME } from "./Type";

export class WhereFilter extends Constant {
    /**
     * @param {number} id
     * @param {string} column
     * @param {any} value
     */
    constructor(id, column, value) {
        super(id);
        this.column = column;
        this.value = value;
    }
}

export const FILM_FILTER = new WhereFilter(1, "type", FILM.id);
export const TV_FILTER = new WhereFilter(2, "type", TV.id);
export const BOOK_FILTER = new WhereFilter(3, "type", BOOK.id);
export const ALBUM_FILTER = new WhereFilter(4, "type", ALBUM.id);
export const PODCAST_FILTER = new WhereFilter(5, "type", PODCAST.id);
export const BOARDGAME_FILTER = new WhereFilter(6, "type", BOARDGAME.id);
export const VIDEOGAME_FILTER = new WhereFilter(7, "type", VIDEOGAME.id);

export const whereFilters = Object.freeze([FILM_FILTER, TV_FILTER, BOOK_FILTER, ALBUM_FILTER, PODCAST_FILTER, BOARDGAME_FILTER, VIDEOGAME_FILTER])

export const whereFilterFromId =
    /**
     * @param {number} id
     * @return {WhereFilter}
     */
    (id) => {
        return whereFilters.find(f => f.id === id);
    }