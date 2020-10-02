import { StateController } from "../views/stateController";
import { Screen } from "./Screen";
import { hideLoginButtons } from "../firebase/login";

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

        const title = `Swrl List 2: ${this.stateController.currentState.selectedCategory.displayName}`;
        const state = {
            pageTitle: title,
            stateId: this.stateController.currentState.id
        };
        const url = `/${this.stateController.currentState.selectedCategory.name}`;
        
        if (newScreen) {
            window.history.pushState(state, title, url);
        } else {
            window.history.replaceState(state, title, url);
        }

        document.title = title;

        // @ts-ignore
        document.querySelector('meta[property="og:title"]').content = title;
        // @ts-ignore
        document.querySelector('meta[name="description"]').content = `Your ${this.stateController.currentState.selectedCategory.name} list`;
       // @ts-ignore
        document.querySelector('meta[property="og:description"]').content = `Your ${this.stateController.currentState.selectedCategory.name} list`;
        // @ts-ignore
        document.querySelector('meta[property="og:url"]').content = `https://swrl-list.herokuapp.com${window.location.pathname}`;
        // @ts-ignore
        document.querySelector('meta[property="og:image"]').content = 'https://swrl-list.herokuapp.com/img/logo.png';
   
    }
}