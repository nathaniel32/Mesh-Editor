import { Tool } from '../../models/Tool.js';

export class SelectionBoxTool extends Tool{
    constructor(controller, state) {
        super("fa-regular fa-square", "Box", state);
        this.controller = controller;
        this.isDragging = false;
        this.dragStart = null;
        this.dragEnd = null;
        this.box = {
            visible: false,
            left: 0,
            top: 0,
            width: 0,
            height: 0
        }
    }

    //override
    activate(){
        this.isActive = true;
    }

    //override
    deactivate(){
        this.isActive = false;
    }

    updateSelectionBoxUI() {
        const x1 = Math.min(this.dragStart.x, this.dragEnd.x);
        const y1 = Math.min(this.dragStart.y, this.dragEnd.y);
        const x2 = Math.max(this.dragStart.x, this.dragEnd.x);
        const y2 = Math.max(this.dragStart.y, this.dragEnd.y);

        this.box.left = x1;
        this.box.top = y1;
        this.box.width = x2 - x1;
        this.box.height = y2 - y1;
        this.box.visible = true;
    }

    setupDragSelection() {
        this.controller.fileState.container.addEventListener('mousedown', (e) => {
            if (e.button !== 2) return;
            e.preventDefault();
            this.isDragging = true;
            this.controller.renderScene.controls.enabled = false;
            this.dragStart = { x: e.clientX, y: e.clientY };
            this.dragEnd = { x: e.clientX, y: e.clientY };
        });

        this.controller.fileState.container.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            e.preventDefault();
            this.dragEnd = { x: e.clientX, y: e.clientY };
            this.updateSelectionBoxUI();
        });

        this.controller.fileState.container.addEventListener('mouseup', (e) => {
            if (!this.isDragging) return;
            
            e.preventDefault();
            this.isDragging = false;
            this.controller.renderScene.controls.enabled = true;
            this.box.visible = false;
            
            this.controller.cutTool.createCuttingVolume();
        });

        this.controller.fileState.container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
}