export class Features {
    constructor() {
        this.list = [],
        this.selectedIndex = 0
    }

    activate(index){
        this.list.forEach((tool, i) => {
            if (i === index){
                tool.activate();
            }else{
                tool.deactivate();
            }
        });
        this.selectedIndex = index;
        console.log(`Activated index: ${index}`);
    }
}