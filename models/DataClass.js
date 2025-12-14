export class Features {
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