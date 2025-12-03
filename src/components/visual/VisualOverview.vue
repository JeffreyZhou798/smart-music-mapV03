<script setup>
/**
 * VisualOverview - 总视觉方案全览
 * 流程4: 显示所有音乐结构块的视觉方案，带小节数字方便查看
 * 支持拖拽平移和缩放
 */
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useStructureStore } from '../../stores/structure.js'
import { useVisualStore } from '../../stores/visual.js'

const structureStore = useStructureStore()
const visualStore = useVisualStore()

const emit = defineEmits(['select-node', 'goto-playback'])

const viewMode = ref('timeline') // 'timeline' | 'grid' | 'list'
const filterLevel = ref('phrase') // 'motive' | 'subphrase' | 'phrase' | 'period' | 'all'

// Zoom and Pan state
const zoom = ref(100)
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const timelineContainer = ref(null)

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
  period: '乐段 Period',
  all: '全部 All'
}

// Get nodes based on filter level
const filteredNodes = computed(() => {
  const allNodes = structureStore.allNodes
  if (filterLevel.value === 'all') {
    return allNodes.filter(n => ['motive', 'subphrase', 'phrase', 'period'].includes(n.type))
  }
  return allNodes.filter(n => n.type === filterLevel.value)
})

// Sort nodes by measure number
const sortedNodes = computed(() => {
  return [...filteredNodes.value].sort((a, b) => a.startMeasure - b.startMeasure)
})

// Statistics
const stats = computed(() => {
  const total = sortedNodes.value.length
  const mapped = sortedNodes.value.filter(n => visualStore.getMapping(n.id)).length
  const unmapped = total - mapped
  const progress = total > 0 ? (mapped / total) * 100 : 0
  return { total, mapped, unmapped, progress }
})

// Get total measures
const totalMeasures = computed(() => {
  if (sortedNodes.value.length === 0) return 0
  return Math.max(...sortedNodes.value.map(n => n.endMeasure))
})

// Transform style for zoom and pan
const transformStyle = computed(() => {
  return {
    transform: `scale(${zoom.value / 100}) translate(${panX.value}px, ${panY.value}px)`,
    transformOrigin: 'top left'
  }
})

// Timeline width based on zoom
const timelineWidth = computed(() => {
  return Math.max(100, totalMeasures.value * 15 * (zoom.value / 100))
})

function getNodeMapping(nodeId) {
  return visualStore.getMapping(nodeId)
}

function getShapeIcon(type) {
  return shapeIcons[type] || '●'
}

function selectNode(node) {
  structureStore.selectNode(node.id)
  emit('select-node', node)
}

function getMeasurePosition(measure) {
  if (totalMeasures.value === 0) return 0
  return ((measure - 1) / totalMeasures.value) * 100
}

function getMeasureWidth(startMeasure, endMeasure) {
  if (totalMeasures.value === 0) return 0
  return ((endMeasure - startMeasure + 1) / totalMeasures.value) * 100
}

function isNodeSelected(nodeId) {
  return structureStore.selectedNodeId === nodeId
}

function goToPlayback() {
  emit('goto-playback')
}

// Zoom controls
function zoomIn() {
  zoom.value = Math.min(200, zoom.value + 20)
}

function zoomOut() {
  zoom.value = Math.max(50, zoom.value - 20)
}

function resetZoom() {
  zoom.value = 100
  panX.value = 0
  panY.value = 0
}

// Mouse drag handlers
function startDrag(event) {
  if (event.button !== 0) return // Only left click
  isDragging.value = true
  dragStart.value = {
    x: event.clientX - panX.value * (zoom.value / 100),
    y: event.clientY - panY.value * (zoom.value / 100)
  }
  event.preventDefault()
}

function onDrag(event) {
  if (!isDragging.value) return
  panX.value = (event.clientX - dragStart.value.x) / (zoom.value / 100)
  panY.value = (event.clientY - dragStart.value.y) / (zoom.value / 100)
}

