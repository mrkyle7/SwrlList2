import { View } from './View';
import { StateController } from './stateController';

export class Home extends View {
    /**
    * @param {StateController} stateController
    */
    constructor(stateController) {
        super(stateController, stateController.homeScreen);
        this.sections = document.getElementById('sections');
    }

    show() {
        this.sections.classList.remove('hidden');
    }

    destroy() {
        this.sections.classList.add('hidden');
    }
}