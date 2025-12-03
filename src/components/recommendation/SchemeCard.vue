<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  scheme: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['accept', 'modify', 'reject', 'preview'])

const isHovered = ref(false)
const showDetails = ref(false)

const shapeIcons = {
  circle: '●', square: '■', triangle: '▲', diamond: '◆',
  hexagon: '⬡', octagon: '⯃', star4: '✦', star5: '★',
  star6: '✶', note: '♪', clef: '𝄞', rest: '𝄽',
  wave: '〰', spiral: '🌀', burst: '💥', flower: '✿',
  leaf: '🍃', sun: '☀', heart: '♥', arrow: '➤'
}

const animationLabels = {
  flash: '⚡ 闪烁 Flash',
  rotate: '🔄 旋转 Rotate',
  bounce: '⬆ 弹跳 Bounce',
  pulse: '💓 脉冲 Pulse',
  slide: '➡ 滑动 Slide',
  fade: '🌫 淡入淡出 Fade',
  shake: '📳 抖动 Shake',
  grow: '📈 生长 Grow',
  spin: '🔃 旋转 Spin',
  wave: '🌊 波浪 Wave'
}

const arrangementLabels = {
  single: '单个 Single',
  sequence: '序列 Sequence',
  grid: '网格 Grid'
}

const primaryShape = computed(() => props.scheme.shapes?.[0]?.type || 'circle')
const primaryColor = computed(() => props.scheme.colors?.[0] || '#667eea')
const animationLabel = computed(() => animationLabels[props.scheme.animation] || props.scheme.animation)

const relationshipBadge = computed(() => {
  const badges = {
    similar: { label: '相似 Similar', class: 'similar', icon: '🔗' },
    contrasting: { label: '对比 Contrast', class: 'contrasting', icon: '⚡' },
    recapitulated: { label: '再现 Recap', class: 'recap', icon: '🔄' }
  }
  return badges[props.scheme.relationship]
})

const sourceBadge = computed(() => {
  if (props.scheme.fromPreference) {
    return { label: '🧠 学习推荐', class: 'learned' }
  }
  return { label: '📐 规则推荐', class: 'rule-based' }
})

const preferenceScore = computed(() => {
  if (props.scheme.preferenceScore) {
    return Math.round(props.scheme.preferenceScore * 100) / 100
  }
  return null
})

// Emotion features display
const emotionDisplay = computed(() => {
  if (!props.scheme.emotionFeatures) return null
  const ef = props.scheme.emotionFeatures
  return {
    tempo: { fast: '快', moderate: '中', slow: '慢' }[ef.tempo] || ef.tempo,
    dynamics: { strong: '强', moderate: '中', soft: '弱' }[ef.dynamics] || ef.dynamics,
    tension: { tense: '紧张', neutral: '中性', relaxed: '舒缓' }[ef.tension] || ef.tension
  }
})

function getShapeIcon(type) {
  return shapeIcons[type] || '●'
}

function handleMouseEnter() {
  isHovered.value = true
  emit('preview', props.scheme)
}

function handleMouseLeave() {
  isHovered.value = false
}
</script>

<template>
  <div 
    class="scheme-card"
    :class="{ selected: isSelected, hovered: isHovered }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Preview Area -->
    <div class="scheme-preview">
      <div 
        class="shape-preview"
        :class="`animate-${scheme.animation}`"
      >
        <span 
          v-for="(shape, idx) in scheme.shapes?.slice(0, 4)" 
          :key="idx"
          class="preview-shape"
          :style="{ color: scheme.colors?.[idx] || primaryColor }"
        >
          {{ getShapeIcon(shape.type) }}
        </span>
      </div>
      <div class="color-swatches">
        <div 
          v-for="(color, index) in scheme.colors?.slice(0, 4)" 
          :key="index"
          class="color-swatch"
          :style="{ background: color }"
          :title="color"
        ></div>
      </div>
    </div>
    
    <!-- Info Area -->
    <div class="scheme-info">
      <div class="scheme-header">
        <span class="shape-name">{{ primaryShape }}</span>
        <button 
          class="btn-details"
          @click="showDetails = !showDetails"
          :title="showDetails ? '收起详情' : '展开详情'"
        >
          {{ showDetails ? '▲' : '▼' }}
        </button>
      </div>
      
      <div class="scheme-animation">{{ animationLabel }}</div>
      
      <div class="badge-row">
        <div class="source-badge" :class="sourceBadge.class">
          {{ sourceBadge.label }}
        </div>
        <div v-if="relationshipBadge" class="relationship-badge" :class="relationshipBadge.class">
          {{ relationshipBadge.icon }} {{ relationshipBadge.label }}
        </div>
        <div v-if="preferenceScore" class="score-badge" :title="`偏好分数: ${preferenceScore}`">
          ⭐ {{ preferenceScore }}
        </div>
      </div>

      <!-- Expanded Details -->
      <div v-if="showDetails" class="scheme-details">
        <div class="detail-row">
          <span class="detail-label">图形数量:</span>
          <span class="detail-value">{{ scheme.shapes?.length || 0 }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">排列方式:</span>
          <span class="detail-value">{{ arrangementLabels[scheme.arrangement] || scheme.arrangement }}</span>
        </div>
        <div v-if="emotionDisplay" class="emotion-row">
          <span class="emotion-chip tempo">{{ emotionDisplay.tempo }}</span>
          <span class="emotion-chip dynamics">{{ emotionDisplay.dynamics }}</span>
          <span class="emotion-chip tension">{{ emotionDisplay.tension }}</span>
        </div>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="scheme-actions">
      <button class="btn-accept" @click.stop="emit('accept')" title="接受 Accept">
        ✓
      </button>
      <button class="btn-modify" @click.stop="emit('modify')" title="修改 Modify">
        ✎
      </button>
      <button class="btn-reject" @click.stop="emit('reject')" title="拒绝 Reject">
        ✕
      </button>
    </div>
  </div>
</template>

<style scoped>
.scheme-card {
  display: flex;
  align-items: stretch;
  gap: 0.75rem;
  padding: 0.85rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s;
}

.scheme-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.scheme-card.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, #f5f3ff, #eef2ff);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.scheme-card.hovered {
  border-color: #a78bfa;
}

