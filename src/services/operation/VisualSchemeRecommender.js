/**
 * Visual Scheme Recommender - Operation Layer
 * Generates visual scheme recommendations based on musical features
 * 
 * Features:
 * - Emotion-based recommendations (快/慢、强/弱、紧张/舒缓)
 * - Material relationship color logic (similar/contrast/recapitulation)
 * - Dynamic weighted KNN for preference learning
 * - 3-5 visual scheme recommendations per structure
 */

import { SHAPE_LIBRARY, COLOR_PALETTE, ANIMATIONS } from '../../types/index.js'
import PreferenceManager from './PreferenceManager.js'

const generateId = () => {
  return 'vs-' + Math.random().toString(36).substr(2, 9)
}

/**
 * Emotion feature mappings for visual recommendations
 * 情绪特征映射
 */
const EMOTION_MAPPINGS = {
  // 快/慢 (tempo/rhythm density)
  tempo: {
    fast: { animations: ['flash', 'bounce', 'spin'], colors: 'warm' },
    moderate: { animations: ['pulse', 'wave', 'slide'], colors: 'mixed' },
    slow: { animations: ['fade', 'grow', 'rotate'], colors: 'cool' }
  },
  // 强/弱 (dynamics/intensity)
  dynamics: {
    strong: { shapes: ['star5', 'burst', 'sun'], sizes: 'large' },
    moderate: { shapes: ['hexagon', 'diamond', 'octagon'], sizes: 'medium' },
    soft: { shapes: ['circle', 'wave', 'flower'], sizes: 'small' }
  },
  // 紧张/舒缓 (tension/resolution)
  tension: {
    tense: { colors: ['#FF5252', '#FF7043', '#FF6B6B'], animations: ['shake', 'flash'] },
    neutral: { colors: ['#FFD93D', '#FFAB40', '#FFA07A'], animations: ['pulse', 'wave'] },
    relaxed: { colors: ['#4D96FF', '#6BCB77', '#1ABC9C'], animations: ['fade', 'grow'] }
  }
}

export class VisualSchemeRecommender {
  constructor() {
    this.preferenceManager = new PreferenceManager()
  }

  /**
   * Generate visual scheme recommendations for a structure node
   * Based on emotion features: 快/慢、强/弱、紧张/舒缓
   * @param {Object} node - Structure node
   * @param {Object} options - Additional options
   * @returns {Object[]} Array of visual schemes (3-5 recommendations)
   */
  recommend(node, options = {}) {
    const { count = 5, relatedNodes = [], audioFeatures = null } = options
    
    // Extract emotion features from node and audio
    const emotionFeatures = this.extractEmotionFeatures(node, audioFeatures)
    
    // Get base recommendations from musical features
    const baseSchemes = this.generateBaseSchemes(node, count, emotionFeatures)

    // Apply color logic based on material relationships
    const coloredSchemes = baseSchemes.map(scheme => 
      this.applyColorLogic(scheme, node, relatedNodes)
    )

    // Adjust based on learned preferences (Dynamic weighted KNN)
    const preferenceSchemes = this.preferenceManager.getRecommendations(
      this.extractNodeFeatures(node),
      count
    )

    // Merge and deduplicate
    const allSchemes = [...preferenceSchemes, ...coloredSchemes]
    const uniqueSchemes = this.deduplicateSchemes(allSchemes).slice(0, count)

    // Ensure we have enough schemes (minimum 3, maximum 5)
    while (uniqueSchemes.length < Math.max(3, count)) {
      uniqueSchemes.push(this.generateRandomScheme(node, emotionFeatures))
    }

    // Add emotion metadata to each scheme for tooltip display
    return uniqueSchemes.map(scheme => ({
      ...scheme,
      emotionFeatures,
      recommendationSource: scheme.fromPreference ? 'preference_learning' : 'rule_based'
    }))
  }

