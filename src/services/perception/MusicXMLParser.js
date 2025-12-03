/**
 * MusicXML Parser - Perception Layer
 * Parses MusicXML files and extracts musical data
 */

import JSZip from 'jszip'

export class MusicXMLParser {
  constructor() {
    this.xmlDoc = null
    this.parsedScore = null
  }

  /**
   * Parse a MusicXML file (.musicxml or .mxl)
   * @param {File} file 
   * @returns {Promise<Object>} ParsedScore
   */
  async parse(file) {
    const fileName = file.name.toLowerCase()
    let xmlString

    if (fileName.endsWith('.mxl')) {
      xmlString = await this.extractMXL(file)
    } else if (fileName.endsWith('.musicxml') || fileName.endsWith('.xml')) {
      xmlString = await file.text()
    } else {
      throw new Error('Unsupported file format. Please use .musicxml or .mxl files.')
    }

    this.xmlDoc = new DOMParser().parseFromString(xmlString, 'text/xml')
    
    // Check for parsing errors
    const parseError = this.xmlDoc.querySelector('parsererror')
    if (parseError) {
      throw new Error('Invalid MusicXML file: ' + parseError.textContent)
    }

    this.parsedScore = {
      measures: this.extractMeasures(),
      notes: this.extractNotes(),
      keySignature: this.extractKeySignature(),
      timeSignature: this.extractTimeSignature(),
      tempo: this.extractTempo(),
      parts: this.extractParts()
    }

    return this.parsedScore
  }

  /**
   * Extract XML from compressed MXL file
   */
  async extractMXL(file) {
    const zip = new JSZip()
    const contents = await zip.loadAsync(file)
    
    // Find the rootfile from META-INF/container.xml
    const containerXml = await contents.file('META-INF/container.xml')?.async('string')
    if (!containerXml) {
      throw new Error('Invalid MXL file: missing container.xml')
    }

    const containerDoc = new DOMParser().parseFromString(containerXml, 'text/xml')
    const rootFile = containerDoc.querySelector('rootfile')?.getAttribute('full-path')
    
    if (!rootFile) {
      throw new Error('Invalid MXL file: cannot find root file')
    }

    const musicXml = await contents.file(rootFile)?.async('string')
    if (!musicXml) {
      throw new Error('Invalid MXL file: cannot read music XML')
    }

    return musicXml
  }

  /**
   * Extract all measures from the score
   */
  extractMeasures() {
    const measures = []
    const measureElements = this.xmlDoc.querySelectorAll('measure')
    
    let currentBeat = 0
    const timeSignature = this.extractTimeSignature()
    const beatsPerMeasure = timeSignature.beats

    measureElements.forEach((measureEl, index) => {
      const measureNumber = parseInt(measureEl.getAttribute('number')) || index + 1
      const notes = this.extractNotesFromMeasure(measureEl, measureNumber)
      
      measures.push({
        number: measureNumber,
        notes: notes,
        startBeat: currentBeat,
        endBeat: currentBeat + beatsPerMeasure
      })
      
      currentBeat += beatsPerMeasure
    })

    return measures
  }

  /**
   * Extract notes from a specific measure element
   */
  extractNotesFromMeasure(measureEl, measureNumber) {
    const notes = []
    const noteElements = measureEl.querySelectorAll('note')
    let currentBeat = 0

    noteElements.forEach(noteEl => {
      // Skip rest notes for now (they don't have pitch)
      const isRest = noteEl.querySelector('rest') !== null
      const isChord = noteEl.querySelector('chord') !== null
      
      if (!isChord) {
        const duration = this.parseDuration(noteEl)
        
        if (!isRest) {
          const pitch = this.parsePitch(noteEl)
          const dynamics = this.parseDynamics(noteEl)
          const voice = parseInt(noteEl.querySelector('voice')?.textContent) || 1

          notes.push({
            pitch: pitch,
            duration: duration,
            measureNumber: measureNumber,
            beat: currentBeat,
            voice: voice,
            dynamics: dynamics
          })
        }
        
        currentBeat += duration
      } else {
        // Chord note - same beat as previous
        const pitch = this.parsePitch(noteEl)
        const duration = this.parseDuration(noteEl)
        const voice = parseInt(noteEl.querySelector('voice')?.textContent) || 1

        notes.push({
          pitch: pitch,
          duration: duration,
          measureNumber: measureNumber,
          beat: currentBeat - duration,
          voice: voice
        })
      }
    })

    return notes
  }

