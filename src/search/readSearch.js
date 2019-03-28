export default { readSearch };

import { Type } from '../constants/Type';
import { Category } from '../constants/Category';

export function readSearch(query, signal, id) {
    return new Promise(async function (resolve, reject) {
        var encodedQuery = encodeURIComponent(query);
        var url = "https://openlibrary.org/search.json?q=" + encodedQuery;
        var response = await fetch(url, { signal });
        var data = await response.json();
        var results = [];
        var apiResults = data.docs;
        if (apiResults) {
            var maxResults = apiResults.length < 20 ? apiResults.length : 20;
            for (var index = 0; index < maxResults; index++) {
                var result = apiResults[index];
                if (!result.isbn) {
                    continue;
                }
                var isbn = result.isbn[0];
                var imageUrl = await getImageUrl(isbn, signal);
                var title = result.title.replace(/'\r\n/g, ' ').replace(/\s\s*/g, ' ');
                results.push({
                    details: {
                        title: title || 'No title',
                        author: result.author_name ? result.author_name[0] : 'Unknown',
                        id: isbn,
                        imageUrl: imageUrl || '/img/NoPoster.jpg'
                    },
                    type: Type.BOOK,
                    category: Category.READ,
                    swrlID: 'OPENLIBRARY-ISBN_' + isbn
                });
            }
        }
        resolve({ id: id, results: results });
    });
}

async function getImageUrl(isbn, signal) {
    var url = "https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys=ISBN:" + isbn;
    var response = await fetch(url, { signal });
    var data = await response.json();
    var covers = data['ISBN:' + isbn].cover;
    if (covers) {
        return covers.large;
    } else {
        return undefined;
    }
}