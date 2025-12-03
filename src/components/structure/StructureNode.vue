<script setup>
import { computed } from 'vue'
import { STRUCTURE_LABELS, CONFIDENCE_THRESHOLDS } from '../../types/index.js'
import { useVisualStore } from '../../stores/visual.js'

const visualStore = useVisualStore()

const shapeIcons = {
  circle: '●', square: '■', triangle: '▲', diamond: '◆',
  hexagon: '⬡', octagon: '⯃', star4: '✦', star5: '★',
  star6: '✶', note: '♪', clef: '𝄞', rest: '𝄽',
  wave: '〰', spiral: '🌀', burst: '💥', flower: '✿',
  leaf: '🍃', sun: '☀', heart: '♥', arrow: '➤'
}

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  depth: {
    type: Number,
    default: 0
  },
  isExpanded: {
    type: Function,
    required: true
  },
  isSelected: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['toggle', 'select', 'mouseenter', 'mouseleave'])

const hasChildren = computed(() => props.node.children && props.node.children.length > 0)
const expanded = computed(() => props.isExpanded(props.node.id))
const selected = computed(() => props.isSelected(props.node.id))

const typeIcon = computed(() => {
  const icons = {
    section: '📦',
    theme: '🎭',
    period: '📄',
    phrase: '🎵',
    subphrase: '🎶',
    motive: '🔹'
  }
  return icons[props.node.type] || '•'
})

const typeLabel = computed(() => {
  return STRUCTURE_LABELS[props.node.type]?.en || props.node.type
})

const confidenceClass = computed(() => {
  const c = props.node.confidence
  if (c >= CONFIDENCE_THRESHOLDS.high) return 'high'
  if (c >= CONFIDENCE_THRESHOLDS.medium) return 'medium'
  if (c >= 0.4) return 'low'
  return 'very-low'
})

// Visual style based on confidence for uncertainty visualization
const nodeStyle = computed(() => {
  const visualStyle = props.node.visualStyle
  if (!visualStyle) return {}
  
  return {
    opacity: visualStyle.opacity || 1,
    borderStyle: visualStyle.lineStyle || 'solid'
  }
})

// Border style class for uncertainty visualization
const borderStyleClass = computed(() => {
  const visualStyle = props.node.visualStyle
  if (!visualStyle) return ''
  
  if (visualStyle.lineStyle === 'dashed') return 'border-dashed'
  if (visualStyle.lineStyle === 'dotted') return 'border-dotted'
  return ''
})

// 获取当前节点的视觉方案
const nodeMapping = computed(() => {
  return visualStore?.getMapping(props.node.id)
})

function getShapeIcon(type) {
  return shapeIcons[type] || '●'
}

function toggle() {
  emit('toggle', props.node.id)
}

function select() {
  emit('select', props.node)
}

function clearMapping() {
  visualStore?.removeMapping(props.node.id)
}
</script>

<template>
  <div class="structure-node" :style="{ paddingLeft: depth * 16 + 'px' }">
    <div 
      class="node-row"
      :class="{ selected, 'has-children': hasChildren, 'has-visual': nodeMapping, [borderStyleClass]: true }"
      :style="nodeStyle"
      @click="select"
      @mouseenter="(e) => emit('mouseenter', node, e)"
      @mouseleave="(e) => emit('mouseleave', node, e)"
    >
      <button 
        v-if="hasChildren"
        class="expand-btn"
        @click.stop="toggle"
      >
        {{ expanded ? '▼' : '▶' }}
      </button>
      <span v-else class="expand-placeholder"></span>
      
      <span class="node-icon">{{ typeIcon }}</span>
      
      <span class="node-label">{{ typeLabel }}</span>
      
      <span class="node-measures">m.{{ node.startMeasure }}-{{ node.endMeasure }}</span>
      
      <span class="node-material" v-if="node.material">{{ node.material }}</span>
      
      <!-- 视觉方案显示 -->
      <div class="node-visual" v-if="nodeMapping">
        <span 
          v-for="(shape, idx) in nodeMapping.shapes?.slice(0, 3)" 
          :key="idx"
          class="visual-shape"
          :style="{ color: nodeMapping.colors?.[idx] || nodeMapping.colors?.[0] }"
        >{{ getShapeIcon(shape.type) }}</span>
        <span class="visual-name">{{ nodeMapping.shapes?.[0]?.type || nodeMapping.animation }}</span>
        <button class="btn-edit-visual" @click.stop="$emit('select', node)" title="修改">✏️</button>
        <button class="btn-clear-visual" @click.stop="clearMapping" title="删除">✕</button>
      </div>
      
      <!-- 未设置视觉方案时的提示 -->
      <div class="node-visual-empty" v-else-if="selected">
        <span class="empty-hint">← 请选择视觉方案</span>
      </div>
    </div>
    
    <div v-if="hasChildren && expanded" class="node-children">
      <StructureNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :is-expanded="isExpanded"
        :is-selected="isSelected"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
        @mouseenter="(node, e) => $emit('mouseenter', node, e)"
        @mouseleave="(node, e) => $emit('mouseleave', node, e)"
      />
    </div>
  </div>
