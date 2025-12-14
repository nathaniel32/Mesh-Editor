import { Tool } from '../../models/Tool.js';

export class SelectionBoxTool extends Tool {
    constructor(controller, state) {
        super("fa-regular fa-square", "Box");
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
        
        this.handleMouseDown = null;
        this.handleMouseMove = null;
        this.handleMouseUp = null;
        this.handleContextMenu = null;
        
        state.add(this);
    }

    activate() {
        this.isActive = true;
        this.controller.fileState.container.style.cursor = 'crosshair';
        this.setupDragSelection();
    }

    deactivate() {
        this.isActive = false;
        this.controller.fileState.container.style.cursor = 'default';
        this.removeDragSelection();
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
        const container = this.controller.fileState.container;
        
        this.handleMouseDown = (e) => {
            if (e.button !== 2) return;
            e.preventDefault();
            this.isDragging = true;
            this.controller.renderScene.controls.enabled = false;
            this.dragStart = { x: e.clientX, y: e.clientY };
            this.dragEnd = { x: e.clientX, y: e.clientY };
        };

        this.handleMouseMove = (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            this.dragEnd = { x: e.clientX, y: e.clientY };
            this.updateSelectionBoxUI();
        };

        this.handleMouseUp = (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            this.isDragging = false;
            this.controller.renderScene.controls.enabled = true;
            this.box.visible = false;
            this.controller.cutTool.createCuttingVolume();
        };

        this.handleContextMenu = (e) => {
            e.preventDefault();
        };

        container.addEventListener('mousedown', this.handleMouseDown);
        container.addEventListener('mousemove', this.handleMouseMove);
        container.addEventListener('mouseup', this.handleMouseUp);
        container.addEventListener('contextmenu', this.handleContextMenu);
    }

    removeDragSelection() {
        const container = this.controller.fileState.container;
        
        if (this.handleMouseDown) {
            container.removeEventListener('mousedown', this.handleMouseDown);
        }
        if (this.handleMouseMove) {
            container.removeEventListener('mousemove', this.handleMouseMove);
        }
        if (this.handleMouseUp) {
            container.removeEventListener('mouseup', this.handleMouseUp);
        }
        if (this.handleContextMenu) {
            container.removeEventListener('contextmenu', this.handleContextMenu);
        }
        
        // Reset handlers
        this.handleMouseDown = null;
        this.handleMouseMove = null;
        this.handleMouseUp = null;
        this.handleContextMenu = null;
        
        // Reset state
        this.isDragging = false;
        this.box.visible = false;
    }
}