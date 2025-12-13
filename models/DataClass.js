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