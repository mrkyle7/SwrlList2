import { DetailGetter } from "./detailGetter";
import { Details } from "../model/details";
import { Link } from "../model/link";

export class ItunesPodcastGetter extends DetailGetter {

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
            try {
                const url = `https://itunes.apple.com/lookup?id=${id}&entity=podcast`;
                const response = await fetch(url, { signal });
                const results = await response.json();
                const result = results.results[0];
                const details = new Details(result.collectionId,
                    result.trackName || 'No title',
                    getLargeImage(result) || 'img/NoPoster.jpg',
                    undefined,
                    result.artistName,
                    result.releaseDate ? result.releaseDate.substring(0, 4) : undefined,
                    result.genres,
                    [new Link(`https://podcasts.apple.com/gb/podcast/${result.collectionId}`,
                        'iTunes', 'img/itunes.svg')],
                    undefined,
                    undefined,
                    [],
                    [],
                    undefined,
                    [],
                    [],
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    [],
                    [],
                    [],
                    [],
                    undefined,
                    undefined,
                    undefined)
                resolve({
                    id: searchId,
                    details: details
                })

            } catch (err) {
                console.error('Error getting details from itunes for ID: ' + id);
                console.error(err);
                reject(err);
            }
        });
    }
}

/**
     * @param {{ artworkUrl100: string; }} result
     */
const getLargeImage = (result) => {
    const smallerImage = result.artworkUrl100;
    return smallerImage.replace('100x100', '600x600');
}