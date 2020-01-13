import { UIView } from './UIView';
import { StateController } from './stateController';

export class Home extends UIView {
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