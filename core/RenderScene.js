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
        this.camera.aspect = this.controller.fileState.container.clientWidth / this.controller.fileState.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.controller.fileState.container.clientWidth, this.controller.fileState.container.clientHeight);
    }

    createInfiniteGrid() {
        const vertexShader = `
            varying vec3 worldPosition;
            void main() {
                worldPosition = position.xzy;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            varying vec3 worldPosition;
            uniform vec3 cameraPos;
            
            float getGrid(float size) {
                vec2 coord = worldPosition.xz / size;
                vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
                float line = min(grid.x, grid.y);
                return 1.0 - min(line, 1.0);
            }
            
            void main() {
                float dist = distance(cameraPos, worldPosition);
                float fadeFactor = 1.0 - smoothstep(500.0, 1000.0, dist);
                
                float grid1 = getGrid(1.0);
                float grid2 = getGrid(10.0);
                
                vec3 color = vec3(0.2, 0.2, 0.2);
                float alpha = (grid1 * 0.3 + grid2 * 0.5) * fadeFactor;
                
                // Axis lines
                if (abs(worldPosition.x) < 0.05) {
                    color = vec3(0.0, 0.5, 1.0);
                    alpha = max(alpha, 0.8 * fadeFactor);
                }
                if (abs(worldPosition.z) < 0.05) {
                    color = vec3(1.0, 0.0, 0.0);
                    alpha = max(alpha, 0.8 * fadeFactor);
                }
                
                gl_FragColor = vec4(color, alpha);
            }
        `;

        const geometry = new THREE.PlaneGeometry(2000, 2000, 1, 1);
        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                cameraPos: { value: new THREE.Vector3() }
            },
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const grid = new THREE.Mesh(geometry, material);
        grid.rotation.x = Math.PI / 2;
        grid.position.y = 0;
        
        return { mesh: grid, material };
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        this.camera = new THREE.PerspectiveCamera(75, this.controller.fileState.container.clientWidth / this.controller.fileState.container.clientHeight, 0.1, 10000);
        this.camera.position.set(3, 3, 3);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.controller.fileState.container.clientWidth, this.controller.fileState.container.clientHeight);
        this.controller.fileState.container.appendChild(this.renderer.domElement);

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

        // Add infinite grid
        const infiniteGrid = this.createInfiniteGrid();
        this.scene.add(infiniteGrid.mesh);
        this.infiniteGridMaterial = infiniteGrid.material;

        window.addEventListener('resize', this.handleResize);
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.controls.update();
        
        // Update camera position for infinite grid shader
        if (this.infiniteGridMaterial) {
            this.infiniteGridMaterial.uniforms.cameraPos.value.copy(this.camera.position);
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}