<script setup>
import { ref, provide, computed } from 'vue'
import { useSessionStore } from './stores/session.js'
import { useStructureStore } from './stores/structure.js'
import { useVisualStore } from './stores/visual.js'
import { usePreferencesStore } from './stores/preferences.js'

// Components
import FileUploader from './components/upload/FileUploader.vue'
import ScoreDisplay from './components/score/ScoreDisplay.vue'
import VisualMap from './components/visual/VisualMap.vue'
import VisualOverview from './components/visual/VisualOverview.vue'
import PlaybackControls from './components/playback/PlaybackControls.vue'
import SyncPlaybackView from './components/playback/SyncPlaybackView.vue'
import ExportPanel from './components/export/ExportPanel.vue'
import StructurePanel from './components/structure/StructurePanel.vue'
import RecommendationPanel from './components/recommendation/RecommendationPanel.vue'
import NotificationContainer from './components/common/NotificationContainer.vue'
import ResizableSplit from './components/common/ResizableSplit.vue'

// Stores
const sessionStore = useSessionStore()
const structureStore = useStructureStore()
const visualStore = useVisualStore()
const preferencesStore = usePreferencesStore()

// UI State
const activeTab = ref('upload')
const showExportPanel = ref(false)
const showSyncPlayback = ref(false)

// Provide stores to child components
provide('sessionStore', sessionStore)
provide('structureStore', structureStore)
provide('visualStore', visualStore)
provide('preferencesStore', preferencesStore)

// Tab navigation
const tabs = [
  { id: 'upload', label: '上传 Upload', icon: '📁' },
  { id: 'score', label: '乐谱 Score', icon: '🎼' },
  { id: 'structure', label: '结构 Structure', icon: '🏗️' },
  { id: 'visual', label: '视觉地图 Visual', icon: '🎨' },
  { id: 'overview', label: '全览 Overview', icon: '📊' },
  { id: 'playback', label: '播放 Playback', icon: '▶️' }
]

// Computed
const mappingProgress = computed(() => {
  const phraseNodes = structureStore.nodesByType.phrase || []
  if (phraseNodes.length === 0) return 0
  const mapped = phraseNodes.filter(n => visualStore.getMapping(n.id)).length
  return Math.round((mapped / phraseNodes.length) * 100)
})

function setActiveTab(tabId) {
  activeTab.value = tabId
}

function handleAnalysisComplete() {
  activeTab.value = 'structure'
}

function toggleExportPanel() {
  showExportPanel.value = !showExportPanel.value
}

function openSyncPlayback() {
  showSyncPlayback.value = true
}

function closeSyncPlayback() {
  showSyncPlayback.value = false
}

function handleOverviewSelectNode(node) {
  activeTab.value = 'structure'
}

function handleOverviewGotoPlayback() {
  openSyncPlayback()
}
</script>

