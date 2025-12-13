export class Features {
    constructor() {
        this.list = [],
        this.selectedIndex = 0
    }

    activate(index){
        this.list[index].isActive = true;
    }
}