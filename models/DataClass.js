export class Features {
    constructor() {
        this.list = [],
        this.selectedIndex = 0
    }

    activate(index){
        this.list.forEach((tool, i) => {
            tool.isActive = i === index;
        });
        this.selectedIndex = index;
        console.log(`Activated index: ${index}`);
    }
}