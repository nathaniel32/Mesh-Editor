import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Brush, Evaluator, SUBTRACTION, INTERSECTION, HOLLOW_SUBTRACTION, HOLLOW_INTERSECTION } from 'three-bvh-csg';
import { Features } from './models/DataClass.js';
import { CutTool } from './features/tools/Cut.js';
import { MoveTool } from './features/tools/Move.js';
import { ScaleTool } from './features/tools/Scale.js';
import { ImportService } from './features/services/Import.js';
import { ExportService } from './features/services/Export.js';
import { RenderScene } from './system/RenderScene.js';

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
        }
    },
    mounted() {
        this.features.list = [this.import_service, this.export_service, this.cut_tool, this.move_tool, this.scale_tool];
        this.container = this.$refs.canvasContainer;
        var renderScene = new RenderScene(this);
        renderScene.initScene();
        renderScene.animate();
    }
});