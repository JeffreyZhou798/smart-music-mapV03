<script setup>
import { inject, computed, ref } from 'vue'
import { STRUCTURE_LABELS, FORM_LABELS, CADENCE_LABELS, CONFIDENCE_THRESHOLDS } from '../../types/index.js'
import StructureNode from './StructureNode.vue'
import Tooltip from '../common/Tooltip.vue'

const structureStore = inject('structureStore')

// Tooltip state
const tooltipVisible = ref(false)
const tooltipPosition = ref({ x: 0, y: 0 })
const tooltipNode = ref(null)

const formAnalysis = computed(() => structureStore.formAnalysis)
const rootNode = computed(() => structureStore.rootNode)
const selectedNode = computed(() => structureStore.selectedNode)
const expandedNodes = computed(() => structureStore.expandedNodes)

function getFormLabel(formType) {
  return FORM_LABELS[formType]?.en || formType
}

function getStructureLabel(type) {
  return STRUCTURE_LABELS[type]?.en || type
}

function getStructureLabelZh(type) {
  return STRUCTURE_LABELS[type]?.zh || ''
}

function getConfidenceClass(confidence) {
  if (confidence >= CONFIDENCE_THRESHOLDS.high) return 'high'
  if (confidence >= CONFIDENCE_THRESHOLDS.medium) return 'medium'
  return 'low'
}

function toggleNode(nodeId) {
  structureStore.toggleExpanded(nodeId)
}

function selectNode(node) {
  structureStore.selectNode(node.id)
}

function isExpanded(nodeId) {
  return expandedNodes.value.has(nodeId)
}

function isSelected(nodeId) {
  return structureStore.selectedNodeId === nodeId
}

// Tooltip handlers
function showTooltip(node, event) {
  tooltipNode.value = node
  tooltipPosition.value = {
    x: event.clientX + 10,
    y: event.clientY + 10
  }
  tooltipVisible.value = true
}

function hideTooltip() {
  tooltipVisible.value = false
  tooltipNode.value = null
}
</script>

<template>
  <div class="structure-panel">
    <div class="panel-header">
      <h3>Musical Structure</h3>
      <div class="header-actions">
        <button class="btn-icon" @click="structureStore.expandAll()" title="Expand All">
          ⊞
        </button>
        <button class="btn-icon" @click="structureStore.collapseAll()" title="Collapse All">
          ⊟
        </button>
      </div>
    </div>

    <!-- Form Analysis Summary -->
    <div class="form-summary" v-if="formAnalysis">
      <div class="form-badge">
        {{ getFormLabel(formAnalysis.formType) }}
      </div>
      <div class="form-confidence">
        <span class="confidence-label">Confidence:</span>
        <span 
          class="confidence-value"
          :class="getConfidenceClass(formAnalysis.confidence)"
        >
          {{ Math.round(formAnalysis.confidence * 100) }}%
        </span>
      </div>
    </div>

    <!-- Structure Tree -->
    <div class="structure-tree" v-if="rootNode">
      <StructureNode 
        :node="rootNode" 
        :depth="0"
        :is-expanded="isExpanded"
        :is-selected="isSelected"
        @toggle="toggleNode"
        @select="selectNode"
        @mouseenter="showTooltip"
        @mouseleave="hideTooltip"
      />
    </div>
    
    <!-- Tooltip for node details -->
    <Tooltip 
      v-if="tooltipNode"
      :node="tooltipNode"
      :position="tooltipPosition"
      :visible="tooltipVisible"
    />

    <!-- Selected Node Details -->
    <div class="node-details" v-if="selectedNode">
      <h4>Selected: {{ getStructureLabel(selectedNode.type) }}</h4>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Type</span>
          <span class="detail-value">
            {{ getStructureLabel(selectedNode.type) }}
            <span class="zh-label">({{ getStructureLabelZh(selectedNode.type) }})</span>
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Measures</span>
          <span class="detail-value">{{ selectedNode.startMeasure }} - {{ selectedNode.endMeasure }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Material</span>
          <span class="detail-value material-badge">{{ selectedNode.material }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Confidence</span>
          <span 
            class="detail-value confidence-badge"
            :class="getConfidenceClass(selectedNode.confidence)"
          >
            {{ Math.round(selectedNode.confidence * 100) }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// Recursive StructureNode component
export default {
  name: 'StructurePanel'
}
</script>

<style scoped>
.structure-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  overflow: auto;
  min-height: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1e293b;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  width: 28px;
  height: 28px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #f1f5f9;
}

.form-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: linear-gradient(135deg, #eef2ff, #faf5ff);
  border-radius: 8px;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.form-badge {
  font-weight: 600;
  color: #4f46e5;
  font-size: 0.95rem;
}

.form-confidence {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.confidence-label {
  color: #64748b;
}

.confidence-value {
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.confidence-value.high {
  background: #dcfce7;
  color: #16a34a;
}

.confidence-value.medium {
  background: #fef3c7;
  color: #d97706;
}

.confidence-value.low {
  background: #fee2e2;
  color: #dc2626;
}

.structure-tree {
  flex: 1;
  overflow: auto;
  padding-right: 0.5rem;
  min-height: 0;
}

.node-details {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
  max-height: 18%;
  min-height: 60px;
  overflow-y: auto;
}

.node-details h4 {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: #334155;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem 0.75rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.detail-label {
  font-size: 0.65rem;
  color: #94a3b8;
  text-transform: uppercase;
}

.detail-value {
  font-size: 0.9rem;
  color: #334155;
}

.zh-label {
  color: #94a3b8;
  font-size: 0.8rem;
}

.material-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 4px;
  font-family: monospace;
}

.confidence-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}
</style>
