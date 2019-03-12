export default { readSearch }

export function readSearch(query, signal, id) {
    return new Promise(function (resolve, reject) {
        resolve({ id: id, results: [] });
    });
}