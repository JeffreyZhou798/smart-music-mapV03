/**
 * Session Store - Pinia
 * Manages session state, file data, and analysis results
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSessionStore = defineStore('session', () => {
  // State
  const sessionId = ref(generateSessionId())
  const createdAt = ref(new Date())
  
  // File data
  const scoreFile = ref(null)
  const audioFile = ref(null)
  const parsedScore = ref(null)
  const audioBuffer = ref(null)
  
  // Analysis results
  const analysisComplete = ref(false)
  const analysisProgress = ref(0)
  const analysisError = ref(null)
  
  // Audio features
  const audioFeatures = ref(null)
  
  // Alignment
  const alignment = ref(null)
  
  // Processing state
  const isProcessing = ref(false)
  const processingStage = ref('')

  // Computed
  const hasScore = computed(() => parsedScore.value !== null)
  const hasAudio = computed(() => audioBuffer.value !== null)
  const isReady = computed(() => hasScore.value && analysisComplete.value)

  // Actions
  function setScoreFile(file) {
    scoreFile.value = file
  }

  function setAudioFile(file) {
    audioFile.value = file
  }

  function setParsedScore(score) {
    parsedScore.value = score
  }

  function setAudioBuffer(buffer) {
    audioBuffer.value = buffer
  }

  function setAudioFeatures(features) {
    audioFeatures.value = features
  }

  function setAlignment(alignmentData) {
    alignment.value = alignmentData
  }

  function setAnalysisComplete(complete) {
    analysisComplete.value = complete
  }

  function setAnalysisProgress(progress) {
    analysisProgress.value = progress
  }

  function setAnalysisError(error) {
    analysisError.value = error
  }

  function setProcessing(processing, stage = '') {
    isProcessing.value = processing
    processingStage.value = stage
  }

  function resetSession() {
    sessionId.value = generateSessionId()
    createdAt.value = new Date()
    scoreFile.value = null
    audioFile.value = null
    parsedScore.value = null
    audioBuffer.value = null
    analysisComplete.value = false
    analysisProgress.value = 0
    analysisError.value = null
    audioFeatures.value = null
    alignment.value = null
    isProcessing.value = false
    processingStage.value = ''
  }

  function exportSession() {
    return {
      sessionId: sessionId.value,
      createdAt: createdAt.value.toISOString(),
      parsedScore: parsedScore.value,
      audioFeatures: audioFeatures.value,
      alignment: alignment.value ? {
        measureToTime: Object.fromEntries(alignment.value.measureToTime || []),
        confidence: alignment.value.confidence
      } : null
    }
  }

  function importSession(data) {
    if (data.sessionId) sessionId.value = data.sessionId
    if (data.createdAt) createdAt.value = new Date(data.createdAt)
    if (data.parsedScore) parsedScore.value = data.parsedScore
    if (data.audioFeatures) audioFeatures.value = data.audioFeatures
    if (data.alignment) {
      alignment.value = {
        measureToTime: new Map(Object.entries(data.alignment.measureToTime || {})),
        confidence: data.alignment.confidence
      }
    }
    analysisComplete.value = true
  }

  return {
    // State
    sessionId,
    createdAt,
    scoreFile,
    audioFile,
    parsedScore,
    audioBuffer,
    analysisComplete,
    analysisProgress,
    analysisError,
    audioFeatures,
    alignment,
    isProcessing,
    processingStage,
    
    // Computed
    hasScore,
    hasAudio,
    isReady,
    
    // Actions
    setScoreFile,
    setAudioFile,
    setParsedScore,
    setAudioBuffer,
    setAudioFeatures,
    setAlignment,
    setAnalysisComplete,
    setAnalysisProgress,
    setAnalysisError,
    setProcessing,
    resetSession,
    exportSession,
    importSession
  }
})

function generateSessionId() {
  return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
}
