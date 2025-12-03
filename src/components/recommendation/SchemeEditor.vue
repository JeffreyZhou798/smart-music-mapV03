<script setup>
/**
 * SchemeEditor - 视觉方案自定义编辑器
 * 允许用户自定义修改图案、颜色、动画等
 */
import { ref, computed, watch } from 'vue'
import { SHAPE_LIBRARY, COLOR_PALETTE, ANIMATIONS } from '../../types/index.js'

const props = defineProps({
  scheme: {
    type: Object,
    default: null
  },
  nodeType: {
    type: String,
    default: 'phrase'
  }
})

const emit = defineEmits(['save', 'cancel', 'preview'])

// Local editing state
const editingScheme = ref({
  shapes: [],
  colors: [],
  animation: 'pulse',
  arrangement: 'single'
})

// Shape icons mapping
const shapeIcons = {
  circle: '●', square: '■', triangle: '▲', diamond: '◆',
  hexagon: '⬡', octagon: '⯃', star4: '✦', star5: '★',
  star6: '✶', note: '♪', clef: '𝄞', rest: '𝄽',
  wave: '〰', spiral: '🌀', burst: '💥', flower: '✿',
  leaf: '🍃', sun: '☀', heart: '♥', arrow: '➤'
}

const animationLabels = {
  flash: { icon: '⚡', label: '闪烁', en: 'Flash' },
  rotate: { icon: '🔄', label: '旋转', en: 'Rotate' },
  bounce: { icon: '⬆', label: '弹跳', en: 'Bounce' },
  pulse: { icon: '💓', label: '脉冲', en: 'Pulse' },
  slide: { icon: '➡', label: '滑动', en: 'Slide' },
  fade: { icon: '🌫', label: '淡入淡出', en: 'Fade' },
  shake: { icon: '📳', label: '抖动', en: 'Shake' },
  grow: { icon: '📈', label: '生长', en: 'Grow' },
  spin: { icon: '🔃', label: '旋转', en: 'Spin' },
  wave: { icon: '🌊', label: '波浪', en: 'Wave' }
}

const arrangementOptions = [
  { value: 'single', label: '单个', en: 'Single', icon: '◯' },
  { value: 'sequence', label: '序列', en: 'Sequence', icon: '◯◯◯' },
  { value: 'grid', label: '网格', en: 'Grid', icon: '⊞' }
]

const sizeOptions = [
  { value: 'small', label: '小', en: 'Small' },
  { value: 'medium', label: '中', en: 'Medium' },
  { value: 'large', label: '大', en: 'Large' }
]

// Initialize from props
watch(() => props.scheme, (newScheme) => {
  if (newScheme) {
    editingScheme.value = {
      shapes: [...(newScheme.shapes || [])],
      colors: [...(newScheme.colors || [])],
      animation: newScheme.animation || 'pulse',
      arrangement: newScheme.arrangement || 'single'
    }
  } else {
    resetToDefault()
  }
}, { immediate: true })

// Computed
const allColors = computed(() => [...COLOR_PALETTE.warm, ...COLOR_PALETTE.cool])
const maxShapes = computed(() => {
  const limits = { motive: 1, subphrase: 2, phrase: 4, period: 6, theme: 8, section: 10 }
  return limits[props.nodeType] || 4
})

// Methods
function resetToDefault() {
  editingScheme.value = {
    shapes: [{ type: 'circle', size: 'medium' }],
    colors: [COLOR_PALETTE.warm[0]],
    animation: 'pulse',
    arrangement: 'single'
  }
}

function addShape(shapeType) {
  if (editingScheme.value.shapes.length < maxShapes.value) {
    editingScheme.value.shapes.push({ type: shapeType, size: 'medium' })
    emitPreview()
  }
}

function removeShape(index) {
  if (editingScheme.value.shapes.length > 1) {
    editingScheme.value.shapes.splice(index, 1)
    emitPreview()
  }
}

function updateShapeType(index, type) {
  editingScheme.value.shapes[index].type = type
  emitPreview()
}

function updateShapeSize(index, size) {
  editingScheme.value.shapes[index].size = size
  emitPreview()
}

function addColor(color) {
  if (editingScheme.value.colors.length < editingScheme.value.shapes.length) {
    editingScheme.value.colors.push(color)
  } else {
    // Replace last color
    editingScheme.value.colors[editingScheme.value.colors.length - 1] = color
  }
  emitPreview()
}

function removeColor(index) {
  if (editingScheme.value.colors.length > 1) {
    editingScheme.value.colors.splice(index, 1)
    emitPreview()
  }
}

