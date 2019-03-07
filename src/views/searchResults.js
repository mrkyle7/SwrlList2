export default { showSearch, destroySearch };

/**
 * @param {string} category
 * @param {firebase.firestore.Firestore} firestore
 */
export function showSearch(category, firestore) {
    document.querySelector('#searchResults').classList.remove('hidden');
    document.querySelector('#swrlSearch').classList.remove('hidden');
}

export function destroySearch() {
    document.querySelector('#searchResults').classList.add('hidden');
    document.querySelector('#swrlSearch').classList.add('hidden');
}