import { config } from './config.js';

export const state = {
    selectionMode: false,
    isCreatingCube: false,
    selectionStart: null,
    labeledCubes: new Map(), // cubeId -> {id, categoryId, cube: {pos, scale, rot}, vertices: [], box: Mesh}
    cubeIdCounter: 0,
    activeCubeId: null,
    categories: [...config.defaultCategories], 
    activeCategory: config.defaultCategories.length > 0 ? config.defaultCategories[0].id : null,
    transformMode: config.ui.initialTransformMode,
    transformSpace: config.ui.initialTransformSpace,
    scaleAnchor: 'center', // 'center', 'positive', 'negative'
    stats: { totalVertices: 0, labeled: 0 },
    vertices: [], // Raw positions array
    rawObj: { v: [], vn: [], f: [], other: [] }, // Store raw OBJ data
    isRotating: false,
    isTransforming: false,
    previousMousePosition: { x: 0, y: 0 },
    currentMousePosition: { x: 0, y: 0 },
    lastScale: null,
    scaleDirection: 0,
    pointSize: config.pointSize.defaultValue,
    meshOpacity: 0.5
};