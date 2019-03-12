export default { listenSearch }

export function listenSearch(query, signal, id) {
    return new Promise(function (resolve, reject) {
        resolve({ id: id, results: [] });
    });
}