export class SelectionBox {
    constructor(controller) {
        this.controller = controller;
        this.isDragging = false;
        this.dragStart = null;
        this.dragEnd = null;
    }

    updateSelectionBoxUI() {
        const x1 = Math.min(this.dragStart.x, this.dragEnd.x);
        const y1 = Math.min(this.dragStart.y, this.dragEnd.y);
        const x2 = Math.max(this.dragStart.x, this.dragEnd.x);
        const y2 = Math.max(this.dragStart.y, this.dragEnd.y);

        this.controller.selectionBox.left = x1;
        this.controller.selectionBox.top = y1;
        this.controller.selectionBox.width = x2 - x1;
        this.controller.selectionBox.height = y2 - y1;

        console.log("TEST", this.controller.selectionBox.left);
    }

    setupDragSelection() {
        this.controller.container.addEventListener('mousedown', (e) => {
            if (e.button !== 2 || !this.controller.workingMesh) return;
            console.log("TEST", this.controller.selectionBox.left);
            e.preventDefault();
            this.isDragging = true;
            this.controller.renderScene.controls.enabled = false;
            this.dragStart = { x: e.clientX, y: e.clientY };
            this.dragEnd = { x: e.clientX, y: e.clientY };
            
            this.controller.selectionBox.visible = true;
        });

        this.controller.container.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            e.preventDefault();
            this.dragEnd = { x: e.clientX, y: e.clientY };
            this.updateSelectionBoxUI();
        });

        this.controller.container.addEventListener('mouseup', (e) => {
            if (!this.isDragging) return;
            
            e.preventDefault();
            this.isDragging = false;
            this.controller.renderScene.controls.enabled = true;
            this.controller.selectionBox.visible = false;
            
            this.controller.cutTool.createCuttingVolume();
        });

        this.controller.container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
}