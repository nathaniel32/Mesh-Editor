import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Brush, Evaluator, SUBTRACTION, INTERSECTION, HOLLOW_SUBTRACTION, HOLLOW_INTERSECTION } from 'three-bvh-csg';
import { Features } from './models/DataClass.js';
import { CutTool } from './features/tools/Cut.js';
import { MoveTool } from './features/tools/Move.js';
import { ScaleTool } from './features/tools/Scale.js';
import { ImportService } from './features/services/Import.js';
import { ExportService } from './features/services/Export.js';

new Vue({
    el: '#app',
    data() {
        return {
            container: null,
            features: new Features(),
            cut_tool: new CutTool(this),
            move_tool: new MoveTool(this),
            scale_tool: new ScaleTool(this),
            import_service: new ImportService(this),
            export_service: new ExportService(this),
            scene: null,
            camera: null,
            renderer: null,
            controls: null,
            workingMesh: null,
            workingBrush: null,
            cutterMesh: null,
            previewMesh: null,
            evaluator: new Evaluator(),
            cutterBrush: null,
            
            cutCount: 0,
            statusText: '',
            isPreviewing: false,
            previewDisabled: false,
            selectionBox: {
                visible: false,
                left: 0,
                top: 0,
                width: 0,
                height: 0
            }
        };
    },
    computed: {
        selectionBoxStyle() {
            return {
                left: this.selectionBox.left + 'px',
                top: this.selectionBox.top + 'px',
                width: this.selectionBox.width + 'px',
                height: this.selectionBox.height + 'px'
            };
        }
    },
    methods: {
        ensureUVAttribute(geometry) {
            if (!geometry.attributes.uv) {
                const positions = geometry.attributes.position;
                const uvs = new Float32Array(positions.count * 2);
                
                for (let i = 0; i < positions.count; i++) {
                    uvs[i * 2] = (positions.getX(i) + 1) * 0.5;
                    uvs[i * 2 + 1] = (positions.getY(i) + 1) * 0.5;
                }
                
                geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
            }
            return geometry;
        },

        initScene() {
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x1a1a1a);

            this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 10000);
            this.camera.position.set(3, 3, 3);

            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.container.appendChild(this.renderer.domElement);

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
        },

        handleResize() {
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        },

        animate() {
            requestAnimationFrame(this.animate);
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        }
    },
    mounted() {
        this.features.list = [this.import_service, this.export_service, this.cut_tool, this.move_tool, this.scale_tool];
        this.container = this.$refs.canvasContainer;
        this.initScene();
        this.animate();
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.handleResize);
    }
});