export default { showRecommend, destroyRecommend };

// @ts-ignore
const firebase = require("firebase/app");
// @ts-ignore
import { RECOMMEND } from '../constants/View';
// @ts-ignore
import { Collection } from '../constants/Collection';
import { swrlUser, hideLoginButtons, showLoginButtons } from '../firebase/login';
import { renderSwrl } from '../components/swrl';
import { showToasterMessage } from '../components/toaster';
import { Swrl } from '../model/swrl';
import { View } from './View';
import { StateController } from './stateController';

export class Recommend extends View {

    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.recommendScreen);
    }

    show() {
        showRecommend(this.stateController);
    }

    destroy() {
        destroyRecommend();
    }
}


const fade = document.getElementById('fade');
const recommendView = document.getElementById('recommend');
const selectedSwrlersContainer = document.getElementById('selectedSwrlers');
/** @type {HTMLInputElement} */
// @ts-ignore
const recommendToInput = document.getElementById('recommendTo');
/** @type {HTMLTextAreaElement} */
// @ts-ignore
const recommendMessage = document.getElementById('recommendMessage');
const recommendedSwrl = document.getElementById('recommendedSwrl');

const recommendSendContainer = document.getElementById('recommendSendContainer');
/** @type {HTMLImageElement} */
// @ts-ignore
let recommendSendButton = document.getElementById('recommendSendButton');

let swrlers = [];
let selectedSwrlers = [];
let autocompleteInitialised = false;

/**
 * @param {StateController} stateController
 */
export function showRecommend(stateController) {

    const swrl = stateController.currentState.swrl;
    const firestore = stateController.firestore;

    recommendView.classList.remove('hidden');

    renderSwrl(stateController, RECOMMEND, swrl, firestore, recommendedSwrl);

    recommendSendContainer.classList.remove('hidden');
    hideLoginButtons();

    bindRecommendSendButton(stateController, swrl, firestore);

    firestore.collection(Collection.SWRLERS).get()
        .then(function (querySnapshot) {
            if (!querySnapshot.empty) {
                swrlers = [];
                querySnapshot.forEach(function (snapshot) {
                    var swrler = snapshot.data();
                    if (swrler.uid !== swrlUser.uid) {
                        swrlers.push(swrler);
                    }
                });
                sortSwrlers();
                if (!autocompleteInitialised) setupAutocomplete(recommendToInput);
            } else {
                recommendFailAndAbort(stateController, firestore);
            }
        })
        .catch(function (error) {
            console.error('Error gettings swrlers');
            console.error(error);
            recommendFailAndAbort(stateController, firestore);
        })
}

/**
 * @param {StateController} stateController
 * @param {Swrl} swrl
 * @param {firebase.firestore.Firestore} firestore
 */
function bindRecommendSendButton(stateController, swrl, firestore) {
    //remove the old event listeners by replacing the button
    const newSendButton = recommendSendButton.cloneNode(true);
    recommendSendButton.parentNode.replaceChild(newSendButton, recommendSendButton);
    //now add the new eventlistener for this swrl
    // @ts-ignore
    recommendSendButton = newSendButton;
    recommendSendButton.addEventListener('click',
        /**
         * @param {Event} e
         */
        (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (selectedSwrlers.length === 0) {
                window.alert('Please select at least one Swrler to send to');
            } else {
                let toSwrlers = selectedSwrlers.map(s => s.uid);
                let fromSwrler = swrlUser.uid;
                let message = recommendMessage.value;
                let swrlID = swrl.swrlID;
                firestore.collection(Collection.RECOMMENDATIONS).add({
                    from: fromSwrler,
                    to: toSwrlers,
                    message: message,
                    swrlID: swrlID,
                    created: firebase.firestore.FieldValue.serverTimestamp()
                })
                    .then(function (docRef) {
                        const id = docRef.id;
                        console.log("Recommendation written with ID: ", id);
                        const updateRecommendations = swrl.toPartialFireStoreData();
                        updateRecommendations.updated = firebase.firestore.FieldValue.serverTimestamp();
                        updateRecommendations.recommendations = firebase.firestore.FieldValue.arrayUnion(id);
                        updateRecommendations.isRecommended = firebase.firestore.FieldValue.arrayUnion.apply(this, toSwrlers)

                        firestore.collection(Collection.SWRLS).doc(swrlID).set(updateRecommendations,
                            { merge: true })
                            .catch(e => console.error(e));
                    })
                    .catch(e => console.error(e));
                showToasterMessage('Recommendation sent!');
                stateController.showPreviousScreen();
            }
        });
}

function sortSwrlers() {
    swrlers.sort((a, b) => {
        if (a.displayName > b.displayName)
            return 1;
        if (a.displayName < b.displayName)
            return -1;
        return 0;
    });
}

export function destroyRecommend() {
    recommendView.classList.add('hidden');
    closeAllLists();
    clearSelectedSwrlers();
    // @ts-ignore
    recommendToInput.value = '';
    recommendMessage.value = '';

    recommendSendContainer.classList.add('hidden');
    showLoginButtons();

    while (recommendedSwrl.firstChild) {
        recommendedSwrl.removeChild(recommendedSwrl.firstChild);
    }
}

function clearSelectedSwrlers() {
    while (selectedSwrlersContainer.firstChild) {
        selectedSwrlersContainer.removeChild(selectedSwrlersContainer.firstChild);
    }
    selectedSwrlers = [];
}

/**
 * 
 * @param {StateController} stateController
 * @param {firebase.firestore.Firestore} firestore 
 */
function recommendFailAndAbort(stateController, firestore) {
    window.alert("You need to be online to use recommendations, sorry!");
    stateController.showPreviousScreen();
}

