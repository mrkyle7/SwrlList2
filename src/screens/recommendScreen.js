import { StateController } from "../views/stateController";
import { Screen } from "./Screen";
import { hideLoginButtons } from "../firebase/login";

export class RecommendScreen extends Screen {
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
        titleText.innerText = 'Recommend';
        const header = document.getElementById('header');
        header.style.backgroundColor = '#4990E2';
        const recommendSendContainer = document.getElementById('recommendSendContainer');
        recommendSendContainer.classList.remove('hidden');
        const filterContainer = document.getElementById('filterContainer');
        filterContainer.classList.add('hidden');
        hideLoginButtons();
    }
}