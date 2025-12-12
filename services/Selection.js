export class ExportService {
    constructor(controller) {
        this.controller = controller;
        this.exportMesh = this.exportMesh.bind(this);
    }
}