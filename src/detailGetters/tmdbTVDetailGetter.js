import { DetailGetter } from "./detailGetter";
import { Details } from "../model/details";
import { Link } from "../model/link";
import { Network } from "../model/network";


const tmdbAPIKey = 'c3356e66739e40233c7870d42b30bc34';
const imageUrlPrefix = 'https://image.tmdb.org/t/p/original';

export class TmdbTVDetailGetter extends DetailGetter {
    constructor() {
        super();
    }

    /**
     * @param {string} id
     * @param {AbortSignal} signal
     * @param {number} searchId
     * @return {Promise<{id: number, details: Details}>}
     */
    get(id, signal, searchId) {
        // to be overidden
        return new Promise(async (resolve, reject) => {
            const url = `https://api.themoviedb.org/3/tv/${id}?api_key=${tmdbAPIKey}`;
            try {
                const response = await fetch(url, { signal });
                const data = await response.json();

                const links = [
                    new Link(`https://www.themoviedb.org/tv/${data.id}`, 'The Movie Database', 'img/tmdb_logo.png'),
                    new Link(data.homepage, 'TV Home Page', undefined)
                ];

                /** @type number[] */
                const episodeRunTimes = data.episode_run_time;

                let averageEpisodeLength = undefined;
                if (episodeRunTimes !== undefined && episodeRunTimes !== null && episodeRunTimes.length > 0) {
                    averageEpisodeLength = Math.round(episodeRunTimes.reduce((a, b) => a + b) / episodeRunTimes.length);
                    averageEpisodeLength = averageEpisodeLength + ' mins';
                }

                const networks = [];


                data.networks.forEach(
                    /**
                     * @param {{ name: string; logo_path: string; }} network
                     */
                    network => {
                        const logo = network.logo_path !== undefined && network.logo_path !== null ?
                            imageUrlPrefix + network.logo_path : undefined;
                        networks.push(new Network(network.name, logo))
                    })

                resolve(
                    {
                        id: searchId,
                        details: new Details(id,
                            data.name,
                            data.poster_path ? imageUrlPrefix + data.poster_path : 'img/NoPoster.jpg',
                            undefined,
                            undefined,
                            releaseYear(data.first_air_date) || 'Unknown',
                            data.genres.map(g => g.name),
                            links,
                            undefined,
                            data.overview,
                            undefined,
                            undefined,
                            [],
                            undefined,
                            data.number_of_seasons,
                            averageEpisodeLength,
                            data.last_air_date,
                            networks
                        )
                    }
                )
            } catch (err) {
                console.error('Error getting details from TMDB for movie ID: ' + id);
                console.error(err);
                reject(err);
            }
        });
    }
}
/**
* @param {string} releaseDate
*/
const releaseYear = (releaseDate) => {
    if (releaseDate !== undefined && releaseDate !== null && releaseDate.length >= 4) {
        return releaseDate.substring(0, 4);
    } else {
        return releaseDate;
    }
}