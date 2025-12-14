import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION, INTERSECTION, HOLLOW_SUBTRACTION, HOLLOW_INTERSECTION } from 'three-bvh-csg';
import { Features, EditorState } from './models/DataClass.js';
import { CutTool } from './features/tools/Cut.js';
import { MoveTool } from './features/tools/Move.js';
import { ScaleTool } from './features/tools/Scale.js';
import { ImportService } from './features/services/Import.js';
import { ExportService } from './features/services/Export.js';
import { RenderScene } from './system/RenderScene.js';
import { SelectionBox } from './system/SelectionBox.js';

new Vue({
    el: '#app',
    data() {
        return {
            selectionBox: new SelectionBox(this),
            features: new Features(),
            cutTool: new CutTool(this),
            moveTool: new MoveTool(this),
            scaleTool: new ScaleTool(this),
            importService: new ImportService(this),
            exportService: new ExportService(this),
            renderScene: new RenderScene(this),
            editorState: new EditorState(this),
            statusText: ''
        };
    },
    computed: {
        selectionBoxStyle() {
            return {
                left: this.selectionBox.box.left + 'px',
                top: this.selectionBox.box.top + 'px',
                width: this.selectionBox.box.width + 'px',
                height: this.selectionBox.box.height + 'px'
            };
        }
    },
    methods: {},
    mounted() {
        this.features.list = [this.importService, this.exportService, this.cutTool, this.moveTool, this.scaleTool];
        this.editorState.container = this.$refs.canvasContainer;
        this.renderScene.initScene();
        this.renderScene.animate();
        this.selectionBox.setupDragSelection();
    }
});