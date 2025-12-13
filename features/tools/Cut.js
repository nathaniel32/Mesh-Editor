import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION, INTERSECTION, HOLLOW_SUBTRACTION, HOLLOW_INTERSECTION } from 'three-bvh-csg';
import { Feature } from '../../models/Feature.js';

export class CutTool extends Feature{
    constructor(controller) {
        super("fa-solid fa-scissors");
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

    createCuttingVolume() {
        if (!this.controller.workingMesh) return;

        const containerRect = this.controller.$refs.canvasContainer.getBoundingClientRect();

        const x1 = Math.min(this.controller.dragStart.x, this.controller.dragEnd.x);
        const y1 = Math.min(this.controller.dragStart.y, this.controller.dragEnd.y);
        const x2 = Math.max(this.controller.dragStart.x, this.controller.dragEnd.x);
        const y2 = Math.max(this.controller.dragStart.y, this.controller.dragEnd.y);

        const ndcX1 = ((x1 - containerRect.left) / containerRect.width) * 2 - 1;
        const ndcY1 = -((y1 - containerRect.top) / containerRect.height) * 2 + 1;
        const ndcX2 = ((x2 - containerRect.left) / containerRect.width) * 2 - 1;
        const ndcY2 = -((y2 - containerRect.top) / containerRect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        const meshBox = new THREE.Box3().setFromObject(this.controller.workingMesh);
        const meshSize = meshBox.getSize(new THREE.Vector3());
        
        const centerNDC = new THREE.Vector2((ndcX1 + ndcX2) / 2, (ndcY1 + ndcY2) / 2);
        raycaster.setFromCamera(centerNDC, this.controller.camera);
        const intersects = raycaster.intersectObject(this.controller.workingMesh);
        
        let centerDepth;
        if (intersects.length > 0) {
            centerDepth = intersects[0].distance;
        } else {
            centerDepth = this.controller.camera.position.distanceTo(meshBox.getCenter(new THREE.Vector3()));
        }

        const depth = meshSize.length() * 2;
        const nearDist = Math.max(0.1, centerDepth - depth);
        const farDist = centerDepth + depth;

        const corners = [
            new THREE.Vector2(ndcX1, ndcY1),
            new THREE.Vector2(ndcX2, ndcY1),
            new THREE.Vector2(ndcX2, ndcY2),
            new THREE.Vector2(ndcX1, ndcY2)
        ];

        const positions = [];
        
        for (const corner of corners) {
            raycaster.setFromCamera(corner, this.controller.camera);
            const point = raycaster.ray.origin.clone().add(
                raycaster.ray.direction.clone().multiplyScalar(nearDist)
            );
            positions.push(point.x, point.y, point.z);
        }
        
        for (const corner of corners) {
            raycaster.setFromCamera(corner, this.controller.camera);
            const point = raycaster.ray.origin.clone().add(
                raycaster.ray.direction.clone().multiplyScalar(farDist)
            );
            positions.push(point.x, point.y, point.z);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        
        const indices = [
            0, 2, 1,  0, 3, 2,
            4, 5, 6,  4, 6, 7,
            0, 1, 5,  0, 5, 4,
            3, 7, 6,  3, 6, 2,
            0, 4, 7,  0, 7, 3,
            1, 2, 6,  1, 6, 5
        ];
        
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        this.controller.ensureUVAttribute(geometry);

        if (this.controller.cutterMesh) {
            this.controller.scene.remove(this.controller.cutterMesh);
        }

        const color = this.mode === 'remove' ? 0xff0000 : 0x00ff00;
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        this.controller.cutterMesh = new THREE.Mesh(geometry, material);
        this.controller.scene.add(this.controller.cutterMesh);

        this.controller.cutterBrush = new Brush(geometry);
        this.controller.cutterBrush.updateMatrixWorld();

        this.controller.selectionInfo.visible = true;
        const modeText = this.mode === 'remove' ? 'REMOVE' : 'KEEP';
        this.controller.selectionInfo.text = `Mode: ${modeText}`;
        this.controller.statusText = 'Selection ready! Click PREVIEW';
    }
}