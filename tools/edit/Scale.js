import { Tool } from '../../models/Tool.js';

export class ScaleTool extends Tool{
    constructor(controller, state) {
        super("fa-solid fa-expand", "Scale");
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