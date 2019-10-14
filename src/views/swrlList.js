export default { showList, destroyList };

import { YOUR_LIST, DISCOVER } from '../constants/View';
import { Collection } from '../constants/Collection';
import { Category } from '../constants/Category';
import { swrlUser } from '../firebase/login';
import { renderSwrl } from '../components/swrl';
import showRequireLoginScreen from '../components/requireLoginScreen';
import { Constant } from '../constants/Constant';
import { Swrl } from '../model/swrl';

var swrlsContainer = document.getElementById('swrlList');
var currentID;

/**
 * @param {Category} category
 * @param {Constant} view
 * @param {firebase.firestore.Firestore} firestore
 */
export function showList(category, view, firestore) {
    currentID = Math.random();
    var resultsID = currentID;
    clearList();
    document.getElementById('swrlList').classList.remove('hidden');
    document.getElementById('messageContainer').classList.remove('hidden');
    document.getElementById('message').innerText = 'Loading Swrls...';
    var swrlsRef = firestore.collection(Collection.SWRLS);
    if (swrlsRef) {
        runQuery(swrlsRef, category, view)
            .then(function (querySnapshot) {
                if (currentID === resultsID) {
                    document.getElementById('messageContainer').classList.add('hidden');
                    if (!querySnapshot.empty) {
                        querySnapshot.forEach(
                            /**
                             * @param {firebase.firestore.QueryDocumentSnapshot} docSnapshot
                             */
                            function (docSnapshot) {
                                const swrl = Swrl.fromFirestore(docSnapshot.data());
                                renderSwrl(category, view, swrl, firestore, swrlsContainer);
                            })
                        if (view === DISCOVER && swrlsContainer.querySelectorAll('div').length == 0) {
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

/**
 * 
 * @param {firebase.firestore.CollectionReference} db 
 * @param {Category} category 
 * @param {Constant} view 
 * @return {Promise}
 */
function runQuery(db, category, view) {
    switch (view) {
        case YOUR_LIST:
            if (!swrlUser || swrlUser.isAnonymous) {
                showRequireLoginScreen('to see Swrls on your list');
                return new Promise(function (resolve, reject) {
                    resolve({ empty: true });
                });
            } else {
                return db.where("category", "==", category.id)
                    .where("later", "array-contains", swrlUser.uid)
                    .orderBy("details.title")
                    .get();
            }
        case DISCOVER:
            return db.where("category", "==", category.id)
                .orderBy("added", "desc")
                .get();
        default:
            return db.where("category", "==", category.id)
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
    document.getElementById('swrlList').classList.add('hidden');
    document.getElementById('messageContainer').classList.add('hidden');
    currentID = undefined;
    clearList();
}

/**
 * @param {Category} category
 */
function showNoSwrlsView(category) {
    document.getElementById('messageContainer').classList.remove('hidden');
    document.getElementById('message').innerText = category.noSwrlsMessage;
}

/**
 * @param {Category} category
 */
function showNoSwrlsDiscoverView(category) {
    document.getElementById('messageContainer').classList.remove('hidden');
    document.getElementById('message').innerText = category.noSwrlsDiscoverMessage;
}
