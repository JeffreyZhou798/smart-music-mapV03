/**
 * DTW Aligner - Logic Layer
 * Aligns symbolic (MusicXML) and acoustic (MP3) data using Dynamic Time Warping
 */

export class DTWAligner {
  constructor() {
    this.alignmentResult = null
    this.measureToTime = new Map()
    this.timeToMeasure = new Map()
  }

  /**
   * Perform DTW alignment between symbolic and acoustic features
   * @param {number[][]} symbolicChroma - Chroma features from MusicXML
   * @param {number[][]} acousticChroma - Chroma features from audio
   * @param {Object} options - Alignment options
   * @returns {Object} AlignmentResult
   */
  align(symbolicChroma, acousticChroma, options = {}) {
    const {
      hopSize = 1024,
      sampleRate = 44100,
      beatsPerMeasure = 4,
      tempo = 120
    } = options

    // Calculate DTW path
    const { path, distance } = this.computeDTW(symbolicChroma, acousticChroma)

    // Convert path to measure-time mappings
    const secondsPerFrame = hopSize / sampleRate
    const secondsPerBeat = 60 / tempo
    const secondsPerMeasure = secondsPerBeat * beatsPerMeasure

    this.measureToTime.clear()
    this.timeToMeasure.clear()

    // Map symbolic frames to measures
    const framesPerMeasure = Math.round(secondsPerMeasure / secondsPerFrame)

    path.forEach(([symbolicIdx, acousticIdx]) => {
      const measureNumber = Math.floor(symbolicIdx / framesPerMeasure) + 1
      const timestamp = acousticIdx * secondsPerFrame

      if (!this.measureToTime.has(measureNumber)) {
        this.measureToTime.set(measureNumber, timestamp)
      }

      const roundedTime = Math.round(timestamp * 10) / 10
      if (!this.timeToMeasure.has(roundedTime)) {
        this.timeToMeasure.set(roundedTime, measureNumber)
      }
    })

    // Calculate confidence based on alignment quality
    const maxDistance = symbolicChroma.length * acousticChroma.length
    const confidence = 1 - (distance / maxDistance)

    this.alignmentResult = {
      path,
      measureToTime: this.measureToTime,
      timeToMeasure: this.timeToMeasure,
      confidence: Math.max(0, Math.min(1, confidence)),
      distance
    }

    return this.alignmentResult
  }

