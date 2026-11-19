import { StateController } from "../views/stateController";
import { Screen } from "./Screen";
import { setHeaderColour } from "../components/headerColour";
import { showLoginButtons } from "../firebase/login";

export class FriendsScreen extends Screen {
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
        titleText.innerText = 'Friends';
        setHeaderColour('#4990E2');
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
        const title = `Friends`;
        const state = {
            pageTitle: title,
            stateId: this.stateController.currentState.id
        };
        const url = `/friends`;

        if (newScreen) {
            window.history.pushState(state, title, url);
        } else {
            window.history.replaceState(state, title, url);
        }

        document.title = title;

        // @ts-ignore
        document.querySelector('meta[property="og:title"]').content = title;
        // @ts-ignore
        document.querySelector('meta[property="og:description"]').content = `Your friends on Swrl List`;
        // @ts-ignore
        document.querySelector('meta[property="og:url"]').content = `https://swrl-list.com${window.location.pathname}`;
        // @ts-ignore
        document.querySelector('meta[property="og:image"]').content = 'https://swrl-list.com/img/logo.png';
    }
}
