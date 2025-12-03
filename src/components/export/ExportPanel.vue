<script setup>
import { ref, inject } from 'vue'
import JSZip from 'jszip'
import { useNotifications } from '../../composables/useNotifications.js'

const emit = defineEmits(['close'])

const sessionStore = inject('sessionStore')
const structureStore = inject('structureStore')
const visualStore = inject('visualStore')
const preferencesStore = inject('preferencesStore')

const { notify } = useNotifications()

const isExporting = ref(false)
const exportProgress = ref(0)
const selectedFormat = ref('json')

const formats = [
  { id: 'json', label: 'JSON Session', icon: '📄', desc: 'Complete session data' },
  { id: 'html', label: 'Interactive HTML', icon: '🌐', desc: 'Standalone viewer' },
  { id: 'svg', label: 'SVG Visual Map', icon: '🎨', desc: 'Vector graphics' },
  { id: 'bundle', label: 'MVT Bundle', icon: '📦', desc: 'Complete package' }
]

async function exportData() {
  isExporting.value = true
  exportProgress.value = 0
  try {
    switch (selectedFormat.value) {
      case 'json': await exportJSON(); break
      case 'html': await exportHTML(); break
      case 'svg': await exportSVG(); break
      case 'bundle': await exportBundle(); break
    }
    notify({ type: 'success', title: 'Export Complete', message: 'Successfully exported' })
  } catch (error) {
    notify({ type: 'error', title: 'Export Failed', message: error.message })
  } finally {
    isExporting.value = false
    exportProgress.value = 0
  }
}

async function exportJSON() {
  exportProgress.value = 50
  const data = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    session: sessionStore.exportSession(),
    structure: structureStore.exportStructure(),
    visualMappings: visualStore.exportMappings(),
    preferences: preferencesStore.exportPreferences()
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadBlob(blob, 'smart-music-map-' + Date.now() + '.json')
  exportProgress.value = 100
}

async function exportHTML() {
  exportProgress.value = 50
  const structureData = structureStore.exportStructure()
  const visualData = visualStore.exportMappings()
  const html = buildHTMLExport(structureData, visualData)
  const blob = new Blob([html], { type: 'text/html' })
  downloadBlob(blob, 'smart-music-map-' + Date.now() + '.html')
  exportProgress.value = 100
}

async function exportSVG() {
  exportProgress.value = 50
  const svg = buildSVGExport()
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  downloadBlob(blob, 'visual-map-' + Date.now() + '.svg')
  exportProgress.value = 100
}

async function exportBundle() {
  exportProgress.value = 20
  const zip = new JSZip()
  const jsonData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    session: sessionStore.exportSession(),
    structure: structureStore.exportStructure(),
    visualMappings: visualStore.exportMappings()
  }
  zip.file('session.json', JSON.stringify(jsonData, null, 2))
  exportProgress.value = 40
  zip.file('visual-map.svg', buildSVGExport())
  exportProgress.value = 60
  zip.file('viewer.html', buildHTMLExport(jsonData.structure, jsonData.visualMappings))
  exportProgress.value = 80
  const content = await zip.generateAsync({ type: 'blob' })
  downloadBlob(content, 'smart-music-map-' + Date.now() + '.zip')
  exportProgress.value = 100
}

function buildHTMLExport(structure, visual) {
  var parts = []
  parts.push('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Smart Music Map</title>')
  parts.push('<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:sans-serif;background:#f5f7fa;padding:2rem}')
  parts.push('.header{text-align:center;margin-bottom:2rem}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:1rem}')
  parts.push('.cell{background:white;border-radius:12px;padding:1rem;box-shadow:0 2px 8px rgba(0,0,0,0.08);text-align:center}')
  parts.push('.cell-label{font-weight:600;color:#4f46e5}.cell-visual{font-size:2rem;padding:1rem}</style></head>')
  parts.push('<body><div class="header"><h1>Smart Music Map</h1></div><div class="grid" id="g"></div>')
  parts.push('<scr' + 'ipt>var v=' + JSON.stringify(visual) + ';var s=' + JSON.stringify(structure) + ';')
  parts.push('var ic={circle:"●",square:"■",triangle:"▲",diamond:"◆",star5:"★"};var g=document.getElementById("g");')
  parts.push('Object.entries(v).forEach(function(e){var c=document.createElement("div");c.className="cell";')
  parts.push('var n=s&&s.nodes&&s.nodes[e[0]];var l=n&&n.material?n.material:e[0].slice(0,8);')
  parts.push('var co=e[1].colors&&e[1].colors[0]?e[1].colors[0]:"#667eea";')
  parts.push('var sh=e[1].shapes&&e[1].shapes[0]?e[1].shapes[0].type:"circle";')
  parts.push('c.innerHTML="<div class=cell-label>"+l+"</div><div class=cell-visual style=color:"+co+">"+(ic[sh]||"●")+"</div>";')
  parts.push('g.appendChild(c);});')
  parts.push('</scr' + 'ipt></body></html>')
  return parts.join('')
}

