/**
 * Preferences Store - Pinia
 * Manages KNN state and preference learning
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePreferencesStore = defineStore('preferences', () => {
  // State
  const exampleCount = ref(0)
  const acceptCount = ref(0)
  const modifyCount = ref(0)
  const rejectCount = ref(0)
  const learningHistory = ref([])

  // Computed
  const acceptRate = computed(() => {
    if (exampleCount.value === 0) return 0
    return acceptCount.value / exampleCount.value
  })

  const hasLearned = computed(() => exampleCount.value > 0)

  const learningProgress = computed(() => {
    // Consider "learned" after 10 examples
    return Math.min(1, exampleCount.value / 10)
  })

  const stats = computed(() => ({
    total: exampleCount.value,
    accepts: acceptCount.value,
    modifies: modifyCount.value,
    rejects: rejectCount.value,
    acceptRate: acceptRate.value
  }))

  // Actions
  function recordAccept(nodeId, schemeId) {
    exampleCount.value++
    acceptCount.value++
    learningHistory.value.push({
      action: 'accept',
      nodeId,
      schemeId,
      timestamp: Date.now()
    })
  }

  function recordModify(nodeId, schemeId) {
    exampleCount.value++
    modifyCount.value++
    learningHistory.value.push({
      action: 'modify',
      nodeId,
      schemeId,
      timestamp: Date.now()
    })
  }

  function recordReject(nodeId, schemeId) {
    exampleCount.value++
    rejectCount.value++
    learningHistory.value.push({
      action: 'reject',
      nodeId,
      schemeId,
      timestamp: Date.now()
    })
  }

  function updateFromManager(managerStats) {
    if (managerStats) {
      exampleCount.value = managerStats.total || 0
      acceptCount.value = managerStats.accepts || 0
      modifyCount.value = managerStats.modifies || 0
      rejectCount.value = managerStats.rejects || 0
    }
  }

  function getRecentHistory(count = 10) {
    return learningHistory.value.slice(-count)
  }

  function reset() {
    exampleCount.value = 0
    acceptCount.value = 0
    modifyCount.value = 0
    rejectCount.value = 0
    learningHistory.value = []
  }

  function exportPreferences() {
    return {
      exampleCount: exampleCount.value,
      acceptCount: acceptCount.value,
      modifyCount: modifyCount.value,
      rejectCount: rejectCount.value,
      learningHistory: learningHistory.value
    }
  }

  function importPreferences(data) {
    if (!data) return

    exampleCount.value = data.exampleCount || 0
    acceptCount.value = data.acceptCount || 0
    modifyCount.value = data.modifyCount || 0
    rejectCount.value = data.rejectCount || 0
    learningHistory.value = data.learningHistory || []
  }

  return {
    // State
    exampleCount,
    acceptCount,
    modifyCount,
    rejectCount,
    learningHistory,
    
    // Computed
    acceptRate,
    hasLearned,
    learningProgress,
    stats,
    
    // Actions
    recordAccept,
    recordModify,
    recordReject,
    updateFromManager,
    getRecentHistory,
    reset,
    exportPreferences,
    importPreferences
  }
})
