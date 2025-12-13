import { Feature } from '../../models/Feature.js';

export class ScaleTool extends Feature{
    constructor(controller) {
        super("fa-solid fa-expand");
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