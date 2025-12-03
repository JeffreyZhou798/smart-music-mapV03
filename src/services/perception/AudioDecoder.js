/**
 * Audio Decoder - Perception Layer
 * Decodes MP3 files using Web Audio API
 */

export class AudioDecoder {
  constructor() {
    this.audioContext = null
    this.audioBuffer = null
    this.waveform = null
  }

  /**
   * Initialize the audio context
   */
  initContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    return this.audioContext
  }

  /**
   * Decode an audio file (MP3)
   * @param {File} file 
   * @returns {Promise<AudioBuffer>}
   */
  async decode(file) {
    this.initContext()
    
    const arrayBuffer = await file.arrayBuffer()
    
    try {
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      this.waveform = this.audioBuffer.getChannelData(0)
      return this.audioBuffer
    } catch (error) {
      throw new Error('Failed to decode audio file: ' + error.message)
    }
  }

  /**
   * Get the waveform data (first channel)
   * @returns {Float32Array}
   */
  getWaveform() {
    if (!this.audioBuffer) {
      throw new Error('No audio loaded. Call decode() first.')
    }
    return this.waveform
  }

  /**
   * Get the duration in seconds
   * @returns {number}
   */
  getDuration() {
    if (!this.audioBuffer) {
      throw new Error('No audio loaded. Call decode() first.')
    }
    return this.audioBuffer.duration
  }

  /**
   * Get the sample rate
   * @returns {number}
   */
  getSampleRate() {
    if (!this.audioBuffer) {
      throw new Error('No audio loaded. Call decode() first.')
    }
    return this.audioBuffer.sampleRate
  }

  /**
   * Get audio buffer
   * @returns {AudioBuffer}
   */
  getAudioBuffer() {
    return this.audioBuffer
  }

  /**
   * Get audio context
   * @returns {AudioContext}
   */
  getAudioContext() {
    return this.initContext()
  }

  /**
   * Process audio in chunks for large files
   * @param {number} chunkDuration - Duration of each chunk in seconds
   * @param {Function} processor - Callback function for each chunk
   */
  async processInChunks(chunkDuration = 30, processor) {
    if (!this.audioBuffer) {
      throw new Error('No audio loaded. Call decode() first.')
    }

    const sampleRate = this.audioBuffer.sampleRate
    const chunkSamples = Math.floor(chunkDuration * sampleRate)
    const totalSamples = this.audioBuffer.length
    const results = []

    for (let start = 0; start < totalSamples; start += chunkSamples) {
      const end = Math.min(start + chunkSamples, totalSamples)
      const chunkData = this.waveform.slice(start, end)
      
      const result = await processor(chunkData, start / sampleRate, end / sampleRate)
      results.push(result)
    }

    return results
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
    }
    this.audioBuffer = null
    this.waveform = null
    this.audioContext = null
  }
}

export default AudioDecoder