function setAnimation(anim) {
  editingScheme.value.animation = anim
  emitPreview()
}

function setArrangement(arr) {
  editingScheme.value.arrangement = arr
  emitPreview()
}

function emitPreview() {
  emit('preview', { ...editingScheme.value })
}

function handleSave() {
  emit('save', {
    id: props.scheme?.id || 'custom-' + Date.now(),
    ...editingScheme.value,
    userModified: true
  })
}

function handleCancel() {
  emit('cancel')
}

function getShapeIcon(type) {
  return shapeIcons[type] || '●'
}
</script>

<template>
  <div class="scheme-editor">
    <div class="editor-header">
      <h4>🎨 自定义视觉方案 Custom Visual Scheme</h4>
      <button class="btn-reset" @click="resetToDefault" title="重置 Reset">
        🔄
      </button>
    </div>

    <!-- Live Preview -->
    <div class="live-preview">
      <div class="preview-label">预览 Preview</div>
      <div 
        class="preview-canvas"
        :class="`animate-${editingScheme.animation}`"
      >
        <span 
          v-for="(shape, idx) in editingScheme.shapes" 
          :key="idx"
          class="preview-shape"
          :class="shape.size"
          :style="{ color: editingScheme.colors[idx] || editingScheme.colors[0] || '#667eea' }"
        >
          {{ getShapeIcon(shape.type) }}
        </span>
      </div>
    </div>

    <!-- Shape Selection -->
    <div class="editor-section">
      <div class="section-header">
        <span class="section-title">图形 Shapes</span>
        <span class="section-hint">{{ editingScheme.shapes.length }}/{{ maxShapes }} 个</span>
      </div>
      
      <!-- Current shapes -->
      <div class="current-shapes">
        <div 
          v-for="(shape, idx) in editingScheme.shapes" 
          :key="idx"
          class="shape-item"
        >
          <span class="shape-icon" :style="{ color: editingScheme.colors[idx] || '#667eea' }">
            {{ getShapeIcon(shape.type) }}
          </span>
          <select 
            :value="shape.size" 
            @change="updateShapeSize(idx, $event.target.value)"
            class="size-select"
          >
            <option v-for="size in sizeOptions" :key="size.value" :value="size.value">
              {{ size.label }}
            </option>
          </select>
          <button 
            class="btn-remove" 
            @click="removeShape(idx)"
            :disabled="editingScheme.shapes.length <= 1"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Shape library -->
      <div class="shape-library">
        <button 
          v-for="shape in SHAPE_LIBRARY" 
          :key="shape.type"
          class="shape-btn"
          :class="{ active: editingScheme.shapes.some(s => s.type === shape.type) }"
          @click="addShape(shape.type)"
          :disabled="editingScheme.shapes.length >= maxShapes"
          :title="shape.type"
        >
          {{ getShapeIcon(shape.type) }}
        </button>
      </div>
    </div>

    <!-- Color Selection -->
    <div class="editor-section">
      <div class="section-header">
        <span class="section-title">颜色 Colors</span>
        <span class="section-hint">暖色/冷色 Warm/Cool</span>
      </div>
      
      <!-- Current colors -->
      <div class="current-colors">
        <div 
          v-for="(color, idx) in editingScheme.colors" 
          :key="idx"
          class="color-item"
        >
          <div class="color-preview" :style="{ background: color }"></div>
          <span class="color-code">{{ color }}</span>
          <button 
            class="btn-remove" 
            @click="removeColor(idx)"
            :disabled="editingScheme.colors.length <= 1"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Color palette -->
      <div class="color-palette">
        <div class="palette-group">
          <span class="palette-label">暖 Warm</span>
          <div class="palette-colors">
            <button 
              v-for="color in COLOR_PALETTE.warm" 
              :key="color"
              class="color-btn"
              :style="{ background: color }"
              :class="{ active: editingScheme.colors.includes(color) }"
              @click="addColor(color)"
            ></button>
          </div>
        </div>
        <div class="palette-group">
          <span class="palette-label">冷 Cool</span>
          <div class="palette-colors">
            <button 
              v-for="color in COLOR_PALETTE.cool" 
              :key="color"
              class="color-btn"
              :style="{ background: color }"
              :class="{ active: editingScheme.colors.includes(color) }"
              @click="addColor(color)"
            ></button>
          </div>
        </div>
      </div>
    </div>

    <!-- Animation Selection -->
    <div class="editor-section">
      <div class="section-header">
        <span class="section-title">动画 Animation</span>
      </div>
      <div class="animation-grid">
        <button 
          v-for="(info, anim) in animationLabels" 
          :key="anim"
          class="anim-btn"
          :class="{ active: editingScheme.animation === anim }"
          @click="setAnimation(anim)"
        >
          <span class="anim-icon">{{ info.icon }}</span>
          <span class="anim-label">{{ info.label }}</span>
        </button>
      </div>
    </div>

    <!-- Arrangement Selection -->
    <div class="editor-section">
      <div class="section-header">
        <span class="section-title">排列方式 Arrangement</span>
      </div>
      <div class="arrangement-options">
        <button 
          v-for="opt in arrangementOptions" 
          :key="opt.value"
          class="arrangement-btn"
          :class="{ active: editingScheme.arrangement === opt.value }"
          @click="setArrangement(opt.value)"
        >
          <span class="arr-icon">{{ opt.icon }}</span>
          <span class="arr-label">{{ opt.label }}</span>
        </button>
      </div>
    </div>

    <!-- Actions -->
    <div class="editor-actions">
      <button class="btn-cancel" @click="handleCancel">
        取消 Cancel
      </button>
      <button class="btn-save" @click="handleSave">
        ✓ 保存 Save
      </button>
    </div>
  </div>
