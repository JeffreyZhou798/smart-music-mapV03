<script setup>
/**
 * VisualMap - 视觉地图编辑器
 * 流程4: 学生交互 - 选择/自定义视觉方案
 */
import { ref, computed, watch } from 'vue'
import { SHAPE_LIBRARY, COLOR_PALETTE, ANIMATIONS } from '../../types/index.js'
import { useNotifications } from '../../composables/useNotifications.js'
import { useStructureStore } from '../../stores/structure.js'
import { useVisualStore } from '../../stores/visual.js'

const structureStore = useStructureStore()
const visualStore = useVisualStore()

const { notify } = useNotifications()

const selectedNodeId = ref(null)
const isPlaying = ref(false)
const currentMeasure = ref(1)
const viewLevel = ref('phrase') // 'motive' | 'subphrase' | 'phrase' | 'period'

const shapeIcons = {
  circle: '●', square: '■', triangle: '▲', diamond: '◆',
  hexagon: '⬡', octagon: '⯃', star4: '✦', star5: '★',
  star6: '✶', note: '♪', clef: '𝄞', rest: '𝄽',
  wave: '〰', spiral: '🌀', burst: '💥', flower: '✿',
  leaf: '🍃', sun: '☀', heart: '♥', arrow: '➤'
}

const levelLabels = {
  motive: '动机 Motive',
  subphrase: '乐节 Sub-phrase',
  phrase: '乐句 Phrase',
  period: '乐段 Period'
}

// Computed
const allNodes = computed(() => structureStore.allNodes)
const displayNodes = computed(() => {
  return structureStore.nodesByType[viewLevel.value] || []
})
const sortedNodes = computed(() => {
  return [...displayNodes.value].sort((a, b) => a.startMeasure - b.startMeasure)
})
const mappings = computed(() => visualStore.getAllMappingsArray())

const stats = computed(() => {
  const total = sortedNodes.value.length
  const mapped = sortedNodes.value.filter(n => visualStore.getMapping(n.id)).length
  return { total, mapped, unmapped: total - mapped }
})

// Methods
function getNodeMapping(nodeId) {
  return visualStore.getMapping(nodeId)
}

function selectNode(nodeId) {
  selectedNodeId.value = nodeId
  structureStore.selectNode(nodeId)
}

function getShapeIcon(shapeType) {
  return shapeIcons[shapeType] || '●'
}

function isNodeActive(node) {
  return currentMeasure.value >= node.startMeasure && currentMeasure.value <= node.endMeasure
}

function isNodeSelected(nodeId) {
  return selectedNodeId.value === nodeId
}

function getAnimationClass(animation) {
  return `animate-${animation}`
}

function clearNodeMapping(nodeId) {
  visualStore.removeMapping(nodeId)
  notify({ type: 'info', title: '已清除', message: '视觉方案已清除' })
}

function copyMappingToClipboard(nodeId) {
  const mapping = visualStore.getMapping(nodeId)
  if (mapping) {
    // Store in a temporary variable for paste
    window.__copiedMapping = { ...mapping, id: null }
    notify({ type: 'success', title: '已复制', message: '视觉方案已复制到剪贴板' })
  }
}

function pasteMappingFromClipboard(nodeId) {
  if (window.__copiedMapping) {
    visualStore.setMapping(nodeId, {
      ...window.__copiedMapping,
      id: 'paste-' + Date.now()
    })
    notify({ type: 'success', title: '已粘贴', message: '视觉方案已粘贴' })
  }
}

function applyToAllSimilar(nodeId) {
  const count = visualStore.applyToSimilarNodes(nodeId, allNodes.value)
  if (count > 0) {
    notify({ type: 'success', title: '批量应用', message: `已应用到 ${count} 个相似结构` })
  }
}

// Watch for structure store selection changes
watch(() => structureStore.selectedNodeId, (newId) => {
  if (newId) {
    selectedNodeId.value = newId
  }
})
</script>

