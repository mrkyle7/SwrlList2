import { StateController } from "../views/stateController";
import { Screen } from "./Screen";
import { showLoginButtons } from "../firebase/login";

export class HomeScreen extends Screen {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController);
    }

    updateTitleBar() {
        const menuButton = document.getElementById('menuButton');
        menuButton.classList.remove('hidden');
        const backButton = document.getElementById('backButtonDiv');
        backButton.classList.add('hidden');
        const titleText = document.getElementById('titleText');
        titleText.innerText = 'Swrl List 2';
        const header = document.getElementById('header');
        header.style.backgroundColor = '#FF2E63';
        const recommendSendContainer = document.getElementById('recommendSendContainer');
        recommendSendContainer.classList.add('hidden');
        const filterContainer = document.getElementById('filterContainer');
        filterContainer.classList.add('hidden');
        showLoginButtons();
    }
}