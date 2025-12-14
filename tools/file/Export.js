import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { Tool } from '../../models/Tool.js';

export class ExportTool extends Tool{
    constructor(controller, state) {
        super("fa-solid fa-file-export", "Export");
        this.controller = controller;
        state.add(this);
    }

    //override
    activate(){
        this.isActive = true;
        this.exportMesh();
        this.deactivate();
    }

    //override
    deactivate(){
        this.isActive = false;
    }

    exportMesh() {
        if (!this.controller.fileState.workingMesh) return;
                
        try {
            const exporter = new OBJExporter();
            const objString = exporter.parse(this.controller.fileState.workingMesh);

            const blob = new Blob([objString], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `data_${Date.now()}.obj`;
            a.click();
            URL.revokeObjectURL(url);

            this.controller.statusState.add('Exported');
        } catch (err) {
            this.controller.statusState.add('Export error: ' + err.message);
            console.error(err);
        }
    }
}