  /**
   * Extract emotion features from node and audio analysis
   * 提取情绪特征：快/慢、强/弱、紧张/舒缓
   */
  extractEmotionFeatures(node, audioFeatures = null) {
    const features = {
      tempo: 'moderate',      // 快/慢
      dynamics: 'moderate',   // 强/弱
      tension: 'neutral'      // 紧张/舒缓
    }
    
    // Analyze from node structure
    const duration = (node.endMeasure - node.startMeasure + 1)
    
    // Tempo estimation from structure density
    if (node.children && node.children.length > 0) {
      const childDensity = node.children.length / duration
      if (childDensity > 2) features.tempo = 'fast'
      else if (childDensity < 0.5) features.tempo = 'slow'
    }
    
    // Dynamics from structure level
    const levelDynamics = {
      motive: 'soft',
      subphrase: 'soft',
      phrase: 'moderate',
      period: 'moderate',
      theme: 'strong',
      section: 'strong'
    }
    features.dynamics = levelDynamics[node.type] || 'moderate'
    
    // Tension from cadence type and closure
    if (node.features?.cadence) {
      const cadenceType = node.features.cadence.type
      if (cadenceType === 'perfect_authentic') {
        features.tension = 'relaxed'
      } else if (cadenceType === 'half' || cadenceType === 'deceptive') {
        features.tension = 'tense'
      }
    }
    
    if (node.features?.closure === 'open') {
      features.tension = 'tense'
    } else if (node.features?.closure === 'closed') {
      features.tension = 'relaxed'
    }
    
    // Override with audio features if available
    if (audioFeatures) {
      if (audioFeatures.rms !== undefined) {
        if (audioFeatures.rms > 0.7) features.dynamics = 'strong'
        else if (audioFeatures.rms < 0.3) features.dynamics = 'soft'
      }
      if (audioFeatures.spectralCentroid !== undefined) {
        if (audioFeatures.spectralCentroid > 3000) features.tension = 'tense'
        else if (audioFeatures.spectralCentroid < 1000) features.tension = 'relaxed'
      }
    }
    
    return features
  }

  /**
   * Generate base schemes based on musical and emotion features
   * 基于音乐和情绪特征生成基础方案
   */
  generateBaseSchemes(node, count, emotionFeatures = {}) {
    const schemes = []
    const features = this.extractNodeFeatures(node)

    for (let i = 0; i < count; i++) {
      const scheme = {
        id: generateId(),
        shapes: this.selectShapes(features, i, emotionFeatures),
        colors: this.selectColors(features, i, emotionFeatures),
        animation: this.selectAnimation(features, i, emotionFeatures),
        arrangement: this.selectArrangement(features)
      }
      schemes.push(scheme)
    }

    return schemes
  }

  /**
   * Select shapes based on structure type, features, and emotion
   * 基于结构类型、特征和情绪选择图形
   */
  selectShapes(features, variant, emotionFeatures = {}) {
    const shapes = []
    const shapeCount = this.getShapeCount(features)

    // Shape selection based on structure type
    const typeShapeMap = {
      motive: ['circle', 'diamond', 'star4'],
      subphrase: ['square', 'triangle', 'hexagon'],
      phrase: ['circle', 'square', 'star5'],
      period: ['hexagon', 'octagon', 'star6'],
      theme: ['star5', 'sun', 'burst'],
      section: ['octagon', 'spiral', 'wave']
    }

    // Override with dynamics-based shapes (强/弱)
    const dynamicsShapes = EMOTION_MAPPINGS.dynamics[emotionFeatures.dynamics]?.shapes
    const preferredShapes = dynamicsShapes || typeShapeMap[features.type] || ['circle', 'square', 'triangle']
    
    // Size based on dynamics
    const dynamicsSize = EMOTION_MAPPINGS.dynamics[emotionFeatures.dynamics]?.sizes
    
    for (let i = 0; i < shapeCount; i++) {
      const shapeIndex = (variant + i) % preferredShapes.length
      const shapeType = preferredShapes[shapeIndex]
      
      shapes.push({
        type: shapeType,
        size: dynamicsSize || this.getShapeSize(features)
      })
    }

    return shapes
  }

