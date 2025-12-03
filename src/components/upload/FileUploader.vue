<script setup>
import { ref, inject } from 'vue'
import MusicXMLParser from '../../services/perception/MusicXMLParser.js'
import AudioDecoder from '../../services/perception/AudioDecoder.js'
import FeatureExtractor from '../../services/perception/FeatureExtractor.js'
import StructureAnalyzer from '../../services/logic/StructureAnalyzer.js'
import { useNotifications } from '../../composables/useNotifications.js'

const emit = defineEmits(['analysis-complete'])

const sessionStore = inject('sessionStore')
const structureStore = inject('structureStore')

const { notify } = useNotifications()

// State
const isDragging = ref(false)
const scoreFile = ref(null)
const audioFile = ref(null)
const isProcessing = ref(false)
const progress = ref(0)
const progressStage = ref('')

// Services
const parser = new MusicXMLParser()
const decoder = new AudioDecoder()
const featureExtractor = new FeatureExtractor()
const analyzer = new StructureAnalyzer()

// File handling
function handleDragOver(e) {
  e.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(e) {
  e.preventDefault()
  isDragging.value = false
  
  const files = Array.from(e.dataTransfer.files)
  processFiles(files)
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files)
  processFiles(files)
}

function processFiles(files) {
  files.forEach(file => {
    const name = file.name.toLowerCase()
    
    if (name.endsWith('.musicxml') || name.endsWith('.mxl') || name.endsWith('.xml')) {
      scoreFile.value = file
      sessionStore.setScoreFile(file)
    } else if (name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg')) {
      audioFile.value = file
      sessionStore.setAudioFile(file)
    } else if (name.endsWith('.json')) {
      importSession(file)
    } else {
      notify({
        type: 'error',
        title: 'Unsupported Format',
        message: `File "${file.name}" is not supported. Please use .musicxml, .mxl, .mp3, or .json files.`,
        persistent: true
      })
    }
  })
}

async function importSession(file) {
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    
    sessionStore.importSession(data.session || data)
    if (data.structure) {
      structureStore.importStructure(data.structure)
    }
    
    notify({
      type: 'success',
      title: 'Session Imported',
      message: 'Previous session data has been restored.'
    })
    
    emit('analysis-complete')
  } catch (error) {
    notify({
      type: 'error',
      title: 'Import Failed',
      message: error.message,
      persistent: true
    })
  }
}

async function startAnalysis() {
  if (!scoreFile.value) {
    notify({
      type: 'warning',
      title: 'No Score File',
      message: 'Please upload a MusicXML file first.'
    })
    return
  }

  isProcessing.value = true
  progress.value = 0
  sessionStore.setProcessing(true, 'Starting analysis...')

  try {
    // Step 1: Parse MusicXML
    progressStage.value = 'Parsing MusicXML...'
    progress.value = 10
    
    const parsedScore = await parser.parse(scoreFile.value)
    sessionStore.setParsedScore(parsedScore)
    
    progress.value = 30

    // Step 2: Decode audio (if available)
    if (audioFile.value) {
      progressStage.value = 'Decoding audio...'
      progress.value = 40
      
      const audioBuffer = await decoder.decode(audioFile.value)
      sessionStore.setAudioBuffer(audioBuffer)
      
      // Extract features
      progressStage.value = 'Extracting audio features...'
      progress.value = 50
      
      const features = featureExtractor.extractMeyda(audioBuffer)
      sessionStore.setAudioFeatures(features)
    }

    progress.value = 60

    // Step 3: Analyze structure
    progressStage.value = 'Analyzing musical structure...'
    progress.value = 70
    
    const structureTree = analyzer.buildHierarchy(parsedScore)
    structureStore.setStructureTree(structureTree)
    
    // Get additional analysis data
    const ruleEngine = analyzer.ruleEngine
    const cadences = ruleEngine.detectCadences(parsedScore.notes, parsedScore.keySignature)
    const phrases = ruleEngine.detectPhrases(parsedScore.notes, cadences)
    const periods = ruleEngine.detectPeriods(phrases)
    const formAnalysis = ruleEngine.detectForm(periods)
    
    structureStore.setCadences(cadences)
    structureStore.setPhrases(phrases)
    structureStore.setPeriods(periods)
    structureStore.setFormAnalysis(formAnalysis)

    progress.value = 100
    progressStage.value = 'Analysis complete!'

    sessionStore.setAnalysisComplete(true)
    sessionStore.setProcessing(false)

    notify({
      type: 'success',
      title: 'Analysis Complete',
      message: `Detected ${formAnalysis.formType.replace(/_/g, ' ')} with ${phrases.length} phrases.`
    })

    emit('analysis-complete')

  } catch (error) {
    console.error('Analysis error:', error)
    sessionStore.setAnalysisError(error.message)
    sessionStore.setProcessing(false)
    
    notify({
      type: 'error',
      title: 'Analysis Failed',
      message: error.message,
      persistent: true
    })
  } finally {
    isProcessing.value = false
  }
}

