import * as THREE from 'three';
import { state } from './state.js';
import { globals } from './globals.js';
import { config } from './config.js';
import { loadOBJ, updateVerticesInCube, createPointCloud, parseOBJ } from './loader.js';
import { deleteCube, createCubeFromData } from './interaction.js';

// DOM Elements
const modeBtn = document.getElementById('selection-mode-btn');
const modeText = document.getElementById('mode-text');
const modeDesc = document.getElementById('mode-desc');
const transformContainer = document.getElementById('transform-controls');
const transformInputs = document.getElementById('transform-inputs');

// Store refresh functions for active indicators to allow real-time updates
let indicatorRefreshers = [];

export function updateAllIndicators() {
    indicatorRefreshers.forEach(refresh => refresh());
}

export function initUI() {
    // File Input
    document.getElementById('file-input').addEventListener('change', (e) => {
        if (e.target.files[0]) loadOBJ(e.target.files[0]);
    });

    // Mode Toggle
    modeBtn.addEventListener('click', () => {
        setSelectionMode(!state.selectionMode);
    });

    // Add Category
    document.getElementById('add-category-btn').addEventListener('click', () => {
        const newId = Math.max(...state.categories.map(c => c.id), 0) + 1;
        const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff8800', '#8800ff'];
        state.categories.push({
            id: newId,
            name: `Category ${newId}`,
            color: colors[newId % colors.length]
        });
        renderCategories();
    });

    // Export
    document.getElementById('export-btn').addEventListener('click', exportData);

    // Import
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', importData);

    // Point Size
    setupPointSizeSlider();
    
    // Mesh Opacity
    setupMeshOpacitySlider();

    // Initial Renders
    renderCategories();
    updateTransformControls();
    updateStatsUI();
}

export function setSelectionMode(active) {
    state.selectionMode = active;
    const icon = document.getElementById('mode-icon');
    const overlay = document.getElementById('mode-status');
    const overlayText = document.getElementById('mode-text-overlay');

    if (state.selectionMode) {
        modeBtn.classList.remove('bg-gray-700', 'hover:bg-gray-600', 'border-gray-600');
        modeBtn.classList.add('bg-yellow-900/50', 'hover:bg-yellow-900/70', 'border-yellow-500');
        
        modeText.textContent = "Add Box: ON";
        modeText.classList.remove('text-gray-300');
        modeText.classList.add('text-yellow-400');
        
        if (icon) {
            icon.classList.remove('text-gray-400');
            icon.classList.add('text-yellow-400');
        }

        modeDesc.textContent = "Drag on points/faces to create box";
        globals.container.classList.add('crosshair');
        
        // Show Overlay
        if (overlay && overlayText) {
            overlay.classList.remove('hidden');
            overlayText.textContent = "MODE: ADD BOX";
        }
    } else {
        modeBtn.classList.remove('bg-yellow-900/50', 'hover:bg-yellow-900/70', 'border-yellow-500');
        modeBtn.classList.add('bg-gray-700', 'hover:bg-gray-600', 'border-gray-600');
        
        modeText.textContent = "Add Box: OFF";
        modeText.classList.remove('text-yellow-400');
        modeText.classList.add('text-gray-300');

        if (icon) {
            icon.classList.remove('text-yellow-400');
            icon.classList.add('text-gray-400');
        }

        modeDesc.textContent = "Drag to rotate view";
        globals.container.classList.remove('crosshair');

        // Hide Overlay
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }
}

function setupPointSizeSlider() {
    const sizeSlider = document.getElementById('point-size-slider');
    const sizeVal = document.getElementById('point-size-val');
    
    sizeSlider.min = state.pointSizeMin;
    sizeSlider.max = state.pointSizeMax;
    sizeSlider.step = state.pointSizeStep;
    sizeSlider.value = state.pointSize;
    sizeVal.textContent = state.pointSize.toFixed(3);

    sizeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state.pointSize = val;
        sizeVal.textContent = val.toFixed(3);
        if (globals.pointsMesh) {
            globals.pointsMesh.material.size = val;
        }
    });
}

