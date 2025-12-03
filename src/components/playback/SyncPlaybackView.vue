<script setup>
/**
 * SyncPlaybackView - 综合视觉呈现界面
 * 流程5: 三窗口同步播放 - 乐谱窗口、音频进度条、音乐视觉地图窗口
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSessionStore } from '../../stores/session.js'
import { useStructureStore } from '../../stores/structure.js'
import { useVisualStore } from '../../stores/visual.js'

const sessionStore = useSessionStore()
const structureStore = useStructureStore()
const visualStore = useVisualStore()

const emit = defineEmits(['back'])

// Playback state
const isPlaying = ref(false)
const isPaused = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playbackRate = ref(1)
const volume = ref(0.8)

// Audio context
let audioContext = null
let audioSource = null
let gainNode = null
let animationFrame = null
let startTime = 0
let pausedAt = 0

// Shape icons
const shapeIcons = {
  circle: '●', square: '■', triangle: '▲', diamond: '◆',
  hexagon: '⬡', octagon: '⯃', star4: '✦', star5: '★',
  star6: '✶', note: '♪', clef: '𝄞', rest: '𝄽',
  wave: '〰', spiral: '🌀', burst: '💥', flower: '✿',
  leaf: '🍃', sun: '☀', heart: '♥', arrow: '➤'
}

// Computed
const parsedScore = computed(() => sessionStore.parsedScore)
const hasAudio = computed(() => sessionStore.audioBuffer !== null)
const measures = computed(() => parsedScore.value?.measures || [])

const bpm = computed(() => parsedScore.value?.tempo || 120)
const beatsPerMeasure = computed(() => parsedScore.value?.timeSignature?.beats || 4)
const secondsPerMeasure = computed(() => (60 / bpm.value) * beatsPerMeasure.value)

const currentMeasure = computed(() => {
  return Math.floor(currentTime.value / secondsPerMeasure.value) + 1
})

const currentBeat = computed(() => {
  const measureTime = currentTime.value % secondsPerMeasure.value
  return Math.floor(measureTime / (60 / bpm.value)) + 1
})

const progressPercent = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

const formattedTime = computed(() => formatTime(currentTime.value))
const formattedDuration = computed(() => formatTime(duration.value))

// Get current active node
const currentNode = computed(() => {
  return structureStore.getNodeAtMeasure(currentMeasure.value)
})

// Get current visual mapping
const currentMapping = computed(() => {
  if (!currentNode.value) return null
  return visualStore.getMapping(currentNode.value.id)
})

// Get all phrase nodes with mappings for visual map
const phraseNodes = computed(() => {
  return structureStore.nodesByType.phrase || []
})

// Methods
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getShapeIcon(type) {
  return shapeIcons[type] || '●'
}

async function initAudio() {
  if (!sessionStore.audioBuffer) {
    // Calculate duration from score
    const lastMeasure = measures.value.length
    duration.value = lastMeasure * secondsPerMeasure.value
    return
  }

  audioContext = new (window.AudioContext || window.webkitAudioContext)()
  gainNode = audioContext.createGain()
  gainNode.connect(audioContext.destination)
  gainNode.gain.value = volume.value

  duration.value = sessionStore.audioBuffer.duration
}

async function play() {
  if (!audioContext && hasAudio.value) {
    await initAudio()
  }

  if (hasAudio.value && sessionStore.audioBuffer) {
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    audioSource = audioContext.createBufferSource()
    audioSource.buffer = sessionStore.audioBuffer
    audioSource.playbackRate.value = playbackRate.value
    audioSource.connect(gainNode)
    
    const offset = isPaused.value ? pausedAt : currentTime.value
    audioSource.start(0, offset)
    startTime = audioContext.currentTime - offset / playbackRate.value
  } else {
    startTime = performance.now() / 1000 - currentTime.value / playbackRate.value
  }

  isPlaying.value = true
  isPaused.value = false
  startTimeUpdate()
}

function pause() {
  if (audioSource) {
    audioSource.stop()
    audioSource = null
  }
  
  pausedAt = currentTime.value
  isPlaying.value = false
  isPaused.value = true
  stopTimeUpdate()
}

function stop() {
  if (audioSource) {
    audioSource.stop()
    audioSource = null
  }
  
  currentTime.value = 0
  pausedAt = 0
  isPlaying.value = false
  isPaused.value = false
  stopTimeUpdate()
  structureStore.clearHighlights()
}

function seek(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  const percent = (event.clientX - rect.left) / rect.width
  const newTime = percent * duration.value
  
  const wasPlaying = isPlaying.value
  
  if (wasPlaying) {
    pause()
  }
  
  currentTime.value = newTime
  pausedAt = newTime
  
  if (wasPlaying) {
    play()
  }
}

function setPlaybackRate(rate) {
  playbackRate.value = rate
  if (audioSource) {
    audioSource.playbackRate.value = rate
  }
}

function setVolume(vol) {
  volume.value = vol
  if (gainNode) {
    gainNode.gain.value = vol
  }
}

function startTimeUpdate() {
  const update = () => {
    if (isPlaying.value) {
      if (hasAudio.value && audioContext) {
        currentTime.value = (audioContext.currentTime - startTime) * playbackRate.value
      } else {
        currentTime.value = (performance.now() / 1000 - startTime) * playbackRate.value
      }

      // Check if finished
      if (currentTime.value >= duration.value) {
        stop()
        return
      }

      // Highlight current node
      if (currentNode.value) {
        structureStore.clearHighlights()
        structureStore.highlightNode(currentNode.value.id)
      }

      animationFrame = requestAnimationFrame(update)
    }
  }
  animationFrame = requestAnimationFrame(update)
}

function stopTimeUpdate() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
}

function isNodeActive(node) {
  return currentMeasure.value >= node.startMeasure && currentMeasure.value <= node.endMeasure
}

function isMeasureActive(measureNumber) {
  return measureNumber === currentMeasure.value
}

// 点击乐谱小节跳转
function seekToMeasure(measureNumber) {
  const newTime = (measureNumber - 1) * secondsPerMeasure.value
  seekToTime(newTime)
}

// 点击视觉节点跳转
function seekToNode(node) {
  const newTime = (node.startMeasure - 1) * secondsPerMeasure.value
  seekToTime(newTime)
}

// 跳转到指定时间
function seekToTime(newTime) {
  const wasPlaying = isPlaying.value
  
  if (wasPlaying) {
    pause()
  }
  
  currentTime.value = Math.max(0, Math.min(newTime, duration.value))
  pausedAt = currentTime.value
  
  // 高亮当前节点
  if (currentNode.value) {
    structureStore.clearHighlights()
    structureStore.highlightNode(currentNode.value.id)
  }
  
  if (wasPlaying) {
    play()
  }
}

function goBack() {
  stop()
  emit('back')
}

// Lifecycle
onMounted(() => {
  initAudio()
})

onUnmounted(() => {
  stop()
  if (audioContext) {
    audioContext.close()
  }
})
</script>

<template>
  <div class="sync-playback-view">
    <!-- Header -->
    <div class="playback-header">
      <button class="btn-back" @click="goBack">← 返回 Back</button>
      <h2>🎬 综合视觉呈现 Synchronized Playback</h2>
      <div class="playback-info">
        <span class="info-item">{{ bpm }} BPM</span>
        <span class="info-item">小节 {{ currentMeasure }} / {{ measures.length }}</span>
        <span class="info-item">拍 {{ currentBeat }}</span>
      </div>
    </div>

    <!-- Three-Panel Layout -->
    <div class="three-panel-layout">
      <!-- Panel 1: Score Display -->
      <div class="panel score-panel">
        <div class="panel-header">
          <span class="panel-title">🎼 乐谱 Score</span>
          <span class="panel-subtitle">指针跟随 Cursor Following</span>
        </div>
        <div class="panel-content score-content">
          <div class="measures-container">
            <div 
              v-for="measure in measures" 
              :key="measure.number"
              class="measure-box"
              :class="{ active: isMeasureActive(measure.number) }"
              @click="seekToMeasure(measure.number)"
              :title="`点击跳转到小节 ${measure.number}`"
            >
              <div class="measure-number">{{ measure.number }}</div>
              <div class="measure-notes">
                <div 
                  v-for="note in measure.notes?.slice(0, 6)" 
                  :key="`${note.pitch}-${note.beat}`"
                  class="note-dot"
                  :title="note.pitch"
                ></div>
              </div>
              <div class="measure-cursor" v-if="isMeasureActive(measure.number)">
                <div class="cursor-line" :style="{ left: ((currentBeat - 1) / beatsPerMeasure * 100) + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel 2: Visual Map -->
      <div class="panel visual-panel">
        <div class="panel-header">
          <span class="panel-title">🎨 视觉地图 Visual Map</span>
          <span class="panel-subtitle">动画跟随 Animation Following</span>
        </div>
        <div class="panel-content visual-content">
          <div class="visual-map-container">
            <div 
              v-for="node in phraseNodes" 
              :key="node.id"
              class="visual-node"
              :class="{ active: isNodeActive(node), 'has-mapping': visualStore.getMapping(node.id) }"
              @click="seekToNode(node)"
              :title="`点击跳转到 ${node.material} (小节 ${node.startMeasure}-${node.endMeasure})`"
            >
              <div class="node-label">
                <span class="node-material">{{ node.material }}</span>
                <span class="node-measures">m.{{ node.startMeasure }}-{{ node.endMeasure }}</span>
              </div>
              <div class="node-visual">
                <template v-if="visualStore.getMapping(node.id)">
                  <div 
                    class="visual-shapes"
                    :class="{ 
                      playing: isNodeActive(node),
                      [`animate-${visualStore.getMapping(node.id).animation}`]: isNodeActive(node)
                    }"
                  >
                    <span 
                      v-for="(shape, idx) in visualStore.getMapping(node.id).shapes?.slice(0, 4)" 
                      :key="idx"
                      class="visual-shape"
                      :style="{ color: visualStore.getMapping(node.id).colors?.[idx] || visualStore.getMapping(node.id).colors?.[0] }"
                    >
                      {{ getShapeIcon(shape.type) }}
                    </span>
                  </div>
                </template>
                <template v-else>
                  <div class="no-mapping">-</div>
                </template>
              </div>
            </div>
          </div>

          <!-- Current Visual Highlight -->
          <div class="current-visual" v-if="currentMapping">
            <div class="current-label">当前 Current</div>
            <div 
              class="current-shapes"
              :class="`animate-${currentMapping.animation}`"
            >
              <span 
                v-for="(shape, idx) in currentMapping.shapes" 
                :key="idx"
                class="current-shape"
                :style="{ color: currentMapping.colors?.[idx] || currentMapping.colors?.[0] }"
              >
                {{ getShapeIcon(shape.type) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Audio Progress Bar -->
    <div class="audio-controls">
      <div class="progress-section">
        <span class="time-display">{{ formattedTime }}</span>
        <div class="progress-bar" @click="seek">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            <div class="progress-handle" :style="{ left: progressPercent + '%' }"></div>
          </div>
          <!-- Structure markers -->
          <div class="structure-markers">
            <div 
              v-for="node in phraseNodes" 
              :key="node.id"
              class="structure-marker"
              :class="{ active: isNodeActive(node), 'has-mapping': visualStore.getMapping(node.id) }"
              :style="{ 
                left: ((node.startMeasure - 1) * secondsPerMeasure / duration * 100) + '%',
                width: ((node.endMeasure - node.startMeasure + 1) * secondsPerMeasure / duration * 100) + '%'
              }"
              :title="`点击跳转: ${node.material} (小节 ${node.startMeasure}-${node.endMeasure})`"
              @click.stop="seekToNode(node)"
            ></div>
          </div>
        </div>
        <span class="time-display">{{ formattedDuration }}</span>
      </div>

      <div class="control-section">
        <button class="btn-control" @click="stop" title="停止 Stop">⏹</button>
        <button class="btn-control btn-play" @click="isPlaying ? pause() : play()" :title="isPlaying ? '暂停 Pause' : '播放 Play'">
          {{ isPlaying ? '⏸' : '▶' }}
        </button>
        
        <div class="speed-controls">
          <span class="control-label">速度</span>
          <button v-for="rate in [0.5, 0.75, 1, 1.25, 1.5]" :key="rate" :class="{ active: playbackRate === rate }" @click="setPlaybackRate(rate)">
            {{ rate }}x
          </button>
        </div>

        <div class="volume-control">
          <span class="control-label">🔊</span>
          <input type="range" min="0" max="1" step="0.1" :value="volume" @input="setVolume(parseFloat($event.target.value))" />
        </div>
      </div>
    </div>

    <!-- No Audio Warning -->
    <div class="no-audio-warning" v-if="!hasAudio">
      <span>⚠️ 未加载音频文件，使用乐谱时间模拟播放</span>
    </div>
  </div>
</template>


<style scoped>
.sync-playback-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0f172a;
  color: white;
  overflow: hidden;
}

.playback-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-back {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-back:hover { background: rgba(255, 255, 255, 0.2); }

.playback-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.playback-info {
  display: flex;
  gap: 1.5rem;
}

.info-item {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

/* Three Panel Layout */
.three-panel-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  overflow: hidden;
}

