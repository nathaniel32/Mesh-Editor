import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, SUBTRACTION, INTERSECTION, HOLLOW_SUBTRACTION, HOLLOW_INTERSECTION } from 'three-bvh-csg';
import { Tool } from '../../models/Tool.js';
import { ensureUVAttribute } from '../../utils/mesh.js';

export class ImportTool extends Tool{
    constructor(controller, state) {
        super("fa-solid fa-file-import", "Import");
        this.controller = controller;
        this.loadOBJ = this.loadOBJ.bind(this);
        this.autoLoad();
        state.add(this);
    }

    autoLoad(){
        const params = new URLSearchParams(window.location.search);
        const subpath = params.get("subpath");

        console.log("subpath:", subpath);
        const url = `/mesh-map/${encodeURIComponent(subpath)}`;
        
        fetch(url)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return res.json();
        })
        .then(async data => {            
            const objUrl = `/file-download/${data.object}`;
            console.log("obj url:", objUrl);

            try {
                const loader = new OBJLoader();
                const obj = await loader.loadAsync(objUrl);
                
                if (this.controller.fileState.workingMesh) {
                    this.controller.renderScene.scene.remove(this.controller.fileState.workingMesh);
                }

                const geometries = [];
                obj.traverse((child) => {
                    if (child.isMesh) {
                        const clonedGeometry = child.geometry.clone();
                        clonedGeometry.applyMatrix4(child.matrixWorld);
                        ensureUVAttribute(clonedGeometry);
                        geometries.push(clonedGeometry);
                    }
                });

                const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
                mergedGeometry.computeVertexNormals();
                ensureUVAttribute(mergedGeometry);
                
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
                
                this.controller.fileState.workingBrush = new Brush(mergedGeometry);
                this.controller.fileState.workingBrush.updateMatrixWorld();

                this.controller.fileState.workingMesh = new THREE.Mesh(
                    mergedGeometry,
                    new THREE.MeshStandardMaterial({
                        color: 0x3498db,
                        side: THREE.DoubleSide
                    })
                );

                this.controller.renderScene.scene.add(this.controller.fileState.workingMesh);

                const size = box.getSize(new THREE.Vector3()).length();
                this.controller.renderScene.camera.position.set(size, size, size);
                this.controller.renderScene.controls.target.set(0, 0, 0);
                this.controller.renderScene.controls.update();

                this.controller.statusState.add('Model loaded successfully');
            } catch (err) {
                this.controller.statusState.add('Error loading model: ' + err.message);
                console.error(err);
            }
        })
        .catch(err => {
            this.controller.statusState.add(`Fetch error: ${err.message}`);
        });
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

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const loader = new OBJLoader();
                const obj = loader.parse(e.target.result);
                
                if (this.controller.fileState.workingMesh) this.controller.renderScene.scene.remove(this.controller.fileState.workingMesh);

                const geometries = [];
                obj.traverse((child) => {
                    if (child.isMesh) {
                        const clonedGeometry = child.geometry.clone();
                        clonedGeometry.applyMatrix4(child.matrixWorld);
                        ensureUVAttribute(clonedGeometry);
                        geometries.push(clonedGeometry);
                    }
                });

                const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
                mergedGeometry.computeVertexNormals();
                ensureUVAttribute(mergedGeometry);
                
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
                
                this.controller.fileState.workingBrush = new Brush(mergedGeometry);
                this.controller.fileState.workingBrush.updateMatrixWorld();

                this.controller.fileState.workingMesh = new THREE.Mesh(
                    mergedGeometry,
                    new THREE.MeshStandardMaterial({
                        color: 0x3498db,
                        side: THREE.DoubleSide
                    })
                );

                this.controller.renderScene.scene.add(this.controller.fileState.workingMesh);

                const size = box.getSize(new THREE.Vector3()).length();
                this.controller.renderScene.camera.position.set(size, size, size);
                this.controller.renderScene.controls.target.set(0, 0, 0);
                this.controller.renderScene.controls.update();

                this.controller.statusState.add('Data successfully imported');
                this.deactivate();
            } catch (err) {
                this.controller.statusState.add('Error: ' + err.message);
                console.error(err);
            }
        };
        reader.readAsText(file);
    }
}