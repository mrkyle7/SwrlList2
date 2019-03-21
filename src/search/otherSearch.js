export default { otherSearch }

import { zip } from '../utils/zip';
import { Type } from '../constants/Type';
import { Category } from '../constants/Category';

export function otherSearch(query, signal, id) {
    return new Promise(function (resolve, reject) {

        var encodedQuery = encodeURIComponent(query);

        var searches = [boardgameSearch(encodedQuery, signal), videoGameSearch(encodedQuery, signal)];
        Promise.all(searches)
            .then(function ([boardGameResults, videoGameResults]) {
                resolve({ id: id, results: zip(boardGameResults, videoGameResults) });
            })
            .catch(function (error) {
                console.error('Error getting other results: ' + JSON.stringify(error))
                console.error(error);
                resolve({ id: id, results: [] })
            })
    });
}

function boardgameSearch(query, signal) {
    return geekSearch(Type.BOARDGAME, query, signal);
}

function videoGameSearch(query, signal) {
    return geekSearch(Type.VIDEOGAME, query, signal);
}

function geekSearch(type, query, signal) {
    return new Promise(async function (resolve, reject) {
        var url = "https://api.geekdo.com/xmlapi2/search?type=" + Type.properties[type].geekType + "&query=" + query;
        var response = await fetch(url, { signal });
        var xmlData = await response.text();
        var parser = new DOMParser();
        var xmlResults = parser.parseFromString(xmlData, 'application/xml');
        var items = xmlResults.getElementsByTagName('item');
        var maxResults = items.length < 10 ? items.length : 10;
        var results = [];
        for (var index = 0; index < maxResults; index++) {
            var item = items[index];
            var title = item.getElementsByTagName('name')[0].getAttribute('value');
            var id = item.getAttribute('id');
            var imageUrl = await getImageUrl(id, signal);
            results.push({
                details: {
                    title: title,
                    id: id,
                    imageUrl: imageUrl || '/img/NoPoster.jpg'
                },
                type: type,
                category: Category.OTHER,
                swrlID: 'GEEK' + Type.properties[type].geekType + '_' + id
            })
        }
        resolve(results);
    });
}

async function getImageUrl(id, signal) {
    var url = 'https://api.geekdo.com/xmlapi2/thing?id=' + id;
    var response = await fetch(url, { signal });
    var xmlData = await response.text();
    var parser = new DOMParser();
    var xmlResult = parser.parseFromString(xmlData, 'application/xml');
    var items = xmlResult.getElementsByTagName('item');
    if (!items || items.length == 0 ) {
        console.log('ID from geek returned no items!');
        return undefined;
    }
    var images = items[0].getElementsByTagName('image');
    if (images && images.length > 0) {
        return images[0].textContent;
    } else {
        console.log('No images for ' + id);
        return undefined;
    }
}