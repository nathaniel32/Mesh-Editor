// Configuration file for Mesh Vertex Labeler

export const config = {
    // Scene Settings
    scene: {
        backgroundColor: '#1a1a1a',         // Canvas background
        cameraPosition: [5, 5, 5],          // Initial Camera XYZ
        gridSize: 10000,                    // Size of the grid helper (Infinite feel)
        gridDivisions: 1000,                // Divisions in the grid
        axesSize: 5                         // Size of the axes helper
    },

    // Mesh Settings
    mesh: {
        opacity: 0.5
    },

    // Default Categories
    // Users can add/remove these defaults here.
    // Ensure IDs are unique numbers.
    defaultCategories: [
        { id: 1, name: 'Bottom', color: '#ff0000' },
        { id: 2, name: 'Wrist', color: '#00ff00' },
        { id: 3, name: 'Finger', color: '#0000ff' },
        { id: 4, name: 'Thumb', color: '#ffff00' }
    ],

    // UI Defaults
    ui: {
        initialTransformMode: 'view',      // 'view', 'translate', 'rotate', 'scale'
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