</template>

<style scoped>
.scheme-editor {
  background: white;
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
  min-height: 400px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.editor-header h4 {
  margin: 0;
  font-size: 1rem;
  color: #1e293b;
}

.btn-reset {
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-reset:hover {
  background: #f1f5f9;
}

/* Live Preview */
.live-preview {
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1rem;
  text-align: center;
}

.preview-label {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.preview-canvas {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  min-height: 60px;
}

.preview-shape {
  line-height: 1;
}

.preview-shape.small { font-size: 1.5rem; }
.preview-shape.medium { font-size: 2.5rem; }
.preview-shape.large { font-size: 3.5rem; }

/* Editor Sections */
.editor-section {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px dashed #e2e8f0;
}

.editor-section:last-of-type {
  border-bottom: none;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.section-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}

.section-hint {
  font-size: 0.75rem;
  color: #94a3b8;
}

/* Current Shapes */
.current-shapes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.shape-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.shape-icon {
  font-size: 1.2rem;
}

.size-select {
  padding: 0.15rem 0.3rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 0.7rem;
  background: white;
}

.btn-remove {
  width: 18px;
  height: 18px;
  border: none;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.7rem;
}

.btn-remove:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Shape Library */
.shape-library {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.shape-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.15s;
}

.shape-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.shape-btn.active {
  border-color: #667eea;
  background: #eef2ff;
}

.shape-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Current Colors */
.current-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.color-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.4rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.color-preview {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.1);
}

.color-code {
  font-size: 0.7rem;
  font-family: monospace;
  color: #64748b;
}

/* Color Palette */
.color-palette {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.palette-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.palette-label {
  font-size: 0.7rem;
  color: #94a3b8;
  min-width: 40px;
}

.palette-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.color-btn {
  width: 24px;
  height: 24px;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.color-btn:hover {
  transform: scale(1.15);
}

.color-btn.active {
  border-color: #1e293b;
  box-shadow: 0 0 0 2px white;
}

/* Animation Grid */
.animation-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.4rem;
}

.anim-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.5rem 0.25rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.anim-btn:hover {
  background: #f1f5f9;
}

.anim-btn.active {
  border-color: #667eea;
  background: #eef2ff;
}

.anim-icon {
  font-size: 1rem;
}

.anim-label {
  font-size: 0.65rem;
  color: #64748b;
}

/* Arrangement Options */
.arrangement-options {
  display: flex;
  gap: 0.5rem;
}

.arrangement-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.6rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.arrangement-btn:hover {
  background: #f1f5f9;
}

.arrangement-btn.active {
  border-color: #667eea;
  background: #eef2ff;
}

.arr-icon {
  font-size: 1rem;
  color: #64748b;
}

.arr-label {
  font-size: 0.75rem;
  color: #475569;
}

/* Actions */
.editor-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.btn-cancel, .btn-save {
  flex: 1;
  padding: 0.7rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f1f5f9;
  color: #475569;
}

.btn-cancel:hover {
  background: #e2e8f0;
}

.btn-save {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
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
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
@keyframes grow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3); } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes wave { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(-5px); } 75% { transform: translateY(5px); } }
@keyframes slide { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(10px); } }
@keyframes fade { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
