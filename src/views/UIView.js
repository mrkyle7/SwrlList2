import { StateController } from "./stateController";
import { Screen } from "../screens/Screen";

export class UIView {
    /**
     * @param {StateController} stateController
     * @param {Screen} screen
     */
    constructor(stateController, screen) {
        this.stateController = stateController;
        this.firestore = stateController.firestore;
        this.screen = screen;
    }

    init() {
        //to be overidden
    }

    show() {
        //to be overidden
    }

    destroy() {
        //to be overidden
    }
}