  /**
   * Get number of shapes based on structure duration
   */
  getShapeCount(features) {
    const duration = features.endMeasure - features.startMeasure + 1
    
    if (duration <= 2) return 1
    if (duration <= 4) return 2
    if (duration <= 8) return 3
    return 4
  }

  /**
   * Get shape size based on structure level
   */
  getShapeSize(features) {
    const sizeMap = {
      motive: 'small',
      subphrase: 'small',
      phrase: 'medium',
      period: 'medium',
      theme: 'large',
      section: 'large'
    }
    return sizeMap[features.type] || 'medium'
  }

  /**
   * Select colors based on features, variant, and emotion
   * 基于特征、变体和情绪选择颜色
   * - 紧张/舒缓 affects color temperature
   * - 快/慢 affects color saturation
   */
  selectColors(features, variant, emotionFeatures = {}) {
    const colors = []
    const colorCount = Math.min(3, this.getShapeCount(features))

    // Get tension-based colors (紧张/舒缓)
    const tensionColors = EMOTION_MAPPINGS.tension[emotionFeatures.tension]?.colors
    if (tensionColors && variant === 0) {
      return tensionColors.slice(0, colorCount)
    }

    // Use warm colors for stable/resolved structures
    // Use cool colors for unstable/contrasting structures
    const isStable = features.closure === 'closed' || 
                     features.cadence?.type === 'perfect_authentic'
    
    // Tempo affects palette choice (快/慢)
    const tempoMapping = EMOTION_MAPPINGS.tempo[emotionFeatures.tempo]?.colors
    let palette
    if (tempoMapping === 'warm') {
      palette = COLOR_PALETTE.warm
    } else if (tempoMapping === 'cool') {
      palette = COLOR_PALETTE.cool
    } else {
      palette = isStable ? COLOR_PALETTE.warm : COLOR_PALETTE.cool
    }
    
    for (let i = 0; i < colorCount; i++) {
      const colorIndex = (variant + i) % palette.length
      colors.push(palette[colorIndex])
    }

    return colors
  }

  /**
   * Select animation based on musical character and emotion
   * 基于音乐特征和情绪选择动画
   * - 快/慢 affects animation speed/type
   */
  selectAnimation(features, variant, emotionFeatures = {}) {
    // Get tempo-based animations (快/慢)
    const tempoAnimations = EMOTION_MAPPINGS.tempo[emotionFeatures.tempo]?.animations
    const tensionAnimations = EMOTION_MAPPINGS.tension[emotionFeatures.tension]?.animations
    
    // Map structure types to appropriate animations
    const typeAnimationMap = {
      motive: ['flash', 'pulse', 'bounce'],
      subphrase: ['slide', 'fade', 'pulse'],
      phrase: ['wave', 'grow', 'slide'],
      period: ['rotate', 'spin', 'wave'],
      theme: ['grow', 'spin', 'bounce'],
      section: ['fade', 'wave', 'rotate']
    }

    // Priority: tempo > tension > type
    let preferredAnimations
    if (tempoAnimations && variant < tempoAnimations.length) {
      preferredAnimations = tempoAnimations
    } else if (tensionAnimations && variant < tensionAnimations.length) {
      preferredAnimations = tensionAnimations
    } else {
      preferredAnimations = typeAnimationMap[features.type] || ANIMATIONS
    }
    
    const animIndex = variant % preferredAnimations.length
    return preferredAnimations[animIndex]
  }

  /**
   * Select arrangement based on structure complexity
   */
  selectArrangement(features) {
    const duration = features.endMeasure - features.startMeasure + 1
    
    if (duration <= 2) return 'single'
    if (duration <= 8) return 'sequence'
    return 'grid'
  }

