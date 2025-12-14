export class ToolsState {
    constructor() {
        this.list = [],
        this.selectedIndex = 0
    }

    toggle(index){
        this.list.forEach((tool, i) => {
            if (i === index){
                tool.toggle();
            }else{
                tool.deactivate();
            }
        });
        this.selectedIndex = index;
        console.log(`Activated index: ${index}`);
    }
}

export class EditorState {
    constructor() {
        this.container = null;
        this.workingMesh = null;
        this.workingBrush = null;
    }
}

export class StatusState {
    constructor() {
        this.list = [];
    }

    add(status, delay=2000) {
        this.list.push(status);
        console.log(`Status added:`, status);

        setTimeout(() => {this.remove()}, delay);
    }

    remove() {
        if (this.list.length === 0) return;
        const removed = this.list.pop();
        console.log(`Status removed:`, removed);
    }
}