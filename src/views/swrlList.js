export default { showList, destroyList };

import { View } from '../constants/View';
import { Type } from '../constants/Type';
import { Category } from '../constants/Category';
import { swrlUser } from '../firebase/login';
import showRequireLoginScreen from '../components/requireLoginScreen';

var swrlsContainer = document.getElementById('swrlList');
var swrlTemplate = document.querySelector('#swrl');
var currentID;
var numSwrlsDisplayed = 0;

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
                        numSwrlsDisplayed = 0;
                        querySnapshot.forEach(function (swrl) {
                            processSwrl(view, swrl.data());
                        })
                        if (view === View.DISCOVER && numSwrlsDisplayed == 0) {
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
                .orderBy("details.title")
                .get();
        default:
            return db.where("category", "==", category)
                .orderBy("details.title")
                .get();
    }
}

function processSwrl(view, swrl) {
    if (!(view === View.DISCOVER && swrl.later.indexOf(swrlUser.uid) !== -1)) {
        numSwrlsDisplayed++;
        var swrlFragment = swrlTemplate.content.cloneNode(true);
        var $swrl = swrlFragment.querySelector.bind(swrlFragment);
        $swrl('.swrlImage').src = swrl.details.imageUrl;
        $swrl('.swrlTitle').innerText = swrl.details.title;
        $swrl('.swrlType').innerText = Type.properties[swrl.type].name;
        swrlsContainer.appendChild(swrlFragment);
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
