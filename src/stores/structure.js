/**
 * Structure Store - Pinia
 * Manages structure tree and selected nodes
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useStructureStore = defineStore('structure', () => {
  // State
  const structureTree = ref(null)
  const selectedNodeId = ref(null)
  const expandedNodes = ref(new Set())
  const highlightedNodes = ref(new Set())
  
  // Form analysis
  const formAnalysis = ref(null)
  
  // Cadences and phrases
  const cadences = ref([])
  const phrases = ref([])
  const periods = ref([])

  // Computed
  const selectedNode = computed(() => {
    if (!structureTree.value || !selectedNodeId.value) return null
    return structureTree.value.nodes.get(selectedNodeId.value)
  })

  const rootNode = computed(() => {
    return structureTree.value?.root || null
  })

  const allNodes = computed(() => {
    if (!structureTree.value) return []
    return Array.from(structureTree.value.nodes.values())
  })

  const nodesByType = computed(() => {
    const grouped = {
      motive: [],
      subphrase: [],
      phrase: [],
      period: [],
      theme: [],
      section: []
    }
    
    allNodes.value.forEach(node => {
      if (grouped[node.type]) {
        grouped[node.type].push(node)
      }
    })
    
    return grouped
  })

  // Actions
  function setStructureTree(tree) {
    structureTree.value = tree
    expandedNodes.value = new Set()
    
    // Auto-expand root and first level
    if (tree?.root) {
      expandedNodes.value.add(tree.root.id)
      tree.root.children?.forEach(child => {
        expandedNodes.value.add(child.id)
      })
    }
  }

  function setFormAnalysis(analysis) {
    formAnalysis.value = analysis
  }

  function setCadences(cadenceList) {
    cadences.value = cadenceList
  }

  function setPhrases(phraseList) {
    phrases.value = phraseList
  }

  function setPeriods(periodList) {
    periods.value = periodList
  }

  function selectNode(nodeId) {
    selectedNodeId.value = nodeId
  }

  function clearSelection() {
    selectedNodeId.value = null
  }

  function toggleExpanded(nodeId) {
    if (expandedNodes.value.has(nodeId)) {
      expandedNodes.value.delete(nodeId)
    } else {
      expandedNodes.value.add(nodeId)
    }
    // Trigger reactivity
    expandedNodes.value = new Set(expandedNodes.value)
  }

  function expandNode(nodeId) {
    expandedNodes.value.add(nodeId)
    expandedNodes.value = new Set(expandedNodes.value)
  }

  function collapseNode(nodeId) {
    expandedNodes.value.delete(nodeId)
    expandedNodes.value = new Set(expandedNodes.value)
  }

  function expandAll() {
    allNodes.value.forEach(node => {
      expandedNodes.value.add(node.id)
    })
    expandedNodes.value = new Set(expandedNodes.value)
  }

  function collapseAll() {
    expandedNodes.value = new Set()
    // Keep root expanded
    if (structureTree.value?.root) {
      expandedNodes.value.add(structureTree.value.root.id)
    }
  }

  function highlightNode(nodeId) {
    highlightedNodes.value.add(nodeId)
    highlightedNodes.value = new Set(highlightedNodes.value)
  }

  function unhighlightNode(nodeId) {
    highlightedNodes.value.delete(nodeId)
    highlightedNodes.value = new Set(highlightedNodes.value)
  }

  function clearHighlights() {
    highlightedNodes.value = new Set()
  }

  function updateNodeBoundaries(nodeId, startMeasure, endMeasure) {
    const node = structureTree.value?.nodes.get(nodeId)
    if (node) {
      node.startMeasure = startMeasure
      node.endMeasure = endMeasure
      node.confidence = Math.max(0.5, (node.confidence || 0.7) - 0.1)
    }
  }

  function updateNodeType(nodeId, newType) {
    const node = structureTree.value?.nodes.get(nodeId)
    if (node) {
      node.type = newType
      node.confidence = Math.max(0.5, (node.confidence || 0.7) - 0.1)
    }
  }

  function updateNodeMaterial(nodeId, material) {
    const node = structureTree.value?.nodes.get(nodeId)
    if (node) {
      node.material = material
    }
  }

  function getNodeAtMeasure(measureNumber) {
    // Find the most specific (deepest) node containing this measure
    let bestNode = null
    let bestDepth = -1

    const findNode = (node, depth) => {
      if (measureNumber >= node.startMeasure && measureNumber <= node.endMeasure) {
        if (depth > bestDepth) {
          bestNode = node
          bestDepth = depth
        }
        node.children?.forEach(child => findNode(child, depth + 1))
      }
    }

    if (structureTree.value?.root) {
      findNode(structureTree.value.root, 0)
    }

    return bestNode
  }

  function getNodesInRange(startMeasure, endMeasure) {
    return allNodes.value.filter(node =>
      node.startMeasure <= endMeasure && node.endMeasure >= startMeasure
    )
  }

  function getRelatedNodes(nodeId) {
    const node = structureTree.value?.nodes.get(nodeId)
    if (!node) return []

    // Find nodes with same or similar material
    return allNodes.value.filter(n => 
      n.id !== nodeId && 
      n.material && 
      node.material &&
      (n.material.charAt(0) === node.material.charAt(0) ||
       n.material === node.material)
    )
  }

  function reset() {
    structureTree.value = null
    selectedNodeId.value = null
    expandedNodes.value = new Set()
    highlightedNodes.value = new Set()
    formAnalysis.value = null
    cadences.value = []
    phrases.value = []
    periods.value = []
  }

  function exportStructure() {
    if (!structureTree.value) return null

    // Convert Map to object for JSON serialization
    const nodesObj = {}
    structureTree.value.nodes.forEach((node, id) => {
      nodesObj[id] = {
        ...node,
        parent: node.parent?.id || null,
        children: node.children?.map(c => c.id) || []
      }
    })

    return {
      root: structureTree.value.root.id,
      nodes: nodesObj,
      formAnalysis: formAnalysis.value,
      cadences: cadences.value,
      phrases: phrases.value,
      periods: periods.value
    }
  }

  function importStructure(data) {
    if (!data || !data.nodes) return

    // Reconstruct the tree
    const nodes = new Map()
    
    // First pass: create all nodes
    Object.entries(data.nodes).forEach(([id, nodeData]) => {
      nodes.set(id, {
        ...nodeData,
        parent: null,
        children: []
      })
    })

    // Second pass: link parents and children
    Object.entries(data.nodes).forEach(([id, nodeData]) => {
      const node = nodes.get(id)
      if (nodeData.parent) {
        node.parent = nodes.get(nodeData.parent)
      }
      if (nodeData.children) {
        node.children = nodeData.children.map(childId => nodes.get(childId)).filter(Boolean)
      }
    })

    structureTree.value = {
      root: nodes.get(data.root),
      nodes
    }

    if (data.formAnalysis) formAnalysis.value = data.formAnalysis
    if (data.cadences) cadences.value = data.cadences
    if (data.phrases) phrases.value = data.phrases
    if (data.periods) periods.value = data.periods
  }

  return {
    // State
    structureTree,
    selectedNodeId,
    expandedNodes,
    highlightedNodes,
    formAnalysis,
    cadences,
    phrases,
    periods,
    
    // Computed
    selectedNode,
    rootNode,
    allNodes,
    nodesByType,
    
    // Actions
    setStructureTree,
    setFormAnalysis,
    setCadences,
    setPhrases,
    setPeriods,
    selectNode,
    clearSelection,
    toggleExpanded,
    expandNode,
    collapseNode,
    expandAll,
    collapseAll,
    highlightNode,
    unhighlightNode,
    clearHighlights,
    updateNodeBoundaries,
    updateNodeType,
    updateNodeMaterial,
    getNodeAtMeasure,
    getNodesInRange,
    getRelatedNodes,
    reset,
    exportStructure,
    importStructure
  }
})
