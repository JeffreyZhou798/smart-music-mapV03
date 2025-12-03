<script setup>
/**
 * PlaybackControls - 简单播放控制
 * 提供基本的播放功能和当前结构显示
 */
import { ref, inject, computed, onUnmounted } from 'vue'

const sessionStore = inject('sessionStore')
const structureStore = inject('structureStore')
const visualStore = inject('visualStore')

// Playback state
const isPlaying = ref(false)
const isPaused = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const tempo = ref(1)
const volume = ref(0.8)
const loopEnabled = ref(false)
const loopStart = ref(0)
const loopEnd = ref(0)

// Audio context
let audioContext = null
let audioSource = null
let gainNode = null
let animationFrame = null
let startTime = 0

const hasAudio = computed(() => sessionStore.audioBuffer !== null)
const parsedScore = computed(() => sessionStore.parsedScore)

const bpm = computed(() => parsedScore.value?.tempo || 120)
const beatsPerMeasure = computed(() => parsedScore.value?.timeSignature?.beats || 4)
const secondsPerMeasure = computed(() => (60 / bpm.value) * beatsPerMeasure.value)

const currentMeasure = computed(() => {
  return Math.floor(currentTime.value / secondsPerMeasure.value) + 1
})

const currentNode = computed(() => {
  return structureStore.getNodeAtMeasure(currentMeasure.value)
})

const currentMapping = computed(() => {
  if (!currentNode.value) return null
  return visualStore.getMapping(currentNode.value.id)
})

const formattedTime = computed(() => formatTime(currentTime.value))
const formattedDuration = computed(() => formatTime(duration.value))

const progressPercent = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

const shapeIcons = {
  circle: '●', square: '■', triangle: '▲', diamond: '◆',
  hexagon: '⬡', octagon: '⯃', star4: '✦', star5: '★',
  star6: '✶', note: '♪', clef: '𝄞', rest: '𝄽',
  wave: '〰', spiral: '🌀', burst: '💥', flower: '✿',
  leaf: '🍃', sun: '☀', heart: '♥', arrow: '➤'
}

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
    const measures = parsedScore.value?.measures || []
    duration.value = measures.length * secondsPerMeasure.value
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
  } else if (!hasAudio.value) {
    await initAudio()
  }

  if (hasAudio.value && sessionStore.audioBuffer && audioContext) {
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    audioSource = audioContext.createBufferSource()
    audioSource.buffer = sessionStore.audioBuffer
    audioSource.playbackRate.value = tempo.value
    audioSource.connect(gainNode)
    
    const offset = isPaused.value ? currentTime.value : 0
    audioSource.start(0, offset)
    startTime = audioContext.currentTime - offset / tempo.value
  } else {
    startTime = performance.now() / 1000 - currentTime.value / tempo.value
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
  
  if (wasPlaying) {
    play()
  }
}

function setTempo(newTempo) {
  tempo.value = newTempo
  if (audioSource) {
    audioSource.playbackRate.value = newTempo
  }
}

function setVolume(newVolume) {
  volume.value = newVolume
  if (gainNode) {
    gainNode.gain.value = newVolume
  }
}

function toggleLoop() {
  loopEnabled.value = !loopEnabled.value
  if (loopEnabled.value) {
    loopStart.value = currentTime.value
    loopEnd.value = Math.min(currentTime.value + 30, duration.value)
  }
}

