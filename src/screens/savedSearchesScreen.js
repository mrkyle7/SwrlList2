import { StateController } from "../views/stateController";
import { Screen } from "./Screen";
import { showLoginButtons } from "../firebase/login";

export class SavedSearchesScreen extends Screen {
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
        titleText.innerText = 'Saved Searches';
        const header = document.getElementById('header');
        header.style.backgroundColor = '#4990E2';
        const recommendSendContainer = document.getElementById('recommendSendContainer');
        recommendSendContainer.classList.add('hidden');
        const filterContainer = document.getElementById('filterContainer');
        filterContainer.classList.add('hidden');
        showLoginButtons();
    }

    /**
     * @param {boolean} newScreen
     */
    updateLocationHistory(newScreen) {
        const title = `Saved Searches`;
        const state = {
            pageTitle: title,
            stateId: this.stateController.currentState.id
        };
        const url = `/savedsearches`;
        
        if (newScreen) {
            window.history.pushState(state, title, url);
        } else {
            window.history.replaceState(state, title, url);
        }

        document.title = title;
    }
}