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