.panel {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-title {
  font-weight: 600;
  font-size: 0.95rem;
}

.panel-subtitle {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.panel-content {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}

/* Score Panel */
.score-content {
  background: rgba(255, 255, 255, 0.02);
}

.measures-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.5rem;
}

.measure-box {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.5rem;
  min-height: 50px;
  transition: all 0.2s;
  cursor: pointer;
}

.measure-box:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.02);
}

.measure-box.active {
  background: rgba(102, 126, 234, 0.3);
  border-color: #667eea;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.4);
}

.measure-number {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);
}

.measure-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding-top: 0.75rem;
}

.note-dot {
  width: 5px;
  height: 5px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
}

.measure-cursor {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.cursor-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #f59e0b;
  box-shadow: 0 0 10px #f59e0b;
  transition: left 0.1s linear;
}

/* Visual Panel */
.visual-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.visual-map-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.75rem;
  flex: 1;
}

.visual-node {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.5rem;
  transition: all 0.3s;
  cursor: pointer;
}

.visual-node:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: rgba(139, 92, 246, 0.5);
  transform: scale(1.03);
}

.visual-node.active {
  background: rgba(102, 126, 234, 0.2);
  border-color: #667eea;
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.4);
}

.visual-node.has-mapping {
  background: rgba(139, 92, 246, 0.1);
}

