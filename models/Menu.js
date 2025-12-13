export class Menu {
    constructor(icon) {
        this.icon = icon,
        this.isActive = false
    }

    toggleActive() {
        this.isActive = !this.isActive;
    }
}