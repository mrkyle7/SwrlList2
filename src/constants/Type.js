import { Constant } from "./Constant";
import { Attribution, TMDB_ATTRIBUTION, BGG_ATTRIBUTION, OSM_ATTRIBUTION } from "./Attribution";
import { DetailGetter } from "../detailGetters/detailGetter";
import { TmdbFilmDetailGetter } from "../detailGetters/tmdbFilmDetailGetter";
import { TmdbTVDetailGetter } from "../detailGetters/tmdbTVDetailGetter";
import { OpenLibraryBookDetailGetter } from "../detailGetters/openLibraryBookDetailGetter";
import { GeekDetailGetter } from "../detailGetters/geekDetailGetter";
import { ItunesAlbumGetter } from "../detailGetters/itunesAlbumGetter";
import { ItunesPodcastGetter } from "../detailGetters/itunesPodcastGetter";
import { OsmPlaceGetter } from "../detailGetters/osmPlaceGetter";

export class Type extends Constant {
    /**
     * @param {number} id
     * @param {string} name
     * @param {string} displayName
     * @param {string} geekType
     * @param {DetailGetter} detailGetter
     * @param {Attribution} [attribution] credit the data source requires
     */
    constructor(id, name, displayName, geekType, detailGetter, attribution) {
        super(id);
        this.name = name;
        this.displayName = displayName;
        this.geekType = geekType;
        this.detailGetter = detailGetter;
        this.attribution = attribution;
        Object.freeze(this);
    }
}

export const FILM = new Type(
    1,
    'FILM',
    'film',
    null,
    new TmdbFilmDetailGetter(),
    TMDB_ATTRIBUTION
)
export const TV = new Type(
    2,
    'TV',
    'TV show',
    null,
    new TmdbTVDetailGetter(),
    TMDB_ATTRIBUTION
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
    new GeekDetailGetter('boardgame'),
    BGG_ATTRIBUTION
)
export const VIDEOGAME = new Type(
    7,
    'VIDEO GAME',
    'video game',
    'videogame',
    new GeekDetailGetter('videogame'),
    BGG_ATTRIBUTION
)

/** A place to eat (restaurant, café, pub, ...) from OpenStreetMap; its card says which kind. */
export const RESTAURANT = new Type(
    8,
    'RESTAURANT',
    'restaurant',
    null,
    new OsmPlaceGetter(),
    OSM_ATTRIBUTION
)

export const types = Object.freeze([FILM, TV, BOOK, PODCAST, ALBUM, BOARDGAME, VIDEOGAME, RESTAURANT])

export const typeFromId =
    /**
     * @param {number} id
     * @return {Type}
     */
    (id) => {
        return types.find(t => t.id === id);
    }

/**
 * How a type is written on a card: its display name in sentence case
 * ("Film", "TV show", "Board game").
 *
 * @param {Type} type
 * @return {string}
 */
export const typeLabel = (type) => type.displayName.charAt(0).toUpperCase() + type.displayName.slice(1);

/**
 * What a card calls a swrl: a place to eat says which kind ("Café", "Pub"),
 * everything else its type ("Film", "Board game").
 *
 * @param {Type} type
 * @param {{place?: {kind?: string}}} [details]
 * @return {string}
 */
export const swrlKind = (type, details) => (details && details.place && details.place.kind) || typeLabel(type);
