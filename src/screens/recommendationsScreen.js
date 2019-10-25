import { StateController } from "../views/stateController";
import { Screen } from "./Screen";

export class RecommendationsScreen extends Screen {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController);
    }

    updateTitleBar() {
        const menuButton = document.getElementById('menuButton');
        menuButton.classList.add('hidden');
        const backButton = document.getElementById('backButtonDiv');
        backButton.classList.remove('hidden');
        const titleText = document.getElementById('titleText');
        titleText.innerText = 'Recommendations';
        const header = document.getElementById('header');
        header.style.backgroundColor = '#4990E2';
    }
}