function stopDrag() {
  isDragging.value = false
}

// Mouse wheel zoom
function onWheel(event) {
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -10 : 10
    zoom.value = Math.max(50, Math.min(200, zoom.value + delta))
  }
}

// Touch handlers for mobile
let touchStartDistance = 0
let touchStartZoom = 100

function onTouchStart(event) {
  if (event.touches.length === 2) {
    // Pinch zoom start
    const dx = event.touches[0].clientX - event.touches[1].clientX
    const dy = event.touches[0].clientY - event.touches[1].clientY
    touchStartDistance = Math.sqrt(dx * dx + dy * dy)
    touchStartZoom = zoom.value
  } else if (event.touches.length === 1) {
    // Pan start
    isDragging.value = true
    dragStart.value = {
      x: event.touches[0].clientX - panX.value * (zoom.value / 100),
      y: event.touches[0].clientY - panY.value * (zoom.value / 100)
    }
  }
}

function onTouchMove(event) {
  if (event.touches.length === 2) {
    // Pinch zoom
    const dx = event.touches[0].clientX - event.touches[1].clientX
    const dy = event.touches[0].clientY - event.touches[1].clientY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const scale = distance / touchStartDistance
    zoom.value = Math.max(50, Math.min(200, touchStartZoom * scale))
    event.preventDefault()
  } else if (event.touches.length === 1 && isDragging.value) {
    // Pan
    panX.value = (event.touches[0].clientX - dragStart.value.x) / (zoom.value / 100)
    panY.value = (event.touches[0].clientY - dragStart.value.y) / (zoom.value / 100)
  }
}

function onTouchEnd() {
  isDragging.value = false
}

