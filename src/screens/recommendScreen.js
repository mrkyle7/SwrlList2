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

    /**
     * @param {boolean} newScreen
     */
    updateLocationHistory(newScreen) {
        const title = `Recommend ${this.stateController.currentState.swrl.details.getFullTitle()}`;
        const state = {
            pageTitle: title,
            stateId: this.stateController.currentState.id
        };
        const url = `/recommend/${this.stateController.currentState.swrl.swrlID}`;
        
        if (newScreen) {
            window.history.pushState(state, title, url);
        } else {
            window.history.replaceState(state, title, url);
        }

        document.title = title;

         // @ts-ignore
        document.querySelector('meta[property="og:title"]').content = title;
        // @ts-ignore
        document.querySelector('meta[name="description"]').content = `Recommend ${this.stateController.currentState.swrl.category.name} the ${this.stateController.currentState.swrl.type.displayName}: ${title}`;
        // @ts-ignore
        document.querySelector('meta[property="og:description"]').content = `Recommend ${this.stateController.currentState.swrl.category.name} the ${this.stateController.currentState.swrl.type.displayName}: ${title}`;
        // @ts-ignore
        document.querySelector('meta[property="og:url"]').content = `https://swrl-list.herokuapp.com${window.location.pathname}`;
        // @ts-ignore
        document.querySelector('meta[property="og:image"]').content = this.stateController.currentState.swrl.details.imageUrl;
   
    }
}