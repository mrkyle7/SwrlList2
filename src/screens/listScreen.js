import { StateController } from "../views/stateController";
import { Screen } from "./Screen";

export class ListScreen extends Screen {
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
        titleText.innerText = this.stateController.currentState.selectedCategory.displayName;
        const header = document.getElementById('header');
        header.style.backgroundColor = this.stateController.currentState.selectedCategory.colour;
    }
}