<template>
  <div class="visual-map">
    <!-- Header -->
    <div class="map-header">
      <div class="header-left">
        <h3>🎨 视觉地图 Visual Map</h3>
        <div class="level-selector">
          <button 
            v-for="(label, level) in levelLabels" 
            :key="level"
            class="level-btn"
            :class="{ active: viewLevel === level }"
            @click="viewLevel = level"
          >
            {{ label }}
          </button>
        </div>
      </div>
      <div class="header-right">
        <div class="map-stats">
          <span class="stat-item">
            <span class="stat-value">{{ stats.mapped }}</span>
            <span class="stat-label">已设置</span>
          </span>
          <span class="stat-divider">/</span>
          <span class="stat-item">
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-label">总计</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Visual Canvas -->
    <div class="map-canvas">
      <div v-if="sortedNodes.length === 0" class="empty-state">
        <div class="empty-icon">🎨</div>
        <p>暂无结构数据</p>
        <p class="hint">请先上传并分析乐谱</p>
      </div>

      <div v-else class="visual-grid">
        <div 
          v-for="node in sortedNodes" 
          :key="node.id"
          class="visual-cell"
          :class="{ 
            active: isNodeActive(node),
            selected: isNodeSelected(node.id),
            mapped: getNodeMapping(node.id),
            unmapped: !getNodeMapping(node.id)
          }"
          @click="selectNode(node.id)"
        >
          <!-- Cell Header -->
          <div class="cell-header">
            <span class="cell-material">{{ node.material || '?' }}</span>
            <span class="cell-measures">m.{{ node.startMeasure }}-{{ node.endMeasure }}</span>
          </div>
          
          <!-- Cell Content -->
          <div class="cell-content">
            <template v-if="getNodeMapping(node.id)">
              <div 
                class="visual-element"
                :class="getAnimationClass(getNodeMapping(node.id).animation)"
              >
                <span 
                  v-for="(shape, idx) in getNodeMapping(node.id).shapes?.slice(0, 4)" 
                  :key="idx"
                  class="shape-icon"
                  :style="{ color: getNodeMapping(node.id).colors?.[idx] || getNodeMapping(node.id).colors?.[0] }"
                >
                  {{ getShapeIcon(shape.type) }}
                </span>
              </div>
              <div class="visual-info">
                <span class="info-animation">{{ getNodeMapping(node.id).animation }}</span>
                <span class="info-modified" v-if="getNodeMapping(node.id).userModified">✎</span>
              </div>
            </template>
            <template v-else>
              <div class="placeholder">
                <span class="placeholder-icon">+</span>
                <span class="placeholder-text">点击设置</span>
              </div>
            </template>
          </div>

          <!-- Cell Actions (on hover) -->
          <div class="cell-actions" v-if="getNodeMapping(node.id)">
            <button class="action-btn" @click.stop="copyMappingToClipboard(node.id)" title="复制">📋</button>
            <button class="action-btn" @click.stop="applyToAllSimilar(node.id)" title="应用到相似">📤</button>
            <button class="action-btn danger" @click.stop="clearNodeMapping(node.id)" title="清除">🗑</button>
          </div>
          <div class="cell-actions" v-else-if="window.__copiedMapping">
            <button class="action-btn" @click.stop="pasteMappingFromClipboard(node.id)" title="粘贴">📥</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Element Library -->
    <div class="element-library">
      <div class="library-header">
        <h4>🎭 元素库 Element Library</h4>
        <span class="library-hint">选择元素后点击上方结构块应用</span>
      </div>
      
      <div class="library-content">
        <!-- Shapes -->
        <div class="library-section">
          <span class="section-title">图形 Shapes</span>
          <div class="shape-grid">
            <button 
              v-for="shape in SHAPE_LIBRARY.slice(0, 16)" 
              :key="shape.type"
              class="shape-btn"
              :class="{ selected: visualStore.selectedShape === shape.type }"
              @click="visualStore.selectShape(shape.type)"
              :title="shape.type"
            >
              {{ getShapeIcon(shape.type) }}
            </button>
          </div>
        </div>

        <!-- Colors -->
        <div class="library-section">
          <span class="section-title">颜色 Colors</span>
          <div class="color-grid">
            <div class="color-row">
              <span class="color-label">暖</span>
              <button 
                v-for="color in COLOR_PALETTE.warm" 
                :key="color"
                class="color-btn"
                :style="{ background: color }"
                :class="{ selected: visualStore.selectedColor === color }"
                @click="visualStore.selectColor(color)"
              ></button>
            </div>
            <div class="color-row">
              <span class="color-label">冷</span>
              <button 
                v-for="color in COLOR_PALETTE.cool" 
                :key="color"
                class="color-btn"
                :style="{ background: color }"
                :class="{ selected: visualStore.selectedColor === color }"
                @click="visualStore.selectColor(color)"
              ></button>
            </div>
          </div>
        </div>

        <!-- Animations -->
        <div class="library-section">
          <span class="section-title">动画 Animation</span>
          <div class="animation-grid">
            <button 
              v-for="anim in ANIMATIONS" 
              :key="anim"
              class="anim-btn"
              :class="{ selected: visualStore.selectedAnimation === anim }"
              @click="visualStore.selectAnimation(anim)"
            >
              {{ anim }}
            </button>
          </div>
        </div>
      </div>

      <!-- Library Actions -->
      <div class="library-actions">
        <button 
          class="btn-apply"
          :disabled="!selectedNodeId || (!visualStore.selectedShape && !visualStore.selectedColor && !visualStore.selectedAnimation)"
          @click="visualStore.applyToNode(selectedNodeId)"
        >
          ✓ 应用到选中 Apply
        </button>
        <button 
          class="btn-clear"
          @click="visualStore.clearSelection()"
        >
          清除选择 Clear
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.visual-map {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-bottom: 1px solid #e2e8f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.map-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1e293b;
}

