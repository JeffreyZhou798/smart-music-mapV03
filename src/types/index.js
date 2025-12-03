/**
 * Smart Music Map - Type Definitions
 * Core data structures for musical analysis
 */

/**
 * @typedef {Object} Note
 * @property {string} pitch - e.g., "C4", "D#5"
 * @property {number} duration - in beats
 * @property {number} measureNumber
 * @property {number} beat
 * @property {number} voice
 * @property {string} [dynamics] - p, mf, f, etc.
 */

/**
 * @typedef {Object} Measure
 * @property {number} number
 * @property {Note[]} notes
 * @property {number} startBeat
 * @property {number} endBeat
 */

/**
 * @typedef {Object} KeySignature
 * @property {number} fifths - -7 to 7
 * @property {string} mode - 'major' | 'minor'
 */

/**
 * @typedef {Object} TimeSignature
 * @property {number} beats
 * @property {number} beatType
 */

/**
 * @typedef {Object} ParsedScore
 * @property {Measure[]} measures
 * @property {Note[]} notes
 * @property {KeySignature} keySignature
 * @property {TimeSignature} timeSignature
 * @property {number} tempo
 * @property {Object[]} parts
 */

/**
 * @typedef {'perfect_authentic'|'imperfect_authentic'|'half'|'deceptive'} CadenceType
 */

/**
 * @typedef {Object} Cadence
 * @property {number} measureNumber
 * @property {number} beat
 * @property {CadenceType} type
 * @property {number} confidence - 0.0 to 1.0
 */

/**
 * @typedef {Object} Phrase
 * @property {string} id
 * @property {number} startMeasure
 * @property {number} endMeasure
 * @property {Cadence} cadence
 * @property {string} material - 'a', 'a\'', 'b', etc.
 */

/**
 * @typedef {'parallel'|'contrasting'|'sequential'} PeriodType
 */

/**
 * @typedef {'square'|'regular'|'non_square'} PeriodProportion
 */

/**
 * @typedef {Object} Period
 * @property {string} id
 * @property {Phrase[]} phrases
 * @property {PeriodType} type
 * @property {PeriodProportion} proportion
 * @property {'closed'|'open'} closure
 */

/**
 * @typedef {'one_part'|'binary_rounded'|'binary_parallel'|'ternary_simple'|'ternary_compound'|'sonata'|'rondo'|'variation'|'rondo_sonata'|'verse_chorus'|'aaba'} FormType
 */

/**
 * @typedef {Object} Section
 * @property {string} id
 * @property {string} name
 * @property {number} startMeasure
 * @property {number} endMeasure
 * @property {string} function - 'exposition', 'development', 'recapitulation', etc.
 */

/**
 * @typedef {Object} FormAnalysis
 * @property {FormType} formType
 * @property {Section[]} sections
 * @property {number} confidence
 */

/**
 * @typedef {'motive'|'subphrase'|'phrase'|'period'|'theme'|'section'} StructureType
 */

/**
 * @typedef {Object} StructureNode
 * @property {string} id
 * @property {StructureType} type
 * @property {number} startMeasure
 * @property {number} endMeasure
 * @property {StructureNode[]} children
 * @property {StructureNode} [parent]
 * @property {string} material
 * @property {number} confidence
 * @property {Object} features
 */

/**
 * @typedef {Object} StructureTree
 * @property {StructureNode} root
 * @property {Map<string, StructureNode>} nodes
 */

// Visual Types

/**
 * @typedef {'circle'|'square'|'triangle'|'diamond'|'hexagon'|'octagon'|'star4'|'star5'|'star6'|'note'|'clef'|'rest'|'wave'|'spiral'|'burst'|'flower'|'leaf'|'sun'|'heart'|'arrow'} ShapeType
 */

/**
 * @typedef {Object} Shape
 * @property {ShapeType} type
 * @property {'small'|'medium'|'large'} size
 */

/**
 * @typedef {'flash'|'rotate'|'bounce'|'pulse'|'slide'|'fade'|'shake'|'grow'|'spin'|'wave'} AnimationType
 */

/**
 * @typedef {Object} VisualScheme
 * @property {string} id
 * @property {Shape[]} shapes
 * @property {string[]} colors
 * @property {AnimationType} animation
 * @property {'single'|'sequence'|'grid'} arrangement
 */

/**
 * @typedef {Object} AlignmentResult
 * @property {Array<[number, number]>} path
 * @property {Map<number, number>} measureToTime
 * @property {number} confidence
 */

// Export constants
export const SHAPE_LIBRARY = [
  { type: 'circle' }, { type: 'square' }, { type: 'triangle' },
  { type: 'diamond' }, { type: 'hexagon' }, { type: 'octagon' },
  { type: 'star4' }, { type: 'star5' }, { type: 'star6' },
  { type: 'note' }, { type: 'clef' }, { type: 'rest' },
  { type: 'wave' }, { type: 'spiral' }, { type: 'burst' },
  { type: 'flower' }, { type: 'leaf' }, { type: 'sun' },
  { type: 'heart' }, { type: 'arrow' }
]

export const COLOR_PALETTE = {
  warm: ['#FF6B6B', '#FFA07A', '#FFD93D', '#FF8C42', '#FF5252', '#FF7043', '#FFAB40', '#FFD740'],
  cool: ['#6BCB77', '#4D96FF', '#9B59B6', '#3498DB', '#1ABC9C', '#00BCD4', '#7E57C2', '#5C6BC0']
}

export const ANIMATIONS = [
  'flash', 'rotate', 'bounce', 'pulse', 'slide',
  'fade', 'shake', 'grow', 'spin', 'wave'
]

export const CONFIDENCE_THRESHOLDS = {
  high: 0.8,
  medium: 0.6,
  low: 0.4
}

export const STRUCTURE_LABELS = {
  motive: { en: 'Motive', zh: '动机' },
  subphrase: { en: 'Sub-phrase', zh: '乐节' },
  phrase: { en: 'Phrase', zh: '乐句' },
  period: { en: 'Period', zh: '乐段' },
  theme: { en: 'Theme', zh: '主题' },
  section: { en: 'Section', zh: '部' }
}

export const FORM_LABELS = {
  one_part: { en: 'One-part Form', zh: '一部曲式' },
  binary_rounded: { en: 'Rounded Binary', zh: '再现单二部曲式' },
  binary_parallel: { en: 'Parallel Binary', zh: '并列单二部曲式' },
  ternary_simple: { en: 'Simple Ternary', zh: '单三部曲式' },
  ternary_compound: { en: 'Compound Ternary', zh: '复三部曲式' },
  sonata: { en: 'Sonata Form', zh: '奏鸣曲式' },
  rondo: { en: 'Rondo Form', zh: '回旋曲式' },
  variation: { en: 'Variation Form', zh: '变奏曲式' },
  rondo_sonata: { en: 'Rondo-Sonata Form', zh: '回旋奏鸣曲式' },
  verse_chorus: { en: 'Verse-Chorus Form', zh: '主歌-副歌式' },
  aaba: { en: 'AABA Form', zh: 'AABA曲式' }
}

export const CADENCE_LABELS = {
  perfect_authentic: { en: 'Perfect Authentic Cadence', zh: '完满全终止' },
  imperfect_authentic: { en: 'Imperfect Authentic Cadence', zh: '不完满全终止' },
  half: { en: 'Half Cadence', zh: '半终止' },
  deceptive: { en: 'Deceptive Cadence', zh: '阻碍终止' }
}
