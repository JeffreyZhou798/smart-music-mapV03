/**
 * Preference Manager - Operation Layer
 * Implements pseudo-reinforcement learning using Dynamic Weighted KNN classifier
 * Learns user preferences during editing session
 * 
 * Features:
 * - Dynamic weight adjustment based on reward signals
 * - Recency weighting (newer examples have more influence)
 * - Feature importance learning
 * - Session-only memory (cleared on export)
 * 
 * Reward Strategy:
 * - Accept AI recommendation: +1
 * - Modify but keep similar type: +0.5
 * - Reject and choose different: -1
 */

export class PreferenceManager {
  constructor() {
    // Dynamic Weighted KNN implementation
    this.examples = []
    this.k = 5 // Number of neighbors (increased for better coverage)
    this.exampleCount = 0
    
    // Dynamic feature weights (learned from user behavior)
    this.featureWeights = {
      structureType: 1.0,
      confidence: 0.5,
      duration: 0.8,
      materialVariation: 0.7,
      cadenceType: 0.9,
      periodType: 0.8,
      emotionTempo: 0.6,
      emotionDynamics: 0.6,
      emotionTension: 0.7
    }
    
    // Recency decay factor (newer examples weighted more)
    this.recencyDecay = 0.95
    
    // Minimum examples before making recommendations
    this.minExamplesForRecommendation = 2
  }

  /**
   * Record a user selection with reward signal
   * @param {Object} features - Musical features of the structure
   * @param {Object} scheme - Selected visual scheme
   * @param {number} reward - +1 (accept), +0.5 (modify), -1 (reject)
   */
  recordSelection(features, scheme, reward) {
    const featureVector = this.extractFeatureVector(features)
    
    this.examples.push({
      features: featureVector,
      scheme: scheme,
      reward: reward,
      timestamp: Date.now()
    })

    this.exampleCount++
  }

  /**
   * Add example to classifier (alias for recordSelection with +1 reward)
   */
  addExample(features, scheme) {
    this.recordSelection(features, scheme, 1)
  }

