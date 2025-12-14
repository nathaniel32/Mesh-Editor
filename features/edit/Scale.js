import { Feature } from '../../models/Feature.js';

export class ScaleTool extends Feature{
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