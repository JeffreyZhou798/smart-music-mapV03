<script setup>
/**
 * ResizableSplit - 可拖动调整大小的分割面板
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  direction: {
    type: String,
    default: 'horizontal' // 'horizontal' | 'vertical'
  },
  initialSize: {
    type: Number,
    default: 50 // percentage
  },
  minSize: {
    type: Number,
    default: 20 // percentage
  },
  maxSize: {
    type: Number,
    default: 80 // percentage
  }
})

const containerRef = ref(null)
const isDragging = ref(false)
const splitPosition = ref(props.initialSize)

const isHorizontal = computed(() => props.direction === 'horizontal')

const firstPanelStyle = computed(() => {
  if (isHorizontal.value) {
    return { width: `${splitPosition.value}%` }
  }
  return { height: `${splitPosition.value}%` }
})

const secondPanelStyle = computed(() => {
  if (isHorizontal.value) {
    return { width: `${100 - splitPosition.value}%` }
  }
  return { height: `${100 - splitPosition.value}%` }
})

function startDrag(e) {
  isDragging.value = true
  e.preventDefault()
}

function onDrag(e) {
  if (!isDragging.value || !containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  let newPosition

  if (isHorizontal.value) {
    const x = e.clientX - rect.left
    newPosition = (x / rect.width) * 100
  } else {
    const y = e.clientY - rect.top
    newPosition = (y / rect.height) * 100
  }

  // Clamp to min/max
  newPosition = Math.max(props.minSize, Math.min(props.maxSize, newPosition))
  splitPosition.value = newPosition
}

function stopDrag() {
  isDragging.value = false
}

// Touch support
function onTouchMove(e) {
  if (!isDragging.value || !containerRef.value) return
  
  const touch = e.touches[0]
  const rect = containerRef.value.getBoundingClientRect()
  let newPosition

  if (isHorizontal.value) {
    const x = touch.clientX - rect.left
    newPosition = (x / rect.width) * 100
  } else {
    const y = touch.clientY - rect.top
    newPosition = (y / rect.height) * 100
  }

  newPosition = Math.max(props.minSize, Math.min(props.maxSize, newPosition))
  splitPosition.value = newPosition
}

onMounted(() => {
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onTouchMove)
  document.addEventListener('touchend', stopDrag)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', stopDrag)
})
</script>

<template>
  <div 
    ref="containerRef"
    class="resizable-split"
    :class="{ horizontal: isHorizontal, vertical: !isHorizontal, dragging: isDragging }"
  >
    <div class="split-panel first-panel" :style="firstPanelStyle">
      <slot name="first"></slot>
    </div>
    
    <div 
      class="split-divider"
      @mousedown="startDrag"
      @touchstart="startDrag"
    >
      <div class="divider-handle">
        <span class="handle-dots">⋮⋮</span>
      </div>
    </div>
    
    <div class="split-panel second-panel" :style="secondPanelStyle">
      <slot name="second"></slot>
    </div>
  </div>
</template>

<style scoped>
.resizable-split {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.resizable-split.horizontal {
  flex-direction: row;
}

.resizable-split.vertical {
  flex-direction: column;
}

.split-panel {
  overflow: auto;
  min-width: 0;
  min-height: 0;
}

.split-divider {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e2e8f0;
  transition: background 0.2s;
  z-index: 10;
}

.horizontal .split-divider {
  width: 8px;
  cursor: col-resize;
}

.vertical .split-divider {
  height: 8px;
  cursor: row-resize;
}

.split-divider:hover,
.dragging .split-divider {
  background: #667eea;
}

.divider-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 0.8rem;
  user-select: none;
}

.split-divider:hover .divider-handle,
.dragging .divider-handle {
  color: white;
}

.horizontal .handle-dots {
  writing-mode: vertical-rl;
}

.dragging {
  cursor: col-resize;
  user-select: none;
}

.dragging.vertical {
  cursor: row-resize;
}
</style>
