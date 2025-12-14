import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, SUBTRACTION, INTERSECTION, HOLLOW_SUBTRACTION, HOLLOW_INTERSECTION } from 'three-bvh-csg';
import { Feature } from '../../models/Feature.js';

export class ImportService extends Feature{
    constructor(controller) {
        super("fa-solid fa-file-import");
        this.controller = controller;
        this.loadOBJ = this.loadOBJ.bind(this);
    }

    //override
    activate(){
        this.isActive = true;
    }

    //override
    deactivate(){
        this.isActive = false;
    }

    loadOBJ(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.controller.statusText = 'Loading...';
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const loader = new OBJLoader();
                const obj = loader.parse(e.target.result);
                
                if (this.controller.workingMesh) this.controller.renderScene.scene.remove(this.controller.workingMesh);

                const geometries = [];
                obj.traverse((child) => {
                    if (child.isMesh) {
                        const clonedGeometry = child.geometry.clone();
                        clonedGeometry.applyMatrix4(child.matrixWorld);
                        this.controller.ensureUVAttribute(clonedGeometry);
                        geometries.push(clonedGeometry);
                    }
                });

                const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
                mergedGeometry.computeVertexNormals();
                this.controller.ensureUVAttribute(mergedGeometry);
                
                const box = new THREE.Box3().setFromBufferAttribute(mergedGeometry.attributes.position);
                const center = box.getCenter(new THREE.Vector3());
                const positions = mergedGeometry.attributes.position;
                for (let i = 0; i < positions.count; i++) {
                    positions.setXYZ(
                        i,
                        positions.getX(i) - center.x,
                        positions.getY(i) - center.y,
                        positions.getZ(i) - center.z
                    );
                }
                
                this.controller.workingBrush = new Brush(mergedGeometry);
                this.controller.workingBrush.updateMatrixWorld();

                this.controller.workingMesh = new THREE.Mesh(
                    mergedGeometry,
                    new THREE.MeshStandardMaterial({
                        color: 0x3498db,
                        side: THREE.DoubleSide
                    })
                );

                this.controller.renderScene.scene.add(this.controller.workingMesh);

                const size = box.getSize(new THREE.Vector3()).length();
                this.controller.renderScene.camera.position.set(size, size, size);
                this.controller.renderScene.controls.target.set(0, 0, 0);
                this.controller.renderScene.controls.update();

                this.controller.cutCount = 0;
                this.controller.statusText = 'Data successfully imported';
                this.deactivate();
            } catch (err) {
                this.controller.statusText = 'Error: ' + err.message;
                console.error(err);
            }
        };
        reader.readAsText(file);
    }
}