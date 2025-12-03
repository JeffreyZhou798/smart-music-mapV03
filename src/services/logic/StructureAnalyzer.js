/**
 * Structure Analyzer - Logic Layer
 * Builds hierarchical structure tree from musical analysis
 * 
 * Features:
 * - Confidence scoring with uncertainty visualization
 * - Tooltip data generation for each node
 * - Chunk-by-chunk processing for large scores
 */

import RuleEngine, { getConfidenceVisualStyle, RULE_ENGINE_VERSION } from './RuleEngine.js'

const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export class StructureAnalyzer {
  constructor() {
    this.ruleEngine = new RuleEngine()
    this.structureTree = null
    this.tooltipDataMap = new Map()
    this.version = RULE_ENGINE_VERSION
  }

  /**
   * Build complete hierarchical structure from parsed score
   * Uses chunk-by-chunk processing for large scores
   * @param {Object} parsedScore 
   * @returns {Object} StructureTree
   */
  buildHierarchy(parsedScore) {
    const { notes, keySignature, measures, timeSignature } = parsedScore
    
    // Use chunked analysis for large scores
    const useChunked = notes.length > 1000 || measures.length > 64
    
    let analysisResult
    if (useChunked) {
      console.log('[StructureAnalyzer] Using chunked analysis for large score')
      analysisResult = this.ruleEngine.analyzeCompleteChunked(notes, {
        keySignature,
        timeSignature: timeSignature || { beats: 4, beatType: 4 }
      })
    } else {
      analysisResult = this.ruleEngine.analyzeComplete(notes, {
        keySignature,
        timeSignature: timeSignature || { beats: 4, beatType: 4 }
      })
    }
    
    const { cadences, phrases, periods, form: formAnalysis, tooltipData } = analysisResult
    
    // Store tooltip data
    if (tooltipData) {
      this.tooltipDataMap = tooltipData
    }

    // Build hierarchical tree
    this.structureTree = this.buildTree(parsedScore, phrases, periods, formAnalysis)

    // Assign confidence scores with visual styles
    this.assignConfidence(this.structureTree)

    // Label materials
    this.labelMaterials(this.structureTree, notes)
    
    // Generate tooltip data for tree nodes
    this.generateTreeTooltips(this.structureTree)

    return this.structureTree
  }

  /**
   * Build the structure tree
   */
  buildTree(parsedScore, phrases, periods, formAnalysis) {
    const nodes = new Map()
    
    // Create root node (entire piece)
    const root = {
      id: generateId(),
      type: 'section',
      startMeasure: 1,
      endMeasure: parsedScore.measures.length,
      children: [],
      parent: null,
      material: 'A',
      confidence: 0.8,
      features: {
        formType: formAnalysis.formType,
        tempo: parsedScore.tempo,
        keySignature: parsedScore.keySignature
      }
    }
    nodes.set(root.id, root)

    // Add sections from form analysis
    formAnalysis.sections.forEach(section => {
      const sectionNode = {
        id: section.id,
        type: 'theme',
        startMeasure: section.startMeasure,
        endMeasure: section.endMeasure,
        children: [],
        parent: root,
        material: section.name,
        confidence: formAnalysis.confidence,
        features: {
          function: section.function
        }
      }
      root.children.push(sectionNode)
      nodes.set(sectionNode.id, sectionNode)
    })

    // Add periods under appropriate sections
    periods.forEach(period => {
      const periodNode = {
        id: period.id,
        type: 'period',
        startMeasure: period.phrases[0]?.startMeasure || 0,
        endMeasure: period.phrases.slice(-1)[0]?.endMeasure || 0,
        children: [],
        parent: null,
        material: period.type === 'parallel' ? 'a+a\'' : 'a+b',
        confidence: 0.75,
        features: {
          periodType: period.type,
          proportion: period.proportion,
          closure: period.closure
        }
      }

      // Find parent section
      const parentSection = root.children.find(s => 
        periodNode.startMeasure >= s.startMeasure && 
        periodNode.endMeasure <= s.endMeasure
      ) || root

      periodNode.parent = parentSection
      parentSection.children.push(periodNode)
      nodes.set(periodNode.id, periodNode)

      // Add phrases under period
      period.phrases.forEach(phrase => {
        const phraseNode = {
          id: phrase.id,
          type: 'phrase',
          startMeasure: phrase.startMeasure,
          endMeasure: phrase.endMeasure,
          children: [],
          parent: periodNode,
          material: phrase.material,
          confidence: phrase.cadence ? 0.8 : 0.6,
          features: {
            cadence: phrase.cadence
          }
        }
        periodNode.children.push(phraseNode)
        nodes.set(phraseNode.id, phraseNode)

        // Add sub-phrases (乐节) - typically half of phrase
        const phraseMeasures = phrase.endMeasure - phrase.startMeasure + 1
        if (phraseMeasures >= 4) {
          const midPoint = phrase.startMeasure + Math.floor(phraseMeasures / 2) - 1
          
          const subphrase1 = {
            id: generateId(),
            type: 'subphrase',
            startMeasure: phrase.startMeasure,
            endMeasure: midPoint,
            children: [],
            parent: phraseNode,
            material: phrase.material + '₁',
            confidence: 0.65,
            features: {}
          }
          
          const subphrase2 = {
            id: generateId(),
            type: 'subphrase',
            startMeasure: midPoint + 1,
            endMeasure: phrase.endMeasure,
            children: [],
            parent: phraseNode,
            material: phrase.material + '₂',
            confidence: 0.65,
            features: {}
          }
          
          phraseNode.children.push(subphrase1, subphrase2)
          nodes.set(subphrase1.id, subphrase1)
          nodes.set(subphrase2.id, subphrase2)

          // Add motives under sub-phrases
          this.addMotives(subphrase1, nodes)
          this.addMotives(subphrase2, nodes)
        } else {
          // Add motives directly under phrase
          this.addMotives(phraseNode, nodes)
        }
      })
    })

    return { root, nodes }
  }

  /**
   * Add motive nodes (1-2 measures each)
   */
  addMotives(parentNode, nodes) {
    const startMeasure = parentNode.startMeasure
    const endMeasure = parentNode.endMeasure
    const totalMeasures = endMeasure - startMeasure + 1

    // Create motives of 1-2 measures
    const motiveSize = totalMeasures <= 2 ? 1 : 2
    let motiveIndex = 0

    for (let m = startMeasure; m <= endMeasure; m += motiveSize) {
      const motiveEnd = Math.min(m + motiveSize - 1, endMeasure)
      
      const motive = {
        id: generateId(),
        type: 'motive',
        startMeasure: m,
        endMeasure: motiveEnd,
        children: [],
        parent: parentNode,
        material: `m${motiveIndex + 1}`,
        confidence: 0.6,
        features: {}
      }
      
      parentNode.children.push(motive)
      nodes.set(motive.id, motive)
      motiveIndex++
    }
  }

  /**
   * Assign confidence scores based on analysis quality
   * Also assigns visual styles for uncertainty visualization
   */
  assignConfidence(tree) {
    const traverse = (node) => {
      // Base confidence from detection
      let confidence = node.confidence || 0.5

      // Adjust based on children consistency
      if (node.children.length > 0) {
        const childConfidences = node.children.map(c => c.confidence || 0.5)
        const avgChildConfidence = childConfidences.reduce((a, b) => a + b, 0) / childConfidences.length
        confidence = (confidence + avgChildConfidence) / 2
      }

      // Adjust based on structure completeness
      if (node.features?.cadence) {
        confidence += 0.1
      }

      node.confidence = Math.min(1, Math.max(0, confidence))
      
      // Assign visual style based on confidence
      // Low confidence = dashed/semi-transparent for user identification
      node.visualStyle = getConfidenceVisualStyle(node.confidence)

      // Recurse
      node.children.forEach(traverse)
    }

    traverse(tree.root)
    return tree
  }
  
  /**
   * Generate tooltip data for all tree nodes
   */
  generateTreeTooltips(tree) {
    const traverse = (node) => {
      // Generate tooltip data for this node
      node.tooltipData = {
        nodeId: node.id,
        nodeType: node.type,
        material: node.material,
        startMeasure: node.startMeasure,
        endMeasure: node.endMeasure,
        length: `${node.endMeasure - node.startMeasure + 1} measures`,
        confidence: node.confidence,
        confidencePercent: `${Math.round((node.confidence || 0.5) * 100)}%`,
        uncertaintyLevel: node.visualStyle?.uncertaintyLevel || 'medium',
        modelVersion: this.version,
        analysisMethod: 'RuleEngine + StructureAnalyzer',
        usedFeatures: this.getNodeFeatures(node),
        visualStyle: node.visualStyle
      }
      
      // Recurse
      node.children.forEach(traverse)
    }
    
    traverse(tree.root)
  }
  
  /**
   * Get features used for this node type
   */
  getNodeFeatures(node) {
    const features = []
    
    switch (node.type) {
      case 'motive':
        features.push('Beat Position', 'Interval Pattern', 'Rhythm')
        break
      case 'subphrase':
        features.push('Measure Boundaries', 'Rhythmic Breaks')
        break
      case 'phrase':
        features.push('Cadence Detection', 'Harmonic Analysis')
        if (node.features?.cadence) {
          features.push(`Cadence: ${node.features.cadence.type}`)
        }
        break
      case 'period':
        features.push('Phrase Relationships', 'Cadence Strength')
        if (node.features?.periodType) {
          features.push(`Type: ${node.features.periodType}`)
        }
        break
      case 'theme':
      case 'section':
        features.push('Form Analysis', 'Material Distribution')
        if (node.features?.function) {
          features.push(`Function: ${node.features.function}`)
        }
        break
    }
    
    return features
  }
  
  /**
   * Get tooltip data for a specific node
   */
  getTooltipData(nodeId) {
    const node = this.findNode(nodeId)
    if (node?.tooltipData) {
      return node.tooltipData
    }
    return this.tooltipDataMap.get(nodeId) || null
  }

  /**
   * Label materials throughout the tree
   */
  labelMaterials(tree, notes) {
    const materialGroups = new Map()
    
    const traverse = (node) => {
      // Get notes for this node
      const nodeNotes = notes.filter(n => 
        n.measureNumber >= node.startMeasure && 
        n.measureNumber <= node.endMeasure
      )

      // Calculate a simple hash for material comparison
      const materialHash = this.calculateMaterialHash(nodeNotes)
      
      // Check for similar materials
      let foundSimilar = false
      for (const [hash, label] of materialGroups) {
        if (this.isSimilarHash(materialHash, hash)) {
          // Use variant of existing label
          node.material = label + "'"
          foundSimilar = true
          break
        }
      }

      if (!foundSimilar && materialHash) {
        materialGroups.set(materialHash, node.material)
      }

      // Recurse
      node.children.forEach(traverse)
    }

    traverse(tree.root)
    return tree
  }

  /**
   * Calculate a simple hash for material comparison
   */
  calculateMaterialHash(notes) {
    if (notes.length === 0) return null
    
    // Use first few intervals as hash
    const intervals = []
    for (let i = 1; i < Math.min(notes.length, 5); i++) {
      const midi1 = this.pitchToMidi(notes[i - 1].pitch)
      const midi2 = this.pitchToMidi(notes[i].pitch)
      intervals.push(midi2 - midi1)
    }
    
    return intervals.join(',')
  }

  /**
   * Check if two material hashes are similar
   */
  isSimilarHash(hash1, hash2) {
    if (!hash1 || !hash2) return false
    
    const intervals1 = hash1.split(',').map(Number)
    const intervals2 = hash2.split(',').map(Number)
    
    if (intervals1.length !== intervals2.length) return false
    
    let matches = 0
    for (let i = 0; i < intervals1.length; i++) {
      if (Math.abs(intervals1[i] - intervals2[i]) <= 2) {
        matches++
      }
    }
    
    return matches / intervals1.length > 0.7
  }

  /**
   * Convert pitch to MIDI number
   */
  pitchToMidi(pitch) {
    if (!pitch) return 60
    
    const pitchClasses = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    }
    
    const match = pitch.match(/([A-G][#b]?)(\d+)/)
    if (!match) return 60
    
    const [, noteName, octave] = match
    const pc = pitchClasses[noteName] || 0
    return pc + (parseInt(octave) + 1) * 12
  }

  /**
   * Get the structure tree
   */
  getStructureTree() {
    return this.structureTree
  }

  /**
   * Find node by ID
   */
  findNode(nodeId) {
    return this.structureTree?.nodes.get(nodeId)
  }

  /**
   * Get all nodes of a specific type
   */
  getNodesByType(type) {
    const result = []
    if (!this.structureTree) return result

    for (const node of this.structureTree.nodes.values()) {
      if (node.type === type) {
        result.push(node)
      }
    }
    return result
  }

  /**
   * Update node boundaries (for user editing)
   */
  updateNodeBoundaries(nodeId, startMeasure, endMeasure) {
    const node = this.findNode(nodeId)
    if (!node) return false

    node.startMeasure = startMeasure
    node.endMeasure = endMeasure
    
    // Recalculate confidence (lower due to manual edit)
    node.confidence = Math.max(0.5, node.confidence - 0.1)
    
    return true
  }

  /**
   * Change node type (for user editing)
   */
  changeNodeType(nodeId, newType) {
    const node = this.findNode(nodeId)
    if (!node) return false

    node.type = newType
    node.confidence = Math.max(0.5, node.confidence - 0.1)
    
    return true
  }
}

export default StructureAnalyzer
