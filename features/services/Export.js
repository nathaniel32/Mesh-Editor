import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { Feature } from '../../models/Feature.js';

export class ExportService extends Feature{
    constructor(controller) {
        super("fa-solid fa-file-export", "Export");
        this.controller = controller;
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
        if (!this.controller.editorState.workingMesh) return;
        
        this.controller.statusText = 'Exporting...';
        
        try {
            const exporter = new OBJExporter();
            const objString = exporter.parse(this.controller.editorState.workingMesh);

            const blob = new Blob([objString], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `data_${Date.now()}.obj`;
            a.click();
            URL.revokeObjectURL(url);

            this.controller.statusText = 'Exported';
            setTimeout(() => this.controller.statusText = '', 2000);
        } catch (err) {
            this.controller.statusText = 'Export error: ' + err.message;
            console.error(err);
        }
    }
}