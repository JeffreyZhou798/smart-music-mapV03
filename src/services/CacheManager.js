/**
 * Cache Manager - IndexedDB Caching
 * Caches model weights, embeddings, and alignment data
 */

import { get, set, del, clear, keys } from 'idb-keyval'

const CACHE_PREFIX = 'smm_'
const CACHE_VERSION = '1.0'
const MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days

export class CacheManager {
  constructor() {
    this.initialized = false
  }

  /**
   * Generate cache key with prefix
   */
  getKey(type, id) {
    return `${CACHE_PREFIX}${type}_${id}`
  }

  /**
   * Cache model weights
   */
  async cacheModelWeights(modelName, weights) {
    const key = this.getKey('model', modelName)
    const data = {
      weights,
      timestamp: Date.now(),
      version: CACHE_VERSION
    }
    await set(key, data)
  }

  /**
   * Get cached model weights
   */
  async getModelWeights(modelName) {
    const key = this.getKey('model', modelName)
    const data = await get(key)
    
    if (!data) return null
    if (this.isExpired(data.timestamp)) {
      await del(key)
      return null
    }
    
    return data.weights
  }

  /**
   * Cache computed embeddings
   */
  async cacheEmbeddings(fileHash, embeddings) {
    const key = this.getKey('embed', fileHash)
    const data = {
      embeddings: Array.from(embeddings),
      timestamp: Date.now(),
      version: CACHE_VERSION
    }
    await set(key, data)
  }

  /**
   * Get cached embeddings
   */
  async getEmbeddings(fileHash) {
    const key = this.getKey('embed', fileHash)
    const data = await get(key)
    
    if (!data) return null
    if (this.isExpired(data.timestamp)) {
      await del(key)
      return null
    }
    
    return new Float32Array(data.embeddings)
  }

  /**
   * Cache alignment result
   */
  async cacheAlignment(fileHash, alignment) {
    const key = this.getKey('align', fileHash)
    const data = {
      alignment: {
        path: alignment.path,
        measureToTime: Object.fromEntries(alignment.measureToTime || []),
        confidence: alignment.confidence
      },
      timestamp: Date.now(),
      version: CACHE_VERSION
    }
    await set(key, data)
  }

  /**
   * Get cached alignment
   */
  async getAlignment(fileHash) {
    const key = this.getKey('align', fileHash)
    const data = await get(key)
    
    if (!data) return null
    if (this.isExpired(data.timestamp)) {
      await del(key)
      return null
    }
    
    return {
      path: data.alignment.path,
      measureToTime: new Map(Object.entries(data.alignment.measureToTime)),
      confidence: data.alignment.confidence
    }
  }

  /**
   * Cache analysis result
   */
  async cacheAnalysis(fileHash, analysis) {
    const key = this.getKey('analysis', fileHash)
    const data = {
      analysis,
      timestamp: Date.now(),
      version: CACHE_VERSION
    }
    await set(key, data)
  }

  /**
   * Get cached analysis
   */
  async getAnalysis(fileHash) {
    const key = this.getKey('analysis', fileHash)
    const data = await get(key)
    
    if (!data) return null
    if (this.isExpired(data.timestamp)) {
      await del(key)
      return null
    }
    
    return data.analysis
  }

  /**
   * Check if cache entry is expired
   */
  isExpired(timestamp) {
    return Date.now() - timestamp > MAX_AGE
  }

  /**
   * Generate hash from file content
   */
  async generateFileHash(file) {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Clear all cached data
   */
  async clearAll() {
    const allKeys = await keys()
    const cacheKeys = allKeys.filter(k => k.startsWith(CACHE_PREFIX))
    
    for (const key of cacheKeys) {
      await del(key)
    }
  }

  /**
   * Clear expired entries
   */
  async clearExpired() {
    const allKeys = await keys()
    const cacheKeys = allKeys.filter(k => k.startsWith(CACHE_PREFIX))
    
    for (const key of cacheKeys) {
      const data = await get(key)
      if (data && this.isExpired(data.timestamp)) {
        await del(key)
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const allKeys = await keys()
    const cacheKeys = allKeys.filter(k => k.startsWith(CACHE_PREFIX))
    
    const stats = {
      totalEntries: cacheKeys.length,
      models: 0,
      embeddings: 0,
      alignments: 0,
      analyses: 0
    }
    
    for (const key of cacheKeys) {
      if (key.includes('_model_')) stats.models++
      else if (key.includes('_embed_')) stats.embeddings++
      else if (key.includes('_align_')) stats.alignments++
      else if (key.includes('_analysis_')) stats.analyses++
    }
    
    return stats
  }
}

export default new CacheManager()
