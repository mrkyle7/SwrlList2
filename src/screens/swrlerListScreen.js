import { StateController } from "../views/stateController";
import { Screen } from "./Screen";
import { hideLoginButtons } from "../firebase/login";

export class SwrlerListScreen extends Screen {
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
        titleText.innerText = this.stateController.currentState.swrler.displayName;
        const header = document.getElementById('header');
        header.style.backgroundColor = '#FF2E63';
        const recommendSendContainer = document.getElementById('recommendSendContainer');
        recommendSendContainer.classList.add('hidden');
        const filterContainer = document.getElementById('filterContainer');
        filterContainer.classList.remove('hidden');
        hideLoginButtons();
    }

    /**
     * @param {boolean} newScreen
     */
    updateLocationHistory(newScreen) {

        const title = `${this.stateController.currentState.swrler.displayName}`;
        const state = {
            pageTitle: title,
            stateId: this.stateController.currentState.id
        };
        const url = `/swrler/${this.stateController.currentState.swrler.uid}`;
        
        if (newScreen) {
            window.history.pushState(state, title, url);
        } else {
            window.history.replaceState(state, title, url);
        }

        document.title = title;
    }
}