function startTimeUpdate() {
  const update = () => {
    if (isPlaying.value) {
      if (hasAudio.value && audioContext) {
        currentTime.value = (audioContext.currentTime - startTime) * tempo.value
      } else {
        currentTime.value = (performance.now() / 1000 - startTime) * tempo.value
      }

      // Check for loop
      if (loopEnabled.value && currentTime.value >= loopEnd.value) {
        currentTime.value = loopStart.value
        if (audioSource) {
          audioSource.stop()
          play()
        }
      }

      // Check if finished
      if (currentTime.value >= duration.value) {
        stop()
        return
      }

      // Highlight current structure
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

onUnmounted(() => {
  stop()
  if (audioContext) {
    audioContext.close()
  }
})
</script>

<template>
  <div class="playback-controls">
    <div class="playback-header">
      <h3>▶️ 播放控制 Playback</h3>
      <div class="playback-info" v-if="parsedScore">
        <span class="info-item">{{ bpm }} BPM</span>
        <span class="info-divider">•</span>
        <span class="info-item">小节 {{ currentMeasure }}</span>
      </div>
    </div>

    <!-- Current Structure Display -->
    <div class="current-structure" v-if="currentNode">
      <div class="structure-info">
        <span class="structure-type">{{ currentNode.type }}</span>
        <span class="structure-material">{{ currentNode.material }}</span>
        <span class="structure-measures">m.{{ currentNode.startMeasure }}-{{ currentNode.endMeasure }}</span>
      </div>
      <div class="visual-preview" v-if="currentMapping">
        <div 
          class="preview-shapes"
          :class="`animate-${currentMapping.animation}`"
        >
          <span 
            v-for="(shape, idx) in currentMapping.shapes?.slice(0, 4)" 
            :key="idx"
            class="preview-shape"
            :style="{ color: currentMapping.colors?.[idx] || currentMapping.colors?.[0] }"
          >
            {{ getShapeIcon(shape.type) }}
          </span>
        </div>
      </div>
      <div class="no-visual" v-else>
        <span>未设置视觉方案</span>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="progress-container">
      <div class="progress-bar" @click="seek">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        <div class="progress-handle" :style="{ left: progressPercent + '%' }"></div>
        <div 
          v-if="loopEnabled" 
          class="loop-region"
          :style="{ 
            left: (loopStart / duration * 100) + '%',
            width: ((loopEnd - loopStart) / duration * 100) + '%'
          }"
        ></div>
      </div>
      <div class="time-display">
        <span>{{ formattedTime }}</span>
        <span>{{ formattedDuration }}</span>
      </div>
    </div>

    <!-- Main Controls -->
    <div class="main-controls">
      <button class="btn-control" @click="stop" title="停止 Stop">⏹</button>
      <button 
        class="btn-control btn-play" 
        @click="isPlaying ? pause() : play()"
        :title="isPlaying ? '暂停 Pause' : '播放 Play'"
      >
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
      <button 
        class="btn-control" 
        :class="{ active: loopEnabled }"
        @click="toggleLoop" 
        title="循环 Loop"
      >
        🔁
      </button>
    </div>

    <!-- Secondary Controls -->
    <div class="secondary-controls">
      <div class="control-group">
        <label>速度 Speed</label>
        <div class="tempo-buttons">
          <button 
            v-for="t in [0.5, 0.75, 1, 1.25, 1.5, 2]" 
            :key="t"
            :class="{ active: tempo === t }"
            @click="setTempo(t)"
          >
            {{ t }}x
          </button>
        </div>
      </div>

      <div class="control-group">
        <label>音量 Volume</label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.1" 
          :value="volume"
          @input="setVolume(parseFloat($event.target.value))"
        />
      </div>
    </div>

    <!-- No Audio Message -->
    <div class="no-audio-message" v-if="!hasAudio && parsedScore">
      <p>🎹 未加载音频文件，使用乐谱时间模拟播放</p>
    </div>

    <!-- Tip -->
    <div class="playback-tip">
      <p>💡 提示：使用顶部的"同步播放"按钮可进入三窗口同步播放模式</p>
    </div>
  </div>
</template>

<style scoped>
.playback-controls {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.playback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.playback-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #1e293b;
}

.playback-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #64748b;
}

.info-divider {
  color: #cbd5e1;
}

.current-structure {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, #eef2ff, #faf5ff);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.structure-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.structure-type {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: capitalize;
}

.structure-material {
  font-weight: 600;
  color: #4f46e5;
  font-family: monospace;
  font-size: 1.1rem;
}

.structure-measures {
  font-size: 0.75rem;
  color: #94a3b8;
}

.visual-preview {
  display: flex;
  align-items: center;
}

.preview-shapes {
  display: flex;
  gap: 0.25rem;
}

.preview-shape {
  font-size: 2rem;
}

.no-visual {
  font-size: 0.8rem;
  color: #94a3b8;
}

.progress-container {
  margin-bottom: 1.5rem;
}

.progress-bar {
  position: relative;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  cursor: pointer;
  overflow: visible;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 4px;
  transition: width 0.1s;
}

.progress-handle {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  background: white;
  border: 2px solid #667eea;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.loop-region {
  position: absolute;
  top: 0;
  height: 100%;
  background: rgba(102, 126, 234, 0.3);
  border-radius: 4px;
}

.time-display {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #64748b;
  font-family: monospace;
}

.main-controls {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.btn-control {
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: #f1f5f9;
  cursor: pointer;
  font-size: 1.5rem;
  transition: all 0.2s;
}

.btn-control:hover {
  background: #e2e8f0;
}

.btn-control.btn-play {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: 2rem;
}

.btn-control.btn-play:hover {
  transform: scale(1.05);
}

.btn-control.active {
  background: #667eea;
  color: white;
}

.secondary-controls {
  display: flex;
  gap: 2rem;
}

.control-group {
  flex: 1;
}

.control-group label {
  display: block;
  font-size: 0.8rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.tempo-buttons {
  display: flex;
  gap: 0.35rem;
}

.tempo-buttons button {
  flex: 1;
  padding: 0.4rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
}

.tempo-buttons button:hover {
  background: #f1f5f9;
}

.tempo-buttons button.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.control-group input[type="range"] {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  background: #e2e8f0;
  border-radius: 3px;
  outline: none;
}

.control-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: #667eea;
  border-radius: 50%;
  cursor: pointer;
}

.no-audio-message {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #fef3c7;
  border-radius: 8px;
  text-align: center;
}

.no-audio-message p {
  margin: 0;
  font-size: 0.85rem;
  color: #92400e;
}

.playback-tip {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f0fdf4;
  border-radius: 8px;
  text-align: center;
}

.playback-tip p {
  margin: 0;
  font-size: 0.8rem;
  color: #166534;
}

/* Animations */
.animate-flash .preview-shape { animation: flash 1s infinite; }
.animate-pulse .preview-shape { animation: pulse 1.5s infinite; }
.animate-bounce .preview-shape { animation: bounce 1s infinite; }

@keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
</style>
