import { Constant } from "./Constant";
import { DetailGetter } from "../detailGetters/detailGetter";
import { TmdbFilmDetailGetter } from "../detailGetters/tmdbFilmDetailGetter";

export class Type extends Constant {
    /**
     * @param {number} id
     * @param {string} name
     * @param {string} geekType
     * @param {DetailGetter} detailGetter
     */
    constructor(id, name, geekType, detailGetter) {
        super(id);
        this.name = name;
        this.geekType = geekType;
        this.detailGetter = detailGetter;
        Object.freeze(this);
    }
}

export const FILM = new Type(
    1,
    'FILM',
    null,
    new TmdbFilmDetailGetter()
)
export const TV = new Type(
    2,
    'TV',
    null,
    new DetailGetter()
)
export const BOOK = new Type(
    3,
    'BOOK',
    null,
    new DetailGetter()

)
export const PODCAST = new Type(
    4,
    'PODCAST',
    null,
    new DetailGetter()

)
export const ALBUM = new Type(
    5,
    'ALBUM',
    null,
    new DetailGetter()

)
export const BOARDGAME = new Type(
    6,
    'BOARDGAME',
    'boardgame',
    new DetailGetter()

)
export const VIDEOGAME = new Type(
    7,
    'VIDEO GAME',
    'videogame',
    new DetailGetter()
)

export const types = Object.freeze([FILM, TV, BOOK, PODCAST, ALBUM, BOARDGAME, VIDEOGAME])

export const typeFromId =
    /**
     * @param {number} id
     * @return {Type}
     */
    (id) => {
        return types.find(t => t.id === id);
    }