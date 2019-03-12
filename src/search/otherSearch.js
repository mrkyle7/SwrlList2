export default { otherSearch }

export function otherSearch(query, signal, id) {
    return new Promise(function (resolve, reject) {
        resolve({ id: id, results: [] });
    });
}