</template>

<style scoped>
.structure-node {
  user-select: none;
}

.node-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.node-row:hover {
  background: #f1f5f9;
}

.node-row.selected {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 2px solid #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.3);
  animation: pulse-selected 1.5s infinite;
}

.node-row.selected.has-visual {
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  border: 2px solid #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
  animation: none;
}

@keyframes pulse-selected {
  0%, 100% { box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.3); }
  50% { box-shadow: 0 0 0 5px rgba(245, 158, 11, 0.15); }
}

.expand-btn {
  width: 18px;
  height: 18px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.65rem;
  color: #94a3b8;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-btn:hover {
  color: #475569;
}

.expand-placeholder {
  width: 18px;
}

.node-icon {
  font-size: 0.9rem;
}

.node-label {
  flex: 1;
  font-size: 0.85rem;
  color: #334155;
}

.node-measures {
  font-size: 0.75rem;
  color: #94a3b8;
  font-family: monospace;
}

.node-material {
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 3px;
  font-family: monospace;
}

.node-confidence {
  font-size: 1rem;
  line-height: 1;
}

.node-confidence.high {
  color: #4ade80;
}

.node-confidence.medium {
  color: #fbbf24;
}

.node-confidence.low {
  color: #f87171;
}

.node-confidence.very-low {
  color: #dc2626;
}

/* Uncertainty visualization - border styles */
.node-row.border-dashed {
  border: 1px dashed #94a3b8;
}

.node-row.border-dotted {
  border: 1px dotted #94a3b8;
}

/* Low confidence nodes appear semi-transparent */
.node-row[style*="opacity: 0.7"],
.node-row[style*="opacity: 0.5"] {
  background: rgba(241, 245, 249, 0.5);
}

.node-children {
  margin-left: 0.5rem;
  border-left: 1px dashed #e2e8f0;
}

/* 视觉方案显示 */
.node-visual {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.15rem 0.35rem;
  background: linear-gradient(135deg, #faf5ff, #eef2ff);
  border-radius: 4px;
  border: 1px solid #c7d2fe;
}

.visual-shape {
  font-size: 0.9rem;
  line-height: 1;
}

.btn-clear-visual {
  width: 14px;
  height: 14px;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.55rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.2rem;
  opacity: 0;
  transition: opacity 0.15s;
}

.node-row:hover .btn-clear-visual {
  opacity: 1;
}

.btn-clear-visual:hover {
  background: rgba(239, 68, 68, 0.2);
}

.visual-name {
  font-size: 0.65rem;
  color: #6366f1;
  font-weight: 500;
  text-transform: capitalize;
  max-width: 50px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-edit-visual {
  width: 16px;
  height: 16px;
  border: none;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
}

.node-row:hover .btn-edit-visual {
  opacity: 1;
}

.btn-edit-visual:hover {
  background: rgba(102, 126, 234, 0.2);
}

/* 未设置视觉方案时的提示 */
.node-visual-empty {
  display: flex;
  align-items: center;
  padding: 0.15rem 0.35rem;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-radius: 4px;
  border: 1px dashed #f59e0b;
  animation: blink-hint 1s infinite;
}

.empty-hint {
  font-size: 0.6rem;
  color: #92400e;
  font-weight: 500;
}

@keyframes blink-hint {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* 已设置视觉方案的节点行 */
.node-row.has-visual {
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
}
</style>