function buildSVGExport() {
  var mappings = visualStore.getAllMappingsArray()
  var w = 800, h = Math.ceil(mappings.length / 4) * 150 + 100
  var ic = { circle: '●', square: '■', triangle: '▲', diamond: '◆', star5: '★' }
  var shapes = ''
  mappings.forEach(function(m, i) {
    var x = 50 + (i % 4) * 180, y = 80 + Math.floor(i / 4) * 140
    var co = m.colors && m.colors[0] ? m.colors[0] : '#667eea'
    var icon = m.shapes && m.shapes[0] ? m.shapes[0].type : 'circle'
    var label = m.material || (m.nodeId ? m.nodeId.slice(0, 8) : 'item')
    shapes += '<g transform="translate(' + x + ',' + y + ')"><rect x="0" y="0" width="160" height="120" rx="12" fill="white" stroke="#e2e8f0"/>'
    shapes += '<text x="80" y="30" text-anchor="middle" font-size="14" fill="#4f46e5">' + label + '</text>'
    shapes += '<text x="80" y="80" text-anchor="middle" font-size="40" fill="' + co + '">' + (ic[icon] || '●') + '</text></g>'
  })
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
    '<rect width="100%" height="100%" fill="#f5f7fa"/>' +
    '<text x="' + (w/2) + '" y="40" text-anchor="middle" font-size="24" fill="#1e293b">Smart Music Map</text>' +
    shapes + '</svg>'
}

function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob)
  var a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="export-overlay" @click.self="emit('close')">
    <div class="export-panel">
      <div class="panel-header">
        <h2>Export Project</h2>
        <button class="btn-close" @click="emit('close')">×</button>
      </div>
      <div class="format-grid">
        <div v-for="format in formats" :key="format.id" class="format-card" :class="{ selected: selectedFormat === format.id }" @click="selectedFormat = format.id">
          <span class="format-icon">{{ format.icon }}</span>
          <span class="format-label">{{ format.label }}</span>
          <span class="format-desc">{{ format.desc }}</span>
        </div>
      </div>
      <div v-if="isExporting" class="export-progress">
        <div class="progress-bar"><div class="progress-fill" :style="{ width: exportProgress + '%' }"></div></div>
        <span class="progress-text">Exporting... {{ exportProgress }}%</span>
      </div>
      <div class="panel-actions">
        <button class="btn-cancel" @click="emit('close')">Cancel</button>
        <button class="btn-export" @click="exportData" :disabled="isExporting">{{ isExporting ? 'Exporting...' : 'Export' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.export-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.export-panel { background: white; border-radius: 16px; width: 90%; max-width: 500px; padding: 1.5rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.panel-header h2 { margin: 0; font-size: 1.25rem; color: #1e293b; }
.btn-close { width: 32px; height: 32px; border: none; background: #f1f5f9; border-radius: 8px; cursor: pointer; font-size: 1.25rem; color: #64748b; }
.btn-close:hover { background: #e2e8f0; }
.format-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
.format-card { display: flex; flex-direction: column; align-items: center; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s; text-align: center; }
.format-card:hover { border-color: #cbd5e1; }
.format-card.selected { border-color: #667eea; background: #eef2ff; }
.format-icon { font-size: 2rem; margin-bottom: 0.5rem; }
.format-label { font-weight: 600; color: #1e293b; margin-bottom: 0.25rem; }
.format-desc { font-size: 0.75rem; color: #64748b; }
.export-progress { margin-bottom: 1.5rem; }
.progress-bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); transition: width 0.3s; }
.progress-text { font-size: 0.85rem; color: #64748b; }
.panel-actions { display: flex; gap: 0.75rem; }
.btn-cancel, .btn-export { flex: 1; padding: 0.75rem; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; }
.btn-cancel { background: #f1f5f9; color: #475569; }
.btn-cancel:hover { background: #e2e8f0; }
.btn-export { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
.btn-export:hover:not(:disabled) { transform: translateY(-1px); }
.btn-export:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
