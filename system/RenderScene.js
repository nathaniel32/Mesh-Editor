import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class RenderScene {
    constructor(controller) {
        this.controller = controller
        this.animate = this.animate.bind(this);
    }

    handleResize() {
        this.controller.camera.aspect = this.controller.container.clientWidth / this.controller.container.clientHeight;
        this.controller.camera.updateProjectionMatrix();
        this.controller.renderer.setSize(this.controller.container.clientWidth, this.controller.container.clientHeight);
    }

    initScene() {
        this.controller.scene = new THREE.Scene();
        this.controller.scene.background = new THREE.Color(0x1a1a1a);

        this.controller.camera = new THREE.PerspectiveCamera(75, this.controller.container.clientWidth / this.controller.container.clientHeight, 0.1, 10000);
        this.controller.camera.position.set(3, 3, 3);

        this.controller.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controller.renderer.setSize(this.controller.container.clientWidth, this.controller.container.clientHeight);
        this.controller.container.appendChild(this.controller.renderer.domElement);

        this.controller.controls = new OrbitControls(this.controller.camera, this.controller.renderer.domElement);
        this.controller.controls.enableDamping = true;
        this.controller.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: null
        };

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.controller.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 5, 5);
        this.controller.scene.add(directionalLight);

        const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
        this.controller.scene.add(gridHelper);

        window.addEventListener('resize', this.handleResize);
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.controller.controls.update();
        this.controller.renderer.render(this.controller.scene, this.controller.camera);
    }
}