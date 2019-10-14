export default { showSwrlFullPage, destroySwrlFullPage };

var firebase = require("firebase/app");
import { RECOMMEND, SEARCH } from '../constants/View';
import { Category } from '../constants/Category';
import { Collection } from '../constants/Collection';
import { swrlUser } from '../firebase/login';
import { showList, destroyList } from './swrlList';
import { destroySearch, showSearch } from './searchResults';
import { renderSwrl } from '../components/swrl';
import { showToasterMessage } from '../components/toaster';
import { Constant } from '../constants/Constant';

var tabs = document.getElementById('tabs');
var fade = document.getElementById('fade');
var swrlFullPageView = document.getElementById('swrlFullPage');

var closeSectionButton;
var backSectionButton;
var defaultTitle;
var swrlFullPageTitle;

/**
 * @param {Constant} view
 * @param {firebase.firestore.Firestore} firestore
 */
export function showSwrlFullPage(swrl, category, view, firestore) {
    closeSectionButton = document.querySelector('.section.' + category.name + ' .close');
    backSectionButton = document.querySelector('.section.' + category.name + ' .back');
    defaultTitle = document.querySelector('.section.' + category.name + ' .defaultTitle');
    swrlFullPageTitle = document.querySelector('.section.' + category.name + ' .swrlFullPageTitle');

    destroyList();
    destroySearch(false);
    swrlFullPageView.classList.remove('hidden');

    tabs.classList.add('hidden');

    closeSectionButton.classList.add('hidden');
    backSectionButton.classList.remove('hidden');
    defaultTitle.classList.add('hidden');
    swrlFullPageTitle.classList.remove('hidden');

    bindBackButton(category, view, firestore);

}

function bindBackButton(category, view, firestore) {
    //remove the old event listeners by replacing the button
    var newBackButton = backSectionButton.cloneNode(true);
    backSectionButton.parentNode.replaceChild(newBackButton, backSectionButton);
    backSectionButton = newBackButton;
    //now add the new eventlistener for this view
    backSectionButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        goBackToPreviousView(category, view, firestore);
    });
}


export function destroySwrlFullPage() {
    swrlFullPageView.classList.add('hidden');

    backSectionButton.classList.add('hidden');
    defaultTitle.classList.remove('hidden');
    swrlFullPageTitle.classList.add('hidden');

    tabs.classList.remove('hidden');
}

function goBackToPreviousView(category, view, firestore) {
    destroySwrlFullPage();
    closeSectionButton.classList.remove('hidden');
    if (view === SEARCH) {
        showSearch(category);
    } else {
        showList(category, view, firestore);
    }
}