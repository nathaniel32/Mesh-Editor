import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { Feature } from '../../models/Feature.js';

export class ExportService extends Feature{
    constructor(controller) {
        super("fa-solid fa-file-export");
        this.controller = controller;
        this.exportMesh = this.exportMesh.bind(this);
    }

    //override
    activate(){
        this.isActive = true;
    }

    //override
    deactivate(){
        this.isActive = false;
    }

    exportMesh() {
        if (!this.controller.workingMesh) return;
        
        this.controller.statusText = 'Exporting...';
        
        try {
            const exporter = new OBJExporter();
            const objString = exporter.parse(this.controller.workingMesh);

            const blob = new Blob([objString], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cut_mesh_${this.controller.cutCount}cuts_${Date.now()}.obj`;
            a.click();
            URL.revokeObjectURL(url);

            this.controller.statusText = `Exported with ${this.controller.cutCount} cuts!`;
            setTimeout(() => this.controller.statusText = '', 2000);
        } catch (err) {
            this.controller.statusText = 'Export error: ' + err.message;
            console.error(err);
        }
    }
}