function clearFiles() {
  scoreFile.value = null
  audioFile.value = null
  sessionStore.resetSession()
  structureStore.reset()
}
</script>

<template>
  <div class="file-uploader">
    <div class="upload-header">
      <h2>Upload Music Files</h2>
      <p>Upload a MusicXML score and optionally an MP3 audio file for analysis.</p>
    </div>

    <!-- Drop Zone -->
    <div 
      class="drop-zone"
      :class="{ dragging: isDragging, 'has-files': scoreFile || audioFile }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <div class="drop-content">
        <div class="drop-icon">📂</div>
        <p class="drop-text">
          Drag & drop files here or 
          <label class="file-label">
            browse
            <input 
              type="file" 
              multiple 
              accept=".musicxml,.mxl,.xml,.mp3,.wav,.ogg,.json"
              @change="handleFileSelect"
              :disabled="isProcessing"
            />
          </label>
        </p>
        <p class="drop-hint">Supported: .musicxml, .mxl, .mp3, .json</p>
      </div>
    </div>

    <!-- Selected Files -->
    <div class="selected-files" v-if="scoreFile || audioFile">
      <div class="file-item" v-if="scoreFile">
        <span class="file-icon">🎼</span>
        <span class="file-name">{{ scoreFile.name }}</span>
        <button class="file-remove" @click="scoreFile = null" :disabled="isProcessing">×</button>
      </div>
      <div class="file-item" v-if="audioFile">
        <span class="file-icon">🎵</span>
        <span class="file-name">{{ audioFile.name }}</span>
        <button class="file-remove" @click="audioFile = null" :disabled="isProcessing">×</button>
      </div>
    </div>

    <!-- Progress -->
    <div class="progress-section" v-if="isProcessing">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <p class="progress-text">{{ progressStage }}</p>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button 
        class="btn btn-primary"
        @click="startAnalysis"
        :disabled="!scoreFile || isProcessing"
      >
        <span v-if="isProcessing">⏳ Analyzing...</span>
        <span v-else>🔍 Analyze Structure</span>
      </button>
      <button 
        class="btn btn-secondary"
        @click="clearFiles"
        :disabled="isProcessing || (!scoreFile && !audioFile)"
      >
        Clear Files
      </button>
    </div>

    <!-- Info Cards -->
    <div class="info-cards">
      <div class="info-card">
        <div class="info-icon">🎼</div>
        <h3>MusicXML Score</h3>
        <p>Upload a .musicxml or .mxl file exported from notation software like MuseScore, Finale, or Sibelius.</p>
      </div>
      <div class="info-card">
        <div class="info-icon">🎵</div>
        <h3>Audio Recording</h3>
        <p>Optionally add an MP3 recording for audio-visual synchronization during playback.</p>
      </div>
      <div class="info-card">
        <div class="info-icon">📄</div>
        <h3>Previous Session</h3>
        <p>Import a .json file from a previous session to continue your work.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-uploader {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.upload-header {
  text-align: center;
  margin-bottom: 2rem;
}

.upload-header h2 {
  margin: 0 0 0.5rem;
  color: #1e293b;
}

.upload-header p {
  color: #64748b;
  margin: 0;
}

.drop-zone {
  border: 2px dashed #cbd5e1;
  border-radius: 16px;
  padding: 3rem;
  text-align: center;
  transition: all 0.3s;
  background: #f8fafc;
}

.drop-zone.dragging {
  border-color: #667eea;
  background: #eef2ff;
}

.drop-zone.has-files {
  border-color: #4ade80;
  background: #f0fdf4;
}

.drop-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.drop-text {
  font-size: 1.1rem;
  color: #475569;
  margin: 0 0 0.5rem;
}

.file-label {
  color: #667eea;
  cursor: pointer;
  text-decoration: underline;
}

.file-label input {
  display: none;
}

.drop-hint {
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 0;
}

.selected-files {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.file-icon {
  font-size: 1.2rem;
}

.file-name {
  color: #334155;
  font-size: 0.9rem;
}

.file-remove {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0 0.25rem;
}

.file-remove:hover {
  color: #ef4444;
}

.progress-section {
  margin-top: 1.5rem;
}

.progress-bar {
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width 0.3s;
}

.progress-text {
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-top: 3rem;
}

.info-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.info-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.info-card h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: #1e293b;
}

.info-card p {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .info-cards {
    grid-template-columns: 1fr;
  }
}
</style>