onMounted(() => {
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<template>
  <div class="visual-overview">
    <!-- Header -->
    <div class="overview-header">
      <div class="header-left">
        <h3>📊 视觉方案全览 Visual Overview</h3>
        <div class="progress-info">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: stats.progress + '%' }"></div>
          </div>
          <span class="progress-text">{{ stats.mapped }}/{{ stats.total }} 已设置</span>
        </div>
      </div>
      <div class="header-right">
        <select v-model="filterLevel" class="filter-select">
          <option v-for="(label, key) in levelLabels" :key="key" :value="key">{{ label }}</option>
        </select>
        <div class="view-toggle">
          <button :class="{ active: viewMode === 'timeline' }" @click="viewMode = 'timeline'" title="时间线视图">📏</button>
          <button :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'" title="网格视图">⊞</button>
          <button :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'" title="列表视图">☰</button>
        </div>
        <button class="btn-playback" @click="goToPlayback" :disabled="stats.mapped === 0">
          ▶ 预览播放
        </button>
      </div>
    </div>

    <!-- Zoom Controls (for timeline view) -->
    <div class="zoom-controls" v-if="viewMode === 'timeline'">
      <button @click="zoomOut" :disabled="zoom <= 50" title="缩小">−</button>
      <span class="zoom-value">{{ zoom }}%</span>
      <button @click="zoomIn" :disabled="zoom >= 200" title="放大">+</button>
      <button @click="resetZoom" class="btn-reset" title="重置">重置</button>
      <span class="zoom-hint">💡 Ctrl+滚轮缩放，拖拽平移</span>
    </div>

    <!-- Measure Ruler -->
    <div class="measure-ruler" v-if="viewMode === 'timeline'">
      <div class="ruler-track" :style="{ width: timelineWidth + '%', ...transformStyle }">
        <span 
          v-for="m in Math.ceil(totalMeasures / 4)" 
          :key="m"
          class="ruler-mark"
          :style="{ left: getMeasurePosition((m - 1) * 4 + 1) + '%' }"
        >
          {{ (m - 1) * 4 + 1 }}
        </span>
      </div>
    </div>

    <!-- Timeline View with Pan & Zoom -->
    <div 
      class="timeline-view" 
      v-if="viewMode === 'timeline'"
      ref="timelineContainer"
      @mousedown="startDrag"
      @wheel="onWheel"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      :class="{ dragging: isDragging }"
    >
      <div class="timeline-track" :style="{ width: timelineWidth + '%', ...transformStyle }">
        <div 
          v-for="node in sortedNodes" 
          :key="node.id"
          class="timeline-item"
          :class="{ 
            selected: isNodeSelected(node.id),
            mapped: getNodeMapping(node.id),
            unmapped: !getNodeMapping(node.id)
          }"
          :style="{ 
            left: getMeasurePosition(node.startMeasure) + '%',
            width: getMeasureWidth(node.startMeasure, node.endMeasure) + '%'
          }"
          @click.stop="selectNode(node)"
        >
          <div class="item-content">
            <template v-if="getNodeMapping(node.id)">
              <div class="item-shapes" :class="`animate-${getNodeMapping(node.id).animation}`">
                <span 
                  v-for="(shape, idx) in getNodeMapping(node.id).shapes?.slice(0, 3)" 
                  :key="idx"
                  class="item-shape"
                  :style="{ color: getNodeMapping(node.id).colors?.[idx] || getNodeMapping(node.id).colors?.[0] }"
                >
                  {{ getShapeIcon(shape.type) }}
                </span>
              </div>
            </template>
            <template v-else>
              <span class="item-placeholder">+</span>
            </template>
          </div>
          <div class="item-label">
            <span class="item-material">{{ node.material || '?' }}</span>
            <span class="item-measures">m.{{ node.startMeasure }}-{{ node.endMeasure }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Grid View -->
    <div class="grid-view" v-else-if="viewMode === 'grid'">
      <div 
        v-for="node in sortedNodes" 
        :key="node.id"
        class="grid-item"
        :class="{ 
          selected: isNodeSelected(node.id),
          mapped: getNodeMapping(node.id)
        }"
        @click="selectNode(node)"
      >
        <div class="grid-header">
          <span class="grid-material">{{ node.material || '?' }}</span>
          <span class="grid-type">{{ node.type }}</span>
        </div>
        <div class="grid-content">
          <template v-if="getNodeMapping(node.id)">
            <div class="grid-shapes" :class="`animate-${getNodeMapping(node.id).animation}`">
              <span 
                v-for="(shape, idx) in getNodeMapping(node.id).shapes?.slice(0, 4)" 
                :key="idx"
                class="grid-shape"
                :style="{ color: getNodeMapping(node.id).colors?.[idx] || getNodeMapping(node.id).colors?.[0] }"
              >
                {{ getShapeIcon(shape.type) }}
              </span>
            </div>
          </template>
          <template v-else>
            <div class="grid-placeholder">
              <span>+</span>
              <span class="placeholder-text">点击设置</span>
            </div>
          </template>
        </div>
        <div class="grid-footer">
          <span class="grid-measures">m.{{ node.startMeasure }}-{{ node.endMeasure }}</span>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div class="list-view" v-else>
      <div class="list-header">
        <span class="col-material">素材</span>
        <span class="col-type">类型</span>
        <span class="col-measures">小节</span>
        <span class="col-visual">视觉方案</span>
        <span class="col-status">状态</span>
      </div>
      <div class="list-scroll">
        <div 
          v-for="node in sortedNodes" 
          :key="node.id"
          class="list-item"
          :class="{ selected: isNodeSelected(node.id) }"
          @click="selectNode(node)"
        >
          <span class="col-material">
            <span class="material-badge">{{ node.material || '?' }}</span>
          </span>
          <span class="col-type">{{ node.type }}</span>
          <span class="col-measures">{{ node.startMeasure }}-{{ node.endMeasure }}</span>
          <span class="col-visual">
            <template v-if="getNodeMapping(node.id)">
              <span 
                v-for="(shape, idx) in getNodeMapping(node.id).shapes?.slice(0, 3)" 
                :key="idx"
                class="list-shape"
                :style="{ color: getNodeMapping(node.id).colors?.[idx] || getNodeMapping(node.id).colors?.[0] }"
              >
                {{ getShapeIcon(shape.type) }}
              </span>
              <span class="list-animation">{{ getNodeMapping(node.id).animation }}</span>
            </template>
            <template v-else>
              <span class="list-empty">未设置</span>
            </template>
          </span>
          <span class="col-status">
            <span class="status-badge" :class="getNodeMapping(node.id) ? 'done' : 'pending'">
              {{ getNodeMapping(node.id) ? '✓' : '○' }}
            </span>
          </span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div class="empty-state" v-if="sortedNodes.length === 0">
      <div class="empty-icon">📭</div>
      <p>暂无结构数据</p>
      <p class="hint">请先上传并分析乐谱</p>
    </div>

    <!-- Summary -->
    <div class="overview-summary" v-if="sortedNodes.length > 0">
      <div class="summary-item">
        <span class="summary-value">{{ stats.total }}</span>
        <span class="summary-label">总计</span>
      </div>
      <div class="summary-item done">
        <span class="summary-value">{{ stats.mapped }}</span>
        <span class="summary-label">已设置</span>
      </div>
      <div class="summary-item pending">
        <span class="summary-value">{{ stats.unmapped }}</span>
        <span class="summary-label">待设置</span>
      </div>
    </div>
  </div>
