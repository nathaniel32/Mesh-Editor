export class Tool {
    constructor(icon, name) {
        this.icon = icon,
        this.name = name,
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