.level-selector {
  display: flex;
  gap: 0.25rem;
  background: white;
  padding: 0.25rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.level-btn {
  padding: 0.35rem 0.75rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  color: #64748b;
  transition: all 0.15s;
}

.level-btn:hover { background: #f1f5f9; }
.level-btn.active { background: #667eea; color: white; }

.map-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 0.65rem;
  color: #94a3b8;
}

.stat-divider {
  color: #cbd5e1;
  font-size: 1.25rem;
}

.map-canvas {
  flex: 1;
  overflow: auto;
  padding: 1.5rem;
  background: #fafafa;
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

.empty-icon { font-size: 3rem; margin-bottom: 1rem; }
.hint { font-size: 0.85rem; margin-top: 0.5rem; }

.visual-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.visual-cell {
  position: relative;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 120px;
  display: flex;
  flex-direction: column;
}

.visual-cell:hover {
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.visual-cell.selected {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.visual-cell.mapped {
  background: linear-gradient(135deg, #faf5ff, #eef2ff);
}

.visual-cell.unmapped {
  border-style: dashed;
  background: #fafafa;
}

.visual-cell.active {
  animation: pulse-border 1s infinite;
}

@keyframes pulse-border {
  0%, 100% { border-color: #667eea; }
  50% { border-color: #a78bfa; }
}

.cell-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.cell-material {
  font-weight: 600;
  color: #4f46e5;
  font-family: monospace;
  font-size: 0.9rem;
}

.cell-measures {
  font-size: 0.7rem;
  color: #94a3b8;
}

.cell-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.visual-element {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  justify-content: center;
}

.shape-icon {
  font-size: 1.8rem;
}

.visual-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.info-animation {
  font-size: 0.7rem;
  color: #64748b;
  padding: 0.15rem 0.4rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.info-modified {
  font-size: 0.7rem;
  color: #f59e0b;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #cbd5e1;
}

.placeholder-icon {
  font-size: 2rem;
  line-height: 1;
}

.placeholder-text {
  font-size: 0.7rem;
  margin-top: 0.25rem;
}

.cell-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.visual-cell:hover .cell-actions {
  opacity: 1;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.7rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.action-btn:hover { background: white; }
.action-btn.danger:hover { background: #fee2e2; }

/* Element Library */
.element-library {
  padding: 1rem 1.5rem;
  background: white;
  border-top: 1px solid #e2e8f0;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.library-header h4 {
  margin: 0;
  font-size: 0.9rem;
  color: #1e293b;
}

.library-hint {
  font-size: 0.75rem;
  color: #94a3b8;
}

.library-content {
  display: flex;
  gap: 2rem;
}

.library-section {
  flex: 1;
}

.section-title {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.shape-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.shape-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.15s;
}

.shape-btn:hover { background: #f1f5f9; }
.shape-btn.selected { border-color: #667eea; background: #eef2ff; }

.color-grid {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.color-label {
  font-size: 0.65rem;
  color: #94a3b8;
  width: 16px;
}

.color-btn {
  width: 22px;
  height: 22px;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.color-btn:hover { transform: scale(1.15); }
.color-btn.selected { border-color: #1e293b; box-shadow: 0 0 0 2px white; }

.animation-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.anim-btn {
  padding: 0.25rem 0.5rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.7rem;
  text-transform: capitalize;
}

.anim-btn:hover { background: #f1f5f9; }
.anim-btn.selected { border-color: #667eea; background: #eef2ff; color: #4f46e5; }

.library-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.btn-apply, .btn-clear {
  flex: 1;
  padding: 0.6rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-apply {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-apply:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
.btn-apply:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-clear {
  background: #f1f5f9;
  color: #475569;
}

.btn-clear:hover { background: #e2e8f0; }

/* Animations */
.animate-flash .shape-icon { animation: flash 1s infinite; }
.animate-rotate .shape-icon { animation: rotate 2s linear infinite; }
.animate-bounce .shape-icon { animation: bounce 1s infinite; }
.animate-pulse .shape-icon { animation: pulse 1.5s infinite; }
.animate-shake .shape-icon { animation: shake 0.5s infinite; }
.animate-grow .shape-icon { animation: grow 1s infinite; }

@keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
@keyframes grow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
</style>
