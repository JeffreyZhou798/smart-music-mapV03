<script setup>
import { ref, inject, computed, onMounted, watch } from 'vue'

const sessionStore = inject('sessionStore')
const structureStore = inject('structureStore')

const scoreContainer = ref(null)
const zoom = ref(100)
const isLoading = ref(false)

const parsedScore = computed(() => sessionStore.parsedScore)
const measures = computed(() => parsedScore.value?.measures || [])
const keySignature = computed(() => parsedScore.value?.keySignature)
const timeSignature = computed(() => parsedScore.value?.timeSignature)
const tempo = computed(() => parsedScore.value?.tempo)

const selectedNode = computed(() => structureStore.selectedNode)
const highlightedMeasures = computed(() => {
  if (!selectedNode.value) return new Set()
  const measures = new Set()
  for (let m = selectedNode.value.startMeasure; m <= selectedNode.value.endMeasure; m++) {
    measures.add(m)
  }
  return measures
})

function getKeyName(fifths, mode) {
  const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#']
  const majorKeysFlat = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']
  
  let key
  if (fifths >= 0) {
    key = majorKeys[fifths] || 'C'
  } else {
    key = majorKeysFlat[-fifths] || 'C'
  }
  
  return `${key} ${mode}`
}

function zoomIn() {
  zoom.value = Math.min(200, zoom.value + 25)
}

function zoomOut() {
  zoom.value = Math.max(50, zoom.value - 25)
}

function resetZoom() {
  zoom.value = 100
}

function selectMeasure(measureNumber) {
  const node = structureStore.getNodeAtMeasure(measureNumber)
  if (node) {
    structureStore.selectNode(node.id)
  }
}

function isMeasureHighlighted(measureNumber) {
  return highlightedMeasures.value.has(measureNumber)
}

function getMeasureStructure(measureNumber) {
  const node = structureStore.getNodeAtMeasure(measureNumber)
  return node?.type || null
}
</script>

<template>
  <div class="score-display">
    <!-- Toolbar -->
    <div class="score-toolbar">
      <div class="toolbar-left">
        <h3>Score View</h3>
        <div class="score-info" v-if="parsedScore">
          <span class="info-item">
            <strong>Key:</strong> {{ getKeyName(keySignature?.fifths, keySignature?.mode) }}
          </span>
          <span class="info-item">
            <strong>Time:</strong> {{ timeSignature?.beats }}/{{ timeSignature?.beatType }}
          </span>
          <span class="info-item">
            <strong>Tempo:</strong> {{ tempo }} BPM
          </span>
          <span class="info-item">
            <strong>Measures:</strong> {{ measures.length }}
          </span>
        </div>
      </div>
      <div class="toolbar-right">
        <div class="zoom-controls">
          <button @click="zoomOut" :disabled="zoom <= 50">−</button>
          <span class="zoom-value">{{ zoom }}%</span>
          <button @click="zoomIn" :disabled="zoom >= 200">+</button>
          <button @click="resetZoom" class="btn-reset">Reset</button>
        </div>
      </div>
    </div>

    <!-- Score Content -->
    <div class="score-content" ref="scoreContainer">
      <div v-if="!parsedScore" class="empty-state">
        <div class="empty-icon">🎼</div>
        <p>No score loaded</p>
        <p class="hint">Upload a MusicXML file to view the score.</p>
      </div>

      <div v-else class="measures-grid" :style="{ transform: `scale(${zoom / 100})` }">
        <div 
          v-for="measure in measures" 
          :key="measure.number"
          class="measure-box"
          :class="{ 
            highlighted: isMeasureHighlighted(measure.number),
            'has-structure': getMeasureStructure(measure.number)
          }"
          @click="selectMeasure(measure.number)"
        >
          <div class="measure-number">{{ measure.number }}</div>
          <div class="measure-content">
            <div 
              v-for="note in measure.notes.slice(0, 8)" 
              :key="`${note.pitch}-${note.beat}`"
              class="note-dot"
              :title="note.pitch"
            ></div>
            <span v-if="measure.notes.length > 8" class="more-notes">
              +{{ measure.notes.length - 8 }}
            </span>
          </div>
          <div 
            v-if="getMeasureStructure(measure.number)"
            class="structure-indicator"
            :class="getMeasureStructure(measure.number)"
          ></div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="score-legend" v-if="parsedScore">
      <span class="legend-title">Structure:</span>
      <span class="legend-item">
        <span class="legend-dot section"></span> Section
      </span>
      <span class="legend-item">
        <span class="legend-dot theme"></span> Theme
      </span>
      <span class="legend-item">
        <span class="legend-dot period"></span> Period
      </span>
      <span class="legend-item">
        <span class="legend-dot phrase"></span> Phrase
      </span>
    </div>
  </div>
</template>

<style scoped>
.score-display {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.score-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.toolbar-left h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1e293b;
}

.score-info {
  display: flex;
  gap: 1rem;
}

.info-item {
  font-size: 0.85rem;
  color: #64748b;
}

.info-item strong {
  color: #475569;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.zoom-controls button {
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

.zoom-controls button:hover:not(:disabled) {
  background: #f1f5f9;
}

.zoom-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zoom-value {
  min-width: 50px;
  text-align: center;
  font-size: 0.85rem;
  color: #64748b;
}

.btn-reset {
  width: auto !important;
  padding: 0 0.75rem;
  font-size: 0.8rem !important;
}

.score-content {
  flex: 1;
  overflow: auto;
  padding: 1.5rem;
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.hint {
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.measures-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.75rem;
  transform-origin: top left;
}

.measure-box {
  position: relative;
  padding: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 60px;
}

.measure-box:hover {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.measure-box.highlighted {
  border-color: #667eea;
  background: #eef2ff;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.measure-number {
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: 0.7rem;
  color: #94a3b8;
  font-weight: 500;
}

.measure-content {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding-top: 1rem;
}

.note-dot {
  width: 6px;
  height: 6px;
  background: #667eea;
  border-radius: 50%;
}

.more-notes {
  font-size: 0.65rem;
  color: #94a3b8;
}

.structure-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 0 0 8px 8px;
}

.structure-indicator.section { background: #f87171; }
.structure-indicator.theme { background: #fbbf24; }
.structure-indicator.period { background: #4ade80; }
.structure-indicator.phrase { background: #60a5fa; }
.structure-indicator.subphrase { background: #a78bfa; }
.structure-indicator.motive { background: #f472b6; }

.score-legend {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  font-size: 0.8rem;
}

.legend-title {
  color: #64748b;
  font-weight: 500;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: #475569;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.legend-dot.section { background: #f87171; }
.legend-dot.theme { background: #fbbf24; }
.legend-dot.period { background: #4ade80; }
.legend-dot.phrase { background: #60a5fa; }
</style>
