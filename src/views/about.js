import { UIView } from './UIView';
import { StateController } from './stateController';

/**
 * "What's a Swrl?": the word explained as a dictionary entry. Static, and
 * open to everyone, signed in or not.
 */
export class About extends UIView {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.aboutScreen);
    }

    show() {
        aboutView.classList.remove('hidden');
        aboutView.scrollTop = 0;
    }

    destroy() {
        aboutView.classList.add('hidden');
    }
}

const aboutView = document.getElementById('aboutView');