</template>


<style scoped>
.visual-overview {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.overview-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #1e293b;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-bar {
  width: 100px;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #22c55e);
  transition: width 0.3s;
}

.progress-text {
  font-size: 0.75rem;
  color: #64748b;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.filter-select {
  padding: 0.35rem 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.8rem;
  background: white;
}

.view-toggle {
  display: flex;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.view-toggle button {
  width: 30px;
  height: 30px;
  border: none;
  background: white;
  cursor: pointer;
  font-size: 0.85rem;
}

.view-toggle button:hover { background: #f1f5f9; }
.view-toggle button.active { background: #667eea; color: white; }

.btn-playback {
  padding: 0.4rem 0.8rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
}

.btn-playback:hover:not(:disabled) { transform: translateY(-1px); }
.btn-playback:disabled { opacity: 0.5; cursor: not-allowed; }

/* Zoom Controls */
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.5rem;
  background: #fafafa;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.zoom-controls button {
  width: 28px;
  height: 28px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.zoom-controls button:hover:not(:disabled) { background: #f1f5f9; }
.zoom-controls button:disabled { opacity: 0.4; cursor: not-allowed; }

.zoom-value {
  min-width: 45px;
  text-align: center;
  font-size: 0.8rem;
  color: #64748b;
}

.btn-reset {
  width: auto !important;
  padding: 0 0.6rem;
  font-size: 0.75rem !important;
}

.zoom-hint {
  margin-left: auto;
  font-size: 0.7rem;
  color: #94a3b8;
}

/* Measure Ruler */
.measure-ruler {
  padding: 0.4rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  overflow: hidden;
  flex-shrink: 0;
}

.ruler-track {
  position: relative;
  height: 18px;
  min-width: 100%;
}

.ruler-mark {
  position: absolute;
  font-size: 0.65rem;
  color: #94a3b8;
  transform: translateX(-50%);
}

/* Timeline View */
.timeline-view {
  flex: 1;
  overflow: auto;
  padding: 1rem 1.5rem;
  cursor: grab;
  user-select: none;
  min-height: 0;
}

.timeline-view.dragging {
  cursor: grabbing;
}

.timeline-track {
  position: relative;
  height: 100px;
  min-width: 100%;
  background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 8px;
  transition: transform 0.05s ease-out;
}

.timeline-item {
  position: absolute;
  top: 10px;
  height: 80px;
  min-width: 60px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.timeline-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
.timeline-item.selected { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2); }
.timeline-item.mapped { background: linear-gradient(135deg, #f5f3ff, #eef2ff); }
.timeline-item.unmapped { background: #fafafa; border-style: dashed; }

.item-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}

.item-shapes {
  display: flex;
  gap: 0.15rem;
}

.item-shape {
  font-size: 1.2rem;
}

.item-placeholder {
  font-size: 1.5rem;
  color: #cbd5e1;
}

.item-label {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.03);
  font-size: 0.6rem;
}

.item-material {
  font-weight: 600;
  color: #4f46e5;
  font-family: monospace;
}

.item-measures {
  color: #94a3b8;
}

/* Grid View */
.grid-view {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.75rem;
  align-content: start;
  min-height: 0;
}

.grid-item {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.grid-item:hover { border-color: #cbd5e1; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
.grid-item.selected { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2); }
.grid-item.mapped { background: linear-gradient(135deg, #faf5ff, #eef2ff); }

.grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0.6rem;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid #f1f5f9;
}

.grid-material {
  font-weight: 600;
  color: #4f46e5;
  font-family: monospace;
  font-size: 0.85rem;
}

.grid-type {
  font-size: 0.6rem;
  color: #94a3b8;
  text-transform: capitalize;
}

.grid-content {
  padding: 0.75rem;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.grid-shapes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  justify-content: center;
}

.grid-shape {
  font-size: 1.3rem;
}

.grid-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #cbd5e1;
}

.grid-placeholder span:first-child {
  font-size: 1.3rem;
}

.placeholder-text {
  font-size: 0.65rem;
  margin-top: 0.2rem;
}

.grid-footer {
  padding: 0.3rem 0.6rem;
  background: rgba(0, 0, 0, 0.02);
  border-top: 1px solid #f1f5f9;
  text-align: center;
}

.grid-measures {
  font-size: 0.65rem;
  color: #94a3b8;
}

/* List View */
.list-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.list-header {
  display: grid;
  grid-template-columns: 70px 90px 70px 1fr 50px;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  background: #f8fafc;
  font-size: 0.7rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  flex-shrink: 0;
  margin: 0 1.5rem;
  border-radius: 6px;
}

.list-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 1.5rem 1rem;
}

.list-item {
  display: grid;
  grid-template-columns: 70px 90px 70px 1fr 50px;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.15s;
  align-items: center;
}

.list-item:hover { background: #f8fafc; }
.list-item.selected { background: #eef2ff; }

.material-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 4px;
  font-family: monospace;
  font-weight: 600;
  font-size: 0.8rem;
}

.col-type {
  font-size: 0.8rem;
  color: #64748b;
  text-transform: capitalize;
}

.col-measures {
  font-size: 0.8rem;
  color: #94a3b8;
  font-family: monospace;
}

.col-visual {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.list-shape {
  font-size: 1.1rem;
}

.list-animation {
  font-size: 0.7rem;
  color: #64748b;
  padding: 0.1rem 0.35rem;
  background: #f1f5f9;
  border-radius: 3px;
}

.list-empty {
  font-size: 0.75rem;
  color: #cbd5e1;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 0.75rem;
}

.status-badge.done { background: #dcfce7; color: #16a34a; }
.status-badge.pending { background: #f1f5f9; color: #94a3b8; }

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  padding: 2rem;
}

.empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
.hint { font-size: 0.8rem; margin-top: 0.4rem; }

/* Summary */
.overview-summary {
  display: flex;
  justify-content: center;
  gap: 2rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.summary-label {
  font-size: 0.7rem;
  color: #64748b;
}

.summary-item.done .summary-value { color: #16a34a; }
.summary-item.pending .summary-value { color: #f59e0b; }

/* Animations */
.animate-flash .item-shape, .animate-flash .grid-shape { animation: flash 1s infinite; }
.animate-pulse .item-shape, .animate-pulse .grid-shape { animation: pulse 1.5s infinite; }
.animate-bounce .item-shape, .animate-bounce .grid-shape { animation: bounce 1s infinite; }

@keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
</style>
