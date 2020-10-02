import { Constant } from "./Constant";
import { DetailGetter } from "../detailGetters/detailGetter";
import { TmdbFilmDetailGetter } from "../detailGetters/tmdbFilmDetailGetter";
import { TmdbTVDetailGetter } from "../detailGetters/tmdbTVDetailGetter";
import { OpenLibraryBookDetailGetter } from "../detailGetters/openLibraryBookDetailGetter";
import { GeekDetailGetter } from "../detailGetters/geekDetailGetter";
import { ItunesAlbumGetter } from "../detailGetters/itunesAlbumGetter";
import { ItunesPodcastGetter } from "../detailGetters/itunesPodcastGetter";

export class Type extends Constant {
    /**
     * @param {number} id
     * @param {string} name
     * @param {string} displayName
     * @param {string} geekType
     * @param {DetailGetter} detailGetter
     */
    constructor(id, name, displayName, geekType, detailGetter) {
        super(id);
        this.name = name;
        this.displayName = displayName;
        this.geekType = geekType;
        this.detailGetter = detailGetter;
        Object.freeze(this);
    }
}

export const FILM = new Type(
    1,
    'FILM',
    'film',
    null,
    new TmdbFilmDetailGetter()
)
export const TV = new Type(
    2,
    'TV',
    'TV show',
    null,
    new TmdbTVDetailGetter()
)
export const BOOK = new Type(
    3,
    'BOOK',
    'book',
    null,
    new OpenLibraryBookDetailGetter()
)
export const PODCAST = new Type(
    4,
    'PODCAST',
    'podcast',
    null,
    new ItunesPodcastGetter()
)
export const ALBUM = new Type(
    5,
    'ALBUM',
    'album',
    null,
    new ItunesAlbumGetter()
)
export const BOARDGAME = new Type(
    6,
    'BOARDGAME',
    'board game',
    'boardgame',
    new GeekDetailGetter('boardgame')
)
export const VIDEOGAME = new Type(
    7,
    'VIDEO GAME',
    'video game',
    'videogame',
    new GeekDetailGetter('videogame')
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