  /**
   * Apply color logic based on material relationships
   */
  applyColorLogic(scheme, node, relatedNodes) {
    const newScheme = { ...scheme, colors: [...scheme.colors] }

    // Find related nodes with same material
    const similarNodes = relatedNodes.filter(n => 
      n.material && node.material && 
      n.material.charAt(0) === node.material.charAt(0)
    )

    // Find contrasting nodes
    const contrastingNodes = relatedNodes.filter(n =>
      n.material && node.material &&
      n.material.charAt(0) !== node.material.charAt(0)
    )

    // Apply color rules
    if (similarNodes.length > 0) {
      // Use warm colors for similar material
      newScheme.colors = newScheme.colors.map((_, i) => 
        COLOR_PALETTE.warm[i % COLOR_PALETTE.warm.length]
      )
      newScheme.relationship = 'similar'
    } else if (contrastingNodes.length > 0) {
      // Use cool colors for contrasting material
      newScheme.colors = newScheme.colors.map((_, i) =>
        COLOR_PALETTE.cool[i % COLOR_PALETTE.cool.length]
      )
      newScheme.relationship = 'contrasting'
    }

    // Check for recapitulation (material with prime)
    if (node.material?.includes("'")) {
      // Use same base color as original but slightly modified
      const baseColorIndex = node.material.charCodeAt(0) - 97 // 'a' = 0
      newScheme.colors[0] = COLOR_PALETTE.warm[baseColorIndex % COLOR_PALETTE.warm.length]
      newScheme.relationship = 'recapitulated'
    }

    return newScheme
  }

  /**
   * Extract features from structure node
   */
  extractNodeFeatures(node) {
    return {
      type: node.type,
      startMeasure: node.startMeasure,
      endMeasure: node.endMeasure,
      material: node.material,
      confidence: node.confidence,
      cadence: node.features?.cadence,
      periodType: node.features?.periodType,
      closure: node.features?.closure
    }
  }

  /**
   * Generate a random scheme as fallback, respecting emotion features
   */
  generateRandomScheme(node, emotionFeatures = {}) {
    const features = this.extractNodeFeatures(node)
    
    // Use emotion-appropriate defaults
    const dynamicsShapes = EMOTION_MAPPINGS.dynamics[emotionFeatures.dynamics]?.shapes || ['circle', 'square']
    const tempoAnimations = EMOTION_MAPPINGS.tempo[emotionFeatures.tempo]?.animations || ANIMATIONS
    const tensionColors = EMOTION_MAPPINGS.tension[emotionFeatures.tension]?.colors || COLOR_PALETTE.warm
    
    return {
      id: generateId(),
      shapes: [{
        type: dynamicsShapes[Math.floor(Math.random() * dynamicsShapes.length)],
        size: this.getShapeSize(features)
      }],
      colors: [tensionColors[Math.floor(Math.random() * tensionColors.length)]],
      animation: tempoAnimations[Math.floor(Math.random() * tempoAnimations.length)],
      arrangement: 'single'
    }
  }

  /**
   * Deduplicate schemes based on shape and color combination
   */
  deduplicateSchemes(schemes) {
    const seen = new Set()
    return schemes.filter(scheme => {
      const key = JSON.stringify({
        shapes: scheme.shapes.map(s => s.type),
        colors: scheme.colors,
        animation: scheme.animation
      })
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  /**
   * Record user selection for learning
   * @param {Object} node - Structure node
   * @param {Object} scheme - Selected scheme
   * @param {'accept'|'modify'|'reject'} action - User action
   */
  recordSelection(node, scheme, action) {
    const rewardMap = {
      accept: 1,
      modify: 0.5,
      reject: -1
    }
    
    const reward = rewardMap[action] || 0
    const features = this.extractNodeFeatures(node)
    
    this.preferenceManager.recordSelection(features, scheme, reward)
  }

  /**
   * Get preference learning status
   */
  getLearningStatus() {
    return {
      exampleCount: this.preferenceManager.getExampleCount(),
      stats: this.preferenceManager.getStats()
    }
  }

  /**
   * Clear learned preferences
   */
  clearPreferences() {
    this.preferenceManager.clear()
  }

  /**
   * Get preference manager for direct access
   */
  getPreferenceManager() {
    return this.preferenceManager
  }
}

export default VisualSchemeRecommender
