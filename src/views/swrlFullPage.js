const firebase = require("firebase/app");
import { Constant } from '../constants/Constant';
import { View } from './View';
import { StateController } from './stateController';
import { State } from '../model/state';

const swrlFullPageView = document.getElementById('swrlFullPage');

export class SwrlFullPage extends View {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.swrlScreen);
    }

    show() {
        showSwrlFullPage(this.stateController.currentState);
    }

    destroy() {
        destroySwrlFullPage();
    }
}


/**
 * @param {State} state
 */
function showSwrlFullPage(state) {
    swrlFullPageView.classList.remove('hidden');

}


function destroySwrlFullPage() {
    swrlFullPageView.classList.add('hidden');
}