  /**
   * Get recommendations based on learned preferences using Dynamic Weighted KNN
   * @param {Object} features - Musical features to match
   * @param {number} count - Number of recommendations
   * @returns {Object[]} Recommended visual schemes with preference metadata
   */
  getRecommendations(features, count = 5) {
    if (this.examples.length < this.minExamplesForRecommendation) {
      return []
    }

    const queryVector = this.extractFeatureVector(features)
    const currentTime = Date.now()
    
    // Calculate weighted distances to all examples
    const distances = this.examples.map((example, index) => {
      // Calculate weighted Euclidean distance
      const distance = this.weightedEuclideanDistance(queryVector, example.features)
      
      // Apply recency weighting (newer examples have more influence)
      const ageInMinutes = (currentTime - example.timestamp) / 60000
      const recencyWeight = Math.pow(this.recencyDecay, ageInMinutes)
      
      return {
        index,
        distance,
        scheme: example.scheme,
        reward: example.reward,
        recencyWeight,
        // Combined score: lower distance + higher reward + recency
        combinedScore: (1 / (distance + 0.1)) * example.reward * recencyWeight
      }
    })

    // Filter out negative reward examples for recommendations
    const positiveExamples = distances.filter(d => d.reward > 0)
    
    // Sort by combined score (higher is better)
    positiveExamples.sort((a, b) => b.combinedScore - a.combinedScore)

    // Get k nearest neighbors with positive rewards
    const neighbors = positiveExamples.slice(0, Math.min(this.k, positiveExamples.length))

    // Weight schemes by combined score
    const schemeScores = new Map()

    neighbors.forEach(neighbor => {
      const schemeKey = JSON.stringify({
        shapes: neighbor.scheme.shapes?.map(s => s.type),
        colors: neighbor.scheme.colors,
        animation: neighbor.scheme.animation
      })
      
      if (!schemeScores.has(schemeKey)) {
        schemeScores.set(schemeKey, { 
          scheme: { ...neighbor.scheme, fromPreference: true },
          score: 0,
          count: 0
        })
      }
      const entry = schemeScores.get(schemeKey)
      entry.score += neighbor.combinedScore
      entry.count++
    })

    // Sort by score and return top recommendations
    const recommendations = Array.from(schemeScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(item => ({
        ...item.scheme,
        preferenceScore: item.score,
        matchCount: item.count
      }))

    return recommendations
  }

  /**
   * Calculate weighted Euclidean distance using dynamic feature weights
   */
  weightedEuclideanDistance(vec1, vec2) {
    let sum = 0
    const weights = this.getWeightVector()
    const len = Math.min(vec1.length, vec2.length, weights.length)
    
    for (let i = 0; i < len; i++) {
      const diff = (vec1[i] || 0) - (vec2[i] || 0)
      const weight = weights[i] || 1
      sum += weight * diff * diff
    }
    
    return Math.sqrt(sum)
  }

  /**
   * Get weight vector for feature dimensions
   */
  getWeightVector() {
    const w = this.featureWeights
    return [
      // Structure type (6 dimensions)
      w.structureType, w.structureType, w.structureType, 
      w.structureType, w.structureType, w.structureType,
      // Confidence
      w.confidence,
      // Duration
      w.duration,
      // Material variation indicators
      w.materialVariation, w.materialVariation,
      // Cadence type (5 dimensions)
      w.cadenceType, w.cadenceType, w.cadenceType, w.cadenceType, w.cadenceType,
      // Period type (4 dimensions)
      w.periodType, w.periodType, w.periodType, w.periodType,
      // Emotion features (3 dimensions)
      w.emotionTempo, w.emotionDynamics, w.emotionTension
    ]
  }

  /**
   * Update feature weights based on user feedback
   * Called when user accepts/rejects recommendations
   */
  updateFeatureWeights(features, accepted) {
    const adjustment = accepted ? 0.05 : -0.03
    
    // Increase weights for features that led to accepted recommendations
    if (features.type) {
      this.featureWeights.structureType = Math.max(0.1, Math.min(2.0, 
        this.featureWeights.structureType + adjustment))
    }
    if (features.cadence) {
      this.featureWeights.cadenceType = Math.max(0.1, Math.min(2.0,
        this.featureWeights.cadenceType + adjustment))
    }
    if (features.periodType) {
      this.featureWeights.periodType = Math.max(0.1, Math.min(2.0,
        this.featureWeights.periodType + adjustment))
    }
  }

  /**
   * Extract feature vector from musical features
   * Extended to include emotion features for better matching
   */
  extractFeatureVector(features) {
    const vector = []

    // Structure type (one-hot encoding) - 6 dimensions
    const structureTypes = ['motive', 'subphrase', 'phrase', 'period', 'theme', 'section']
    structureTypes.forEach(type => {
      vector.push(features.type === type ? 1 : 0)
    })

    // Confidence - 1 dimension
    vector.push(features.confidence || 0.5)

    // Duration (normalized) - 1 dimension
    const duration = (features.endMeasure - features.startMeasure + 1) / 16
    vector.push(Math.min(1, duration))

    // Material similarity indicators - 2 dimensions
    vector.push(features.material?.includes("'") ? 1 : 0) // Is variation
    vector.push(features.material?.length > 1 ? 1 : 0) // Is compound

    // Cadence type (if available) - 5 dimensions
    const cadenceTypes = ['perfect_authentic', 'imperfect_authentic', 'half', 'deceptive', 'none']
    const cadenceType = features.cadence?.type || 'none'
    cadenceTypes.forEach(type => {
      vector.push(cadenceType === type ? 1 : 0)
    })

    // Period type (if available) - 4 dimensions
    const periodTypes = ['parallel', 'contrasting', 'sequential', 'none']
    const periodType = features.periodType || 'none'
    periodTypes.forEach(type => {
      vector.push(periodType === type ? 1 : 0)
    })

    // Emotion features (if available) - 3 dimensions
    // Tempo: fast=1, moderate=0.5, slow=0
    const tempoMap = { fast: 1, moderate: 0.5, slow: 0 }
    vector.push(tempoMap[features.emotionTempo] ?? 0.5)
    
    // Dynamics: strong=1, moderate=0.5, soft=0
    const dynamicsMap = { strong: 1, moderate: 0.5, soft: 0 }
    vector.push(dynamicsMap[features.emotionDynamics] ?? 0.5)
    
    // Tension: tense=1, neutral=0.5, relaxed=0
    const tensionMap = { tense: 1, neutral: 0.5, relaxed: 0 }
    vector.push(tensionMap[features.emotionTension] ?? 0.5)

    return vector
  }

  /**
   * Calculate simple Euclidean distance (fallback)
   */
  euclideanDistance(vec1, vec2) {
    let sum = 0
    const len = Math.min(vec1.length, vec2.length)
    
    for (let i = 0; i < len; i++) {
      const diff = (vec1[i] || 0) - (vec2[i] || 0)
      sum += diff * diff
    }
    
    return Math.sqrt(sum)
  }

  /**
   * Get the number of examples learned
   */
  getExampleCount() {
    return this.exampleCount
  }

  /**
   * Clear all learned preferences
   */
  clear() {
    this.examples = []
    this.exampleCount = 0
  }

  /**
   * Export preferences for session save
   */
  export() {
    return {
      examples: this.examples,
      exampleCount: this.exampleCount
    }
  }

  /**
   * Import preferences from session data
   */
  import(data) {
    if (data.examples) {
      this.examples = data.examples
      this.exampleCount = data.exampleCount || data.examples.length
    }
  }

  /**
   * Get learning statistics
   */
  getStats() {
    const accepts = this.examples.filter(e => e.reward === 1).length
    const modifies = this.examples.filter(e => e.reward === 0.5).length
    const rejects = this.examples.filter(e => e.reward === -1).length

    return {
      total: this.exampleCount,
      accepts,
      modifies,
      rejects,
      acceptRate: this.exampleCount > 0 ? accepts / this.exampleCount : 0,
      featureWeights: { ...this.featureWeights },
      kValue: this.k
    }
  }

  /**
   * Get detailed learning status for UI display
   */
  getLearningStatus() {
    const stats = this.getStats()
    return {
      exampleCount: this.exampleCount,
      isLearning: this.exampleCount >= this.minExamplesForRecommendation,
      learningProgress: Math.min(100, (this.exampleCount / 10) * 100),
      stats,
      message: this.exampleCount < this.minExamplesForRecommendation
        ? `Need ${this.minExamplesForRecommendation - this.exampleCount} more selections to start learning`
        : `Learning from ${this.exampleCount} examples (${Math.round(stats.acceptRate * 100)}% accept rate)`
    }
  }

  /**
   * Adjust K value based on example count
   */
  adjustK() {
    // Increase K as we get more examples
    if (this.exampleCount > 20) {
      this.k = 7
    } else if (this.exampleCount > 10) {
      this.k = 5
    } else {
      this.k = 3
    }
  }
}

export default PreferenceManager
