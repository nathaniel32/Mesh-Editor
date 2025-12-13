import { Feature } from '../../models/Feature.js';

export class MoveTool extends Feature{
    constructor(controller) {
        super("fa-solid fa-arrows-up-down-left-right");
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