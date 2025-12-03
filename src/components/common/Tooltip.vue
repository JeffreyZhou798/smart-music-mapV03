<script setup>
import { computed } from 'vue'
import { STRUCTURE_LABELS, CADENCE_LABELS, FORM_LABELS } from '../../types/index.js'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  visible: {
    type: Boolean,
    default: false
  }
})

const structureLabel = computed(() => {
  const label = STRUCTURE_LABELS[props.node.type]
  return label ? `${label.en} (${label.zh})` : props.node.type
})

const cadenceLabel = computed(() => {
  if (!props.node.features?.cadence) return null
  const label = CADENCE_LABELS[props.node.features.cadence.type]
  return label ? `${label.en} (${label.zh})` : props.node.features.cadence.type
})

const confidencePercent = computed(() => {
  // Use tooltipData if available, otherwise fall back to node.confidence
  const confidence = props.node.tooltipData?.confidence ?? props.node.confidence ?? 0
  return Math.round(confidence * 100)
})

const confidenceClass = computed(() => {
  const c = props.node.tooltipData?.confidence ?? props.node.confidence ?? 0
  if (c >= 0.8) return 'high'
  if (c >= 0.6) return 'medium'
  if (c >= 0.4) return 'low'
  return 'very-low'
})

// Get uncertainty level for display
const uncertaintyLevel = computed(() => {
  return props.node.tooltipData?.uncertaintyLevel || 
         props.node.visualStyle?.uncertaintyLevel || 
         'medium'
})

// Get used features from tooltipData or generate from node
const usedFeatures = computed(() => {
  // First check tooltipData
  if (props.node.tooltipData?.usedFeatures?.length > 0) {
    return props.node.tooltipData.usedFeatures
  }
  
  // Fall back to generating from node features
  const features = []
  if (props.node.features?.cadence) features.push('Cadence Detection')
  if (props.node.features?.periodType) features.push('Period Classification')
  if (props.node.features?.closure) features.push('Closure Analysis')
  if (props.node.features?.function) features.push('Structural Function')
  return features.length > 0 ? features : ['Rule-based Analysis']
})

// Get similarity scores if available
const similarityScores = computed(() => {
  return props.node.tooltipData?.similarityScores || []
})

// Model version from tooltipData or default
const modelVersion = computed(() => {
  return props.node.tooltipData?.modelVersion 
    ? `RuleEngine v${props.node.tooltipData.modelVersion}`
    : 'RuleEngine v1.0.0'
})

// Analysis method
const analysisMethod = computed(() => {
  return props.node.tooltipData?.analysisMethod || 'Rule-based Analysis'
})
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="visible"
      class="tooltip"
      :style="{ 
        left: position.x + 'px', 
        top: position.y + 'px' 
      }"
    >
      <div class="tooltip-header">
        <span class="tooltip-title">{{ structureLabel }}</span>
        <span 
          class="confidence-badge"
          :class="confidenceClass"
        >
          {{ confidencePercent }}%
        </span>
      </div>

      <div class="tooltip-body">
        <div class="tooltip-row">
          <span class="label">Material:</span>
          <span class="value material">{{ node.material }}</span>
        </div>

        <div class="tooltip-row">
          <span class="label">Measures:</span>
          <span class="value">{{ node.startMeasure }} - {{ node.endMeasure }}</span>
        </div>

        <div class="tooltip-row" v-if="cadenceLabel">
          <span class="label">Cadence:</span>
          <span class="value">{{ cadenceLabel }}</span>
        </div>

        <div class="tooltip-row" v-if="node.features?.periodType">
          <span class="label">Period Type:</span>
          <span class="value">{{ node.features.periodType }}</span>
        </div>

        <div class="tooltip-row" v-if="node.features?.closure">
          <span class="label">Closure:</span>
          <span class="value">{{ node.features.closure }}</span>
        </div>

        <!-- Similarity Scores Section -->
        <div class="tooltip-section" v-if="similarityScores.length > 0">
          <span class="section-title">Similarity Scores:</span>
          <div class="similarity-list">
            <div 
              v-for="score in similarityScores" 
              :key="score.label"
              class="similarity-item"
            >
              <span class="similarity-label">{{ score.label }}:</span>
              <span class="similarity-value">{{ score.value }}</span>
            </div>
          </div>
        </div>

        <div class="tooltip-section">
          <span class="section-title">Used Features:</span>
          <ul class="feature-list">
            <li v-for="feature in usedFeatures" :key="feature">{{ feature }}</li>
          </ul>
        </div>

        <!-- Uncertainty Indicator -->
        <div class="tooltip-row" v-if="uncertaintyLevel !== 'low'">
          <span class="label">Uncertainty:</span>
          <span 
            class="uncertainty-badge"
            :class="uncertaintyLevel"
          >
            {{ uncertaintyLevel.replace('_', ' ') }}
          </span>
        </div>

        <div class="tooltip-footer">
          <span class="model-info">{{ modelVersion }}</span>
          <span class="analysis-method">{{ analysisMethod }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tooltip {
  position: fixed;
  z-index: 1000;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 250px;
  max-width: 320px;
  pointer-events: none;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 10px 10px 0 0;
  color: white;
}

.tooltip-title {
  font-weight: 600;
  font-size: 0.95rem;
}

.confidence-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.confidence-badge.high {
  background: rgba(74, 222, 128, 0.3);
  color: #dcfce7;
}

.confidence-badge.medium {
  background: rgba(251, 191, 36, 0.3);
  color: #fef3c7;
}

.confidence-badge.low {
  background: rgba(248, 113, 113, 0.3);
  color: #fee2e2;
}

.tooltip-body {
  padding: 0.75rem 1rem;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.tooltip-row:last-child {
  border-bottom: none;
}

.label {
  font-size: 0.8rem;
  color: #64748b;
}

.value {
  font-size: 0.85rem;
  color: #334155;
  font-weight: 500;
}

.value.material {
  font-family: monospace;
  background: #e0e7ff;
  color: #4338ca;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.tooltip-section {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e2e8f0;
}

.section-title {
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  display: block;
  margin-bottom: 0.35rem;
}

.feature-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.8rem;
  color: #475569;
}

.feature-list li {
  margin: 0.2rem 0;
}

.similarity-list {
  margin-top: 0.35rem;
}

.similarity-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  padding: 0.2rem 0;
}

.similarity-label {
  color: #64748b;
}

.similarity-value {
  color: #4338ca;
  font-weight: 500;
}

.uncertainty-badge {
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.uncertainty-badge.low {
  background: #dcfce7;
  color: #166534;
}

.uncertainty-badge.medium {
  background: #fef3c7;
  color: #92400e;
}

.uncertainty-badge.high {
  background: #fed7aa;
  color: #c2410c;
}

.uncertainty-badge.very_high,
.uncertainty-badge.very-high {
  background: #fee2e2;
  color: #dc2626;
}

.tooltip-footer {
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.model-info {
  font-size: 0.7rem;
  color: #94a3b8;
}

.analysis-method {
  font-size: 0.65rem;
  color: #cbd5e1;
}

/* Confidence badge for very low */
.confidence-badge.very-low {
  background: rgba(248, 113, 113, 0.4);
  color: #fecaca;
}
</style>
