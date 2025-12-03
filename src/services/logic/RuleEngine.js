/**
 * RuleEngine - Logic Layer
 * Implements comprehensive music theory rules for structural analysis
 * Based on MusicFormTheory.md knowledge base
 * 
 * 音乐结构层级：音符 → 动机 → 乐节 → 乐句 → 乐段 → 主题 → 乐部
 * Musical Structure Hierarchy: Note → Motive → Sub-phrase → Phrase → Period → Theme → Section
 * 
 * Key Features:
 * - Zero-shot inference (no training required)
 * - Confidence scoring with uncertainty visualization
 * - Chunk-by-chunk processing for memory efficiency
 * - Tooltip data generation for UI display
 * 
 * @version 1.0.0
 */

// Model version for tooltip display
export const RULE_ENGINE_VERSION = '1.0.0'

// Simple UUID generator
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Confidence thresholds for visualization
 * Low confidence nodes should be displayed with dashed lines / semi-transparent
 */
export const ConfidenceThresholds = {
  HIGH: 0.8,      // Solid line, full opacity
  MEDIUM: 0.6,    // Normal line, slight transparency
  LOW: 0.4,       // Dashed line, semi-transparent
  VERY_LOW: 0.2   // Dotted line, very transparent
}

/**
 * Get visual style based on confidence level
 * @param {number} confidence 
 * @returns {Object} Visual style properties
 */
export function getConfidenceVisualStyle(confidence) {
  if (confidence >= ConfidenceThresholds.HIGH) {
    return {
      lineStyle: 'solid',
      opacity: 1.0,
      borderWidth: 2,
      uncertaintyLevel: 'low'
    }
  } else if (confidence >= ConfidenceThresholds.MEDIUM) {
    return {
      lineStyle: 'solid',
      opacity: 0.85,
      borderWidth: 2,
      uncertaintyLevel: 'medium'
    }
  } else if (confidence >= ConfidenceThresholds.LOW) {
    return {
      lineStyle: 'dashed',
      opacity: 0.7,
      borderWidth: 1,
      uncertaintyLevel: 'high'
    }
  } else {
    return {
      lineStyle: 'dotted',
      opacity: 0.5,
      borderWidth: 1,
      uncertaintyLevel: 'very_high'
    }
  }
}

/**
 * 音乐结构层级常量 - Musical Structure Level Constants
 * Based on MusicFormTheory.md hierarchy
 */
export const StructureLevels = {
  NOTE: 'note',           // 音符
  MOTIVE: 'motive',       // 动机 - 最小可辨认单位，约1-2拍
  SUBPHRASE: 'subphrase', // 乐节 - 约1小节，半个"逗号"
  PHRASE: 'phrase',       // 乐句 - 2-4小节，完整话语
  PERIOD: 'period',       // 乐段 - 8-16小节，段落
  THEME: 'theme',         // 主题 - 核心材料
  SECTION: 'section'      // 乐部 - 大型结构单位
}

/**
 * 曲式类型常量 - Form Type Constants
 */
export const FormTypes = {
  // 小型曲式 - Small Forms (乐段为结构单位)
  ONE_PART: 'one_part',                    // 一段曲式/一部曲式
  BINARY_PARALLEL: 'binary_parallel',       // 并列单二部曲式
  BINARY_ROUNDED: 'binary_rounded',         // 再现单二部曲式
  TERNARY_SIMPLE: 'ternary_simple',         // 再现单三部曲式
  TERNARY_PARALLEL: 'ternary_parallel',     // 并列单三部曲式
  TERNARY_COMPOUND: 'ternary_compound',     // 复三部曲式
  
  // 大型曲式 - Large Forms (乐部为结构单位)
  RONDO: 'rondo',                           // 回旋曲式
  VARIATION: 'variation',                   // 变奏曲式
  SONATA: 'sonata',                         // 奏鸣曲式
  SONATA_RONDO: 'sonata_rondo',            // 回旋奏鸣曲式
  FUGUE: 'fugue',                          // 赋格
  
  // 流行音乐曲式 - Popular Music Forms
  VERSE_CHORUS: 'verse_chorus',            // 主歌-副歌式
  AABA: 'aaba',                            // AABA曲式
  STROPHIC: 'strophic'                     // 分节歌形式
}

/**
 * 终止式类型 - Cadence Types
 */
export const CadenceTypes = {
  PERFECT_AUTHENTIC: 'perfect_authentic',   // 完满全终止 V→I (根音位置)
  IMPERFECT_AUTHENTIC: 'imperfect_authentic', // 不完满全终止
  HALF: 'half',                             // 半终止 (停在V)
  DECEPTIVE: 'deceptive',                   // 阻碍终止 V→VI
  PLAGAL: 'plagal',                         // 变格终止 IV→I
  PHRYGIAN: 'phrygian'                      // 弗里几亚终止
}

/**
 * 乐段类型 - Period Types
 */
export const PeriodTypes = {
  PARALLEL: 'parallel',           // 平行乐段 - 同头换尾 a+a'
  CONTRASTING: 'contrasting',     // 对比乐段 - a+b
  SEQUENTIAL: 'sequential',       // 模进乐段 - 同材料不同高度
  THREE_PHRASE: 'three_phrase',   // 三句乐段
  FOUR_PHRASE: 'four_phrase',     // 四句乐段
  COMPOUND: 'compound'            // 复乐段
}

/**
 * 乐段比例类型 - Period Proportion Types
 */
export const ProportionTypes = {
  SQUARE: 'square',       // 方整性 - 4+4, 8+8 (2的倍数)
  REGULAR: 'regular',     // 规整性 - 等长但非2倍数 5+5, 6+6
  NON_SQUARE: 'non_square' // 非方整性 - 不等长
}

/**
 * 中部类型 - Middle Section Types (用于三部曲式)
 */
export const MiddleSectionTypes = {
  TRIO: 'trio',                   // 三声中部 - 稳定调性，有曲式
  EPISODE: 'episode',             // 插部性中部 - 调性开放，无完整曲式
  DEVELOPMENT: 'development',     // 展开性中部 - 使用A材料展开
  MIXED: 'mixed'                  // 混合型中部
}

/**
 * 材料发展手法 - Material Development Techniques
 */
export const DevelopmentTechniques = {
  REPETITION: 'repetition',       // 重复
  SEQUENCE: 'sequence',           // 模进
  VARIATION: 'variation',         // 变奏
  FRAGMENTATION: 'fragmentation', // 裁截
  AUGMENTATION: 'augmentation',   // 扩大
  DIMINUTION: 'diminution',       // 缩小
  INVERSION: 'inversion',         // 倒影
  RETROGRADE: 'retrograde',       // 逆行
  CONTRAST: 'contrast'            // 对比
}

export class RuleEngine {
  constructor() {
    // Version info for tooltip display
    this.version = RULE_ENGINE_VERSION
    
    // Processing configuration for chunk-by-chunk analysis
    this.chunkConfig = {
      maxNotesPerChunk: 500,      // Process notes in chunks to avoid memory issues
      maxMeasuresPerChunk: 32,    // Process measures in chunks
      overlapMeasures: 4          // Overlap between chunks for boundary detection
    }
    
    // 音名到音级的映射
    this.pitchClasses = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'Fb': 4, 'E#': 5, 'F': 5, 'F#': 6, 'Gb': 6,
      'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10,
      'B': 11, 'Cb': 11, 'B#': 0
    }
    
    // 大小调音阶
    this.scales = {
      major: [0, 2, 4, 5, 7, 9, 11],
      natural_minor: [0, 2, 3, 5, 7, 8, 10],
      harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
      melodic_minor: [0, 2, 3, 5, 7, 9, 11]
    }
    
    // 中古调式 (教会调式)
    this.churchModes = {
      ionian: [0, 2, 4, 5, 7, 9, 11],     // 伊奥尼亚 (大调)
      dorian: [0, 2, 3, 5, 7, 9, 10],     // 多利亚
      phrygian: [0, 1, 3, 5, 7, 8, 10],   // 弗里几亚
      lydian: [0, 2, 4, 6, 7, 9, 11],     // 利底亚
      mixolydian: [0, 2, 4, 5, 7, 9, 10], // 混合利底亚
      aeolian: [0, 2, 3, 5, 7, 8, 10],    // 爱奥利亚 (自然小调)
      locrian: [0, 1, 3, 5, 6, 8, 10]     // 洛克利亚
    }
    
    // 民族五声调式
    this.pentatonicModes = {
      gong: [0, 2, 4, 7, 9],    // 宫调式
      shang: [0, 2, 5, 7, 10],  // 商调式
      jue: [0, 3, 5, 8, 10],    // 角调式
      zhi: [0, 2, 5, 7, 9],     // 徵调式
      yu: [0, 3, 5, 7, 10]      // 羽调式
    }
    
