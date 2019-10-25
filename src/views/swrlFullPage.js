export default { showSwrlFullPage, destroySwrlFullPage };

var firebase = require("firebase/app");
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

    swrlFullPageView.classList.remove('hidden');

    tabs.classList.add('hidden');

    closeSectionButton.classList.add('hidden');
    backSectionButton.classList.remove('hidden');
    defaultTitle.classList.add('hidden');
    swrlFullPageTitle.classList.remove('hidden');

}


export function destroySwrlFullPage() {
    swrlFullPageView.classList.add('hidden');

    backSectionButton.classList.add('hidden');
    defaultTitle.classList.remove('hidden');
    swrlFullPageTitle.classList.add('hidden');

    tabs.classList.remove('hidden');
}