export function updatePointSizeSlider(val, min = null, max = null, step = null) {
    const sizeSlider = document.getElementById('point-size-slider');
    const sizeVal = document.getElementById('point-size-val');
    
    if (min !== null) {
        state.pointSizeMin = min;
        sizeSlider.min = min;
    }
    if (max !== null) {
        state.pointSizeMax = max;
        sizeSlider.max = max;
    }
    if (step !== null) {
        state.pointSizeStep = step;
        sizeSlider.step = step;
    }

    if (sizeSlider && sizeVal) {
        sizeSlider.value = val;
        sizeVal.textContent = val.toFixed(3);
        state.pointSize = val; // Ensure state is synced
        if (globals.pointsMesh) {
            globals.pointsMesh.material.size = val;
        }
    }
}

function setupMeshOpacitySlider() {
    const opacitySlider = document.getElementById('mesh-opacity-slider');
    const opacityVal = document.getElementById('mesh-opacity-val');
    
    opacitySlider.value = state.meshOpacity;
    opacityVal.textContent = state.meshOpacity.toFixed(2);

    opacitySlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state.meshOpacity = val;
        opacityVal.textContent = val.toFixed(2);
        if (globals.baseMesh) {
            globals.baseMesh.material.opacity = val;
            globals.baseMesh.visible = val > 0;
            
            // Toggle transparency mode
            const isOpaque = val >= 1.0;
            globals.baseMesh.material.transparent = !isOpaque;
            globals.baseMesh.material.depthWrite = isOpaque;
            globals.baseMesh.material.needsUpdate = true;
        }
    });
}

export function updateStatsUI() {
    let totalLabeled = 0;
    state.labeledCubes.forEach(c => totalLabeled += c.vertices.length);
    state.stats.labeled = totalLabeled;

    document.getElementById('stat-total').textContent = state.stats.totalVertices;
    document.getElementById('stat-labeled').textContent = state.stats.labeled;
    
    let activeName = 'None';
    if (state.activeCubeId) {
        const cube = state.labeledCubes.get(state.activeCubeId);
        if (cube) {
            const cat = state.categories.find(c => c.id === cube.categoryId);
            if (cat) activeName = `${cat.name} (Cube ${cube.id})`;
        }
    } else if (state.activeCategory !== null) {
        const cat = state.categories.find(c => c.id === state.activeCategory);
        if (cat) activeName = cat.name;
    }
    document.getElementById('stat-active-cube').textContent = activeName;
}

