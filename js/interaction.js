import * as THREE from 'three';
import { state } from './state.js';
import { globals } from './globals.js';
import { config } from './config.js';
import { updateVerticesInCube, createPointCloud } from './loader.js';
import { updateStatsUI, renderCategories, updateTransformControls, setSelectionMode, updateAllIndicators } from './ui.js';

export function initInteraction() {
    globals.renderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    globals.renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
}

function handleMouseDown(e) {
    if (e.button !== 0) return;
    const rect = globals.renderer.domElement.getBoundingClientRect();
    
    if (e.clientX < rect.left || e.clientX > rect.right || 
        e.clientY < rect.top || e.clientY > rect.bottom) return;

    let boxCreated = false;

    if (state.selectionMode) {
        const mouse = new THREE.Vector2();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.params.Points.threshold = Math.max(0.1, state.pointSize / 2);
        raycaster.setFromCamera(mouse, globals.camera);

        let hitPoint = null;
        let distance = 0;

        // 1. Try hitting points
        if (globals.pointsMesh) {
            const intersects = raycaster.intersectObject(globals.pointsMesh);
            if (intersects.length > 0) {
                hitPoint = intersects[0].point;
                distance = intersects[0].distance;
            }
        }

        // 2. If no points hit, try hitting the base mesh (faces)
        if (!hitPoint && globals.baseMesh && globals.baseMesh.visible) {
            const intersects = raycaster.intersectObject(globals.baseMesh);
            if (intersects.length > 0) {
                hitPoint = intersects[0].point;
                distance = intersects[0].distance;
            }
        }

        if (hitPoint) {
            const oldCube = state.labeledCubes.get(state.activeCategory);
            let isReplacement = false;
            
            // Confirmation logic
            if (oldCube && oldCube.box) {
                const category = state.categories.find(c => c.id === state.activeCategory);
                const confirmed = window.confirm(`Category "${category ? category.name : state.activeCategory}" already has a bounding box. Do you want to replace it?`);
                if (!confirmed) return; // Abort if user cancels
                
                globals.scene.remove(oldCube.box);
                isReplacement = true;
            }

            boxCreated = true;
            state.selectionStart = hitPoint.clone();
            state.isCreatingCube = true;

            const category = state.categories.find(c => c.id === state.activeCategory);
            const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
            const boxMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(category.color),
                transparent: true,
                opacity: 0.3,
            });
            const box = new THREE.Mesh(boxGeometry, boxMaterial);
            
            const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
            const edgesMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(category.color), linewidth: 2 });
            const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
            box.add(edges);

            box.position.copy(state.selectionStart);

            const s = distance * config.interaction.addBoxScaleFactor; 
            box.scale.set(s, s, s); 
            globals.scene.add(box);

            state.labeledCubes.set(state.activeCategory, {
                cube: { position: state.selectionStart.clone(), scale: new THREE.Vector3(s, s, s), rotation: new THREE.Euler() },
                vertices: [],
                box: box
            });
            state.activeCubeId = state.activeCategory;
            
            if (isReplacement) {
                updateVerticesInCube(state.activeCategory);
                state.isCreatingCube = false;
                state.selectionStart = null;
                setSelectionMode(false);
            }

            updateStatsUI();
            renderCategories();
            updateTransformControls();
        }
    } 
    
    if (!boxCreated) {
        state.isRotating = true;
        state.previousMousePosition = { x: e.clientX, y: e.clientY };
    }
}

function handleMouseMove(e) {
    if (state.isCreatingCube && state.selectionStart) {
        const rect = globals.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, globals.camera);
        
        const planeNormal = new THREE.Vector3();
        globals.camera.getWorldDirection(planeNormal);
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, state.selectionStart);
        
        const intersect = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersect);

        const cubeData = state.labeledCubes.get(state.activeCategory);
        if (cubeData && cubeData.box && intersect) {
            const center = new THREE.Vector3().addVectors(state.selectionStart, intersect).multiplyScalar(0.5);
            const size = new THREE.Vector3().subVectors(intersect, state.selectionStart).abs();
            
            const dist = globals.camera.position.distanceTo(center);
            const minSize = dist * config.interaction.minBoxScaleFactor;

            cubeData.box.position.copy(center);
            cubeData.box.scale.set(
                Math.max(size.x, minSize),
                Math.max(size.y, minSize),
                Math.max(size.z, minSize)
            );

            cubeData.cube.position.copy(cubeData.box.position);
            cubeData.cube.scale.copy(cubeData.box.scale);
            updateAllIndicators();
        }
    } else if (state.isRotating && globals.pointsMesh) {
        const deltaX = e.clientX - state.previousMousePosition.x;
        const deltaY = e.clientY - state.previousMousePosition.y;

        const center = globals.pointsMesh.geometry.boundingSphere ? globals.pointsMesh.geometry.boundingSphere.center : new THREE.Vector3();
        const offset = new THREE.Vector3().subVectors(globals.camera.position, center);
        const distance = offset.length();

        let phi = Math.atan2(offset.x, offset.z) - deltaX * 0.01;
        let theta = Math.acos(Math.max(-1, Math.min(1, offset.y / distance))) - deltaY * 0.01;
        theta = Math.max(0.1, Math.min(Math.PI - 0.1, theta));

        offset.x = distance * Math.sin(theta) * Math.sin(phi);
        offset.y = distance * Math.cos(theta);
        offset.z = distance * Math.sin(theta) * Math.cos(phi);

        globals.camera.position.copy(center).add(offset);
        globals.camera.lookAt(center);

        state.previousMousePosition = { x: e.clientX, y: e.clientY };
        updateAllIndicators();
    }
}

function handleMouseUp() {
    if (state.isCreatingCube) {
        updateVerticesInCube(state.activeCategory);
        state.isCreatingCube = false;
        state.selectionStart = null;
        updateAllIndicators();
    }
    
    if (state.selectionMode) {
        setSelectionMode(false);
    }

    state.isRotating = false;
}

function handleWheel(e) {
    e.preventDefault();
    const center = globals.pointsMesh?.geometry?.boundingSphere?.center || new THREE.Vector3();
    const distance = globals.camera.position.distanceTo(center);
    const speed = distance * 0.1 * Math.sign(e.deltaY);
    globals.camera.translateZ(speed);
    updateAllIndicators();
}

// Logic for deleting a cube
export function deleteCube(categoryId) {
    const cubeData = state.labeledCubes.get(categoryId);
    if (cubeData && cubeData.box) {
        globals.scene.remove(cubeData.box);
    }
    state.labeledCubes.delete(categoryId);
    if (state.activeCubeId === categoryId) {
        state.activeCubeId = null;
        updateTransformControls();
    }
    updateVerticesInCube(categoryId);
    updateStatsUI();
    renderCategories();
    createPointCloud(state.vertices);
}