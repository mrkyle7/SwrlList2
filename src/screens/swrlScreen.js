import { StateController } from "../views/stateController";
import { Screen } from "./Screen";
import { showLoginButtons } from "../firebase/login";

export class SwrlScreen extends Screen {
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
        titleText.innerText = this.stateController.currentState.swrl.details.title;
        const header = document.getElementById('header');
        header.style.backgroundColor = this.stateController.currentState.swrl.category.colour;
        const recommendSendContainer = document.getElementById('recommendSendContainer');
        recommendSendContainer.classList.add('hidden');
        const filterContainer = document.getElementById('filterContainer');
        filterContainer.classList.add('hidden');
        showLoginButtons();
    }
}