import { tmdbFilmToSwrl, tmdbTVToSwrl } from './watchSearch';

/**
 * Turns a recognised shared link (see model/share.js) into a Swrl, with just
 * enough detail to open its page; the page fetches the rest.
 *
 * @param {import('../model/share').SharedLink} link
 * @param {AbortSignal} [signal]
 * @return {Promise<import('../model/swrl').Swrl | undefined>} undefined when the source does not know it
 */
export async function swrlFromLink(link, signal) {
    if (link.source === 'tmdb') {
        const data = await getJson(`/api/v1/tmdb/${link.kind}/${link.id}`, signal);
        if (!data || !data.id) return undefined;
        return link.kind === 'movie' ? tmdbFilmToSwrl(data) : tmdbTVToSwrl(data);
    }
    // IMDb ids are looked up through TMDB, which is where our film and TV data comes from.
    const found = await getJson(`/api/v1/tmdb/find/${link.imdbId}`, signal);
    if (!found) return undefined;
    if (found.movie_results && found.movie_results.length > 0) {
        return tmdbFilmToSwrl(found.movie_results[0]);
    }
    if (found.tv_results && found.tv_results.length > 0) {
        return tmdbTVToSwrl(found.tv_results[0]);
    }
    // an episode's page: open its show
    const episode = found.tv_episode_results && found.tv_episode_results[0];
    if (episode && episode.show_id) {
        const show = await getJson(`/api/v1/tmdb/tv/${episode.show_id}`, signal);
        return show && show.id ? tmdbTVToSwrl(show) : undefined;
    }
    return undefined;
}

/**
 * @param {string} url
 * @param {AbortSignal} [signal]
 * @return {Promise<any | undefined>} undefined on a 404
 */
async function getJson(url, signal) {
    const response = await fetch(url, { signal });
    if (response.status === 404) return undefined;
    if (!response.ok) {
        throw new Error(`Request failed with HTTP ${response.status}`);
    }
    return response.json();
}
