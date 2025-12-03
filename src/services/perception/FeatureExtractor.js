/**
 * Feature Extractor - Perception Layer
 * Extracts audio features using Meyda.js
 */

import Meyda from 'meyda'

export class FeatureExtractor {
  constructor() {
    this.bufferSize = 2048
    this.hopSize = 1024
  }

  /**
   * Extract Meyda features from audio buffer
   * @param {AudioBuffer} audioBuffer 
   * @returns {Object} MeydaFeatures
   */
  extractMeyda(audioBuffer) {
    const channelData = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate
    
    const features = {
      rms: [],
      spectralCentroid: [],
      zcr: [],
      mfcc: [],
      chroma: [],
      timestamps: []
    }

    // Process in windows
    for (let i = 0; i < channelData.length - this.bufferSize; i += this.hopSize) {
      const windowData = channelData.slice(i, i + this.bufferSize)
      const timestamp = i / sampleRate

      try {
        const extracted = Meyda.extract(
          ['rms', 'spectralCentroid', 'zcr', 'mfcc', 'chroma'],
          windowData
        )

        if (extracted) {
          features.rms.push(extracted.rms || 0)
          features.spectralCentroid.push(extracted.spectralCentroid || 0)
          features.zcr.push(extracted.zcr || 0)
          features.mfcc.push(extracted.mfcc || new Array(13).fill(0))
          features.chroma.push(extracted.chroma || new Array(12).fill(0))
          features.timestamps.push(timestamp)
        }
      } catch (error) {
        console.warn('Feature extraction error at', timestamp, error)
      }
    }

    return features
  }

  /**
   * Extract Chroma features for DTW alignment
   * @param {AudioBuffer} audioBuffer 
   * @returns {number[][]} Chroma features
   */
  extractChroma(audioBuffer) {
    const channelData = audioBuffer.getChannelData(0)
    const chromaFeatures = []

    for (let i = 0; i < channelData.length - this.bufferSize; i += this.hopSize) {
      const windowData = channelData.slice(i, i + this.bufferSize)
      
      try {
        const extracted = Meyda.extract(['chroma'], windowData)
        if (extracted && extracted.chroma) {
          chromaFeatures.push(extracted.chroma)
        }
      } catch (error) {
        chromaFeatures.push(new Array(12).fill(0))
      }
    }

    return chromaFeatures
  }

  /**
   * Extract MFCC features
   * @param {AudioBuffer} audioBuffer 
   * @returns {number[][]} MFCC features
   */
  extractMFCC(audioBuffer) {
    const channelData = audioBuffer.getChannelData(0)
    const mfccFeatures = []

    for (let i = 0; i < channelData.length - this.bufferSize; i += this.hopSize) {
      const windowData = channelData.slice(i, i + this.bufferSize)
      
      try {
        const extracted = Meyda.extract(['mfcc'], windowData)
        if (extracted && extracted.mfcc) {
          mfccFeatures.push(extracted.mfcc)
        }
      } catch (error) {
        mfccFeatures.push(new Array(13).fill(0))
      }
    }

    return mfccFeatures
  }

  /**
   * Calculate onset density (rhythm tension indicator)
   * @param {number[]} rmsValues 
   * @returns {number[]}
   */
  calculateOnsetDensity(rmsValues) {
    const onsets = []
    const threshold = 0.02
    
    for (let i = 1; i < rmsValues.length; i++) {
      const diff = rmsValues[i] - rmsValues[i - 1]
      onsets.push(diff > threshold ? 1 : 0)
    }

    // Calculate density in windows
    const windowSize = 10
    const density = []
    
    for (let i = 0; i < onsets.length; i += windowSize) {
      const window = onsets.slice(i, i + windowSize)
      const sum = window.reduce((a, b) => a + b, 0)
      density.push(sum / window.length)
    }

    return density
  }

  /**
   * Calculate velocity curve (dynamic contrast)
   * @param {number[]} rmsValues 
   * @returns {number[]}
   */
  calculateVelocityCurve(rmsValues) {
    // Normalize RMS to 0-127 range (MIDI velocity)
    const maxRms = Math.max(...rmsValues)
    const minRms = Math.min(...rmsValues)
    const range = maxRms - minRms || 1

    return rmsValues.map(rms => 
      Math.round(((rms - minRms) / range) * 127)
    )
  }

  /**
   * Calculate pitch distribution from chroma features
   * @param {number[][]} chromaFeatures 
   * @returns {number[]}
   */
  calculatePitchDistribution(chromaFeatures) {
    const distribution = new Array(12).fill(0)
    
    chromaFeatures.forEach(chroma => {
      chroma.forEach((value, index) => {
        distribution[index] += value
      })
    })

    // Normalize
    const total = distribution.reduce((a, b) => a + b, 0) || 1
    return distribution.map(v => v / total)
  }

  /**
   * Detect potential structure boundaries based on feature changes
   * @param {Object} features - Meyda features
   * @returns {number[]} - Timestamps of potential boundaries
   */
  detectBoundaries(features) {
    const boundaries = []
    const threshold = 0.3

    // Look for significant changes in spectral centroid
    for (let i = 1; i < features.spectralCentroid.length; i++) {
      const prev = features.spectralCentroid[i - 1]
      const curr = features.spectralCentroid[i]
      const change = Math.abs(curr - prev) / (prev || 1)

      if (change > threshold) {
        boundaries.push(features.timestamps[i])
      }
    }

    return boundaries
  }

  /**
   * Set buffer size for feature extraction
   * @param {number} size 
   */
  setBufferSize(size) {
    this.bufferSize = size
  }

  /**
   * Set hop size for feature extraction
   * @param {number} size 
   */
  setHopSize(size) {
    this.hopSize = size
  }
}

export default FeatureExtractor