//taken and modified from https://www.w3schools.com/howto/howto_js_autocomplete.asp
/**
 * @param {HTMLInputElement} toInput
 */
function setupAutocomplete(toInput) {
    /*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
    var currentFocus;

    /*execute a function when someone writes in the text field:*/
    // @ts-ignore
    toInput.addEventListener("input", function (e) {
        // @ts-ignore
        var autocompleteContainer, autocompleteItem, i, val = this.value;
        /*close any already open lists of autocompleted values*/
        closeAllLists();
        if (!val) { return false; }
        currentFocus = -1;
        /*create a DIV element that will contain the items (values):*/
        autocompleteContainer = document.createElement("DIV");
        autocompleteContainer.setAttribute("id", this.id + "autocomplete-list");
        autocompleteContainer.setAttribute("class", "autocomplete-items");
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(autocompleteContainer);
        fade.classList.remove('hidden');

        var selectableSwrlers = swrlers.filter((s) => {
            return selectedSwrlers.indexOf(s) === -1;
        })

        if (selectableSwrlers.length > 0) {
            selectableSwrlers.forEach(swrler => {
                /*check if the input val is part of a swrlers name or email:*/
                if (swrler.displayName.toUpperCase().indexOf(val.toUpperCase()) !== -1
                    || swrler.email.toUpperCase().indexOf(val.toUpperCase()) !== -1
                ) {
                    /*create a DIV element for each matching element:*/
                    autocompleteItem = document.createElement("DIV");

                    var swrlerSmall = getSwrlerSmall(swrler, false);
                    autocompleteItem.appendChild(swrlerSmall);

                    // @ts-ignore
                    autocompleteItem.addEventListener("click", function (e) {
                        var swrlerSmall = getSwrlerSmall(swrler, true);
                        selectedSwrlersContainer.appendChild(swrlerSmall);
                        selectedSwrlers.push(swrler);
                        toInput.value = '';
                        /*close the list of autocompleted values,
                        (or any other open lists of autocompleted values:*/
                        closeAllLists();
                    });
                    autocompleteContainer.appendChild(autocompleteItem);
                }
            });
        } else {
            autocompleteItem = document.createElement("DIV");
            autocompleteItem.innerText = 'No more Swrlers left!';
            autocompleteItem.style.padding = '4px';
            autocompleteContainer.appendChild(autocompleteItem);
        }
    });
    /*execute a function presses a key on the keyboard:*/
    toInput.addEventListener("keydown", function (e) {
        var x = document.getElementById(this.id + "autocomplete-list");
        // @ts-ignore
        if (x) x = x.getElementsByClassName("swrlerSmall");
        if (e.keyCode == 40) {
            /*If the arrow DOWN key is pressed,
            increase the currentFocus variable:*/
            currentFocus++;
            /*and and make the current item more visible:*/
            addActive(x);
        } else if (e.keyCode == 38) { //up
            /*If the arrow UP key is pressed,
            decrease the currentFocus variable:*/
            currentFocus--;
            /*and and make the current item more visible:*/
            addActive(x);
        } else if (e.keyCode == 13) {
            /*If the ENTER key is pressed, prevent the form from being submitted,*/
            e.preventDefault();
            if (currentFocus > -1) {
                /*and simulate a click on the "active" item:*/
                if (x) x[currentFocus].click();
            }
        }
    });
    function addActive(x) {
        /*a function to classify an item as "active":*/
        if (!x) return false;
        /*start by removing the "active" class on all items:*/
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        /*add class "autocomplete-active":*/
        x[currentFocus].classList.add("autocomplete-active");
    }
    function removeActive(x) {
        /*a function to remove the "active" class from all autocomplete items:*/
        for (var i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    }
    /*execute a function when someone clicks in the document:*/
    // @ts-ignore
    document.addEventListener("click", function (e) {
        closeAllLists();
        // @ts-ignore
        recommendToInput.value = '';
    });

    //Initialised the autocomplete, don't do it again.
    autocompleteInitialised = true;
}

function closeAllLists() {
    /*close all autocomplete lists in the document,
    except the one passed as an argument:*/
    var autocompleteItemContainers = document.getElementsByClassName("autocomplete-items");
    //Using a for here as even an ES5 babeled Array.from didn't work on android
    for (let index = 0; index < autocompleteItemContainers.length; index++) {
        const container = autocompleteItemContainers[index];
        container.parentNode.removeChild(container);
    }
    fade.classList.add('hidden');
}

/**
 * @param {firebase.User} swrler
 * @param {boolean} showDeleteButton
 */
function getSwrlerSmall(swrler, showDeleteButton) {
    var swrlerSmallTemplate = document.getElementById('swrlerSmall');
    // @ts-ignore
    var swrlerSmall = swrlerSmallTemplate.content.cloneNode(true);
    var $swrlerSmall = swrlerSmall.querySelector.bind(swrlerSmall);
    $swrlerSmall('.swrlerSmallImage').src = swrler.photoURL;
    $swrlerSmall('.swrlerSmallImage').addEventListener('error',
        /**
         * @param {Event} e
         */
        (e) => {
            /** @type {HTMLImageElement} */
            // @ts-ignore
            const image = e.target;
            if (image) {
                image.src = 'img/NoPoster.jpg' //todo: get blank user photo
            }
        });
    $swrlerSmall('.swrlerSmallText').innerText = swrler.displayName;
    if (showDeleteButton) {
        var deleteButton = $swrlerSmall('.swrlerSmallDelete');
        deleteButton.classList.remove('hidden');
        var swrlerSmallDiv = $swrlerSmall('div');
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            selectedSwrlersContainer.removeChild(swrlerSmallDiv);
            selectedSwrlers = selectedSwrlers.filter(s => s !== swrler);
        })
    }
    return swrlerSmall;
}

