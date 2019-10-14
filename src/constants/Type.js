import { Constant } from "./Constant";

export class Type extends Constant {
    /**
     * @param {number} id
     * @param {string} name
     * @param {string} geekType
     */
    constructor(id, name, geekType) {
        super(id);
        this.name = name;
        this.geekType = geekType;
        Object.freeze(this);
    }
}

export const FILM = new Type(
    1,
    'FILM',
    null
)
export const TV = new Type(
    2,
    'TV',
    null
)
export const BOOK = new Type(
    3,
    'BOOK',
    null
)
export const PODCAST = new Type(
    4,
    'PODCAST',
    null
)
export const ALBUM = new Type(
    5,
    'ALBUM',
    null
)
export const BOARDGAME = new Type(
    6,
    'BOARDGAME',
    'boardgame'
)
export const VIDEOGAME = new Type(
    7,
    'VIDEO GAME',
    'videogame'
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