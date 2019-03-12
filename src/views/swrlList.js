export default { showList, destroyList };

import { ListView } from '../constants/ListView';
import { Category } from '../constants/Category';

var currentListView = ListView.YOURLIST;
var currentID;

/**
 * @param {Category} category
 * @param {firebase.firestore.Firestore} firestore
 */
export function showList(category, firestore) {
    currentID = Math.random();
    var resultsID = currentID;
    var categoryName = Category.properties[category].name;
    document.querySelector('#swrlList').classList.remove('hidden');
    document.querySelector('#messageContainer').classList.remove('hidden');
    document.querySelector('#message').innerText = 'Loading Swrls...';
    var swrlsRef = firestore.collection("swrls");
    if (swrlsRef) {
        console.log("Getting Swrls for: " + categoryName);
        swrlsRef.where("category", "==", categoryName).get()
            .then(function (querySnapshot) {
                if (currentID === resultsID){
                    document.querySelector('#messageContainer').classList.add('hidden');
                    if (!querySnapshot.empty) {
                        querySnapshot.forEach(function (swrl) {
                            console.log(JSON.stringify(swrl));
                        })
                    } else {
                        console.log("No Swrls found");
                        showNoSwrlsView(category);
                    }
                } else {
                    console.log('View was changed');
                }
            })
            .catch(function (error) {
                console.error("Couldn't get swrls! " + JSON.stringify(error));
            })
    } else {
        if (currentID === resultsID) {
            console.log("No Swrls found");
            showNoSwrlsView(category);
        } else {
            console.log('View was changed');
        }
    }
}

export function destroyList() {
    document.querySelector('#swrlList').classList.add('hidden');
    document.querySelector('#messageContainer').classList.add('hidden');
    currentID = undefined;
}   

function showNoSwrlsView(category) {
    document.querySelector('#messageContainer').classList.remove('hidden');
    document.querySelector('#message').innerText = Category.properties[category].noSwrlsMessage;
}
