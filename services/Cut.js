import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION, INTERSECTION, HOLLOW_SUBTRACTION, HOLLOW_INTERSECTION } from 'three-bvh-csg';

export class CutService {
    constructor(controller) {
        this.controller = controller;
        this.mode = 'remove';
        this.applyCut = this.applyCut.bind(this);
    }

    setMode(mode) {
        console.log(mode);
        
        this.mode = mode;
        
        if (this.controller.cutterMesh) {
            const color = mode === 'remove' ? 0xff0000 : 0x00ff00;
            this.controller.cutterMesh.material.color.setHex(color);
        }
    }

    applyCut() {
        if (!this.controller.previewMesh) return;

        if (this.controller.workingMesh) {
            this.controller.scene.remove(this.controller.workingMesh);
        }

        this.controller.workingMesh = new THREE.Mesh(
            this.controller.previewMesh.geometry.clone(),
            new THREE.MeshStandardMaterial({
                color: 0x3498db,
                side: THREE.DoubleSide
            })
        );
        this.controller.scene.add(this.controller.workingMesh);

        this.controller.workingBrush = new Brush(this.controller.previewMesh.geometry.clone());
        this.controller.workingBrush.updateMatrixWorld();

        if (this.controller.previewMesh) {
            this.controller.scene.remove(this.controller.previewMesh);
            this.controller.previewMesh = null;
        }

        if (this.controller.cutterMesh) {
            this.controller.scene.remove(this.controller.cutterMesh);
            this.controller.cutterMesh = null;
        }

        this.controller.cutterBrush = null;

        this.controller.cutCount++;
        this.controller.isPreviewing = false;
        this.controller.previewDisabled = false;
        this.controller.selectionInfo.visible = false;

        this.controller.statusText = `Cut #${this.controller.cutCount} applied! Select again or EXPORT`;
    }
}