export default { listenSearch }

import { zip } from '../utils/zip';
import { Type } from '../constants/Type';
import { Category } from '../constants/Category';

export function listenSearch(query, signal, id) {
    return new Promise(function (resolve, reject) {
        var encodedQuery = encodeURIComponent(query);
        var searches = [albumSearch(encodedQuery, signal), podcastSearch(encodedQuery, signal)];
        Promise.all(searches)
            .then(function ([albumResults, podcastResults]) {
                resolve({ id: id, results: zip(albumResults, podcastResults) });
            })
            .catch(function (error) {
                console.error('Error getting list results: ' + JSON.stringify(error))
                console.error(error);
                resolve({ id: id, results: [] })
            })
    })
}

function albumSearch(query, signal) {
    return new Promise(async function (resolve, reject) {
        var url = 'https://itunes.apple.com/search?term=' + query + '&media=music&entity=album';
        try {
            var response = await fetch(url, { signal });
            var data = await response.json();
            resolve(data.results.map(function (result) {
                return {
                    details: {
                        title: result.collectionName + ' by ' + result.artistName,
                        id: result.collectionId,
                        imageUrl: getLargeImage(result) || '/img/NoPoster.jpg'
                    },
                    type: Type.ALBUM,
                    category: Category.LISTEN,
                    swrlID: 'ITUNESALBUM_' + result.collectionId
                }
            }));
        } catch (error) {
            console.log('Fetch failed for Album search: ' + JSON.stringify(error));
            console.error(error);
            resolve([]);
        }
    })
}

function podcastSearch(query, signal) {
    return new Promise(async function (resolve, reject) {
        var url = 'https://itunes.apple.com/search?term=' + query + '&media=podcast&entity=podcast';        
        try {
            var response = await fetch(url, { signal });
            var data = await response.json();
            resolve(data.results.map(function (result) {
                return {
                    details: {
                        title: result.trackName || 'No Title',
                        id: result.collectionId,
                        imageUrl: getLargeImage(result) || '/img/NoPoster.jpg'
                    },
                    type: Type.PODCAST,
                    category: Category.LISTEN,
                    swrlID: 'ITUNESPODCAST_' + result.collectionId
                }
            }));
        } catch (error) {
            console.log('Fetch failed for Podcast search: ' + JSON.stringify(error));
            console.error(error);
            resolve([]);
        }
    })
}

function getLargeImage (result) {
    var smallerImage = result.artworkUrl100;
    return smallerImage.replace('100x100', '600x600');
}