export function renderCategories() {
    const list = document.getElementById('categories-list');
    list.innerHTML = '';
    
    state.categories.forEach(cat => {
        const cubes = Array.from(state.labeledCubes.values()).filter(c => c.categoryId === cat.id);
        const isActiveCat = state.activeCategory === cat.id;

        const catDiv = document.createElement('div');
        catDiv.className = `rounded-sm mb-1 border-l-4 transition-all ${isActiveCat ? 'bg-gray-800 border-l-blue-500' : 'bg-gray-800/50 border-l-transparent hover:bg-gray-800'}`;
        
        // Category Header
        const header = document.createElement('div');
        header.className = "flex items-center gap-2 p-2 cursor-pointer";
        header.innerHTML = `
            <div class="w-3 h-3 rounded-full shadow-sm flex-shrink-0" style="background-color: ${cat.color}"></div>
            <input type="text" class="category-name flex-1 bg-transparent text-xs text-gray-200 outline-none min-w-0 font-medium pointer-events-none" value="${cat.name}" readonly>
            <button class="delete-cat w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-gray-600 rounded transition-colors flex-shrink-0" title="Delete Category">
                <i class="fa-solid fa-trash-can text-[10px]"></i>
            </button>
        `;

        const input = header.querySelector('.category-name');

        // Select Category
        header.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT' && !input.readOnly) return; 
            if (e.target.closest('.delete-cat')) return;
            
            if (state.activeCategory !== cat.id) {
                state.activeCategory = cat.id;
                renderCategories();
            }
        });

        // Rename Category
        header.addEventListener('dblclick', () => {
            input.readOnly = false;
            input.classList.remove('pointer-events-none', 'text-gray-200');
            input.classList.add('bg-gray-950', 'ring-1', 'ring-blue-500', 'px-1', 'rounded-sm', 'text-white');
            input.focus();
            input.select();
        });

        input.addEventListener('blur', () => {
            input.readOnly = true;
            input.classList.add('pointer-events-none', 'text-gray-200');
            input.classList.remove('bg-gray-950', 'ring-1', 'ring-blue-500', 'px-1', 'rounded-sm', 'text-white');
            cat.name = input.value;
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
        });

        // Delete Category
        header.querySelector('.delete-cat').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Delete category "${cat.name}" and all its cubes?`)) {
                cubes.forEach(c => deleteCube(c.id, true)); 
                
                state.categories = state.categories.filter(c => c.id !== cat.id);
                if (state.activeCategory === cat.id && state.categories.length > 0) {
                    state.activeCategory = state.categories[0].id;
                } else if (state.categories.length === 0) {
                    state.activeCategory = null;
                }
                
                updateStatsUI();
                renderCategories();
                createPointCloud(state.vertices);
            }
        });

        catDiv.appendChild(header);

        // Cubes List
        if (cubes.length > 0) {
            const cubeList = document.createElement('div');
            cubeList.className = "pl-6 pr-2 pb-2 space-y-1";
            
            cubes.forEach((cube, index) => {
                const isCubeActive = state.activeCubeId === cube.id;
                const isVisible = cube.box.visible;
                const cubeItem = document.createElement('div');
                cubeItem.className = `flex items-center justify-between p-1.5 rounded text-[10px] cursor-pointer transition-colors ${isCubeActive ? 'bg-blue-900/30 text-blue-200 border border-blue-800' : 'bg-gray-900/50 text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-transparent'}`;
                
                cubeItem.innerHTML = `
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-cube text-[8px] ${isCubeActive ? 'text-blue-400' : 'text-gray-600'}"></i>
                        <span class="${!isVisible ? 'opacity-50 line-through' : ''}">Cube ${index + 1} <span class="opacity-50">(${cube.vertices.length} pts)</span></span>
                    </div>
                    <div class="flex items-center">
                        <button class="toggle-visibility w-4 h-4 flex items-center justify-center hover:text-gray-200 text-gray-400 rounded transition-colors mr-1" title="Toggle Visibility">
                            <i class="fa-solid ${isVisible ? 'fa-eye' : 'fa-eye-slash'} text-[10px]"></i>
                        </button>
                        <button class="delete-cube w-4 h-4 flex items-center justify-center hover:text-red-400 rounded transition-colors" title="Delete Cube">
                            <i class="fa-solid fa-xmark text-[10px]"></i>
                        </button>
                    </div>
                `;

                cubeItem.addEventListener('click', (e) => {
                    if (e.target.closest('.delete-cube') || e.target.closest('.toggle-visibility')) return;
                    state.activeCubeId = cube.id;
                    state.activeCategory = cat.id; // Also select parent category
                    updateTransformControls();
                    updateStatsUI();
                    renderCategories();
                });

                cubeItem.querySelector('.toggle-visibility').addEventListener('click', (e) => {
                    e.stopPropagation();
                    cube.box.visible = !cube.box.visible;
                    
                    // Update UI locally to avoid full re-render flickering
                    const icon = e.currentTarget.querySelector('i');
                    icon.className = `fa-solid ${cube.box.visible ? 'fa-eye' : 'fa-eye-slash'} text-[10px]`;
                    const labelSpan = cubeItem.querySelector('span > span').previousSibling; 
                    // Note: accessing text node might be brittle, let's just re-render categories or toggle class
                    // Re-rendering is safer for consistency
                    
                    if (state.activeCubeId === cube.id) {
                        updateTransformControls();
                    }
                    renderCategories(); 
                });

                cubeItem.querySelector('.delete-cube').addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteCube(cube.id);
                });

                cubeList.appendChild(cubeItem);
            });
            catDiv.appendChild(cubeList);
        }

        list.appendChild(catDiv);
    });
}

export function updateTransformControls() {
    if (!state.activeCubeId) {
        transformContainer.classList.add('hidden');
        if (globals.transformControls) globals.transformControls.detach();
        return;
    }
    transformContainer.classList.remove('hidden');
    
    const cubeData = state.labeledCubes.get(state.activeCubeId);
    if (globals.transformControls && cubeData && cubeData.box) {
        if (state.transformMode === 'view' || !cubeData.box.visible) {
            globals.transformControls.detach();
        } else {
            if (globals.transformControls.object !== cubeData.box) {
                globals.transformControls.attach(cubeData.box);
            }
            globals.transformControls.setMode(state.transformMode);
            globals.transformControls.setSpace(state.transformSpace);
        }
    }
    
    document.querySelectorAll('.transform-tab').forEach(btn => {
        if (btn.dataset.mode === state.transformMode) {
            btn.classList.remove('bg-gray-700');
            btn.classList.add('bg-blue-600');
        } else {
            btn.classList.add('bg-gray-700');
            btn.classList.remove('bg-blue-600');
        }
    });

    renderTransformInputs();
}

// Transform Tab Listeners
document.querySelectorAll('.transform-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        state.transformMode = btn.dataset.mode;
        updateTransformControls();
    });
});

function renderTransformInputs() {
    transformInputs.innerHTML = '';
    indicatorRefreshers = []; // Clear old refreshers
    
    if (state.transformMode === 'view') {
        const info = document.createElement('div');
        info.className = "text-center text-[10px] text-gray-500 italic p-2 border border-dashed border-gray-700 rounded";
        info.textContent = "View Mode - Gizmo Hidden";
        transformInputs.appendChild(info);
        return;
    }

    const cubeData = state.labeledCubes.get(state.activeCubeId);
    if (!cubeData) return;

    // Helper for segmented controls
    const createSegmentedControl = (label, options, currentValue, onChange) => {
        const container = document.createElement('div');
        container.className = "mb-2";
        
        const labelDiv = document.createElement('div');
        labelDiv.className = "text-[10px] font-bold text-gray-400 mb-1 uppercase";
        labelDiv.textContent = label;
        container.appendChild(labelDiv);

        const btnGroup = document.createElement('div');
        btnGroup.className = "flex bg-gray-800 rounded p-1 gap-1";
        
        options.forEach(opt => {
            const btn = document.createElement('button');
            const isActive = currentValue === opt.value;
            const activeColor = opt.activeColor || "bg-blue-600 hover:bg-blue-500 text-white";
            const inactiveColor = "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200";
            
            btn.className = `flex-1 py-1 px-2 rounded text-[10px] font-bold transition-all ${isActive ? activeColor : inactiveColor}`;
            btn.textContent = opt.label;
            btn.onclick = () => onChange(opt.value);
            btnGroup.appendChild(btn);
        });
        
        container.appendChild(btnGroup);
        transformInputs.appendChild(container);
    };

    // Space Toggle (Axis)
    createSegmentedControl("Axis Space", [
        { label: "Global", value: 'global', activeColor: "bg-indigo-600 hover:bg-indigo-500 text-white" },
        { label: "Local", value: 'local', activeColor: "bg-teal-600 hover:bg-teal-500 text-white" },
        { label: "View", value: 'view', activeColor: "bg-orange-600 hover:bg-orange-500 text-white" }
    ], state.transformSpace, (val) => {
        state.transformSpace = val;
        if (globals.transformControls) globals.transformControls.setSpace(state.transformSpace);
        renderTransformInputs();
    });

    if (state.transformMode === 'scale') {
        // Anchor Toggle
        createSegmentedControl("Scale Anchor", [
            { label: "Center", value: 'center', activeColor: "bg-gray-500 hover:bg-gray-400 text-white" },
            { label: "Pos (+)", value: 'positive', activeColor: "bg-green-600 hover:bg-green-500 text-white" },
            { label: "Neg (-)", value: 'negative', activeColor: "bg-red-600 hover:bg-red-500 text-white" }
        ], state.scaleAnchor, (val) => {
            state.scaleAnchor = val;
            renderTransformInputs();
        });
    }

    // Render Axis Inputs
    ['x', 'y', 'z'].forEach(axis => {
        if (state.transformMode === 'translate') createMoveControl(axis, cubeData);
        else if (state.transformMode === 'rotate') createRotateControl(axis, cubeData);
        else if (state.transformMode === 'scale') createScaleControl(axis, cubeData);
    });
}

// ... Transform Helper Functions (Move, Rotate, Scale) ... 

function createMoveControl(axis, cubeData) {
    createTransformControlBase(axis, cubeData, 'move');
}

function createRotateControl(axis, cubeData) {
    createTransformControlBase(axis, cubeData, 'rotate');
}

function createScaleControl(axis, cubeData) {
    createTransformControlBase(axis, cubeData, 'scale');
}

function createTransformControlBase(axis, cubeData, mode) {
    const container = document.createElement('div');
    container.className = "flex items-center gap-2 p-1 rounded hover:bg-gray-750";

    // Label Logic
    let labelText = "";
    if (state.transformSpace === 'view') {
        if (mode === 'scale') {
             if (axis === 'x') labelText = "WIDTH"; 
             if (axis === 'y') labelText = "HEIGHT";   
             if (axis === 'z') labelText = "DEPTH";  
        } else if (mode === 'rotate') {
             if (axis === 'x') labelText = "PITCH (X)";
             if (axis === 'y') labelText = "YAW (Y)";
             if (axis === 'z') labelText = "ROLL (Z)";
        } else {
             if (axis === 'x') labelText = "LEFT/RIGHT";
             if (axis === 'y') labelText = "DOWN/UP";
             if (axis === 'z') labelText = "BACK/FWD";
        }
    } else if (state.transformSpace === 'local') {
        labelText = "LOC " + axis;
    } else {
        labelText = "GLOB " + axis;
    }

    const labelSpan = document.createElement('span');
    labelSpan.className = "w-20 uppercase font-bold text-[10px] text-gray-400"; 
    labelSpan.textContent = labelText;
    container.appendChild(labelSpan);

    const minusBtn = document.createElement('button');
    minusBtn.className = "w-9 h-8 bg-gray-600 hover:bg-gray-500 rounded flex items-center justify-center text-xl leading-none font-bold text-gray-200 transition-colors pb-1 shadow-sm";
    minusBtn.textContent = "-";
    container.appendChild(minusBtn);

    // Indicator (Editable Input)
    const indicator = document.createElement('input');
    indicator.type = "text"; // Text to allow "step 0.01" or "5°" formatting initially
    indicator.className = "flex-1 text-center text-[10px] text-gray-400 font-mono bg-transparent outline-none border-b border-transparent focus:border-blue-500 focus:text-white transition-colors h-8";
    
    // Step Calculation
    const getStep = () => {
        if (mode === 'rotate') return config.interaction.rotationStepDeg * (Math.PI / 180);
        const dist = globals.camera.position.distanceTo(cubeData.cube.position);
        return Math.max(config.interaction.transformMinStep, dist * config.interaction.transformStepFactor);
    };
        
    let isEditing = false;
    
    const updateIndicator = () => {
        if (isEditing) return;
        
        const box = cubeData.box;
        let val = 0;
        let isStep = false;

        if (mode === 'scale') {
             // Scale is always local
             val = box.scale[axis];
        } else if (mode === 'move') {
             if (state.transformSpace === 'global') {
                 val = box.position[axis];
             } else {
                 // For local/view move, showing absolute pos is confusing vs local axis.
                 // Let's show the STEP size for these modes, clearly labeled.
                 val = getStep(); 
                 isStep = true;
             }
        } else if (mode === 'rotate') {
             // Rotation is hard to map to single axis 0-360 for user editing without Gimbal lock issues.
             // Let's show the Step Degree.
             val = config.interaction.rotationStepDeg;
             isStep = true;
        }

        if (isStep) {
            indicator.value = (mode === 'rotate' ? val + "°" : "step " + val.toPrecision(2));
            indicator.dataset.isStep = "true";
        } else {
            indicator.value = val.toFixed(3);
            indicator.dataset.isStep = "false";
        }
    };
    
    updateIndicator();
    // Register for real-time updates
    indicatorRefreshers.push(updateIndicator);
    
    // Update on mouse enter as a fallback
    container.addEventListener('mouseenter', updateIndicator);

    indicator.addEventListener('focus', () => { isEditing = true; indicator.select(); });
    indicator.addEventListener('blur', () => { isEditing = false; updateIndicator(); });
    
    indicator.addEventListener('change', (e) => {
        let val = parseFloat(e.target.value);
        if (isNaN(val)) return updateIndicator(); // Revert if invalid

        const box = cubeData.box;
        
        if (mode === 'scale') {
             // Apply absolute scale
             val = Math.max(0.001, val); // Prevent 0 or neg
             box.scale[axis] = val;
             cubeData.cube.scale.copy(box.scale);
        } else if (mode === 'move') {
             if (state.transformSpace === 'global') {
                 box.position[axis] = val;
                 cubeData.cube.position.copy(box.position);
             } else {
                 // It was a step value, update the factor relative to current distance
                 const dist = globals.camera.position.distanceTo(cubeData.cube.position);
                 if (dist > 0) {
                     config.interaction.transformStepFactor = val / dist;
                 }
             }
        } else if (mode === 'rotate') {
             // Update the global rotation step
             config.interaction.rotationStepDeg = Math.abs(val);
        }
        
        updateVerticesInCube(state.activeCubeId);
        isEditing = false;
        updateAllIndicators();
    });
    
    // Keydown Enter to blur
    indicator.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') indicator.blur();
    });

    container.appendChild(indicator);

    const plusBtn = document.createElement('button');
    plusBtn.className = "w-9 h-8 bg-gray-600 hover:bg-gray-500 rounded flex items-center justify-center text-xl leading-none font-bold text-gray-200 transition-colors pb-1 shadow-sm";
    plusBtn.textContent = "+";
    container.appendChild(plusBtn);

    const performAction = (dir) => {
        const box = cubeData.box;
        const step = getStep();
        
        if (mode === 'move') {
             if (state.transformSpace === 'local') {
                if (axis === 'x') box.translateX(dir * step);
                if (axis === 'y') box.translateY(dir * step);
                if (axis === 'z') box.translateZ(dir * step);
            } else if (state.transformSpace === 'view') {
                const forward = new THREE.Vector3();
                globals.camera.getWorldDirection(forward);
                const right = new THREE.Vector3().crossVectors(forward, globals.camera.up).normalize();
                const up = new THREE.Vector3().crossVectors(right, forward).normalize();
                const moveVec = new THREE.Vector3();
                if (axis === 'x') moveVec.copy(right); 
                if (axis === 'y') moveVec.copy(up);    
                if (axis === 'z') moveVec.copy(forward);
                moveVec.multiplyScalar(dir * step);
                box.position.add(moveVec);
            } else {
                box.position[axis] += dir * step;
            }
            cubeData.cube.position.copy(box.position);

        } else if (mode === 'rotate') {
             const amount = dir * step;
             if (state.transformSpace === 'local') {
                if (axis === 'x') box.rotateX(amount);
                if (axis === 'y') box.rotateY(amount);
                if (axis === 'z') box.rotateZ(amount);
            } else if (state.transformSpace === 'view') {
                const forward = new THREE.Vector3();
                globals.camera.getWorldDirection(forward);
                const right = new THREE.Vector3().crossVectors(forward, globals.camera.up).normalize();
                const up = new THREE.Vector3().crossVectors(right, forward).normalize();
                const rotAxis = new THREE.Vector3();
                if (axis === 'x') rotAxis.copy(right);
                if (axis === 'y') rotAxis.copy(up);
                if (axis === 'z') rotAxis.copy(forward);
                box.rotateOnWorldAxis(rotAxis, amount);
            } else {
                const rotAxis = new THREE.Vector3();
                if (axis === 'x') rotAxis.set(1, 0, 0);
                if (axis === 'y') rotAxis.set(0, 1, 0);
                if (axis === 'z') rotAxis.set(0, 0, 1);
                box.rotateOnWorldAxis(rotAxis, amount);
            }
            cubeData.cube.rotation.copy(box.rotation);

        } else if (mode === 'scale') {
             const change = dir * step;
             let targetLocalAxis = axis;
             
             if (state.transformSpace !== 'local') {
                // Smart Scale Logic
                const targetVec = new THREE.Vector3();
                if (state.transformSpace === 'view') {
                    const forward = new THREE.Vector3();
                    globals.camera.getWorldDirection(forward);
                    const right = new THREE.Vector3().crossVectors(forward, globals.camera.up).normalize();
                    const up = new THREE.Vector3().crossVectors(right, forward).normalize();
                    if (axis === 'x') targetVec.copy(right);
                    if (axis === 'y') targetVec.copy(up);
                    if (axis === 'z') targetVec.copy(forward);
                } else {
                    if (axis === 'x') targetVec.set(1, 0, 0);
                    if (axis === 'y') targetVec.set(0, 1, 0);
                    if (axis === 'z') targetVec.set(0, 0, 1);
                }
                const invRot = box.quaternion.clone().invert();
                targetVec.applyQuaternion(invRot);
                const absX = Math.abs(targetVec.x);
                const absY = Math.abs(targetVec.y);
                const absZ = Math.abs(targetVec.z);
                targetLocalAxis = 'x';
                if (absY > absX && absY > absZ) targetLocalAxis = 'y';
                if (absZ > absX && absZ > absY) targetLocalAxis = 'z';
             }

             const oldScale = box.scale[targetLocalAxis];
             const newScale = Math.max(0.001, oldScale + change);
             const actualChange = newScale - oldScale; 
             box.scale[targetLocalAxis] = newScale;

             if (state.scaleAnchor !== 'center' && actualChange !== 0) {
                const shiftAmount = actualChange * 0.5;
                const shiftDir = state.scaleAnchor === 'negative' ? 1 : -1;
                if (targetLocalAxis === 'x') box.translateX(shiftAmount * shiftDir);
                if (targetLocalAxis === 'y') box.translateY(shiftAmount * shiftDir);
                if (targetLocalAxis === 'z') box.translateZ(shiftAmount * shiftDir);
             }
             cubeData.cube.scale.copy(box.scale);
             cubeData.cube.position.copy(box.position);
        }

        updateVerticesInCube(state.activeCubeId);
        updateAllIndicators();
    };

    minusBtn.addEventListener('click', () => performAction(-1));
    plusBtn.addEventListener('click', () => performAction(1));

    transformInputs.appendChild(container);
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            
            // 1. Reconstruct OBJ and reload scene
            // Check if rawObj exists
            if (!data.rawObj) {
                alert('Invalid file format: missing rawObj data.');
                return;
            }

            const objText = reconstructOBJ(data.rawObj);
            parseOBJ(objText);

            // 2. Restore Categories
            if (data.categories) {
                state.categories = data.categories;
                // If there's an active category, ensure it exists, else set to first
                if (!state.categories.find(c => c.id === state.activeCategory)) {
                    state.activeCategory = state.categories.length > 0 ? state.categories[0].id : null;
                }
            }
            renderCategories();

            // 3. Restore Cubes
            if (data.cubes) {
                data.cubes.forEach(cubeData => {
                    // Restore complex objects (Vector3, Euler) from plain JSON objects
                    // Handle potential differences in serialization (e.g. _x vs x for Euler)
                    const rotX = cubeData.cube.rotation._x !== undefined ? cubeData.cube.rotation._x : cubeData.cube.rotation.x;
                    const rotY = cubeData.cube.rotation._y !== undefined ? cubeData.cube.rotation._y : cubeData.cube.rotation.y;
                    const rotZ = cubeData.cube.rotation._z !== undefined ? cubeData.cube.rotation._z : cubeData.cube.rotation.z;
                    const rotOrder = cubeData.cube.rotation._order !== undefined ? cubeData.cube.rotation._order : (cubeData.cube.rotation.order || 'XYZ');

                    const restoredData = {
                        categoryId: cubeData.categoryId,
                        vertices: cubeData.vertices,
                        cube: {
                            position: new THREE.Vector3(cubeData.cube.position.x, cubeData.cube.position.y, cubeData.cube.position.z),
                            scale: new THREE.Vector3(cubeData.cube.scale.x, cubeData.cube.scale.y, cubeData.cube.scale.z),
                            rotation: new THREE.Euler(rotX, rotY, rotZ, rotOrder)
                        }
                    };
                    createCubeFromData(restoredData);
                });
            }

            // 4. Update UI and Point Cloud Colors
            updateStatsUI();
            renderCategories();
            createPointCloud(state.vertices, true); // This re-colors points based on labeledCubes
            
            // Reset file input
            e.target.value = '';

        } catch (err) {
            console.error(err);
            alert('Error importing file: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function reconstructOBJ(rawObj) {
    const lines = [];
    if (rawObj.v) lines.push(...rawObj.v);
    if (rawObj.vn) lines.push(...rawObj.vn);
    if (rawObj.other) lines.push(...rawObj.other);
    if (rawObj.f) lines.push(...rawObj.f);
    return lines.join('\n');
}

function exportData() {
    const data = {
        metadata: {
            generatedBy: 'Mesh Vertex Labeler',
            date: new Date().toISOString()
        },
        rawObj: state.rawObj,
        categories: state.categories,
        cubes: Array.from(state.labeledCubes.values()).map(cubeData => ({
            categoryId: cubeData.categoryId,
            vertices: cubeData.vertices,
            cube: {
                position: cubeData.cube.position,
                scale: cubeData.cube.scale,
                rotation: cubeData.cube.rotation
            }
        }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vertex_labels.json';
    a.click();
}