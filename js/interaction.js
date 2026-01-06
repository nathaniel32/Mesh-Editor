import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
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
    globals.renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

    // Initialize TransformControls
    globals.transformControls = new TransformControls(globals.camera, globals.renderer.domElement);
    globals.transformControls.addEventListener('change', () => {
        // Update vertices when object changes
        if (state.activeCubeId) {
             const cubeData = state.labeledCubes.get(state.activeCubeId);
             if (cubeData && cubeData.box) {
                // Handle Anchored Scaling during interaction
                if (state.isTransforming && state.transformMode === 'scale' && state.scaleDirection !== 0 && state.lastScale) {
                    const axis = globals.transformControls.axis;
                    if (axis && axis.length === 1) { // Ensure single axis
                        const axisChar = axis.toLowerCase();
                        const currentScale = cubeData.box.scale[axisChar];
                        const prevScale = state.lastScale[axisChar];
                        const delta = currentScale - prevScale;

                        if (delta !== 0) {
                            const shift = delta * 0.5 * state.scaleDirection;
                            
                            const localAxisVec = new THREE.Vector3();
                            if (axisChar === 'x') localAxisVec.set(1, 0, 0);
                            if (axisChar === 'y') localAxisVec.set(0, 1, 0);
                            if (axisChar === 'z') localAxisVec.set(0, 0, 1);
                            
                            // Convert to world direction
                            localAxisVec.applyQuaternion(cubeData.box.quaternion);
                            
                            cubeData.box.position.addScaledVector(localAxisVec, shift);
                            state.lastScale.copy(cubeData.box.scale);
                        }
                    }
                }

                // Sync the internal data model with the mesh
                cubeData.cube.position.copy(cubeData.box.position);
                cubeData.cube.rotation.copy(cubeData.box.rotation);
                cubeData.cube.scale.copy(cubeData.box.scale);
                
                updateVerticesInCube(state.activeCubeId);
                updateAllIndicators(); // Update UI inputs
             }
        }
    });

    globals.transformControls.addEventListener('dragging-changed', function (event) {
        state.isTransforming = event.value;
        if (state.isTransforming && state.transformMode === 'scale' && state.activeCubeId) {
            const cubeData = state.labeledCubes.get(state.activeCubeId);
            if (cubeData) {
                state.lastScale = cubeData.cube.scale.clone();
                const axis = globals.transformControls.axis;
                if (axis && ['X', 'Y', 'Z'].includes(axis)) {
                    state.scaleDirection = getDragDirection(axis, cubeData.box);
                } else {
                    state.scaleDirection = 0;
                }
            }
        }
    });

    globals.scene.add(globals.transformControls);
}

