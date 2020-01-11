import { DetailGetter } from "./detailGetter";
import { Details } from "../model/details";
import { Link } from "../model/link";

export class ItunesAlbumGetter extends DetailGetter {

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
                const url = `https://itunes.apple.com/lookup?id=${id}&entity=song`;
                const response = await fetch(url, { signal });
                const results = await response.json();
                const result = results.results[0];
                const details = new Details(result.collectionId,
                    result.collectionName || 'No title',
                    getLargeImage(result) || 'img/NoPoster.jpg',
                    result.artistName || 'Unknown',
                    undefined,
                    result.releaseDate ? result.releaseDate.substring(0, 4) : undefined,
                    [result.primaryGenreName],
                    [new Link(`https://music.apple.com/gb/album/${result.collectionId}`,
                        'iTunes', 'img/itunes.svg')],
                    undefined,
                    undefined,
                    [],
                    undefined,
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