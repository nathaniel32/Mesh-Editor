export class CutService {
    constructor(controller) {
        this.controller = controller;
        this.mode = 'remove';
    }

    setMode(mode) {
        console.log(mode);
        
        this.mode = mode;
        
        if (this.controller.cutterMesh) {
            const color = mode === 'remove' ? 0xff0000 : 0x00ff00;
            this.controller.cutterMesh.material.color.setHex(color);
        }
    }
}