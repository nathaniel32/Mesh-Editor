import { EditorToolsState } from './state/ToolState.js';
import { StatusState } from './state/StatusState.js';
import { FileState } from './state/FileState.js';
import { CutTool } from './tools/edit/Cut.js';
import { MoveTool } from './tools/edit/Move.js';
import { ScaleTool } from './tools/edit/Scale.js';
import { ImportTool } from './tools/file/Import.js';
import { ExportTool } from './tools/file/Export.js';
import { SelectionBoxTool } from './tools/selection/SelectionBox.js';
import { RenderScene } from './core/RenderScene.js';

new Vue({
    el: '#app',
    data() {
        return {
            selectionBox: new SelectionBoxTool(this),
            cutTool: new CutTool(this),
            moveTool: new MoveTool(this),
            scaleTool: new ScaleTool(this),
            importTool: new ImportTool(this),
            exportTool: new ExportTool(this),
            renderScene: new RenderScene(this),
            editorToolsState: new EditorToolsState(),
            fileState: new FileState(),
            statusState: new StatusState()
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
        this.editorToolsState.list = [this.importTool, this.exportTool, this.cutTool, this.moveTool, this.scaleTool];
        this.fileState.container = this.$refs.canvasContainer;
        this.renderScene.initScene();
        this.renderScene.animate();
        this.selectionBox.setupDragSelection();
    }
});