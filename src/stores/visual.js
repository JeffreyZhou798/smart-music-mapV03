/**
 * Visual Store - Pinia
 * Manages visual mappings and element library
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SHAPE_LIBRARY, COLOR_PALETTE, ANIMATIONS } from '../types/index.js'

export const useVisualStore = defineStore('visual', () => {
  // State
  const visualMappings = ref(new Map()) // nodeId -> VisualScheme
  const recommendations = ref(new Map()) // nodeId -> VisualScheme[]
  const selectedSchemeId = ref(null)
  
  // Library state
  const selectedShape = ref(null)
  const selectedColor = ref(null)
  const selectedAnimation = ref(null)

  // Computed
  const shapeLibrary = computed(() => SHAPE_LIBRARY)
  const warmColors = computed(() => COLOR_PALETTE.warm)
  const coolColors = computed(() => COLOR_PALETTE.cool)
  const allColors = computed(() => [...COLOR_PALETTE.warm, ...COLOR_PALETTE.cool])
  const animations = computed(() => ANIMATIONS)

  const mappingCount = computed(() => visualMappings.value.size)

  const hasMappingFor = computed(() => (nodeId) => {
    return visualMappings.value.has(nodeId)
  })

  // Actions
  function setMapping(nodeId, scheme) {
    visualMappings.value.set(nodeId, {
      ...scheme,
      nodeId,
      timestamp: Date.now(),
      userModified: false
    })
    // Trigger reactivity
    visualMappings.value = new Map(visualMappings.value)
  }

  function updateMapping(nodeId, updates) {
    const existing = visualMappings.value.get(nodeId)
    if (existing) {
      visualMappings.value.set(nodeId, {
        ...existing,
        ...updates,
        userModified: true,
        timestamp: Date.now()
      })
      visualMappings.value = new Map(visualMappings.value)
    }
  }

  function removeMapping(nodeId) {
    visualMappings.value.delete(nodeId)
    visualMappings.value = new Map(visualMappings.value)
  }

  function getMapping(nodeId) {
    return visualMappings.value.get(nodeId)
  }

  function setRecommendations(nodeId, schemes) {
    recommendations.value.set(nodeId, schemes)
    recommendations.value = new Map(recommendations.value)
  }

  function getRecommendations(nodeId) {
    return recommendations.value.get(nodeId) || []
  }

  function clearRecommendations(nodeId) {
    if (nodeId) {
      recommendations.value.delete(nodeId)
    } else {
      recommendations.value.clear()
    }
    recommendations.value = new Map(recommendations.value)
  }

  function selectShape(shape) {
    selectedShape.value = shape
  }

  function selectColor(color) {
    selectedColor.value = color
  }

  function selectAnimation(animation) {
    selectedAnimation.value = animation
  }

  function clearSelection() {
    selectedShape.value = null
    selectedColor.value = null
    selectedAnimation.value = null
    selectedSchemeId.value = null
  }

  function applyToNode(nodeId) {
    if (!selectedShape.value && !selectedColor.value && !selectedAnimation.value) {
      return false
    }

    const existing = visualMappings.value.get(nodeId) || {
      id: 'custom-' + Date.now(),
      shapes: [],
      colors: [],
      animation: 'pulse',
      arrangement: 'single'
    }

    const updated = { ...existing }

    if (selectedShape.value) {
      updated.shapes = [{ type: selectedShape.value, size: 'medium' }]
    }
    if (selectedColor.value) {
      updated.colors = [selectedColor.value]
    }
    if (selectedAnimation.value) {
      updated.animation = selectedAnimation.value
    }

    setMapping(nodeId, updated)
    return true
  }

  function copyMapping(fromNodeId, toNodeId) {
    const source = visualMappings.value.get(fromNodeId)
    if (source) {
      setMapping(toNodeId, {
        ...source,
        id: 'copy-' + Date.now()
      })
      return true
    }
    return false
  }

  function applyToSimilarNodes(nodeId, allNodes) {
    const sourceMapping = visualMappings.value.get(nodeId)
    const sourceNode = allNodes.find(n => n.id === nodeId)
    
    if (!sourceMapping || !sourceNode) return 0

    let count = 0
    allNodes.forEach(node => {
      if (node.id !== nodeId && 
          node.material && 
          sourceNode.material &&
          node.material.charAt(0) === sourceNode.material.charAt(0)) {
        copyMapping(nodeId, node.id)
        count++
      }
    })

    return count
  }

  function reset() {
    visualMappings.value = new Map()
    recommendations.value = new Map()
    selectedShape.value = null
    selectedColor.value = null
    selectedAnimation.value = null
    selectedSchemeId.value = null
  }

  function exportMappings() {
    const mappingsObj = {}
    visualMappings.value.forEach((mapping, nodeId) => {
      mappingsObj[nodeId] = mapping
    })
    return mappingsObj
  }

  function importMappings(data) {
    if (!data) return

    Object.entries(data).forEach(([nodeId, mapping]) => {
      visualMappings.value.set(nodeId, mapping)
    })
    visualMappings.value = new Map(visualMappings.value)
  }

  function getAllMappingsArray() {
    return Array.from(visualMappings.value.entries()).map(([nodeId, mapping]) => ({
      nodeId,
      ...mapping
    }))
  }

  return {
    // State
    visualMappings,
    recommendations,
    selectedSchemeId,
    selectedShape,
    selectedColor,
    selectedAnimation,
    
    // Computed
    shapeLibrary,
    warmColors,
    coolColors,
    allColors,
    animations,
    mappingCount,
    hasMappingFor,
    
    // Actions
    setMapping,
    updateMapping,
    removeMapping,
    getMapping,
    setRecommendations,
    getRecommendations,
    clearRecommendations,
    selectShape,
    selectColor,
    selectAnimation,
    clearSelection,
    applyToNode,
    copyMapping,
    applyToSimilarNodes,
    reset,
    exportMappings,
    importMappings,
    getAllMappingsArray
  }
})