function getDragDirection(axisChar, object) {
    const axisName = axisChar.toLowerCase();
    const localAxis = new THREE.Vector3();
    if (axisName === 'x') localAxis.set(1, 0, 0);
    if (axisName === 'y') localAxis.set(0, 1, 0);
    if (axisName === 'z') localAxis.set(0, 0, 1);
    
    // Transform local axis to world direction
    const worldAxis = localAxis.clone().applyQuaternion(object.quaternion).normalize();
    
    // Project Center to Screen
    const center = object.position.clone();
    center.project(globals.camera); 
    
    // Project Center + Axis to Screen
    const offsetPoint = object.position.clone().add(worldAxis.multiplyScalar(1)); 
    offsetPoint.project(globals.camera); 
    
    // Vector on screen
    const screenAxis = new THREE.Vector2(offsetPoint.x - center.x, offsetPoint.y - center.y);
    
    // Mouse NDC
    const rect = globals.renderer.domElement.getBoundingClientRect();
    const mouseX = ((state.currentMousePosition.x - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((state.currentMousePosition.y - rect.top) / rect.height) * 2 + 1;
    
    const mouseVec = new THREE.Vector2(mouseX - center.x, mouseY - center.y);
    
    // Dot Product
    return screenAxis.dot(mouseVec) >= 0 ? 1 : -1;
}

function handleMouseDown(e) {
    if (state.isTransforming) return; 
    if (globals.transformControls && globals.transformControls.axis) return; // Prevent conflict if hovering controls

    const rect = globals.renderer.domElement.getBoundingClientRect();
    
    if (e.clientX < rect.left || e.clientX > rect.right || 
        e.clientY < rect.top || e.clientY > rect.bottom) return;

    if (e.button === 2) { // Right click for panning
        state.isPanning = true;
        state.previousMousePosition = { x: e.clientX, y: e.clientY };
        return;
    }

    if (e.button !== 0) return;

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
            // Create new cube
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

            const cubeId = ++state.cubeIdCounter;
            state.labeledCubes.set(cubeId, {
                id: cubeId,
                categoryId: state.activeCategory,
                cube: { position: state.selectionStart.clone(), scale: new THREE.Vector3(s, s, s), rotation: new THREE.Euler() },
                vertices: [],
                box: box,
                pointsVisible: true
            });
            state.activeCubeId = cubeId;
            
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
    state.currentMousePosition = { x: e.clientX, y: e.clientY };

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

        const cubeData = state.labeledCubes.get(state.activeCubeId);
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
    } else if (state.isRotating && globals.pointsMesh && !state.isTransforming) {
        const deltaX = e.clientX - state.previousMousePosition.x;
        const deltaY = e.clientY - state.previousMousePosition.y;

        // Use the dynamic camera target instead of the static mesh center
        const center = state.cameraTarget || (globals.pointsMesh.geometry.boundingSphere ? globals.pointsMesh.geometry.boundingSphere.center : new THREE.Vector3());
        
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
    } else if (state.isPanning && !state.isTransforming) {
        const deltaX = e.clientX - state.previousMousePosition.x;
        const deltaY = e.clientY - state.previousMousePosition.y;

        // Calculate pan speed based on distance to target
        const center = state.cameraTarget || new THREE.Vector3();
        const distance = globals.camera.position.distanceTo(center);
        const panSpeed = distance * 0.001; 

        const panOffset = new THREE.Vector3();
        
        // Pan Camera
        globals.camera.translateX(-deltaX * panSpeed);
        globals.camera.translateY(deltaY * panSpeed);
        
        // IMPORTANT: Also pan the target so rotation stays consistent relative to view
        // We need to move the target by the same world-space vector the camera moved (inverted)
        // Camera translateX/Y moves in local space.
        const right = new THREE.Vector3().setFromMatrixColumn(globals.camera.matrix, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(globals.camera.matrix, 1);
        
        panOffset.addScaledVector(right, -deltaX * panSpeed);
        panOffset.addScaledVector(up, deltaY * panSpeed);
        
        if (state.cameraTarget) {
            state.cameraTarget.add(panOffset);
        }

        state.previousMousePosition = { x: e.clientX, y: e.clientY };
        updateAllIndicators();
    }
}

function handleMouseUp() {
    if (state.isCreatingCube) {
        updateVerticesInCube(state.activeCubeId);
        state.isCreatingCube = false;
        state.selectionStart = null;
        updateAllIndicators();
    }
    
    if (state.selectionMode) {
        setSelectionMode(false);
    }

    state.isRotating = false;
    state.isPanning = false;
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
export function deleteCube(cubeId, skipUiUpdate = false) {
    const cubeData = state.labeledCubes.get(cubeId);
    if (cubeData && cubeData.box) {
        globals.scene.remove(cubeData.box);
    }
    state.labeledCubes.delete(cubeId);
    if (state.activeCubeId === cubeId) {
        state.activeCubeId = null;
        updateTransformControls();
    }
    
    if (!skipUiUpdate) {
        updateStatsUI();
        renderCategories();
        createPointCloud(state.vertices);
    }
}

export function createCubeFromData(data) {
    const category = state.categories.find(c => c.id === data.categoryId);
    // Fallback if category doesn't exist (shouldn't happen if categories are restored first)
    const color = category ? category.color : '#ff0000';

    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.3,
    });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    
    const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(color), linewidth: 2 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    box.add(edges);

    // Set transforms
    box.position.copy(data.cube.position);
    box.scale.copy(data.cube.scale);
    box.rotation.copy(data.cube.rotation);

    globals.scene.add(box);

    const cubeId = ++state.cubeIdCounter;
    
    // Create the cube entry
    const newCubeData = {
        id: cubeId,
        categoryId: data.categoryId,
        cube: { 
            position: data.cube.position, // Should be Vector3
            scale: data.cube.scale,       // Should be Vector3
            rotation: data.cube.rotation  // Should be Euler
        },
        vertices: data.vertices,
        box: box,
        pointsVisible: data.pointsVisible !== undefined ? data.pointsVisible : true
    };

    state.labeledCubes.set(cubeId, newCubeData);
    return cubeId;
}