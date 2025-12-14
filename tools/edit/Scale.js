import { Tool } from '../../models/Tool.js';

export class ScaleTool extends Tool{
    constructor(controller) {
        super("fa-solid fa-expand", "Scale");
        this.controller = controller;
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