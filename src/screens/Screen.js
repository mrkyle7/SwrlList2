import { StateController } from "../views/stateController";

export class Screen {

    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        this.stateController = stateController;
    }

    updateTitleBar() {
        //override me
    }
}