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
    
    createPointCloud(positions);
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

export function createPointCloud(positions) {
    if (globals.pointsMesh) globals.scene.remove(globals.pointsMesh);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const colors = new Float32Array(positions.length);
    for (let i = 0; i < colors.length; i += 3) {
        const vertexIndex = i / 3;
        let found = false;

        state.labeledCubes.forEach((cubeData) => {
            if (cubeData.vertices.includes(vertexIndex)) {
                const category = state.categories.find(c => c.id === cubeData.categoryId);
                if (category) {
                    const color = new THREE.Color(category.color);
                    colors[i] = color.r;
                    colors[i + 1] = color.g;
                    colors[i + 2] = color.b;
                    found = true;
                }
            }
        });

        if (!found) {
            const defColor = config.ui.pointDefaultColor || [0.8, 0.8, 0.8];
            colors[i] = defColor[0];
            colors[i + 1] = defColor[1];
            colors[i + 2] = defColor[2];
        }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Compute bounding sphere early for auto-sizing and centering
    geometry.computeBoundingSphere();
    const center = geometry.boundingSphere.center;
    const radius = geometry.boundingSphere.radius;

    // Auto-calculate point size based on model scale
    // Heuristic: Radius / 400 seems to provide a good balance
    const autoSize = Math.max(config.pointSize.min, Math.min(config.pointSize.max, radius / 400));
    updatePointSizeSlider(autoSize);

    const sprite = createCircleTexture();
    const material = new THREE.PointsMaterial({ 
        size: state.pointSize, // state.pointSize is updated by updatePointSizeSlider
        vertexColors: true, 
        sizeAttenuation: true,
        map: sprite,
        alphaTest: 0.5,
        transparent: true
    });

    globals.pointsMesh = new THREE.Points(geometry, material);
    globals.scene.add(globals.pointsMesh);

    // Center camera logic (simple re-center)
    if (state.labeledCubes.size === 0) {
        globals.camera.position.set(center.x + radius * 2, center.y + radius * 2, center.z + radius * 2);
        globals.camera.lookAt(center);
    }
}

// Re-export this for interaction.js to call
export function updateVerticesInCube(cubeId) {
    const cubeData = state.labeledCubes.get(cubeId);
    if (!cubeData || !cubeData.box || !globals.pointsMesh) return;

    const box = cubeData.box;
    box.updateMatrixWorld();

    const inverseMatrix = new THREE.Matrix4().copy(box.matrixWorld).invert();
    const positions = globals.pointsMesh.geometry.attributes.position.array;
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
    createPointCloud(state.vertices);
    renderCategories();
}
