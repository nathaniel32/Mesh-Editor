import { initScene } from './scene.js';
import { initInteraction } from './interaction.js';
import { initUI } from './ui.js';

// Bootstrapping the application
function init() {
    initScene();
    initInteraction();
    initUI();
}

init();