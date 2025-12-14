export class Tool {
    constructor(icon, name, state) {
        this.icon = icon;
        this.name = name;
        this.isActive = false;
        state.add(this);
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