  /**
   * Compute DTW distance and path
   * @param {number[][]} seq1 
   * @param {number[][]} seq2 
   * @returns {Object} { path, distance }
   */
  computeDTW(seq1, seq2) {
    const n = seq1.length
    const m = seq2.length

    if (n === 0 || m === 0) {
      return { path: [], distance: Infinity }
    }

    // Initialize cost matrix
    const dtw = Array(n + 1).fill(null).map(() => 
      Array(m + 1).fill(Infinity)
    )
    dtw[0][0] = 0

    // Fill cost matrix
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = this.euclideanDistance(seq1[i - 1], seq2[j - 1])
        dtw[i][j] = cost + Math.min(
          dtw[i - 1][j],     // insertion
          dtw[i][j - 1],     // deletion
          dtw[i - 1][j - 1]  // match
        )
      }
    }

    // Backtrack to find optimal path
    const path = this.backtrack(dtw, n, m)

    return {
      path,
      distance: dtw[n][m]
    }
  }

  /**
   * Backtrack through DTW matrix to find optimal path
   */
  backtrack(dtw, n, m) {
    const path = []
    let i = n
    let j = m

    while (i > 0 && j > 0) {
      path.unshift([i - 1, j - 1])

      const diag = dtw[i - 1][j - 1]
      const left = dtw[i][j - 1]
      const up = dtw[i - 1][j]

      if (diag <= left && diag <= up) {
        i--
        j--
      } else if (left < up) {
        j--
      } else {
        i--
      }
    }

    return path
  }

  /**
   * Calculate Euclidean distance between two feature vectors
   */
  euclideanDistance(vec1, vec2) {
    if (!vec1 || !vec2) return Infinity
    
    let sum = 0
    const len = Math.min(vec1.length, vec2.length)
    
    for (let i = 0; i < len; i++) {
      const diff = (vec1[i] || 0) - (vec2[i] || 0)
      sum += diff * diff
    }
    
    return Math.sqrt(sum)
  }

  /**
   * Get timestamp for a measure number
   * @param {number} measureNumber 
   * @returns {number} timestamp in seconds
   */
  getTimestamp(measureNumber) {
    if (this.measureToTime.has(measureNumber)) {
      return this.measureToTime.get(measureNumber)
    }

    // Interpolate if exact measure not found
    const measures = Array.from(this.measureToTime.keys()).sort((a, b) => a - b)
    
    if (measures.length === 0) return 0

    // Find surrounding measures
    let lower = measures[0]
    let upper = measures[measures.length - 1]

    for (const m of measures) {
      if (m <= measureNumber) lower = m
      if (m >= measureNumber && m < upper) upper = m
    }

    if (lower === upper) {
      return this.measureToTime.get(lower)
    }

    // Linear interpolation
    const lowerTime = this.measureToTime.get(lower)
    const upperTime = this.measureToTime.get(upper)
    const ratio = (measureNumber - lower) / (upper - lower)

    return lowerTime + ratio * (upperTime - lowerTime)
  }

  /**
   * Get measure number for a timestamp
   * @param {number} timestamp in seconds
   * @returns {number} measure number
   */
  getMeasure(timestamp) {
    const roundedTime = Math.round(timestamp * 10) / 10
    
    if (this.timeToMeasure.has(roundedTime)) {
      return this.timeToMeasure.get(roundedTime)
    }

    // Find closest time
    let closestTime = 0
    let minDiff = Infinity

    for (const time of this.timeToMeasure.keys()) {
      const diff = Math.abs(time - timestamp)
      if (diff < minDiff) {
        minDiff = diff
        closestTime = time
      }
    }

    return this.timeToMeasure.get(closestTime) || 1
  }

  /**
   * Manually adjust an alignment point
   * @param {number} measureNumber 
   * @param {number} newTimestamp 
   */
  adjustAlignment(measureNumber, newTimestamp) {
    this.measureToTime.set(measureNumber, newTimestamp)
    
    // Update reverse mapping
    const roundedTime = Math.round(newTimestamp * 10) / 10
    this.timeToMeasure.set(roundedTime, measureNumber)

    // Recalculate confidence (lower due to manual adjustment)
    if (this.alignmentResult) {
      this.alignmentResult.confidence = Math.max(0.5, this.alignmentResult.confidence - 0.05)
    }
  }

  /**
   * Get alignment result
   */
  getAlignmentResult() {
    return this.alignmentResult
  }

  /**
   * Get all measure-to-time mappings
   */
  getAllMappings() {
    return {
      measureToTime: Object.fromEntries(this.measureToTime),
      timeToMeasure: Object.fromEntries(this.timeToMeasure)
    }
  }

  /**
   * Generate chroma features from symbolic notes
   * @param {Note[]} notes 
   * @param {number} totalMeasures 
   * @param {number} framesPerMeasure 
   * @returns {number[][]}
   */
  static generateSymbolicChroma(notes, totalMeasures, framesPerMeasure = 10) {
    const pitchClasses = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    }

    const totalFrames = totalMeasures * framesPerMeasure
    const chroma = Array(totalFrames).fill(null).map(() => new Array(12).fill(0))

    notes.forEach(note => {
      if (!note.pitch) return

      const pitchName = note.pitch.replace(/[0-9]/g, '')
      const pc = pitchClasses[pitchName]
      
      if (pc === undefined) return

      const startFrame = Math.floor((note.measureNumber - 1) * framesPerMeasure + 
                                    (note.beat / 4) * framesPerMeasure)
      const endFrame = Math.min(startFrame + Math.ceil(note.duration * framesPerMeasure / 4), totalFrames - 1)

      for (let f = startFrame; f <= endFrame; f++) {
        if (f >= 0 && f < totalFrames) {
          chroma[f][pc] += 1
        }
      }
    })

    // Normalize each frame
    return chroma.map(frame => {
      const sum = frame.reduce((a, b) => a + b, 0) || 1
      return frame.map(v => v / sum)
    })
  }
}

export default DTWAligner