    // 典型小节长度
    this.typicalLengths = {
      motive: { min: 0.5, max: 2 },    // 动机: 0.5-2小节
      subphrase: { min: 1, max: 2 },   // 乐节: 1-2小节
      phrase: { min: 2, max: 8 },      // 乐句: 2-8小节
      period: { min: 4, max: 16 }      // 乐段: 4-16小节
    }
  }

  // ==================== 动机检测 Motive Detection ====================
  
  /**
   * 检测动机 - Detect motives (最小可辨认音乐单位)
   * 动机是包含重拍的几个音符，约1-2拍
   * @param {Note[]} notes 
   * @param {Object} timeSignature 
   * @returns {Motive[]}
   */
  detectMotives(notes, timeSignature = { beats: 4, beatType: 4 }) {
    const motives = []
    if (!notes || notes.length < 2) return motives
    
    const beatsPerMeasure = timeSignature.beats
    const measureGroups = this.groupNotesByMeasure(notes)
    const measureNumbers = Object.keys(measureGroups).map(Number).sort((a, b) => a - b)
    
    let motiveIndex = 0
    
    for (const measureNum of measureNumbers) {
      const measureNotes = measureGroups[measureNum]
      if (!measureNotes || measureNotes.length === 0) continue
      
      // 按拍位分组，寻找包含重拍的音符组
      const beatGroups = this.groupNotesByBeat(measureNotes, beatsPerMeasure)
      
      // 动机通常从重拍开始，包含2-4个音符
      let currentMotive = []
      let motiveStartBeat = 0
      
      for (let beat = 0; beat < beatsPerMeasure; beat++) {
        const beatNotes = beatGroups[beat] || []
        
        // 重拍位置 (第1拍和第3拍在4/4拍中)
        const isStrongBeat = beat === 0 || (beatsPerMeasure === 4 && beat === 2)
        
        if (isStrongBeat && currentMotive.length > 0) {
          // 保存当前动机
          if (currentMotive.length >= 2) {
            motives.push({
              id: generateId(),
              index: motiveIndex++,
              notes: [...currentMotive],
              measureNumber: measureNum,
              startBeat: motiveStartBeat,
              intervalPattern: this.extractIntervalPattern(currentMotive),
              rhythmPattern: this.extractRhythmPattern(currentMotive),
              contour: this.extractContour(currentMotive)
            })
          }
          currentMotive = []
          motiveStartBeat = beat
        }
        
        currentMotive.push(...beatNotes)
      }
      
      // 处理小节末尾的动机
      if (currentMotive.length >= 2) {
        motives.push({
          id: generateId(),
          index: motiveIndex++,
          notes: [...currentMotive],
          measureNumber: measureNum,
          startBeat: motiveStartBeat,
          intervalPattern: this.extractIntervalPattern(currentMotive),
          rhythmPattern: this.extractRhythmPattern(currentMotive),
          contour: this.extractContour(currentMotive)
        })
      }
    }
    
    // 标记动机之间的关系
    this.labelMotiveRelationships(motives)
    
    return motives
  }

  /**
   * 提取音程模式
   */
  extractIntervalPattern(notes) {
    const intervals = []
    for (let i = 1; i < notes.length; i++) {
      const midi1 = this.pitchToMidi(notes[i - 1].pitch)
      const midi2 = this.pitchToMidi(notes[i].pitch)
      intervals.push(midi2 - midi1)
    }
    return intervals
  }

  /**
   * 提取节奏模式
   */
  extractRhythmPattern(notes) {
    return notes.map(n => n.duration || 1)
  }

  /**
   * 提取旋律轮廓 (上行/下行/平行)
   */
  extractContour(notes) {
    if (notes.length < 2) return 'static'
    
    const firstMidi = this.pitchToMidi(notes[0].pitch)
    const lastMidi = this.pitchToMidi(notes[notes.length - 1].pitch)
    const diff = lastMidi - firstMidi
    
    if (diff > 2) return 'ascending'
    if (diff < -2) return 'descending'
    return 'static'
  }

  /**
   * 标记动机之间的关系 (重复、模进、变奏等)
   */
  labelMotiveRelationships(motives) {
    for (let i = 1; i < motives.length; i++) {
      const prev = motives[i - 1]
      const curr = motives[i]
      
      const relationship = this.analyzeMotiveRelationship(prev, curr)
      curr.relationship = relationship
      curr.relatedTo = relationship.type !== 'new' ? prev.id : null
    }
  }

  /**
   * 分析两个动机之间的关系
   */
  analyzeMotiveRelationship(motive1, motive2) {
    const intervalSim = this.compareArrays(motive1.intervalPattern, motive2.intervalPattern)
    const rhythmSim = this.compareArrays(motive1.rhythmPattern, motive2.rhythmPattern)
    
    // 完全重复
    if (intervalSim > 0.9 && rhythmSim > 0.9) {
      return { type: DevelopmentTechniques.REPETITION, confidence: 0.95 }
    }
    
    // 模进 (音程模式相同，但整体移位)
    if (intervalSim > 0.8 && rhythmSim > 0.7) {
      const transposition = this.detectTransposition(motive1.notes, motive2.notes)
      if (transposition !== 0) {
        return { type: DevelopmentTechniques.SEQUENCE, confidence: 0.85, transposition }
      }
    }
    
    // 节奏变奏 (节奏相似，音高变化)
    if (rhythmSim > 0.8 && intervalSim < 0.5) {
      return { type: DevelopmentTechniques.VARIATION, confidence: 0.7 }
    }
    
    // 裁截 (使用部分材料)
    if (this.isFragmentation(motive1, motive2)) {
      return { type: DevelopmentTechniques.FRAGMENTATION, confidence: 0.75 }
    }
    
    // 倒影
    if (this.isInversion(motive1.intervalPattern, motive2.intervalPattern)) {
      return { type: DevelopmentTechniques.INVERSION, confidence: 0.8 }
    }
    
    // 新材料
    return { type: 'new', confidence: 0.6 }
  }

  // ==================== 乐节检测 Sub-phrase Detection ====================
  
  /**
   * 检测乐节 - Detect sub-phrases (约1小节，半个"逗号")
   * 乐节规模"大于动机、小于乐句"
   * @param {Note[]} notes 
   * @param {Motive[]} motives 
   * @returns {SubPhrase[]}
   */
  detectSubPhrases(notes, motives = []) {
    const subPhrases = []
    const measureGroups = this.groupNotesByMeasure(notes)
    const measureNumbers = Object.keys(measureGroups).map(Number).sort((a, b) => a - b)
    
    let subPhraseIndex = 0
    
    // 每1-2小节形成一个乐节
    for (let i = 0; i < measureNumbers.length; i++) {
      const measureNum = measureNumbers[i]
      const measureNotes = measureGroups[measureNum] || []
      
      // 检查是否有明显的内部分割点
      const hasInternalBreak = this.hasRhythmicBreak(measureNotes)
      
      if (hasInternalBreak && measureNotes.length > 4) {
        // 小节内部分割成两个乐节
        const midPoint = Math.floor(measureNotes.length / 2)
        
        subPhrases.push({
          id: generateId(),
          index: subPhraseIndex++,
          startMeasure: measureNum,
          endMeasure: measureNum,
          startBeat: 0,
          endBeat: 2,
          notes: measureNotes.slice(0, midPoint),
          motives: this.getMotivesInRange(motives, measureNum, 0, 2),
          material: this.assignMaterialLabel(subPhraseIndex - 1)
        })
        
        subPhrases.push({
          id: generateId(),
          index: subPhraseIndex++,
          startMeasure: measureNum,
          endMeasure: measureNum,
          startBeat: 2,
          endBeat: 4,
          notes: measureNotes.slice(midPoint),
          motives: this.getMotivesInRange(motives, measureNum, 2, 4),
          material: this.assignMaterialLabel(subPhraseIndex - 1)
        })
      } else {
        // 整个小节作为一个乐节
        subPhrases.push({
          id: generateId(),
          index: subPhraseIndex++,
          startMeasure: measureNum,
          endMeasure: measureNum,
          startBeat: 0,
          endBeat: 4,
          notes: measureNotes,
          motives: this.getMotivesInRange(motives, measureNum, 0, 4),
          material: this.assignMaterialLabel(subPhraseIndex - 1)
        })
      }
    }
    
    // 分析乐节之间的材料关系
    this.analyzeSubPhraseMaterials(subPhrases)
    
    return subPhrases
  }

  /**
   * 检查是否有节奏断点
   */
  hasRhythmicBreak(notes) {
    if (notes.length < 4) return false
    
    // 检查是否有较长的休止或长音
    for (let i = 1; i < notes.length - 1; i++) {
      const note = notes[i]
      if (note.duration >= 2 || note.isRest) {
        return true
      }
    }
    return false
  }

  /**
   * 获取指定范围内的动机
   */
  getMotivesInRange(motives, measureNum, startBeat, endBeat) {
    return motives.filter(m => 
      m.measureNumber === measureNum && 
      m.startBeat >= startBeat && 
      m.startBeat < endBeat
    )
  }

  /**
   * 分析乐节材料关系
   */
  analyzeSubPhraseMaterials(subPhrases) {
    const materialMap = new Map()
    let materialIndex = 0
    
    for (let i = 0; i < subPhrases.length; i++) {
      const sp = subPhrases[i]
      let foundSimilar = false
      
      // 与之前的乐节比较
      for (let j = 0; j < i; j++) {
        const prevSp = subPhrases[j]
        const similarity = this.calculateSubPhraseSimilarity(sp, prevSp)
        
        if (similarity > 0.8) {
          // 高度相似，使用相同材料标记加撇号
          sp.material = prevSp.material + "'"
          sp.similarTo = prevSp.id
          sp.similarity = similarity
          foundSimilar = true
          break
        } else if (similarity > 0.5) {
          // 中等相似，变体关系
          sp.material = prevSp.material + "v"
          sp.similarTo = prevSp.id
          sp.similarity = similarity
          foundSimilar = true
          break
        }
      }
      
      if (!foundSimilar) {
        sp.material = String.fromCharCode(97 + materialIndex) // a, b, c...
        materialIndex = Math.min(materialIndex + 1, 25)
      }
    }
  }

  /**
   * 计算乐节相似度
   */
  calculateSubPhraseSimilarity(sp1, sp2) {
    if (!sp1.notes.length || !sp2.notes.length) return 0
    
    const intervals1 = this.extractIntervalPattern(sp1.notes)
    const intervals2 = this.extractIntervalPattern(sp2.notes)
    const rhythm1 = this.extractRhythmPattern(sp1.notes)
    const rhythm2 = this.extractRhythmPattern(sp2.notes)
    
    const intervalSim = this.compareArrays(intervals1, intervals2)
    const rhythmSim = this.compareArrays(rhythm1, rhythm2)
    
    return intervalSim * 0.6 + rhythmSim * 0.4
  }

  // ==================== 终止式检测 Cadence Detection ====================
  
  /**
   * 检测终止式 - Detect cadences
   * 终止式是划分乐句、乐段的重要依据
   * @param {Note[]} notes 
   * @param {Object} keySignature 
   * @returns {Cadence[]}
   */
  detectCadences(notes, keySignature = { fifths: 0, mode: 'major' }) {
    const cadences = []
    const tonicPitch = this.getTonicFromKey(keySignature)
    const mode = keySignature.mode || 'major'
    
    const measureGroups = this.groupNotesByMeasure(notes)
    const measureNumbers = Object.keys(measureGroups).map(Number).sort((a, b) => a - b)

    for (let i = 1; i < measureNumbers.length; i++) {
      const prevMeasure = measureGroups[measureNumbers[i - 1]]
      const currMeasure = measureGroups[measureNumbers[i]]
      
      if (!prevMeasure || !currMeasure) continue

      // 获取低音 (和声基础)
      const prevBass = this.getLowestNote(prevMeasure)
      const currBass = this.getLowestNote(currMeasure)
      
      // 获取旋律音 (最高声部)
      const prevMelody = this.getHighestNote(prevMeasure)
      const currMelody = this.getHighestNote(currMeasure)
      
      if (!prevBass || !currBass) continue

      const prevBassDegree = this.getScaleDegree(prevBass.pitch, tonicPitch, mode)
      const currBassDegree = this.getScaleDegree(currBass.pitch, tonicPitch, mode)
      const currMelodyDegree = currMelody ? this.getScaleDegree(currMelody.pitch, tonicPitch, mode) : -1

      // 检测终止式类型
      const cadence = this.classifyCadence(
        prevBassDegree, 
        currBassDegree, 
        currMelodyDegree,
        measureNumbers[i],
        mode
      )
      
      if (cadence) {
        cadences.push(cadence)
      }
    }

    return cadences
  }

  /**
   * 分类终止式类型
   * @param {number} prevDegree - 前一和弦根音级数
   * @param {number} currDegree - 当前和弦根音级数
   * @param {number} melodyDegree - 旋律音级数
   * @param {number} measureNumber - 小节号
   * @param {string} mode - 调式
   */
  classifyCadence(prevDegree, currDegree, melodyDegree, measureNumber, mode) {
    // 完满全终止: V→I，低音和旋律都在主音上
    if (prevDegree === 4 && currDegree === 0) {
      const isPerfect = melodyDegree === 0
      return {
        id: generateId(),
        measureNumber,
        beat: 0,
        type: isPerfect ? CadenceTypes.PERFECT_AUTHENTIC : CadenceTypes.IMPERFECT_AUTHENTIC,
        strength: isPerfect ? 'strong' : 'moderate',
        confidence: isPerfect ? 0.95 : 0.8
      }
    }
    
    // 不完满全终止: V→I6 或 VII→I
    if ((prevDegree === 4 || prevDegree === 6) && currDegree === 0 && melodyDegree !== 0) {
      return {
        id: generateId(),
        measureNumber,
        beat: 0,
        type: CadenceTypes.IMPERFECT_AUTHENTIC,
        strength: 'moderate',
        confidence: 0.75
      }
    }
    
    // 半终止: 停在V上
    if (currDegree === 4) {
      return {
        id: generateId(),
        measureNumber,
        beat: 0,
        type: CadenceTypes.HALF,
        strength: 'weak',
        confidence: 0.8
      }
    }
    
    // 阻碍终止: V→VI
    if (prevDegree === 4 && currDegree === 5) {
      return {
        id: generateId(),
        measureNumber,
        beat: 0,
        type: CadenceTypes.DECEPTIVE,
        strength: 'moderate',
        confidence: 0.85
      }
    }
    
    // 变格终止: IV→I
    if (prevDegree === 3 && currDegree === 0) {
      return {
        id: generateId(),
        measureNumber,
        beat: 0,
        type: CadenceTypes.PLAGAL,
        strength: 'moderate',
        confidence: 0.75
      }
    }
    
    // 弗里几亚终止 (小调): iv6→V
    if (mode === 'minor' && prevDegree === 3 && currDegree === 4) {
      return {
        id: generateId(),
        measureNumber,
        beat: 0,
        type: CadenceTypes.PHRYGIAN,
        strength: 'weak',
        confidence: 0.7
      }
    }

    return null
  }

  /**
   * 判断终止式强度 - 用于结构划分
   */
  getCadenceStrength(cadence) {
    if (!cadence) return 0
    
    const strengthMap = {
      [CadenceTypes.PERFECT_AUTHENTIC]: 1.0,
      [CadenceTypes.IMPERFECT_AUTHENTIC]: 0.8,
      [CadenceTypes.PLAGAL]: 0.7,
      [CadenceTypes.DECEPTIVE]: 0.5,
      [CadenceTypes.HALF]: 0.4,
      [CadenceTypes.PHRYGIAN]: 0.3
    }
    
    return strengthMap[cadence.type] || 0.3
  }

  // ==================== 乐句检测 Phrase Detection ====================
  
  /**
   * 检测乐句 - Detect phrases
   * 乐句需有终止式，能表达完整意思，相当于一句"完整话"
   * 典型长度: 2-8小节
   * @param {Note[]} notes 
   * @param {Cadence[]} cadences 
   * @param {SubPhrase[]} subPhrases
   * @returns {Phrase[]}
   */
  detectPhrases(notes, cadences, subPhrases = []) {
    const phrases = []
    const measureGroups = this.groupNotesByMeasure(notes)
    const measureNumbers = Object.keys(measureGroups).map(Number).sort((a, b) => a - b)
    
    if (measureNumbers.length === 0) return phrases

    let phraseStart = measureNumbers[0]
    let phraseIndex = 0
    
    // 按终止式划分乐句
    const sortedCadences = [...cadences].sort((a, b) => a.measureNumber - b.measureNumber)

    for (const cadence of sortedCadences) {
      const phraseEnd = cadence.measureNumber
      const phraseLength = phraseEnd - phraseStart + 1
      
      // 乐句长度检查 (典型2-8小节)
      if (phraseLength >= 2 && phraseLength <= 12) {
        const phraseNotes = this.getNotesInRange(notes, phraseStart, phraseEnd)
        const phraseSubPhrases = subPhrases.filter(sp => 
          sp.startMeasure >= phraseStart && sp.endMeasure <= phraseEnd
        )
        
        phrases.push({
          id: generateId(),
          index: phraseIndex,
          startMeasure: phraseStart,
          endMeasure: phraseEnd,
          length: phraseLength,
          cadence: cadence,
          notes: phraseNotes,
          subPhrases: phraseSubPhrases,
          material: this.assignMaterialLabel(phraseIndex),
          closure: this.getCadenceStrength(cadence) > 0.7 ? 'closed' : 'open'
        })
        
        phraseStart = phraseEnd + 1
        phraseIndex++
      } else if (phraseLength > 12) {
        // 过长，可能需要进一步细分
        const midPoint = phraseStart + Math.floor(phraseLength / 2)
        
        // 第一半
        phrases.push({
          id: generateId(),
          index: phraseIndex++,
          startMeasure: phraseStart,
          endMeasure: midPoint,
          length: midPoint - phraseStart + 1,
          cadence: null,
          notes: this.getNotesInRange(notes, phraseStart, midPoint),
          subPhrases: subPhrases.filter(sp => sp.startMeasure >= phraseStart && sp.endMeasure <= midPoint),
          material: this.assignMaterialLabel(phraseIndex - 1),
          closure: 'open'
        })
        
        // 第二半
        phrases.push({
          id: generateId(),
          index: phraseIndex++,
          startMeasure: midPoint + 1,
          endMeasure: phraseEnd,
          length: phraseEnd - midPoint,
          cadence: cadence,
          notes: this.getNotesInRange(notes, midPoint + 1, phraseEnd),
          subPhrases: subPhrases.filter(sp => sp.startMeasure > midPoint && sp.endMeasure <= phraseEnd),
          material: this.assignMaterialLabel(phraseIndex - 1),
          closure: this.getCadenceStrength(cadence) > 0.7 ? 'closed' : 'open'
        })
        
        phraseStart = phraseEnd + 1
      }
    }

    // 处理剩余小节
    const lastMeasure = measureNumbers[measureNumbers.length - 1]
    if (phraseStart <= lastMeasure) {
      const remainingLength = lastMeasure - phraseStart + 1
      if (remainingLength >= 2) {
        phrases.push({
          id: generateId(),
          index: phraseIndex,
          startMeasure: phraseStart,
          endMeasure: lastMeasure,
          length: remainingLength,
          cadence: null,
          notes: this.getNotesInRange(notes, phraseStart, lastMeasure),
          subPhrases: subPhrases.filter(sp => sp.startMeasure >= phraseStart),
          material: this.assignMaterialLabel(phraseIndex),
          closure: 'open'
        })
      }
    }

    // 分析乐句材料关系
    this.analyzePhraseMaterials(phrases)

    return phrases
  }

  /**
   * 分析乐句材料关系 - 识别同头换尾、对比等
   */
  analyzePhraseMaterials(phrases) {
    for (let i = 1; i < phrases.length; i++) {
      const curr = phrases[i]
      const prev = phrases[i - 1]
      
      // 比较乐句开头 (前2小节或前半部分)
      const headSimilarity = this.comparePhraseHeads(prev, curr)
      // 比较乐句结尾
      const tailSimilarity = this.comparePhraseTails(prev, curr)
      
      if (headSimilarity > 0.7 && tailSimilarity < 0.5) {
        // 同头换尾 - 平行关系
        curr.material = prev.material + "'"
        curr.relationship = 'parallel'
        curr.headSimilarity = headSimilarity
      } else if (headSimilarity > 0.7 && tailSimilarity > 0.7) {
        // 完全重复或变化重复
        curr.material = prev.material + "r"
        curr.relationship = 'repetition'
      } else if (headSimilarity < 0.3) {
        // 对比关系
        curr.relationship = 'contrasting'
      } else {
        // 发展关系
        curr.relationship = 'development'
      }
    }
  }

  /**
   * 比较乐句开头
   */
  comparePhraseHeads(phrase1, phrase2) {
    const headLength = Math.min(
      Math.ceil(phrase1.notes.length / 2),
      Math.ceil(phrase2.notes.length / 2),
      8
    )
    
    const head1 = phrase1.notes.slice(0, headLength)
    const head2 = phrase2.notes.slice(0, headLength)
    
    return this.calculateMelodicSimilarity(head1, head2)
  }

  /**
   * 比较乐句结尾
   */
  comparePhraseTails(phrase1, phrase2) {
    const tailLength = Math.min(
      Math.ceil(phrase1.notes.length / 2),
      Math.ceil(phrase2.notes.length / 2),
      8
    )
    
    const tail1 = phrase1.notes.slice(-tailLength)
    const tail2 = phrase2.notes.slice(-tailLength)
    
    return this.calculateMelodicSimilarity(tail1, tail2)
  }

  // ==================== 乐段检测 Period Detection ====================
  
  /**
   * 检测乐段 - Detect periods
   * 乐段由若干乐句组成，是"段落"级结构
   * 典型长度: 8-16小节
   * @param {Phrase[]} phrases 
   * @returns {Period[]}
   */
  detectPeriods(phrases) {
    const periods = []
    if (phrases.length === 0) return periods
    
    let periodStart = 0
    let periodIndex = 0
    
    // 策略: 根据终止式强度和乐句关系划分乐段
    for (let i = 0; i < phrases.length; i++) {
      const phrase = phrases[i]
      const cadenceStrength = this.getCadenceStrength(phrase.cadence)
      
      // 强终止式标志乐段结束
      const isStrongCadence = cadenceStrength >= 0.7
      // 检查是否形成完整的乐段结构
      const phrasesInPeriod = i - periodStart + 1
      
      // 乐段结束条件:
      // 1. 强终止式 + 至少2个乐句
      // 2. 累积4个乐句
      // 3. 下一乐句是明显的新开始
      const shouldEndPeriod = (isStrongCadence && phrasesInPeriod >= 2) ||
                              phrasesInPeriod >= 4 ||
                              (i < phrases.length - 1 && this.isNewSection(phrase, phrases[i + 1]))
      
      if (shouldEndPeriod || i === phrases.length - 1) {
        const periodPhrases = phrases.slice(periodStart, i + 1)
        const period = this.createPeriod(periodPhrases, periodIndex)
        periods.push(period)
        
        periodStart = i + 1
        periodIndex++
      }
    }
    
    return periods
  }

  /**
   * 创建乐段对象
   */
  createPeriod(phrases, index) {
    const startMeasure = phrases[0].startMeasure
    const endMeasure = phrases[phrases.length - 1].endMeasure
    const lastCadence = phrases[phrases.length - 1].cadence
    
    // 确定乐段类型
    const periodType = this.classifyPeriodType(phrases)
    const proportion = this.classifyProportion(phrases)
    const closure = this.getCadenceStrength(lastCadence) >= 0.7 ? 'closed' : 'open'
    
    return {
      id: generateId(),
      index,
      startMeasure,
      endMeasure,
      length: endMeasure - startMeasure + 1,
      phrases,
      phraseCount: phrases.length,
      type: periodType,
      proportion,
      closure,
      material: this.derivePeriodMaterial(phrases),
      cadence: lastCadence
    }
  }

  /**
   * 分类乐段类型
   * 平行乐段: 同头换尾 a+a'
   * 对比乐段: a+b
   * 模进乐段: 同材料不同高度
   * 三句乐段: a+b+b' 或 a+b+a' 或 a+b+c
   */
  classifyPeriodType(phrases) {
    const count = phrases.length
    
    if (count === 1) {
      return PeriodTypes.PARALLEL // 单句乐段视为特殊情况
    }
    
    if (count === 2) {
      const p1 = phrases[0]
      const p2 = phrases[1]
      
      // 检查是否同头换尾
      if (p2.relationship === 'parallel' || p2.headSimilarity > 0.7) {
        return PeriodTypes.PARALLEL
      }
      
      // 检查是否模进
      if (this.isSequentialRelation(p1, p2)) {
        return PeriodTypes.SEQUENTIAL
      }
      
      return PeriodTypes.CONTRASTING
    }
    
    if (count === 3) {
      return PeriodTypes.THREE_PHRASE
    }
    
    if (count === 4) {
      return PeriodTypes.FOUR_PHRASE
    }
    
    // 多句乐段
    return PeriodTypes.COMPOUND
  }

  /**
   * 检查是否为模进关系
   */
  isSequentialRelation(phrase1, phrase2) {
    if (!phrase1.notes.length || !phrase2.notes.length) return false
    
    const intervals1 = this.extractIntervalPattern(phrase1.notes.slice(0, 8))
    const intervals2 = this.extractIntervalPattern(phrase2.notes.slice(0, 8))
    
    // 音程模式相似但整体移位
    const intervalSim = this.compareArrays(intervals1, intervals2)
    const transposition = this.detectTransposition(phrase1.notes, phrase2.notes)
    
    return intervalSim > 0.7 && Math.abs(transposition) > 0
  }

  /**
   * 分类乐段比例
   * 方整性: 4+4, 8+8 (2的倍数且相等)
   * 规整性: 等长但非2倍数
   * 非方整性: 不等长
   */
  classifyProportion(phrases) {
    if (phrases.length < 2) return ProportionTypes.NON_SQUARE
    
    const lengths = phrases.map(p => p.length)
    const allEqual = lengths.every(l => l === lengths[0])
    
    if (!allEqual) return ProportionTypes.NON_SQUARE
    
    const length = lengths[0]
    const isPowerOf2 = (length & (length - 1)) === 0 && length >= 4
    
    return isPowerOf2 ? ProportionTypes.SQUARE : ProportionTypes.REGULAR
  }

  /**
   * 推导乐段材料标记
   */
  derivePeriodMaterial(phrases) {
    if (phrases.length === 0) return 'a'
    
    const materials = phrases.map(p => p.material.charAt(0))
    const uniqueMaterials = [...new Set(materials)]
    
    // 如果所有乐句使用相同基础材料
    if (uniqueMaterials.length === 1) {
      return materials[0]
    }
    
    // 返回材料组合
    return materials.join('+')
  }

  /**
   * 检测复乐段 - Detect compound periods
   * 复乐段: 两个乐段呈平行关系，同头换尾
   */
  detectCompoundPeriods(periods) {
    const compoundPeriods = []
    
    for (let i = 0; i < periods.length - 1; i += 2) {
      const p1 = periods[i]
      const p2 = periods[i + 1]
      
      if (!p2) break
      
      // 检查是否形成复乐段 (同头换尾的两个乐段)
      const isCompound = this.arePeriodsParallel(p1, p2)
      
      if (isCompound) {
        compoundPeriods.push({
          id: generateId(),
          type: 'compound',
          periods: [p1, p2],
          startMeasure: p1.startMeasure,
          endMeasure: p2.endMeasure,
          structure: 'AA\'' // 复乐段结构
        })
      }
    }
    
    return compoundPeriods
  }

  /**
   * 检查两个乐段是否为平行关系
   */
  arePeriodsParallel(period1, period2) {
    if (!period1.phrases.length || !period2.phrases.length) return false
    
    // 比较第一乐句的开头
    const firstPhrase1 = period1.phrases[0]
    const firstPhrase2 = period2.phrases[0]
    
    const headSim = this.comparePhraseHeads(firstPhrase1, firstPhrase2)
    
    // 检查终止式差异 (第一乐段通常半终止，第二乐段全终止)
    const cadence1Strength = this.getCadenceStrength(period1.cadence)
    const cadence2Strength = this.getCadenceStrength(period2.cadence)
    
    return headSim > 0.7 && cadence2Strength > cadence1Strength
  }

  // ==================== 曲式检测 Form Detection ====================
  
  /**
   * 检测整体曲式结构 - Detect overall musical form
   * @param {Period[]} periods 
   * @param {Object} metadata - 额外信息如调性、速度等
   * @returns {FormAnalysis}
   */
  detectForm(periods, metadata = {}) {
    const periodCount = periods.length
    
    if (periodCount === 0) {
      return { formType: FormTypes.ONE_PART, sections: [], confidence: 0.5 }
    }

    // 分析材料分布
    const materialPattern = this.analyzeMaterialPattern(periods)
    
    // 一部曲式: 单乐段
    if (periodCount === 1) {
      return this.analyzeOnePartForm(periods)
    }

    // 二部曲式: 两个乐段
    if (periodCount === 2) {
      return this.analyzeBinaryForm(periods, materialPattern)
    }

    // 三部曲式: 三个乐段
    if (periodCount === 3) {
      return this.analyzeTernaryForm(periods, materialPattern)
    }

    // 检测特殊曲式
    // 变奏曲式
    const variationAnalysis = this.detectVariationForm(periods)
    if (variationAnalysis.confidence > 0.7) {
      return variationAnalysis
    }

    // 回旋曲式 (ABACA...)
    if (periodCount >= 5) {
      const rondoAnalysis = this.detectRondoForm(periods, materialPattern)
      if (rondoAnalysis.confidence > 0.6) {
        return rondoAnalysis
      }
    }

    // 奏鸣曲式
    if (periodCount >= 3) {
      const sonataAnalysis = this.detectSonataForm(periods, metadata)
      if (sonataAnalysis.confidence > 0.6) {
        return sonataAnalysis
      }
    }

    // 复三部曲式 (大型三部)
    if (periodCount >= 4) {
      return this.analyzeCompoundTernaryForm(periods, materialPattern)
    }

    // 默认: 多段曲式
    return {
      formType: 'multi_part',
      sections: this.createSections(periods, 'multi_part'),
      confidence: 0.5
    }
  }

  /**
   * 分析材料分布模式
   */
  analyzeMaterialPattern(periods) {
    const materials = periods.map(p => p.material.charAt(0))
    const pattern = materials.join('')
    
    // 统计各材料出现次数
    const counts = {}
    materials.forEach(m => {
      counts[m] = (counts[m] || 0) + 1
    })
    
    // 找出主要材料 (出现最多的)
    const mainMaterial = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'a'
    
    return {
      pattern,
      materials,
      counts,
      mainMaterial,
      uniqueCount: Object.keys(counts).length,
      hasRecapitulation: materials.length >= 3 && materials[0] === materials[materials.length - 1]
    }
  }

  /**
   * 分析一部曲式
   */
  analyzeOnePartForm(periods) {
    const period = periods[0]
    
    return {
      formType: FormTypes.ONE_PART,
      sections: [{
        id: generateId(),
        name: 'A',
        type: 'period',
        startMeasure: period.startMeasure,
        endMeasure: period.endMeasure,
        function: 'main',
        periods: [period]
      }],
      confidence: 0.9,
      description: '一部曲式 (One-part Form)'
    }
  }

  /**
   * 分析二部曲式
   */
  analyzeBinaryForm(periods, materialPattern) {
    const [A, B] = periods
    const hasRecap = this.hasRecapitulation(A, B)
    
    const formType = hasRecap ? FormTypes.BINARY_ROUNDED : FormTypes.BINARY_PARALLEL
    
    return {
      formType,
      sections: [
        {
          id: generateId(),
          name: 'A',
          type: 'period',
          startMeasure: A.startMeasure,
          endMeasure: A.endMeasure,
          function: 'exposition',
          periods: [A]
        },
        {
          id: generateId(),
          name: hasRecap ? "A'" : 'B',
          type: 'period',
          startMeasure: B.startMeasure,
          endMeasure: B.endMeasure,
          function: hasRecap ? 'recapitulation' : 'contrast',
          periods: [B]
        }
      ],
      confidence: 0.8,
      description: hasRecap ? '再现单二部曲式 (Rounded Binary)' : '并列单二部曲式 (Parallel Binary)'
    }
  }

  /**
   * 分析三部曲式
   */
  analyzeTernaryForm(periods, materialPattern) {
    const [A, B, C] = periods
    const isABA = materialPattern.hasRecapitulation
    
    if (isABA) {
      // 再现单三部曲式
      const middleType = this.classifyMiddleSection(B, A)
      
      return {
        formType: FormTypes.TERNARY_SIMPLE,
        sections: [
          {
            id: generateId(),
            name: 'A',
            type: 'period',
            startMeasure: A.startMeasure,
            endMeasure: A.endMeasure,
            function: 'exposition',
            periods: [A]
          },
          {
            id: generateId(),
            name: 'B',
            type: middleType.type,
            startMeasure: B.startMeasure,
            endMeasure: B.endMeasure,
            function: 'middle',
            middleType: middleType,
            periods: [B]
          },
          {
            id: generateId(),
            name: "A'",
            type: 'period',
            startMeasure: C.startMeasure,
            endMeasure: C.endMeasure,
            function: 'recapitulation',
            periods: [C]
          }
        ],
        confidence: 0.85,
        description: '再现单三部曲式 (Ternary Form ABA)'
      }
    } else {
      // 并列单三部曲式
      return {
        formType: FormTypes.TERNARY_PARALLEL,
        sections: [
          {
            id: generateId(),
            name: 'A',
            type: 'period',
            startMeasure: A.startMeasure,
            endMeasure: A.endMeasure,
            function: 'first_theme',
            periods: [A]
          },
          {
            id: generateId(),
            name: 'B',
            type: 'period',
            startMeasure: B.startMeasure,
            endMeasure: B.endMeasure,
            function: 'second_theme',
            periods: [B]
          },
          {
            id: generateId(),
            name: 'C',
            type: 'period',
            startMeasure: C.startMeasure,
            endMeasure: C.endMeasure,
            function: 'third_theme',
            periods: [C]
          }
        ],
        confidence: 0.75,
        description: '并列单三部曲式 (Parallel Ternary ABC)'
      }
    }
  }

  /**
   * 分类中部类型
   */
  classifyMiddleSection(middlePeriod, firstPeriod) {
    // 检查材料来源
    const materialSimilarity = this.calculatePeriodSimilarity(middlePeriod, firstPeriod)
    
    // 检查调性稳定性
    const isKeyStable = middlePeriod.closure === 'closed'
    
    // 检查是否有完整曲式结构
    const hasCompleteStructure = middlePeriod.phraseCount >= 2
    
    if (hasCompleteStructure && isKeyStable) {
      // 三声中部: 稳定调性，有完整曲式
      return {
        type: MiddleSectionTypes.TRIO,
        description: '三声中部 (Trio)',
        confidence: 0.8
      }
    } else if (materialSimilarity > 0.5) {
      // 展开性中部: 使用A材料展开
      return {
        type: MiddleSectionTypes.DEVELOPMENT,
        description: '展开性中部 (Development)',
        confidence: 0.75
      }
    } else {
      // 插部性中部: 新材料，调性开放
      return {
        type: MiddleSectionTypes.EPISODE,
        description: '插部性中部 (Episode)',
        confidence: 0.7
      }
    }
  }

  /**
   * 分析复三部曲式
   * 复三部曲式: A B A' 中至少有一部分大于乐段
   */
  analyzeCompoundTernaryForm(periods, materialPattern) {
    const sections = []
    const { materials, hasRecapitulation } = materialPattern
    
    if (!hasRecapitulation) {
      // 非再现结构，可能是其他曲式
      return {
        formType: 'multi_part',
        sections: this.createSections(periods, 'multi_part'),
        confidence: 0.5
      }
    }
    
    // 找出ABA结构的分界点
    const mainMaterial = materials[0]
    let middleStart = -1
    let middleEnd = -1
    
    for (let i = 1; i < materials.length; i++) {
      if (materials[i] !== mainMaterial && middleStart === -1) {
        middleStart = i
      }
      if (materials[i] === mainMaterial && middleStart !== -1 && middleEnd === -1) {
        middleEnd = i - 1
        break
      }
    }
    
    if (middleStart === -1) middleStart = 1
    if (middleEnd === -1) middleEnd = periods.length - 2
    
    // A部分
    const aPeriods = periods.slice(0, middleStart)
    const aSection = {
      id: generateId(),
      name: 'A',
      type: aPeriods.length > 1 ? 'section' : 'period',
      startMeasure: aPeriods[0].startMeasure,
      endMeasure: aPeriods[aPeriods.length - 1].endMeasure,
      function: 'exposition',
      periods: aPeriods,
      internalForm: this.analyzeInternalForm(aPeriods)
    }
    sections.push(aSection)
    
    // B部分 (中部)
    const bPeriods = periods.slice(middleStart, middleEnd + 1)
    if (bPeriods.length > 0) {
      const middleType = this.classifyMiddleSection(bPeriods[0], aPeriods[0])
      const bSection = {
        id: generateId(),
        name: 'B',
        type: bPeriods.length > 1 ? 'section' : middleType.type,
        startMeasure: bPeriods[0].startMeasure,
        endMeasure: bPeriods[bPeriods.length - 1].endMeasure,
        function: 'middle',
        middleType: middleType,
        periods: bPeriods,
        internalForm: this.analyzeInternalForm(bPeriods)
      }
      sections.push(bSection)
    }
    
    // A'部分 (再现)
    const aPrimePeriods = periods.slice(middleEnd + 1)
    if (aPrimePeriods.length > 0) {
      const aPrimeSection = {
        id: generateId(),
        name: "A'",
        type: aPrimePeriods.length > 1 ? 'section' : 'period',
        startMeasure: aPrimePeriods[0].startMeasure,
        endMeasure: aPrimePeriods[aPrimePeriods.length - 1].endMeasure,
        function: 'recapitulation',
        periods: aPrimePeriods,
        recapitulationType: this.classifyRecapitulation(aPeriods, aPrimePeriods)
      }
      sections.push(aPrimeSection)
    }
    
    return {
      formType: FormTypes.TERNARY_COMPOUND,
      sections,
      confidence: 0.75,
      description: '复三部曲式 (Compound Ternary Form)'
    }
  }

  /**
   * 分析内部曲式结构
   */
  analyzeInternalForm(periods) {
    if (periods.length === 1) {
      return { type: 'period', description: '乐段' }
    }
    if (periods.length === 2) {
      const hasRecap = this.arePeriodsParallel(periods[0], periods[1])
      return {
        type: hasRecap ? 'binary_rounded' : 'binary_parallel',
        description: hasRecap ? '再现单二部' : '并列单二部'
      }
    }
    if (periods.length === 3) {
      return { type: 'ternary', description: '单三部' }
    }
    return { type: 'complex', description: '复杂结构' }
  }

  /**
   * 分类再现类型
   */
  classifyRecapitulation(originalPeriods, recapPeriods) {
    if (originalPeriods.length === 0 || recapPeriods.length === 0) {
      return { type: 'unknown', description: '未知' }
    }
    
    const originalLength = originalPeriods.reduce((sum, p) => sum + p.length, 0)
    const recapLength = recapPeriods.reduce((sum, p) => sum + p.length, 0)
    
    const lengthRatio = recapLength / originalLength
    
    if (lengthRatio > 0.95 && lengthRatio < 1.05) {
      return { type: 'complete', description: '完全再现' }
    } else if (lengthRatio < 0.7) {
      return { type: 'abbreviated', description: '减缩再现' }
    } else if (lengthRatio > 1.3) {
      return { type: 'expanded', description: '扩充再现' }
    } else {
      return { type: 'varied', description: '变化再现' }
    }
  }

  /**
   * 检测变奏曲式
   */
  detectVariationForm(periods) {
    if (periods.length < 3) {
      return { formType: FormTypes.VARIATION, confidence: 0.3 }
    }
    
    const theme = periods[0]
    let variationCount = 0
    const variations = []
    
    for (let i = 1; i < periods.length; i++) {
      const similarity = this.calculatePeriodSimilarity(periods[i], theme)
      
      // 变奏应该与主题有一定相似性但不完全相同
      if (similarity > 0.3 && similarity < 0.9) {
        variationCount++
        variations.push({
          index: i,
          period: periods[i],
          similarity,
          variationType: this.classifyVariationType(theme, periods[i])
        })
      }
    }
    
    // 如果大部分乐段都是主题的变奏
    const variationRatio = variationCount / (periods.length - 1)
    
    if (variationRatio > 0.6) {
      return {
        formType: FormTypes.VARIATION,
        theme: theme,
        variations: variations,
        sections: this.createVariationSections(theme, variations),
        confidence: 0.7 + variationRatio * 0.2,
        description: '变奏曲式 (Variation Form)'
      }
    }
    
    return { formType: FormTypes.VARIATION, confidence: 0.3 }
  }

  /**
   * 分类变奏类型
   */
  classifyVariationType(theme, variation) {
    const melodySim = this.calculateMelodicSimilarity(
      theme.phrases[0]?.notes || [],
      variation.phrases[0]?.notes || []
    )
    
    const rhythmSim = this.compareRhythms(theme, variation)
    
    if (melodySim > 0.7) {
      return { type: 'ornamental', description: '装饰变奏' }
    } else if (rhythmSim > 0.7) {
      return { type: 'melodic', description: '旋律变奏' }
    } else {
      return { type: 'character', description: '性格变奏' }
    }
  }

  /**
   * 创建变奏曲式的段落结构
   */
  createVariationSections(theme, variations) {
    const sections = [{
      id: generateId(),
      name: 'Theme',
      type: 'theme',
      startMeasure: theme.startMeasure,
      endMeasure: theme.endMeasure,
      function: 'theme',
      periods: [theme]
    }]
    
    variations.forEach((v, i) => {
      sections.push({
        id: generateId(),
        name: `Var. ${i + 1}`,
        type: 'variation',
        startMeasure: v.period.startMeasure,
        endMeasure: v.period.endMeasure,
        function: 'variation',
        variationType: v.variationType,
        periods: [v.period]
      })
    })
    
    return sections
  }

  /**
   * 检测回旋曲式
   * 回旋曲式: 主部至少出现三次，至少有两个不同的插部
   * 典型结构: A B A C A 或 A B A C A B A
   */
  detectRondoForm(periods, materialPattern) {
    const { materials, mainMaterial, counts } = materialPattern
    
    // 主部出现次数
    const mainCount = counts[mainMaterial] || 0
    
    // 检查回旋曲式条件
    if (mainCount < 3) {
      return { formType: FormTypes.RONDO, confidence: 0.3 }
    }
    
    // 检查主部是否在奇数位置 (1, 3, 5...)
    const mainPositions = materials
      .map((m, i) => m === mainMaterial ? i : -1)
      .filter(i => i >= 0)
    
    // 统计插部数量
    const episodeMaterials = Object.keys(counts).filter(m => m !== mainMaterial)
    const episodeCount = episodeMaterials.length
    
    if (episodeCount < 2) {
      return { formType: FormTypes.RONDO, confidence: 0.4 }
    }
    
    // 创建回旋曲式结构
    const sections = []
    let mainThemeIndex = 0
    let episodeIndex = 0
    
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i]
      const material = materials[i]
      
      if (material === mainMaterial) {
        sections.push({
          id: generateId(),
          name: mainThemeIndex === 0 ? 'A (Main Theme)' : `A${mainThemeIndex}`,
          type: 'refrain',
          startMeasure: period.startMeasure,
          endMeasure: period.endMeasure,
          function: 'main_theme',
          periods: [period],
          isRecurrence: mainThemeIndex > 0
        })
        mainThemeIndex++
      } else {
        episodeIndex++
        const episodeName = String.fromCharCode(65 + episodeIndex) // B, C, D...
        sections.push({
          id: generateId(),
          name: `${episodeName} (Episode ${episodeIndex})`,
          type: 'episode',
          startMeasure: period.startMeasure,
          endMeasure: period.endMeasure,
          function: 'episode',
          periods: [period]
        })
      }
    }
    
    // 计算置信度
    const confidence = Math.min(0.9, 0.5 + mainCount * 0.1 + episodeCount * 0.1)
    
    return {
      formType: FormTypes.RONDO,
      sections,
      mainThemeCount: mainCount,
      episodeCount,
      pattern: materials.join(''),
      confidence,
      description: `回旋曲式 (Rondo Form) - ${materials.join('')}`
    }
  }

  /**
   * 检测奏鸣曲式
   * 奏鸣曲式: 呈示部(主部+副部) - 展开部 - 再现部
   */
  detectSonataForm(periods, metadata = {}) {
    if (periods.length < 3) {
      return { formType: FormTypes.SONATA, confidence: 0.3 }
    }
    
    const totalLength = periods.reduce((sum, p) => sum + p.length, 0)
    const sections = []
    
    // 尝试识别呈示部、展开部、再现部
    // 典型比例: 呈示部约1/3, 展开部约1/3, 再现部约1/3
    
    // 寻找可能的分界点
    let expositionEnd = -1
    let developmentEnd = -1
    
    // 策略1: 基于调性变化
    // 策略2: 基于材料再现
    // 策略3: 基于结构比例
    
    // 简化策略: 按比例划分
    const expEndIndex = Math.floor(periods.length / 3)
    const devEndIndex = Math.floor(2 * periods.length / 3)
    
    // 检查是否有明显的再现 (最后部分与开头相似)
    const firstPeriod = periods[0]
    const lastPeriods = periods.slice(devEndIndex)
    
    let hasRecapitulation = false
    for (const p of lastPeriods) {
      if (this.calculatePeriodSimilarity(p, firstPeriod) > 0.5) {
        hasRecapitulation = true
        break
      }
    }
    
    if (!hasRecapitulation) {
      return { formType: FormTypes.SONATA, confidence: 0.4 }
    }
    
    // 呈示部
    const expositionPeriods = periods.slice(0, expEndIndex + 1)
    sections.push({
      id: generateId(),
      name: 'Exposition',
      type: 'exposition',
      startMeasure: expositionPeriods[0].startMeasure,
      endMeasure: expositionPeriods[expositionPeriods.length - 1].endMeasure,
      function: 'exposition',
      periods: expositionPeriods,
      components: this.analyzeExposition(expositionPeriods)
    })
    
    // 展开部
    const developmentPeriods = periods.slice(expEndIndex + 1, devEndIndex + 1)
    if (developmentPeriods.length > 0) {
      sections.push({
        id: generateId(),
        name: 'Development',
        type: 'development',
        startMeasure: developmentPeriods[0].startMeasure,
        endMeasure: developmentPeriods[developmentPeriods.length - 1].endMeasure,
        function: 'development',
        periods: developmentPeriods
      })
    }
    
    // 再现部
    const recapPeriods = periods.slice(devEndIndex + 1)
    if (recapPeriods.length > 0) {
      sections.push({
        id: generateId(),
        name: 'Recapitulation',
        type: 'recapitulation',
        startMeasure: recapPeriods[0].startMeasure,
        endMeasure: recapPeriods[recapPeriods.length - 1].endMeasure,
        function: 'recapitulation',
        periods: recapPeriods,
        components: this.analyzeRecapitulation(recapPeriods, expositionPeriods)
      })
    }
    
    return {
      formType: FormTypes.SONATA,
      sections,
      confidence: 0.65,
      description: '奏鸣曲式 (Sonata Form)'
    }
  }

  /**
   * 分析呈示部结构
   */
  analyzeExposition(periods) {
    if (periods.length === 0) return {}
    
    const components = {
      primaryTheme: null,
      transition: null,
      secondaryTheme: null,
      closingTheme: null
    }
    
    // 简化分析: 第一个乐段为主部，最后一个为副部
    if (periods.length >= 1) {
      components.primaryTheme = {
        period: periods[0],
        startMeasure: periods[0].startMeasure,
        endMeasure: periods[0].endMeasure
      }
    }
    
    if (periods.length >= 2) {
      components.secondaryTheme = {
        period: periods[periods.length - 1],
        startMeasure: periods[periods.length - 1].startMeasure,
        endMeasure: periods[periods.length - 1].endMeasure
      }
    }
    
    if (periods.length >= 3) {
      // 中间部分为连接部
      const transitionPeriods = periods.slice(1, -1)
      components.transition = {
        periods: transitionPeriods,
        startMeasure: transitionPeriods[0].startMeasure,
        endMeasure: transitionPeriods[transitionPeriods.length - 1].endMeasure
      }
    }
    
    return components
  }

  /**
   * 分析再现部结构
   */
  analyzeRecapitulation(recapPeriods, expositionPeriods) {
    const components = {
      primaryTheme: null,
      secondaryTheme: null,
      isComplete: false,
      isVaried: false
    }
    
    if (recapPeriods.length >= 1 && expositionPeriods.length >= 1) {
      const similarity = this.calculatePeriodSimilarity(recapPeriods[0], expositionPeriods[0])
      components.primaryTheme = {
        period: recapPeriods[0],
        similarity,
        isVaried: similarity < 0.8
      }
    }
    
    if (recapPeriods.length >= 2 && expositionPeriods.length >= 2) {
      const expSecondary = expositionPeriods[expositionPeriods.length - 1]
      const recapSecondary = recapPeriods[recapPeriods.length - 1]
      const similarity = this.calculatePeriodSimilarity(recapSecondary, expSecondary)
      
      components.secondaryTheme = {
        period: recapSecondary,
        similarity,
        // 副部在再现部应该回到主调
        isInTonic: true // 简化处理
      }
    }
    
    components.isComplete = recapPeriods.length >= expositionPeriods.length * 0.7
    
    return components
  }

  /**
   * 检测流行音乐曲式
   * 主歌-副歌式 (Verse-Chorus)
   */
  detectPopularMusicForm(periods, metadata = {}) {
    if (periods.length < 2) {
      return { formType: 'unknown', confidence: 0.3 }
    }
    
    const materialPattern = this.analyzeMaterialPattern(periods)
    const { materials, counts } = materialPattern
    
    // 检测主歌-副歌结构
    // 特征: 交替出现的两种材料，副歌通常更有力
    
    const uniqueMaterials = Object.keys(counts)
    if (uniqueMaterials.length === 2) {
      const [mat1, mat2] = uniqueMaterials
      const pattern = materials.join('')
      
      // 检查是否为交替模式 (ABAB, AABB, etc.)
      if (pattern.match(/^(ab)+a?$/i) || pattern.match(/^(ba)+b?$/i)) {
        return {
          formType: FormTypes.VERSE_CHORUS,
          sections: this.createVerseChorusSections(periods, materials),
          confidence: 0.75,
          description: '主歌-副歌式 (Verse-Chorus Form)'
        }
      }
    }
    
    // 检测AABA曲式
    if (materials.length === 4) {
      const pattern = materials.join('')
      if (pattern.match(/^aaba$/i)) {
        return {
          formType: FormTypes.AABA,
          sections: this.createAABASections(periods),
          confidence: 0.8,
          description: 'AABA曲式 (32-bar Form)'
        }
      }
    }
    
    return { formType: 'unknown', confidence: 0.3 }
  }

  /**
   * 创建主歌-副歌段落结构
   */
  createVerseChorusSections(periods, materials) {
    const sections = []
    let verseCount = 0
    let chorusCount = 0
    
    // 假设第一个材料是主歌
    const verseMaterial = materials[0]
    
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i]
      const material = materials[i]
      
      if (material === verseMaterial) {
        verseCount++
        sections.push({
          id: generateId(),
          name: `Verse ${verseCount}`,
          type: 'verse',
          startMeasure: period.startMeasure,
          endMeasure: period.endMeasure,
          function: 'verse',
          periods: [period]
        })
      } else {
        chorusCount++
        sections.push({
          id: generateId(),
          name: `Chorus ${chorusCount}`,
          type: 'chorus',
          startMeasure: period.startMeasure,
          endMeasure: period.endMeasure,
          function: 'chorus',
          periods: [period]
        })
      }
    }
    
    return sections
  }

  /**
   * 创建AABA段落结构
   */
  createAABASections(periods) {
    const names = ['A (Verse 1)', 'A (Verse 2)', 'B (Bridge)', "A' (Verse 3)"]
    const functions = ['verse', 'verse', 'bridge', 'verse']
    
    return periods.map((period, i) => ({
      id: generateId(),
      name: names[i] || `Section ${i + 1}`,
      type: functions[i] || 'section',
      startMeasure: period.startMeasure,
      endMeasure: period.endMeasure,
      function: functions[i] || 'section',
      periods: [period]
    }))
  }

  // ==================== 附属结构检测 Auxiliary Structure Detection ====================

  /**
   * 检测引子 - Detect introduction
   */
  detectIntroduction(notes, firstPeriod) {
    if (!firstPeriod || !notes.length) return null
    
    const firstPeriodStart = firstPeriod.startMeasure
    if (firstPeriodStart <= 1) return null
    
    // 获取第一乐段之前的音符
    const introNotes = notes.filter(n => n.measureNumber < firstPeriodStart)
    if (introNotes.length === 0) return null
    
    const introMeasures = [...new Set(introNotes.map(n => n.measureNumber))].sort((a, b) => a - b)
    
    return {
      id: generateId(),
      type: 'introduction',
      name: 'Introduction',
      startMeasure: introMeasures[0],
      endMeasure: introMeasures[introMeasures.length - 1],
      length: introMeasures.length,
      notes: introNotes,
      function: 'preparation'
    }
  }

  /**
   * 检测尾声 - Detect coda
   */
  detectCoda(notes, lastPeriod, lastCadence) {
    if (!lastPeriod || !notes.length) return null
    
    const lastPeriodEnd = lastPeriod.endMeasure
    const measureGroups = this.groupNotesByMeasure(notes)
    const allMeasures = Object.keys(measureGroups).map(Number).sort((a, b) => a - b)
    const lastMeasure = allMeasures[allMeasures.length - 1]
    
    if (lastMeasure <= lastPeriodEnd) return null
    
    // 获取最后乐段之后的音符
    const codaNotes = notes.filter(n => n.measureNumber > lastPeriodEnd)
    if (codaNotes.length === 0) return null
    
    const codaMeasures = [...new Set(codaNotes.map(n => n.measureNumber))].sort((a, b) => a - b)
    
    // 判断是补充还是尾声 (补充较短，尾声较长)
    const codaLength = codaMeasures.length
    const isCoda = codaLength > 4
    
    return {
      id: generateId(),
      type: isCoda ? 'coda' : 'codetta',
      name: isCoda ? 'Coda' : 'Codetta',
      startMeasure: codaMeasures[0],
      endMeasure: codaMeasures[codaMeasures.length - 1],
      length: codaLength,
      notes: codaNotes,
      function: 'conclusion'
    }
  }

  /**
   * 检测连接部 - Detect transitions
   */
  detectTransitions(periods) {
    const transitions = []
    
    for (let i = 0; i < periods.length - 1; i++) {
      const curr = periods[i]
      const next = periods[i + 1]
      
      // 检查两个乐段之间是否有间隙
      const gap = next.startMeasure - curr.endMeasure - 1
      
      if (gap > 0) {
        transitions.push({
          id: generateId(),
          type: 'transition',
          name: `Transition ${i + 1}`,
          startMeasure: curr.endMeasure + 1,
          endMeasure: next.startMeasure - 1,
          length: gap,
          fromSection: curr.id,
          toSection: next.id,
          function: 'connection'
        })
      }
    }
    
    return transitions
  }

  /**
   * 检测扩充 - Detect extensions
   * 扩充是曲式内部的结构延展，在终止式之前
   */
  detectExtensions(phrases) {
    const extensions = []
    
    for (const phrase of phrases) {
      // 检查乐句是否超过典型长度
      const typicalLength = 4
      if (phrase.length > typicalLength * 1.5) {
        // 可能包含扩充
        const extensionLength = phrase.length - typicalLength
        extensions.push({
          id: generateId(),
          type: 'extension',
          phraseId: phrase.id,
          estimatedLength: extensionLength,
          position: 'internal'
        })
      }
    }
    
    return extensions
  }

  // ==================== 调式检测 Mode Detection ====================

  /**
   * 检测调式类型
   * @param {Note[]} notes 
   * @param {Object} keySignature 
   * @returns {ModeAnalysis}
   */
  detectMode(notes, keySignature = { fifths: 0, mode: 'major' }) {
    if (!notes || notes.length === 0) {
      return { mode: 'major', confidence: 0.5 }
    }
    
    // 统计音级分布
    const pitchClassCounts = this.countPitchClasses(notes)
    const tonic = this.getTonicFromKey(keySignature)
    const tonicPc = this.pitchClasses[tonic] || 0
    
    // 相对于主音的音级分布
    const relativeCounts = {}
    for (const [pc, count] of Object.entries(pitchClassCounts)) {
      const relativePc = (parseInt(pc) - tonicPc + 12) % 12
      relativeCounts[relativePc] = count
    }
    
    // 与各调式音阶比较
    const modeScores = {}
    
    // 大小调
    modeScores.major = this.calculateModeScore(relativeCounts, this.scales.major)
    modeScores.natural_minor = this.calculateModeScore(relativeCounts, this.scales.natural_minor)
    modeScores.harmonic_minor = this.calculateModeScore(relativeCounts, this.scales.harmonic_minor)
    
    // 中古调式
    for (const [modeName, scale] of Object.entries(this.churchModes)) {
      modeScores[modeName] = this.calculateModeScore(relativeCounts, scale)
    }
    
    // 五声调式
    for (const [modeName, scale] of Object.entries(this.pentatonicModes)) {
      modeScores[`pentatonic_${modeName}`] = this.calculateModeScore(relativeCounts, scale)
    }
    
    // 找出最匹配的调式
    const sortedModes = Object.entries(modeScores)
      .sort((a, b) => b[1] - a[1])
    
    const bestMode = sortedModes[0]
    const secondBest = sortedModes[1]
    
    return {
      mode: bestMode[0],
      confidence: bestMode[1],
      alternativeMode: secondBest ? secondBest[0] : null,
      alternativeConfidence: secondBest ? secondBest[1] : 0,
      pitchClassDistribution: relativeCounts,
      allScores: modeScores
    }
  }

  /**
   * 统计音级分布
   */
  countPitchClasses(notes) {
    const counts = {}
    for (const note of notes) {
      if (!note.pitch) continue
      const pitchName = note.pitch.replace(/[0-9]/g, '')
      const pc = this.pitchClasses[pitchName]
      if (pc !== undefined) {
        counts[pc] = (counts[pc] || 0) + (note.duration || 1)
      }
    }
    return counts
  }

  /**
   * 计算调式匹配分数
   */
  calculateModeScore(pitchCounts, scale) {
    let inScaleWeight = 0
    let outOfScaleWeight = 0
    let totalWeight = 0
    
    for (const [pc, weight] of Object.entries(pitchCounts)) {
      totalWeight += weight
      if (scale.includes(parseInt(pc))) {
        inScaleWeight += weight
      } else {
        outOfScaleWeight += weight
      }
    }
    
    if (totalWeight === 0) return 0
    return inScaleWeight / totalWeight
  }

  // ==================== 主题检测 Theme Detection ====================

  /**
   * 识别主题 - Identify themes
   * 主题是最具标志性的乐段，为全曲发展提供核心材料
   */
  identifyThemes(periods, formAnalysis) {
    const themes = []
    
    if (!periods.length) return themes
    
    // 策略1: 根据曲式结构识别主题
    if (formAnalysis && formAnalysis.sections) {
      for (const section of formAnalysis.sections) {
        if (section.function === 'exposition' || 
            section.function === 'main_theme' ||
            section.function === 'theme') {
          const themePeriods = section.periods || [periods[0]]
          themes.push({
            id: generateId(),
            name: section.name || 'Main Theme',
            type: 'primary',
            periods: themePeriods,
            startMeasure: themePeriods[0]?.startMeasure,
            endMeasure: themePeriods[themePeriods.length - 1]?.endMeasure,
            occurrences: this.findThemeOccurrences(themePeriods[0], periods)
          })
        }
      }
    }
    
    // 策略2: 如果没有从曲式分析中获得，使用第一个乐段作为主题
    if (themes.length === 0 && periods.length > 0) {
      themes.push({
        id: generateId(),
        name: 'Main Theme',
        type: 'primary',
        periods: [periods[0]],
        startMeasure: periods[0].startMeasure,
        endMeasure: periods[0].endMeasure,
        occurrences: this.findThemeOccurrences(periods[0], periods)
      })
    }
    
    // 识别副主题 (与主主题对比的材料)
    if (periods.length > 1 && themes.length > 0) {
      const mainTheme = themes[0]
      for (let i = 1; i < periods.length; i++) {
        const period = periods[i]
        const similarity = this.calculatePeriodSimilarity(period, mainTheme.periods[0])
        
        // 低相似度且有足够重要性的乐段可能是副主题
        if (similarity < 0.4 && period.closure === 'closed') {
          const isAlreadyTheme = themes.some(t => 
            t.periods.some(p => p.id === period.id)
          )
          
          if (!isAlreadyTheme) {
            themes.push({
              id: generateId(),
              name: `Secondary Theme ${themes.length}`,
              type: 'secondary',
              periods: [period],
              startMeasure: period.startMeasure,
              endMeasure: period.endMeasure,
              occurrences: this.findThemeOccurrences(period, periods)
            })
          }
        }
      }
    }
    
    return themes
  }

  /**
   * 查找主题出现的位置
   */
  findThemeOccurrences(themePeriod, allPeriods) {
    const occurrences = []
    
    for (let i = 0; i < allPeriods.length; i++) {
      const period = allPeriods[i]
      const similarity = this.calculatePeriodSimilarity(period, themePeriod)
      
      if (similarity > 0.6) {
        occurrences.push({
          periodIndex: i,
          periodId: period.id,
          startMeasure: period.startMeasure,
          endMeasure: period.endMeasure,
          similarity,
          isExact: similarity > 0.9,
          isVariation: similarity > 0.6 && similarity <= 0.9
        })
      }
    }
    
    return occurrences
  }

  // ==================== 综合分析 Comprehensive Analysis ====================

  /**
   * 执行完整的曲式分析
   * @param {Note[]} notes - 音符数组
   * @param {Object} options - 分析选项
   * @returns {FullAnalysis}
   */
  analyzeComplete(notes, options = {}) {
    const {
      keySignature = { fifths: 0, mode: 'major' },
      timeSignature = { beats: 4, beatType: 4 },
      metadata = {}
    } = options
    
    // 1. 检测调式
    const modeAnalysis = this.detectMode(notes, keySignature)
    
    // 2. 检测动机
    const motives = this.detectMotives(notes, timeSignature)
    
    // 3. 检测乐节
    const subPhrases = this.detectSubPhrases(notes, motives)
    
    // 4. 检测终止式
    const cadences = this.detectCadences(notes, keySignature)
    
    // 5. 检测乐句
    const phrases = this.detectPhrases(notes, cadences, subPhrases)
    
    // 6. 检测乐段
    const periods = this.detectPeriods(phrases)
    
    // 7. 检测复乐段
    const compoundPeriods = this.detectCompoundPeriods(periods)
    
    // 8. 检测曲式
    const formAnalysis = this.detectForm(periods, metadata)
    
    // 9. 尝试检测流行音乐曲式
    const popFormAnalysis = this.detectPopularMusicForm(periods, metadata)
    if (popFormAnalysis.confidence > formAnalysis.confidence) {
      Object.assign(formAnalysis, popFormAnalysis)
    }
    
    // 10. 识别主题
    const themes = this.identifyThemes(periods, formAnalysis)
    
    // 11. 检测附属结构
    const introduction = periods.length > 0 ? 
      this.detectIntroduction(notes, periods[0]) : null
    const coda = periods.length > 0 ? 
      this.detectCoda(notes, periods[periods.length - 1], cadences[cadences.length - 1]) : null
    const transitions = this.detectTransitions(periods)
    const extensions = this.detectExtensions(phrases)
    
    // 12. 构建层级结构
    const hierarchy = this.buildHierarchy({
      motives,
      subPhrases,
      phrases,
      periods,
      compoundPeriods,
      themes,
      formAnalysis
    })
    
    return {
      // 基础信息
      keySignature,
      timeSignature,
      modeAnalysis,
      
      // 结构层级
      hierarchy,
      
      // 各层级详情
      motives,
      subPhrases,
      phrases,
      periods,
      compoundPeriods,
      
      // 终止式
      cadences,
      
      // 曲式分析
      form: formAnalysis,
      
      // 主题
      themes,
      
      // 附属结构
      auxiliaryStructures: {
        introduction,
        coda,
        transitions,
        extensions
      },
      
      // 统计信息
      statistics: this.calculateStatistics({
        notes, motives, subPhrases, phrases, periods, cadences
      })
    }
  }

  /**
   * 构建层级结构
   */
  buildHierarchy(data) {
    const { motives, subPhrases, phrases, periods, formAnalysis } = data
    
    return {
      level1_motives: motives.length,
      level2_subPhrases: subPhrases.length,
      level3_phrases: phrases.length,
      level4_periods: periods.length,
      level5_sections: formAnalysis.sections?.length || 0,
      
      // 层级关系映射
      relationships: {
        motiveToSubPhrase: this.mapMotivesToSubPhrases(motives, subPhrases),
        subPhraseToPhrase: this.mapSubPhrasesToPhrases(subPhrases, phrases),
        phraseToperiod: this.mapPhrasesToPeriods(phrases, periods),
        periodToSection: this.mapPeriodsToSections(periods, formAnalysis.sections || [])
      }
    }
  }

  /**
   * 映射动机到乐节
   */
  mapMotivesToSubPhrases(motives, subPhrases) {
    const mapping = {}
    for (const sp of subPhrases) {
      mapping[sp.id] = motives
        .filter(m => m.measureNumber >= sp.startMeasure && m.measureNumber <= sp.endMeasure)
        .map(m => m.id)
    }
    return mapping
  }

  /**
   * 映射乐节到乐句
   */
  mapSubPhrasesToPhrases(subPhrases, phrases) {
    const mapping = {}
    for (const phrase of phrases) {
      mapping[phrase.id] = subPhrases
        .filter(sp => sp.startMeasure >= phrase.startMeasure && sp.endMeasure <= phrase.endMeasure)
        .map(sp => sp.id)
    }
    return mapping
  }

  /**
   * 映射乐句到乐段
   */
  mapPhrasesToPeriods(phrases, periods) {
    const mapping = {}
    for (const period of periods) {
      mapping[period.id] = period.phrases.map(p => p.id)
    }
    return mapping
  }

  /**
   * 映射乐段到段落
   */
  mapPeriodsToSections(periods, sections) {
    const mapping = {}
    for (const section of sections) {
      mapping[section.id] = (section.periods || []).map(p => p.id)
    }
    return mapping
  }

  /**
   * 计算统计信息
   */
  calculateStatistics(data) {
    const { notes, motives, subPhrases, phrases, periods, cadences } = data
    
    const measureGroups = this.groupNotesByMeasure(notes)
    const totalMeasures = Object.keys(measureGroups).length
    
    return {
      totalNotes: notes.length,
      totalMeasures,
      totalMotives: motives.length,
      totalSubPhrases: subPhrases.length,
      totalPhrases: phrases.length,
      totalPeriods: periods.length,
      totalCadences: cadences.length,
      
      averagePhraseLengthMeasures: phrases.length > 0 ?
        phrases.reduce((sum, p) => sum + p.length, 0) / phrases.length : 0,
      
      averagePeriodLengthMeasures: periods.length > 0 ?
        periods.reduce((sum, p) => sum + p.length, 0) / periods.length : 0,
      
      cadenceDistribution: this.getCadenceDistribution(cadences),
      
      materialDiversity: this.calculateMaterialDiversity(phrases)
    }
  }

  /**
   * 获取终止式分布
   */
  getCadenceDistribution(cadences) {
    const distribution = {}
    for (const cadence of cadences) {
      distribution[cadence.type] = (distribution[cadence.type] || 0) + 1
    }
    return distribution
  }

  /**
   * 计算材料多样性
   */
  calculateMaterialDiversity(phrases) {
    if (phrases.length === 0) return 0
    
    const materials = phrases.map(p => p.material.charAt(0))
    const uniqueMaterials = new Set(materials)
    
    return uniqueMaterials.size / phrases.length
  }

  // ==================== Tooltip Data Generation ====================

  /**
   * Generate tooltip data for a structure node
   * Displays: used features, similarity scores, model version
   * @param {Object} node - Structure node
   * @param {Object} context - Additional context (parent, siblings, etc.)
   * @returns {Object} Tooltip data
   */
  generateTooltipData(node, context = {}) {
    const visualStyle = getConfidenceVisualStyle(node.confidence || 0.5)
    
    const tooltipData = {
      // Basic info
      nodeId: node.id,
      nodeType: node.type,
      material: node.material,
      
      // Position info
      startMeasure: node.startMeasure,
      endMeasure: node.endMeasure,
      length: (node.endMeasure - node.startMeasure + 1) + ' measures',
      
      // Confidence and uncertainty
      confidence: node.confidence,
      confidencePercent: Math.round((node.confidence || 0.5) * 100) + '%',
      uncertaintyLevel: visualStyle.uncertaintyLevel,
      visualStyle: visualStyle,
      
      // Model info
      modelVersion: this.version,
      analysisMethod: 'RuleEngine (Expert Rules)',
      
      // Features used for this detection
      usedFeatures: this.getUsedFeatures(node),
      
      // Similarity scores (if applicable)
      similarityScores: this.getSimilarityScores(node, context),
      
      // Detection details
      detectionDetails: this.getDetectionDetails(node)
    }
    
    return tooltipData
  }

  /**
   * Get features used for detecting this node
   */
  getUsedFeatures(node) {
    const features = []
    
    switch (node.type) {
      case 'motive':
        features.push('Interval Pattern', 'Rhythm Pattern', 'Melodic Contour', 'Beat Position')
        break
      case 'subphrase':
        features.push('Rhythmic Breaks', 'Measure Boundaries', 'Motive Grouping')
        break
      case 'phrase':
        features.push('Cadence Detection', 'Harmonic Analysis', 'Melodic Closure')
        break
      case 'period':
        features.push('Phrase Relationships', 'Cadence Strength', 'Material Similarity')
        break
      case 'theme':
      case 'section':
        features.push('Form Analysis', 'Material Distribution', 'Tonal Structure')
        break
      default:
        features.push('General Analysis')
    }
    
    // Add specific features based on node properties
    if (node.features?.cadence) {
      features.push(`Cadence: ${node.features.cadence.type}`)
    }
    if (node.features?.periodType) {
      features.push(`Period Type: ${node.features.periodType}`)
    }
    if (node.features?.formType) {
      features.push(`Form: ${node.features.formType}`)
    }
    
    return features
  }

  /**
   * Get similarity scores for related nodes
   */
  getSimilarityScores(node, context) {
    const scores = []
    
    if (node.similarity !== undefined) {
      scores.push({
        label: 'Material Similarity',
        value: Math.round(node.similarity * 100) + '%',
        relatedTo: node.similarTo || 'previous'
      })
    }
    
    if (node.headSimilarity !== undefined) {
      scores.push({
        label: 'Head Similarity',
        value: Math.round(node.headSimilarity * 100) + '%',
        description: 'Similarity of opening material'
      })
    }
    
    if (node.relationship) {
      scores.push({
        label: 'Relationship',
        value: node.relationship,
        description: this.getRelationshipDescription(node.relationship)
      })
    }
    
    return scores
  }

  /**
   * Get relationship description
   */
  getRelationshipDescription(relationship) {
    const descriptions = {
      'parallel': 'Same head, different tail (同头换尾)',
      'contrasting': 'Different material (对比)',
      'repetition': 'Exact or near-exact repeat (重复)',
      'development': 'Developed from previous material (发展)',
      'sequence': 'Transposed repetition (模进)',
      'variation': 'Varied repetition (变奏)'
    }
    return descriptions[relationship] || relationship
  }

  /**
   * Get detection details for tooltip
   */
  getDetectionDetails(node) {
    const details = {}
    
    if (node.type === 'phrase' && node.cadence) {
      details.cadenceType = node.cadence.type
      details.cadenceStrength = node.cadence.strength
      details.closure = node.closure
    }
    
    if (node.type === 'period') {
      details.periodType = node.features?.periodType
      details.proportion = node.features?.proportion
      details.phraseCount = node.phraseCount
    }
    
    if (node.type === 'motive') {
      details.intervalPattern = node.intervalPattern?.slice(0, 5).join(', ')
      details.contour = node.contour
    }
    
    return details
  }

  // ==================== Chunk Processing ====================

  /**
   * Process notes in chunks to avoid memory issues
   * @param {Note[]} notes - All notes
   * @param {Function} processor - Processing function
   * @param {Object} options - Processing options
   * @returns {Array} Combined results
   */
  processInChunks(notes, processor, options = {}) {
    const { maxMeasures = this.chunkConfig.maxMeasuresPerChunk } = options
    
    const measureGroups = this.groupNotesByMeasure(notes)
    const measureNumbers = Object.keys(measureGroups).map(Number).sort((a, b) => a - b)
    
    if (measureNumbers.length <= maxMeasures) {
      // Small enough to process at once
      return processor(notes, measureNumbers)
    }
    
    // Process in chunks with overlap
    const results = []
    const overlap = this.chunkConfig.overlapMeasures
    
    for (let i = 0; i < measureNumbers.length; i += maxMeasures - overlap) {
      const chunkStart = measureNumbers[i]
      const chunkEndIndex = Math.min(i + maxMeasures, measureNumbers.length) - 1
      const chunkEnd = measureNumbers[chunkEndIndex]
      
      const chunkNotes = notes.filter(n => 
        n.measureNumber >= chunkStart && n.measureNumber <= chunkEnd
      )
      
      const chunkMeasures = measureNumbers.slice(i, chunkEndIndex + 1)
      const chunkResults = processor(chunkNotes, chunkMeasures)
      
      // Merge results, avoiding duplicates in overlap region
      if (results.length === 0) {
        results.push(...chunkResults)
      } else {
        // Filter out items that overlap with previous chunk
        const overlapStart = measureNumbers[i]
        const newResults = chunkResults.filter(r => 
          (r.startMeasure || r.measureNumber || 0) >= overlapStart + overlap / 2
        )
        results.push(...newResults)
      }
    }
    
    return results
  }

  /**
   * Analyze complete structure with chunk processing
   * Memory-efficient version of analyzeComplete
   * @param {Note[]} notes 
   * @param {Object} options 
   * @returns {FullAnalysis}
   */
  analyzeCompleteChunked(notes, options = {}) {
    const totalNotes = notes.length
    const measureGroups = this.groupNotesByMeasure(notes)
    const totalMeasures = Object.keys(measureGroups).length
    
    // For small pieces, use regular analysis
    if (totalNotes < this.chunkConfig.maxNotesPerChunk * 2 && 
        totalMeasures < this.chunkConfig.maxMeasuresPerChunk * 2) {
      return this.analyzeComplete(notes, options)
    }
    
    console.log(`[RuleEngine] Processing ${totalNotes} notes in ${totalMeasures} measures using chunked analysis`)
    
    const {
      keySignature = { fifths: 0, mode: 'major' },
      timeSignature = { beats: 4, beatType: 4 },
      metadata = {}
    } = options
    
    // 1. Detect mode (can use sampling)
    const sampleNotes = notes.slice(0, Math.min(500, notes.length))
    const modeAnalysis = this.detectMode(sampleNotes, keySignature)
    
    // 2. Detect motives in chunks
    const motives = this.processInChunks(notes, (chunkNotes) => {
      return this.detectMotives(chunkNotes, timeSignature)
    })
    
    // 3. Detect sub-phrases in chunks
    const subPhrases = this.processInChunks(notes, (chunkNotes) => {
      const chunkMotives = motives.filter(m => 
        chunkNotes.some(n => n.measureNumber === m.measureNumber)
      )
      return this.detectSubPhrases(chunkNotes, chunkMotives)
    })
    
    // 4. Detect cadences (full analysis needed for harmonic context)
    const cadences = this.detectCadences(notes, keySignature)
    
    // 5. Detect phrases
    const phrases = this.detectPhrases(notes, cadences, subPhrases)
    
    // 6. Detect periods
    const periods = this.detectPeriods(phrases)
    
    // 7. Detect compound periods
    const compoundPeriods = this.detectCompoundPeriods(periods)
    
    // 8. Detect form
    const formAnalysis = this.detectForm(periods, metadata)
    
    // 9. Try popular music form
    const popFormAnalysis = this.detectPopularMusicForm(periods, metadata)
    if (popFormAnalysis.confidence > formAnalysis.confidence) {
      Object.assign(formAnalysis, popFormAnalysis)
    }
    
    // 10. Identify themes
    const themes = this.identifyThemes(periods, formAnalysis)
    
    // 11. Detect auxiliary structures
    const introduction = periods.length > 0 ? 
      this.detectIntroduction(notes, periods[0]) : null
    const coda = periods.length > 0 ? 
      this.detectCoda(notes, periods[periods.length - 1], cadences[cadences.length - 1]) : null
    const transitions = this.detectTransitions(periods)
    const extensions = this.detectExtensions(phrases)
    
    // 12. Build hierarchy
    const hierarchy = this.buildHierarchy({
      motives,
      subPhrases,
      phrases,
      periods,
      compoundPeriods,
      themes,
      formAnalysis
    })
    
    // 13. Generate tooltip data for all nodes
    const tooltipDataMap = this.generateAllTooltipData({
      motives, subPhrases, phrases, periods, formAnalysis
    })
    
    return {
      keySignature,
      timeSignature,
      modeAnalysis,
      hierarchy,
      motives,
      subPhrases,
      phrases,
      periods,
      compoundPeriods,
      cadences,
      form: formAnalysis,
      themes,
      auxiliaryStructures: {
        introduction,
        coda,
        transitions,
        extensions
      },
      tooltipData: tooltipDataMap,
      statistics: this.calculateStatistics({
        notes, motives, subPhrases, phrases, periods, cadences
      }),
      processingInfo: {
        chunked: true,
        totalNotes,
        totalMeasures,
        version: this.version
      }
    }
  }

  /**
   * Generate tooltip data for all structure nodes
   */
  generateAllTooltipData(data) {
    const tooltipMap = new Map()
    
    const { motives, subPhrases, phrases, periods, formAnalysis } = data
    
    // Motives
    motives.forEach(m => {
      tooltipMap.set(m.id, this.generateTooltipData(m))
    })
    
    // Sub-phrases
    subPhrases.forEach(sp => {
      tooltipMap.set(sp.id, this.generateTooltipData(sp))
    })
    
    // Phrases
    phrases.forEach(p => {
      tooltipMap.set(p.id, this.generateTooltipData(p))
    })
    
    // Periods
    periods.forEach(p => {
      tooltipMap.set(p.id, this.generateTooltipData(p))
    })
    
    // Sections from form analysis
    if (formAnalysis.sections) {
      formAnalysis.sections.forEach(s => {
        tooltipMap.set(s.id, this.generateTooltipData(s))
      })
    }
    
    return tooltipMap
  }

  // ==================== 辅助方法 Helper Methods ====================

  /**
   * 从调号获取主音
   */
  getTonicFromKey(keySignature) {
    const fifths = keySignature.fifths || 0
    const mode = keySignature.mode || 'major'
    
    const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#']
    const majorKeysFlat = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']
    
    let tonic
    if (fifths >= 0) {
      tonic = majorKeys[Math.min(fifths, 7)] || 'C'
    } else {
      tonic = majorKeysFlat[Math.min(-fifths, 7)] || 'C'
    }
    
    // 小调调整 (关系小调低三度)
    if (mode === 'minor') {
      const tonicPc = this.pitchClasses[tonic]
      const minorPc = (tonicPc + 9) % 12
      for (const [name, pc] of Object.entries(this.pitchClasses)) {
        if (pc === minorPc && name.length <= 2) {
          tonic = name
          break
        }
      }
    }
    
    return tonic
  }

  /**
   * 获取音阶级数
   */
  getScaleDegree(pitch, tonic, mode = 'major') {
    if (!pitch) return -1
    
    const pitchName = pitch.replace(/[0-9]/g, '')
    const tonicPc = this.pitchClasses[tonic] || 0
    const pitchPc = this.pitchClasses[pitchName]
    
    if (pitchPc === undefined) return -1
    
    const interval = (pitchPc - tonicPc + 12) % 12
    const degreeMap = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 }
    
    return degreeMap[interval] ?? -1
  }

  /**
   * 按小节分组音符
   */
  groupNotesByMeasure(notes) {
    const groups = {}
    for (const note of notes) {
      const measure = note.measureNumber || 1
      if (!groups[measure]) {
        groups[measure] = []
      }
      groups[measure].push(note)
    }
    return groups
  }

  /**
   * 按拍分组音符
   */
  groupNotesByBeat(notes, beatsPerMeasure) {
    const groups = {}
    for (let i = 0; i < beatsPerMeasure; i++) {
      groups[i] = []
    }
    
    for (const note of notes) {
      const beat = Math.floor((note.beat || 0) % beatsPerMeasure)
      if (groups[beat]) {
        groups[beat].push(note)
      }
    }
    
    return groups
  }

  /**
   * 获取最低音
   */
  getLowestNote(notes) {
    if (!notes || notes.length === 0) return null
    
    return notes.reduce((lowest, note) => {
      if (!lowest) return note
      const lowestMidi = this.pitchToMidi(lowest.pitch)
      const noteMidi = this.pitchToMidi(note.pitch)
      return noteMidi < lowestMidi ? note : lowest
    }, null)
  }

  /**
   * 获取最高音
   */
  getHighestNote(notes) {
    if (!notes || notes.length === 0) return null
    
    return notes.reduce((highest, note) => {
      if (!highest) return note
      const highestMidi = this.pitchToMidi(highest.pitch)
      const noteMidi = this.pitchToMidi(note.pitch)
      return noteMidi > highestMidi ? note : highest
    }, null)
  }

  /**
   * 音高转MIDI编号
   */
  pitchToMidi(pitch) {
    if (!pitch) return 60
    
    const match = pitch.match(/([A-G][#b]?)(-?\d+)/)
    if (!match) return 60
    
    const [, noteName, octave] = match
    const pc = this.pitchClasses[noteName] || 0
    return pc + (parseInt(octave) + 1) * 12
  }

  /**
   * 获取指定范围内的音符
   */
  getNotesInRange(notes, startMeasure, endMeasure) {
    return notes.filter(n => 
      n.measureNumber >= startMeasure && n.measureNumber <= endMeasure
    )
  }

  /**
   * 分配材料标签
   */
  assignMaterialLabel(index) {
    const baseLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const baseIndex = index % baseLabels.length
    const primeCount = Math.floor(index / baseLabels.length)
    
    return baseLabels[baseIndex] + "'".repeat(primeCount)
  }

  /**
   * 比较两个数组的相似度
   */
  compareArrays(arr1, arr2) {
    if (!arr1.length || !arr2.length) return 0
    
    const minLen = Math.min(arr1.length, arr2.length)
    const maxLen = Math.max(arr1.length, arr2.length)
    
    let matches = 0
    for (let i = 0; i < minLen; i++) {
      if (Math.abs(arr1[i] - arr2[i]) <= 1) {
        matches++
      }
    }
    
    // 考虑长度差异
    const lengthPenalty = 1 - (maxLen - minLen) / maxLen
    
    return (matches / minLen) * lengthPenalty
  }

  /**
   * 检测移位
   */
  detectTransposition(notes1, notes2) {
    if (!notes1.length || !notes2.length) return 0
    
    const midi1 = notes1.map(n => this.pitchToMidi(n.pitch))
    const midi2 = notes2.map(n => this.pitchToMidi(n.pitch))
    
    const avg1 = midi1.reduce((a, b) => a + b, 0) / midi1.length
    const avg2 = midi2.reduce((a, b) => a + b, 0) / midi2.length
    
    return Math.round(avg2 - avg1)
  }

  /**
   * 检查是否为裁截
   */
  isFragmentation(motive1, motive2) {
    const len1 = motive1.notes.length
    const len2 = motive2.notes.length
    
    // 第二个动机明显更短
    if (len2 >= len1 * 0.8) return false
    
    // 检查是否使用了第一个动机的部分材料
    const intervals1 = motive1.intervalPattern.slice(0, len2 - 1)
    const intervals2 = motive2.intervalPattern
    
    return this.compareArrays(intervals1, intervals2) > 0.7
  }

  /**
   * 检查是否为倒影
   */
  isInversion(intervals1, intervals2) {
    if (intervals1.length !== intervals2.length) return false
    
    let matches = 0
    for (let i = 0; i < intervals1.length; i++) {
      if (Math.abs(intervals1[i] + intervals2[i]) <= 1) {
        matches++
      }
    }
    
    return matches / intervals1.length > 0.8
  }

  /**
   * 计算旋律相似度
   */
  calculateMelodicSimilarity(notes1, notes2) {
    if (!notes1.length || !notes2.length) return 0
    
    const intervals1 = this.extractIntervalPattern(notes1)
    const intervals2 = this.extractIntervalPattern(notes2)
    const rhythm1 = this.extractRhythmPattern(notes1)
    const rhythm2 = this.extractRhythmPattern(notes2)
    
    const intervalSim = this.compareArrays(intervals1, intervals2)
    const rhythmSim = this.compareArrays(rhythm1, rhythm2)
    
    return intervalSim * 0.6 + rhythmSim * 0.4
  }

  /**
   * 计算乐段相似度
   */
  calculatePeriodSimilarity(period1, period2) {
    if (!period1.phrases?.length || !period2.phrases?.length) return 0
    
    const notes1 = period1.phrases.flatMap(p => p.notes || [])
    const notes2 = period2.phrases.flatMap(p => p.notes || [])
    
    return this.calculateMelodicSimilarity(notes1, notes2)
  }

  /**
   * 比较节奏
   */
  compareRhythms(period1, period2) {
    const rhythm1 = period1.phrases.flatMap(p => 
      (p.notes || []).map(n => n.duration || 1)
    )
    const rhythm2 = period2.phrases.flatMap(p => 
      (p.notes || []).map(n => n.duration || 1)
    )
    
    return this.compareArrays(rhythm1, rhythm2)
  }

  /**
   * 检查是否有再现
   */
  hasRecapitulation(period1, period2) {
    if (!period2.phrases || period2.phrases.length === 0) return false
    
    const lastPhrase = period2.phrases[period2.phrases.length - 1]
    const firstPhrase = period1.phrases[0]
    
    if (!lastPhrase || !firstPhrase) return false
    
    return this.comparePhraseHeads(firstPhrase, lastPhrase) > 0.6
  }

  /**
   * 检查是否为新段落开始
   */
  isNewSection(currentPhrase, nextPhrase) {
    if (!currentPhrase || !nextPhrase) return false
    
    // 强终止式后的新材料
    const hasStrongCadence = this.getCadenceStrength(currentPhrase.cadence) >= 0.8
    const headSimilarity = this.comparePhraseHeads(currentPhrase, nextPhrase)
    
    return hasStrongCadence && headSimilarity < 0.3
  }

  /**
   * 创建通用段落结构
   */
  createSections(periods, formType) {
    return periods.map((period, index) => ({
      id: generateId(),
      name: String.fromCharCode(65 + index),
      type: 'period',
      startMeasure: period.startMeasure,
      endMeasure: period.endMeasure,
      function: index === 0 ? 'main' : 'secondary',
      periods: [period]
    }))
  }
}

export default RuleEngine
