// Configuration file for Mesh Vertex Labeler

export const config = {
    // Scene Settings
    scene: {
        backgroundColor: '#1a1a1a',         // Canvas background
        cameraPosition: [5, 5, 5],          // Initial Camera XYZ
        gridSize: 10,                       // Size of the grid helper
        gridDivisions: 10,                  // Divisions in the grid
        axesSize: 5                         // Size of the axes helper
    },

    // Point Size Settings
    pointSize: {
        defaultValue: 0.2,
        min: 0.001,
        max: 10.0,
        step: 0.001
    },

    // Default Categories
    // Users can add/remove these defaults here.
    // Ensure IDs are unique numbers.
    defaultCategories: [
        { id: 1, name: 'Category 1', color: '#ff0000' },
        { id: 2, name: 'Category 2', color: '#00ff00' },
        { id: 3, name: 'Category 3', color: '#0000ff' }
    ],

    // UI Defaults
    ui: {
        initialTransformMode: 'translate', // 'translate', 'rotate', 'scale'
        initialTransformSpace: 'view',      // 'view', 'local', 'global'
        pointDefaultColor: [0.8, 0.8, 0.8]  // RGB values 0-1
    },
    
    // Interaction Settings
    interaction: {
        addBoxScaleFactor: 0.05,       // Initial box size relative to distance
        minBoxScaleFactor: 0.001,      // Min box size during drag relative to distance
        transformStepFactor: 0.01,     // Transform step size as fraction of distance (e.g. 0.01 = 1%)
        transformMinStep: 0.0001,      // Absolute minimum step size
        rotationStepDeg: 5             // Rotation step in degrees
    }
};