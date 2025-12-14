import { ToolsState, EditorState, StatusState } from './models/DataClass.js';
import { CutTool } from './tools/edit/Cut.js';
import { MoveTool } from './tools/edit/Move.js';
import { ScaleTool } from './tools/edit/Scale.js';
import { ImportTool } from './tools/file/Import.js';
import { ExportTool } from './tools/file/Export.js';
import { RenderScene } from './system/RenderScene.js';
import { SelectionBox } from './system/SelectionBox.js';

new Vue({
    el: '#app',
    data() {
        return {
            selectionBox: new SelectionBox(this),
            cutTool: new CutTool(this),
            moveTool: new MoveTool(this),
            scaleTool: new ScaleTool(this),
            importTool: new ImportTool(this),
            exportTool: new ExportTool(this),
            renderScene: new RenderScene(this),
            toolsState: new ToolsState(),
            editorState: new EditorState(),
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
        this.toolsState.list = [this.importTool, this.exportTool, this.cutTool, this.moveTool, this.scaleTool];
        this.editorState.container = this.$refs.canvasContainer;
        this.renderScene.initScene();
        this.renderScene.animate();
        this.selectionBox.setupDragSelection();
    }
});