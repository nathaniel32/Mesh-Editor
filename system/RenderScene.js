import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class RenderScene {
    constructor(controller) {
        this.controller = controller
        this.animate = this.animate.bind(this);
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this.handleResize = this.handleResize.bind(this);
    }

    handleResize() {
        this.camera.aspect = this.controller.editorState.container.clientWidth / this.controller.editorState.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.controller.editorState.container.clientWidth, this.controller.editorState.container.clientHeight);
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        this.camera = new THREE.PerspectiveCamera(75, this.controller.editorState.container.clientWidth / this.controller.editorState.container.clientHeight, 0.1, 10000);
        this.camera.position.set(3, 3, 3);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.controller.editorState.container.clientWidth, this.controller.editorState.container.clientHeight);
        this.controller.editorState.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: null
        };

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
        this.scene.add(gridHelper);

        window.addEventListener('resize', this.handleResize);
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}