.node-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.node-material {
  font-weight: 600;
  color: #a78bfa;
  font-family: monospace;
}

.node-measures {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);
}

.node-visual {
  display: flex;
  justify-content: center;
  min-height: 40px;
  align-items: center;
}

.visual-shapes {
  display: flex;
  gap: 0.25rem;
}

.visual-shape {
  font-size: 1.5rem;
  transition: all 0.3s;
}

.visual-shapes.playing .visual-shape {
  filter: drop-shadow(0 0 8px currentColor);
}

.no-mapping {
  color: rgba(255, 255, 255, 0.2);
  font-size: 1.5rem;
}

/* Current Visual Highlight */
.current-visual {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(139, 92, 246, 0.2));
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.current-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.5rem;
}

.current-shapes {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.current-shape {
  font-size: 3rem;
  filter: drop-shadow(0 0 15px currentColor);
}

/* Audio Controls */
.audio-controls {
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.time-display {
  font-size: 0.85rem;
  font-family: monospace;
  color: rgba(255, 255, 255, 0.7);
  min-width: 50px;
}

.progress-bar {
  flex: 1;
  position: relative;
  cursor: pointer;
  padding: 0.5rem 0;
}

.progress-track {
  position: relative;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #a78bfa);
  border-radius: 3px;
  transition: width 0.1s linear;
}

.progress-handle {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.structure-markers {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  height: 8px;
  margin-top: 4px;
}

.structure-marker {
  position: absolute;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  transition: all 0.2s;
  cursor: pointer;
}

.structure-marker:hover {
  background: rgba(139, 92, 246, 0.5);
  transform: scaleY(1.3);
}

.structure-marker.has-mapping { background: rgba(139, 92, 246, 0.3); }
.structure-marker.active { background: rgba(102, 126, 234, 0.6); box-shadow: 0 0 10px rgba(102, 126, 234, 0.5); }

.control-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}

.btn-control {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  font-size: 1.25rem;
  transition: all 0.2s;
}

.btn-control:hover { background: rgba(255, 255, 255, 0.2); }

.btn-control.btn-play {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  font-size: 1.5rem;
}

.btn-control.btn-play:hover { transform: scale(1.05); box-shadow: 0 0 20px rgba(102, 126, 234, 0.5); }

.speed-controls, .volume-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.speed-controls button {
  padding: 0.3rem 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

.speed-controls button:hover { background: rgba(255, 255, 255, 0.1); }
.speed-controls button.active { background: #667eea; border-color: #667eea; color: white; }

.volume-control input[type="range"] {
  width: 80px;
  height: 4px;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.volume-control input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
}

.no-audio-warning {
  padding: 0.5rem 1rem;
  background: rgba(245, 158, 11, 0.2);
  text-align: center;
  font-size: 0.8rem;
  color: #fbbf24;
}

/* Animations */
.animate-flash .visual-shape, .animate-flash .current-shape { animation: flash 0.5s infinite; }
.animate-rotate .visual-shape, .animate-rotate .current-shape { animation: rotate 2s linear infinite; }
.animate-bounce .visual-shape, .animate-bounce .current-shape { animation: bounce 0.5s infinite; }
.animate-pulse .visual-shape, .animate-pulse .current-shape { animation: pulse 0.8s infinite; }
.animate-shake .visual-shape, .animate-shake .current-shape { animation: shake 0.3s infinite; }
.animate-grow .visual-shape, .animate-grow .current-shape { animation: grow 0.8s infinite; }
.animate-spin .visual-shape, .animate-spin .current-shape { animation: spin 1s linear infinite; }
.animate-wave .visual-shape, .animate-wave .current-shape { animation: wave 0.8s infinite; }
.animate-slide .visual-shape, .animate-slide .current-shape { animation: slide 1s infinite; }
.animate-fade .visual-shape, .animate-fade .current-shape { animation: fade 1s infinite; }

@keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
@keyframes grow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3); } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes wave { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(-8px); } 75% { transform: translateY(8px); } }
@keyframes slide { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(15px); } }
@keyframes fade { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
</style>
