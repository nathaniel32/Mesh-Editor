import { Tool } from '../../models/Tool.js';

export class MoveTool extends Tool{
    constructor(controller, state) {
        super("fa-solid fa-arrows-up-down-left-right", "Move");
        this.controller = controller;
        state.add(this);
    }

    //override
    activate(){
        this.isActive = true;
    }

    //override
    deactivate(){
        this.isActive = false;
    }
}