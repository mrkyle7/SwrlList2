export default { showList, destroyList };

import { View } from '../constants/View';
import { Category } from '../constants/Category';
import { swrlUser } from '../firebase/login';
import { renderSwrl } from '../components/swrl';

var swrlsContainer = document.getElementById('swrlList');
var currentID;

/**
 * @param {Category} category
 * @param {View} view
 * @param {firebase.firestore.Firestore} firestore
 */
export function showList(category, view, firestore) {
    currentID = Math.random();
    var resultsID = currentID;
    clearList();
    document.querySelector('#swrlList').classList.remove('hidden');
    document.querySelector('#messageContainer').classList.remove('hidden');
    document.querySelector('#message').innerText = 'Loading Swrls...';
    var swrlsRef = firestore.collection("swrls");
    if (swrlsRef) {
        console.log("Getting Swrls for: " + Category.properties[category].name);
        runQuery(swrlsRef, category, view)
            .then(function (querySnapshot) {
                if (currentID === resultsID) {
                    document.querySelector('#messageContainer').classList.add('hidden');
                    if (!querySnapshot.empty) {
                        querySnapshot.forEach(function (swrl) {
                            renderSwrl(view, category, swrl.data(), firestore, swrlsContainer);
                        })
                        if (view === View.DISCOVER && swrlsContainer.querySelectorAll('div').length == 0) {
                            console.log('No Swrls to discover');
                            showNoSwrlsDiscoverView(category);
                        }
                    } else {
                        console.log("No Swrls found");
                        showNoSwrlsView(category);
                    }
                } else {
                    console.log('View was changed');
                }
            })
            .catch(function (error) {
                console.error(error);
                console.error("Couldn't get swrls!");
                showNoSwrlsView(category);
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

function runQuery(db, category, view) {
    switch (view) {
        case View.YOUR_LIST:
            if (!swrlUser || swrlUser.isAnonymous) {
                showRequireLoginScreen('to see Swrls on your list');
                return new Promise(function (resolve, reject) {
                    resolve({ empty: true });
                });
            } else {
                return db.where("category", "==", category)
                    .where("later", "array-contains", swrlUser.uid)
                    .orderBy("details.title")
                    .get();
            }
        case View.DISCOVER:
            return db.where("category", "==", category)
                .orderBy("added", "desc")
                .get();
        default:
            return db.where("category", "==", category)
                .orderBy("added", "desc")
                .get();
    }
}

function clearList() {
    while (swrlsContainer.firstChild) {
        swrlsContainer.removeChild(swrlsContainer.firstChild);
    }
}

export function destroyList() {
    document.querySelector('#swrlList').classList.add('hidden');
    document.querySelector('#messageContainer').classList.add('hidden');
    currentID = undefined;
    clearList();
}

function showNoSwrlsView(category) {
    document.querySelector('#messageContainer').classList.remove('hidden');
    document.querySelector('#message').innerText = Category.properties[category].noSwrlsMessage;
}

function showNoSwrlsDiscoverView(category) {
    document.querySelector('#messageContainer').classList.remove('hidden');
    document.querySelector('#message').innerText = Category.properties[category].noSwrlsDiscoverMessage;
}
