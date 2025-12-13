export class Feature {
    constructor(icon) {
        this.icon = icon,
        this.isActive = false
    }

    toggle(){
        if (this.isActive){
            this.deactivate();
        }else{
            this.activate();
        }
    }

    activate(){
    }

    deactivate(){
    }
}