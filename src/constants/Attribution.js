/**
 * Credit a data provider requires wherever its data is shown.
 */
export class Attribution {
    /**
     * @param {string} name
     * @param {string} url where the logo links to
     * @param {string | undefined} logo none for a credit in words only (Google Maps)
     * @param {boolean} logoOnDark the logo is drawn for a dark background
     * @param {boolean} logoSaysPoweredBy the logo already contains the words "Powered by"
     * @param {string} [notice] wording the provider requires alongside the logo
     */
    constructor(name, url, logo, logoOnDark, logoSaysPoweredBy, notice) {
        this.name = name;
        this.url = url;
        this.logo = logo;
        this.logoOnDark = logoOnDark;
        this.logoSaysPoweredBy = logoSaysPoweredBy;
        this.notice = notice;
        Object.freeze(this);
    }
}

export const TMDB_ATTRIBUTION = new Attribution(
    'The Movie Database (TMDB)',
    'https://www.themoviedb.org/',
    'img/tmdb_logo.png',
    false,
    true,
    'This product uses the TMDB API but is not endorsed or certified by TMDB.');

export const BGG_ATTRIBUTION = new Attribution(
    'BoardGameGeek',
    'https://boardgamegeek.com/',
    'img/bgg.svg',
    true,
    false);

/** Google Places data off a Google map: credited in words (the photo's author is credited on the swrl page). */
export const GOOGLE_ATTRIBUTION = new Attribution(
    'Google Maps',
    'https://www.google.com/maps',
    undefined,
    false,
    false);
