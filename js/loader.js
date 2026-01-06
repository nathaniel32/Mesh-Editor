import * as THREE from 'three';
import { state } from './state.js';
import { globals } from './globals.js';
import { config } from './config.js';
import { createCircleTexture } from './utils.js';
import { updateStatsUI, renderCategories, updateTransformControls, updatePointSizeSlider } from './ui.js';

export function loadOBJ(file) {
    const reader = new FileReader();
    reader.onload = (e) => parseOBJ(e.target.result);
    reader.readAsText(file);
}

export function parseOBJ(text) {
    const lines = text.split('\n');
    const positions = [];
    const indices = [];
    
    // Reset raw storage
    state.rawObj = { v: [], vn: [], f: [], other: [] };

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const parts = trimmed.split(/\s+/);
        const type = parts[0];

        if (type === 'v') {
            // Parse for visualization
            positions.push(
                parseFloat(parts[1]),
                parseFloat(parts[2]),
                parseFloat(parts[3])
            );
            // Store raw
            state.rawObj.v.push(trimmed);
        } else if (type === 'vn') {
            state.rawObj.vn.push(trimmed);
        } else if (type === 'f') {
            state.rawObj.f.push(trimmed);
            // Parse indices
            const vertices = parts.slice(1);
            const faceIndices = vertices.map(v => {
                const indexStr = v.split('/')[0];
                return parseInt(indexStr) - 1;
            });
            
            // Triangulate (fan)
            for (let i = 1; i < faceIndices.length - 1; i++) {
                indices.push(faceIndices[0], faceIndices[i], faceIndices[i+1]);
            }
        } else {
            state.rawObj.other.push(trimmed);
        }
    });

    state.vertices = positions;
    
    // Reset labeled cubes meshes but keep categories
    state.labeledCubes.forEach(data => {
        if (data.box) globals.scene.remove(data.box);
    });
    state.labeledCubes.clear();
    state.activeCubeId = null;
    
    state.stats.totalVertices = positions.length / 3;
    state.stats.labeled = 0;
    
    createPointCloud(positions, true);
    createMesh(positions, indices);
    updateStatsUI();
    renderCategories(); 
    updateTransformControls();
}

export function createMesh(positions, indices) {
    if (globals.baseMesh) globals.scene.remove(globals.baseMesh);

    if (indices.length === 0) return;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const isOpaque = state.meshOpacity >= 1.0;

    const material = new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.5,
        metalness: 0.5,
        transparent: !isOpaque,
        opacity: state.meshOpacity,
        side: THREE.DoubleSide,
        depthWrite: isOpaque, 
        polygonOffset: true,
        polygonOffsetFactor: 1, 
        polygonOffsetUnits: 1
    });

    globals.baseMesh = new THREE.Mesh(geometry, material);
    globals.baseMesh.visible = state.meshOpacity > 0;
    globals.scene.add(globals.baseMesh);
}

export function createPointCloud(positions, updateSize = false) {
    if (globals.pointsMesh) globals.scene.remove(globals.pointsMesh);

    // 1. Identify hidden vertices
    const hiddenIndices = new Set();
    state.labeledCubes.forEach(cube => {
        if (!cube.pointsVisible) {
            cube.vertices.forEach(vIdx => hiddenIndices.add(vIdx));
        }
    });

    const visiblePositions = [];
    const visibleColors = [];

    // Pre-calculate defColor
    const defColor = config.ui.pointDefaultColor || [0.8, 0.8, 0.8];

    // 2. Build filtered arrays
    for (let i = 0; i < positions.length; i += 3) {
        const vertexIndex = i / 3;

        // Skip if hidden
        if (hiddenIndices.has(vertexIndex)) continue;

        // Add Position
        visiblePositions.push(positions[i], positions[i+1], positions[i+2]);

        // Determine Color
        let r = defColor[0];
        let g = defColor[1];
        let b = defColor[2];
        
        // Check if vertex is in any labeled cube
        // Note: If a vertex is in multiple cubes, the last one wins (or we break on first).
        // The original logic iterated all and let last one overwrite.
        // We'll mimic that.
        state.labeledCubes.forEach((cubeData) => {
            if (cubeData.vertices.includes(vertexIndex)) {
                const category = state.categories.find(c => c.id === cubeData.categoryId);
                if (category) {
                    const color = new THREE.Color(category.color);
                    r = color.r;
                    g = color.g;
                    b = color.b;
                }
            }
        });

        visibleColors.push(r, g, b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(visiblePositions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(visibleColors, 3));
    
    // Compute bounding sphere on the *visible* geometry for the mesh to work correctly
    geometry.computeBoundingSphere();

    // 3. Camera Target & Auto-sizing logic
    // We use the FULL positions for calculating the camera target to keep it stable
    // regardless of visibility toggles.
    const tempGeo = new THREE.BufferGeometry();
    tempGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    tempGeo.computeBoundingSphere();
    
    const center = tempGeo.boundingSphere ? tempGeo.boundingSphere.center : new THREE.Vector3();
    const radius = tempGeo.boundingSphere ? tempGeo.boundingSphere.radius : 10;
    
    // Initialize/Reset camera target to mesh center
    if (updateSize || !state.cameraTarget) {
        state.cameraTarget = center.clone();
    }

    if (updateSize) {
        // Auto-calculate point size based on model scale
        const autoSize = radius / 400;
        const autoMin = 0; // Allow hiding points completely
        const autoMax = radius / 10;
        const autoStep = radius / 10000;

        updatePointSizeSlider(autoSize, autoMin, autoMax, autoStep);
    }

    const sprite = createCircleTexture();
    const material = new THREE.PointsMaterial({ 
        size: state.pointSize, 
        vertexColors: true, 
        sizeAttenuation: true,
        map: sprite,
        alphaTest: 0.5,
        transparent: true
    });

    globals.pointsMesh = new THREE.Points(geometry, material);
    globals.pointsMesh.visible = state.pointSize > 0; // Ensure visibility respects point size
    globals.scene.add(globals.pointsMesh);

    // Center camera logic (simple re-center)
    if (state.labeledCubes.size === 0 && updateSize) {
        globals.camera.position.set(center.x + radius * 2, center.y + radius * 2, center.z + radius * 2);
        globals.camera.lookAt(state.cameraTarget);
    }
}

// Re-export this for interaction.js to call
export function updateVerticesInCube(cubeId) {
    const cubeData = state.labeledCubes.get(cubeId);
    if (!cubeData || !cubeData.box || !globals.pointsMesh) return;

    const box = cubeData.box;
    box.updateMatrixWorld();

    const inverseMatrix = new THREE.Matrix4().copy(box.matrixWorld).invert();
    // Use state.vertices as the source of truth, not the potentially modified mesh geometry
    const positions = state.vertices; 
    const selected = [];
    const p = new THREE.Vector3();
    const limit = 0.5;

    for (let i = 0; i < positions.length; i += 3) {
        p.set(positions[i], positions[i+1], positions[i+2]);
        p.applyMatrix4(inverseMatrix);
        
        if (Math.abs(p.x) <= limit && Math.abs(p.y) <= limit && Math.abs(p.z) <= limit) {
            selected.push(i / 3);
        }
    }

    cubeData.vertices = selected;
    updateStatsUI();
    createPointCloud(state.vertices, false);
    renderCategories();
}