<template>
  <div class="app-container">
    <!-- Sync Playback Full Screen View -->
    <SyncPlaybackView 
      v-if="showSyncPlayback"
      @back="closeSyncPlayback"
    />

    <!-- Main App View -->
    <template v-else>
      <!-- Header -->
      <header class="app-header">
        <div class="logo">
          <span class="logo-icon">🎵</span>
          <h1>Smart Music Map</h1>
          <span class="logo-subtitle">智能音乐图谱</span>
        </div>
        <div class="header-actions">
          <div class="progress-indicator" v-if="sessionStore.hasScore">
            <div class="progress-ring">
              <svg viewBox="0 0 36 36">
                <path class="progress-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path class="progress-fill" :stroke-dasharray="`${mappingProgress}, 100`" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <span class="progress-text">{{ mappingProgress }}%</span>
            </div>
            <span class="progress-label">完成度</span>
          </div>
          <button 
            class="btn btn-sync" 
            @click="openSyncPlayback"
            :disabled="!sessionStore.isReady || mappingProgress === 0"
            title="综合播放视图"
          >
            🎬 同步播放
          </button>
          <button 
            class="btn btn-export" 
            @click="toggleExportPanel"
            :disabled="!sessionStore.isReady"
          >
            📤 导出 Export
          </button>
          <div class="learning-status" v-if="preferencesStore.hasLearned">
            <span class="status-dot"></span>
            🧠 {{ preferencesStore.exampleCount }} 已学习
          </div>
        </div>
      </header>

      <!-- Navigation Tabs -->
      <nav class="tab-nav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="setActiveTab(tab.id)"
          :disabled="tab.id !== 'upload' && !sessionStore.hasScore"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </nav>

      <!-- Main Content -->
      <main class="main-content">
        <!-- Upload Tab -->
        <div v-show="activeTab === 'upload'" class="tab-content">
          <FileUploader @analysis-complete="handleAnalysisComplete" />
        </div>

        <!-- Score Tab -->
        <div v-show="activeTab === 'score'" class="tab-content">
          <ScoreDisplay />
        </div>

        <!-- Structure Tab (with Recommendations) -->
        <div v-show="activeTab === 'structure'" class="tab-content tab-split">
          <ResizableSplit direction="horizontal" :initial-size="55" :min-size="30" :max-size="75">
            <template #first>
              <div class="panel-box">
                <StructurePanel />
              </div>
            </template>
            <template #second>
              <div class="panel-box">
                <RecommendationPanel />
              </div>
            </template>
          </ResizableSplit>
        </div>

        <!-- Visual Map Tab -->
        <div v-show="activeTab === 'visual'" class="tab-content">
          <VisualMap />
        </div>

        <!-- Overview Tab -->
        <div v-show="activeTab === 'overview'" class="tab-content">
          <VisualOverview 
            @select-node="handleOverviewSelectNode"
            @goto-playback="handleOverviewGotoPlayback"
          />
        </div>

        <!-- Playback Tab -->
        <div v-show="activeTab === 'playback'" class="tab-content">
          <PlaybackControls />
        </div>
      </main>
    </template>

    <!-- Export Panel (Modal) -->
    <ExportPanel 
      v-if="showExportPanel" 
      @close="showExportPanel = false" 
    />

    <!-- Notifications -->
    <NotificationContainer />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 1.75rem;
}

.logo h1 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 600;
}

.logo-subtitle {
  font-size: 0.8rem;
  opacity: 0.8;
  margin-left: 0.5rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Progress Ring */
.progress-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-ring {
  position: relative;
  width: 36px;
  height: 36px;
}

.progress-ring svg {
  transform: rotate(-90deg);
}

.progress-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 3;
}

.progress-fill {
  fill: none;
  stroke: #4ade80;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.55rem;
  font-weight: 600;
}

.progress-label {
  font-size: 0.75rem;
  opacity: 0.8;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-sync {
  background: rgba(74, 222, 128, 0.2);
  color: white;
  border: 1px solid rgba(74, 222, 128, 0.4);
}

.btn-sync:hover:not(:disabled) {
  background: rgba(74, 222, 128, 0.3);
}

.btn-export {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.btn-export:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.learning-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  opacity: 0.9;
  padding: 0.35rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #4ade80;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.tab-nav {
  display: flex;
  gap: 0.35rem;
  padding: 0.6rem 2rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #64748b;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-btn:hover:not(:disabled) {
  background: #f1f5f9;
  color: #334155;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.tab-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tab-icon {
  font-size: 1rem;
}

.main-content {
  flex: 1;
  overflow: hidden;
  padding: 1rem 2rem;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tab-content {
  flex: 1;
  height: 100%;
  overflow: auto;
  min-height: 0;
}

.tab-split {
  height: 100%;
  min-height: 0;
}

.panel-box {
  height: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: auto;
  display: flex;
  flex-direction: column;
  margin: 0 0.5rem;
}

@media (max-width: 768px) {
  .panel-box {
    margin: 0.25rem;
  }
}
</style>