  /**
   * Extract all notes from the entire score
   */
  extractNotes() {
    const allNotes = []
    this.parsedScore?.measures?.forEach(measure => {
      allNotes.push(...measure.notes)
    }) 
    
    // If measures not yet parsed, extract directly
    if (allNotes.length === 0) {
      const measureElements = this.xmlDoc.querySelectorAll('measure')
      measureElements.forEach((measureEl, index) => {
        const measureNumber = parseInt(measureEl.getAttribute('number')) || index + 1
        const notes = this.extractNotesFromMeasure(measureEl, measureNumber)
        allNotes.push(...notes)
      })
    }
    
    return allNotes
  }

  /**
   * Parse pitch from note element
   */
  parsePitch(noteEl) {
    const pitchEl = noteEl.querySelector('pitch')
    if (!pitchEl) return null

    const step = pitchEl.querySelector('step')?.textContent || 'C'
    const octave = pitchEl.querySelector('octave')?.textContent || '4'
    const alter = parseInt(pitchEl.querySelector('alter')?.textContent) || 0

    let accidental = ''
    if (alter === 1) accidental = '#'
    else if (alter === -1) accidental = 'b'
    else if (alter === 2) accidental = '##'
    else if (alter === -2) accidental = 'bb'

    return `${step}${accidental}${octave}`
  }

  /**
   * Parse duration from note element (in beats)
   */
  parseDuration(noteEl) {
    const durationEl = noteEl.querySelector('duration')
    const divisionsEl = this.xmlDoc.querySelector('divisions')
    
    const duration = parseInt(durationEl?.textContent) || 1
    const divisions = parseInt(divisionsEl?.textContent) || 1
    
    return duration / divisions
  }

  /**
   * Parse dynamics from note element
   */
  parseDynamics(noteEl) {
    const dynamicsEl = noteEl.querySelector('dynamics')
    if (!dynamicsEl) return null
    
    // Check for common dynamics markings
    const dynamicsTypes = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff']
    for (const type of dynamicsTypes) {
      if (dynamicsEl.querySelector(type)) {
        return type
      }
    }
    return null
  }

  /**
   * Extract key signature
   */
  extractKeySignature() {
    const keyEl = this.xmlDoc.querySelector('key')
    if (!keyEl) {
      return { fifths: 0, mode: 'major' }
    }

    const fifths = parseInt(keyEl.querySelector('fifths')?.textContent) || 0
    const mode = keyEl.querySelector('mode')?.textContent || 'major'

    return { fifths, mode }
  }

  /**
   * Extract time signature
   */
  extractTimeSignature() {
    const timeEl = this.xmlDoc.querySelector('time')
    if (!timeEl) {
      return { beats: 4, beatType: 4 }
    }

    const beats = parseInt(timeEl.querySelector('beats')?.textContent) || 4
    const beatType = parseInt(timeEl.querySelector('beat-type')?.textContent) || 4

    return { beats, beatType }
  }

  /**
   * Extract tempo (BPM)
   */
  extractTempo() {
    // Try to find tempo from sound element
    const soundEl = this.xmlDoc.querySelector('sound[tempo]')
    if (soundEl) {
      return parseFloat(soundEl.getAttribute('tempo')) || 120
    }

    // Try metronome marking
    const metronomeEl = this.xmlDoc.querySelector('metronome')
    if (metronomeEl) {
      const perMinute = metronomeEl.querySelector('per-minute')?.textContent
      if (perMinute) {
        return parseFloat(perMinute) || 120
      }
    }

    return 120 // Default tempo
  }

  /**
   * Extract parts information
   */
  extractParts() {
    const parts = []
    const partListEl = this.xmlDoc.querySelector('part-list')
    
    if (partListEl) {
      const scorePartEls = partListEl.querySelectorAll('score-part')
      scorePartEls.forEach(partEl => {
        parts.push({
          id: partEl.getAttribute('id'),
          name: partEl.querySelector('part-name')?.textContent || 'Unknown'
        })
      })
    }

    return parts
  }

  /**
   * Get the parsed score
   */
  getParsedScore() {
    return this.parsedScore
  }
}

export default MusicXMLParser
