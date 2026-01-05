import * as THREE from 'three';
import { config } from './config.js';
import { globals } from './globals.js';

export function initScene() {
    globals.container = document.getElementById('canvas-container');

    // Scene
    globals.scene = new THREE.Scene();
    globals.scene.background = new THREE.Color(config.scene.backgroundColor);

    // Camera
    globals.camera = new THREE.PerspectiveCamera(75, globals.container.clientWidth / globals.container.clientHeight, 0.1, 20000);
    globals.camera.position.set(...config.scene.cameraPosition);
    globals.camera.lookAt(0, 0, 0);

    // Renderer
    globals.renderer = new THREE.WebGLRenderer({ antialias: true });
    globals.renderer.setSize(globals.container.clientWidth, globals.container.clientHeight);
    globals.container.appendChild(globals.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    globals.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    globals.scene.add(directionalLight);

    // Helpers
    // Infinite-feel grid
    const gridHelper = new THREE.GridHelper(config.scene.gridSize, config.scene.gridDivisions, 0x666666, 0x444444);
    globals.scene.add(gridHelper);
    const axesHelper = new THREE.AxesHelper(config.scene.axesSize);
    globals.scene.add(axesHelper);

    // Resize Handler
    window.addEventListener('resize', onWindowResize);

    // Start Animation Loop
    animate();
}

function onWindowResize() {
    if (!globals.camera || !globals.renderer || !globals.container) return;
    
    globals.camera.aspect = globals.container.clientWidth / globals.container.clientHeight;
    globals.camera.updateProjectionMatrix();
    globals.renderer.setSize(globals.container.clientWidth, globals.container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (globals.renderer && globals.scene && globals.camera) {
        globals.renderer.render(globals.scene, globals.camera);
    }
}