.scheme-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-width: 70px;
  padding: 0.5rem;
  background: #f8fafc;
  border-radius: 8px;
}

.shape-preview {
  display: flex;
  gap: 0.15rem;
  flex-wrap: wrap;
  justify-content: center;
}

.preview-shape {
  font-size: 1.5rem;
  line-height: 1;
}

.color-swatches {
  display: flex;
  gap: 3px;
}

.color-swatch {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  cursor: help;
}

.scheme-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.scheme-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shape-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
  text-transform: capitalize;
}

.btn-details {
  width: 20px;
  height: 20px;
  border: none;
  background: #f1f5f9;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.6rem;
  color: #64748b;
}

.btn-details:hover {
  background: #e2e8f0;
}

.scheme-animation {
  font-size: 0.75rem;
  color: #64748b;
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.25rem;
}

.source-badge,
.relationship-badge,
.score-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  font-size: 0.65rem;
  border-radius: 4px;
  font-weight: 500;
}

.source-badge.learned {
  background: #ede9fe;
  color: #7c3aed;
}

.source-badge.rule-based {
  background: #f1f5f9;
  color: #64748b;
}

.relationship-badge.similar {
  background: #fef3c7;
  color: #d97706;
}

.relationship-badge.contrasting {
  background: #dbeafe;
  color: #2563eb;
}

.relationship-badge.recap {
  background: #dcfce7;
  color: #16a34a;
}

.score-badge {
  background: #fef9c3;
  color: #a16207;
}

.scheme-details {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed #e2e8f0;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.detail-label {
  color: #94a3b8;
}

.detail-value {
  color: #475569;
}

.emotion-row {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.35rem;
}

.emotion-chip {
  padding: 0.1rem 0.35rem;
  font-size: 0.65rem;
  border-radius: 3px;
}

.emotion-chip.tempo {
  background: #dbeafe;
  color: #1e40af;
}

.emotion-chip.dynamics {
  background: #fce7f3;
  color: #9d174d;
}

.emotion-chip.tension {
  background: #d1fae5;
  color: #065f46;
}

.scheme-actions {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  justify-content: center;
}

.scheme-actions button {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.15s;
}

.btn-accept {
  background: #dcfce7;
  color: #16a34a;
}

.btn-accept:hover {
  background: #bbf7d0;
  transform: scale(1.1);
}

.btn-modify {
  background: #fef3c7;
  color: #d97706;
}

.btn-modify:hover {
  background: #fde68a;
  transform: scale(1.1);
}

.btn-reject {
  background: #fee2e2;
  color: #dc2626;
}

.btn-reject:hover {
  background: #fecaca;
  transform: scale(1.1);
}

/* Animations */
.animate-flash .preview-shape { animation: flash 1s infinite; }
.animate-rotate .preview-shape { animation: rotate 2s linear infinite; }
.animate-bounce .preview-shape { animation: bounce 1s infinite; }
.animate-pulse .preview-shape { animation: pulse 1.5s infinite; }
.animate-shake .preview-shape { animation: shake 0.5s infinite; }
.animate-grow .preview-shape { animation: grow 1s infinite; }
.animate-spin .preview-shape { animation: spin 2s linear infinite; }
.animate-wave .preview-shape { animation: wave 1.5s infinite; }
.animate-slide .preview-shape { animation: slide 1.5s infinite; }
.animate-fade .preview-shape { animation: fade 2s infinite; }

@keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
@keyframes grow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.25); } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes wave { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(-4px); } 75% { transform: translateY(4px); } }
@keyframes slide { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(8px); } }
@keyframes fade { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
