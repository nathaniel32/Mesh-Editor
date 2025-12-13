import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Brush, Evaluator, SUBTRACTION, INTERSECTION, HOLLOW_SUBTRACTION, HOLLOW_INTERSECTION } from 'three-bvh-csg';
import { CutTool } from '../tools/Cut.js';
import { ImportService } from '../services/Import.js';
import { ExportService } from '../services/Export.js';

new Vue({
    el: '#app',
    data() {
        return {
            features: [],
            cut_service: new CutTool(this),
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
            dragStart: null,
            dragEnd: null,
            isDragging: false,
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
            },
            selectionInfo: {
                visible: false,
                text: '-'
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
    mounted() {
        this.features = [this.cut_service, this.import_service, this.export_service];
        this.initScene();
        this.animate();
        this.setupDragSelection();
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

            const container = this.$refs.canvasContainer;
            this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 10000);
            this.camera.position.set(3, 3, 3);

            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(container.clientWidth, container.clientHeight);
            container.appendChild(this.renderer.domElement);

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
            const container = this.$refs.canvasContainer;
            this.camera.aspect = container.clientWidth / container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        },

        setupDragSelection() {
            const container = this.$refs.canvasContainer;

            container.addEventListener('mousedown', (e) => {
                if (e.button !== 2 || !this.workingMesh) return;
                
                e.preventDefault();
                this.isDragging = true;
                this.controls.enabled = false;
                this.dragStart = { x: e.clientX, y: e.clientY };
                this.dragEnd = { x: e.clientX, y: e.clientY };
                
                this.selectionBox.visible = true;
            });

            container.addEventListener('mousemove', (e) => {
                if (!this.isDragging) return;
                
                e.preventDefault();
                this.dragEnd = { x: e.clientX, y: e.clientY };
                this.updateSelectionBoxUI();
            });

            container.addEventListener('mouseup', (e) => {
                if (!this.isDragging) return;
                
                e.preventDefault();
                this.isDragging = false;
                this.controls.enabled = true;
                this.selectionBox.visible = false;
                
                this.cut_service.createCuttingVolume();
            });

            container.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
        },

        updateSelectionBoxUI() {
            const x1 = Math.min(this.dragStart.x, this.dragEnd.x);
            const y1 = Math.min(this.dragStart.y, this.dragEnd.y);
            const x2 = Math.max(this.dragStart.x, this.dragEnd.x);
            const y2 = Math.max(this.dragStart.y, this.dragEnd.y);

            this.selectionBox.left = x1;
            this.selectionBox.top = y1;
            this.selectionBox.width = x2 - x1;
            this.selectionBox.height = y2 - y1;
        },
        previewCut() {
            if (!this.workingBrush) {
                alert('Load OBJ file dulu!');
                return;
            }

            if (!this.cutterBrush) {
                alert('Klik kanan + drag untuk select area!');
                return;
            }

            this.statusText = 'Calculating preview...';
            this.previewDisabled = true;

            setTimeout(() => {
                try {
                    const operation = this.cut_service.mode === 'remove' ? HOLLOW_SUBTRACTION : HOLLOW_INTERSECTION;
                    
                    const result = this.evaluator.evaluate(this.workingBrush, this.cutterBrush, operation);
                    
                    this.workingMesh.visible = false;
                    
                    if (this.previewMesh) {
                        this.scene.remove(this.previewMesh);
                    }
                    
                    this.previewMesh = new THREE.Mesh(
                        result.geometry,
                        new THREE.MeshStandardMaterial({
                            color: 0xf39c12,
                            side: THREE.DoubleSide
                        })
                    );
                    this.scene.add(this.previewMesh);
                    
                    this.isPreviewing = true;
                    this.statusText = 'Preview OK! APPLY or CANCEL';
                } catch (err) {
                    this.statusText = 'Error: ' + err.message;
                    console.error('CSG Error:', err);
                    this.previewDisabled = false;
                }
            }, 100);
        },

        cancelPreview() {
            if (this.previewMesh) {
                this.scene.remove(this.previewMesh);
                this.previewMesh = null;
            }

            if (this.workingMesh) {
                this.workingMesh.visible = true;
            }

            this.isPreviewing = false;
            this.previewDisabled = false;
            this.statusText = 'Cancelled. Select again';
        },

        resetAll() {
            if (confirm('Reset semua cuts dan mulai dari awal?')) {
                location.reload();
            }
        },

        animate() {
            requestAnimationFrame(this.animate);
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        }
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.handleResize);
    }
});