<script setup>
/**
 * RecommendationPanel - 视觉方案推荐面板
 * 流程3: 显示推荐的视觉方案，支持选择和自定义修改
 */
import { ref, inject, computed, watch } from 'vue'
import VisualSchemeRecommender from '../../services/operation/VisualSchemeRecommender.js'
import SchemeCard from './SchemeCard.vue'
import SchemeEditor from './SchemeEditor.vue'
import { useNotifications } from '../../composables/useNotifications.js'

const structureStore = inject('structureStore')
const visualStore = inject('visualStore')
const preferencesStore = inject('preferencesStore')

const { notify } = useNotifications()

const recommender = new VisualSchemeRecommender()
const recommendations = ref([])
const isLoading = ref(false)
const currentEmotionFeatures = ref(null)
const showEditor = ref(false)
const editingScheme = ref(null)

const selectedNode = computed(() => structureStore.selectedNode)
const learningStatus = computed(() => recommender.getLearningStatus())
const currentMapping = computed(() => {
  if (!selectedNode.value) return null
  return visualStore.getMapping(selectedNode.value.id)
})

const emotionLabels = {
  tempo: { fast: '快 Fast', moderate: '中 Moderate', slow: '慢 Slow' },
  dynamics: { strong: '强 Strong', moderate: '中 Moderate', soft: '弱 Soft' },
  tension: { tense: '紧张 Tense', neutral: '中性 Neutral', relaxed: '舒缓 Relaxed' }
}

// 计算情绪特征的置信度
const emotionConfidence = computed(() => {
  if (!currentEmotionFeatures.value || !selectedNode.value) return null
  
  // 基于节点的置信度和特征完整性计算
  const nodeConfidence = selectedNode.value.confidence || 0.7
  
  // 根据特征值计算各维度置信度
  const tempoConf = currentEmotionFeatures.value.tempo === 'moderate' ? 0.6 : 0.8
  const dynamicsConf = currentEmotionFeatures.value.dynamics === 'moderate' ? 0.6 : 0.85
  const tensionConf = currentEmotionFeatures.value.tension === 'neutral' ? 0.55 : 0.75
  
  return {
    tempo: Math.round(tempoConf * nodeConfidence * 100),
    dynamics: Math.round(dynamicsConf * nodeConfidence * 100),
    tension: Math.round(tensionConf * nodeConfidence * 100),
    overall: Math.round(((tempoConf + dynamicsConf + tensionConf) / 3) * nodeConfidence * 100)
  }
})

watch(selectedNode, (node) => {
  if (node) {
    generateRecommendations(node)
    showEditor.value = false
    editingScheme.value = null
  } else {
    recommendations.value = []
    currentEmotionFeatures.value = null
  }
})

function generateRecommendations(node) {
  isLoading.value = true
  try {
    const relatedNodes = structureStore.getRelatedNodes(node.id)
    const result = recommender.recommend(node, { count: 5, relatedNodes })
    recommendations.value = result
    if (result.length > 0 && result[0].emotionFeatures) {
      currentEmotionFeatures.value = result[0].emotionFeatures
    }
    visualStore.setRecommendations(node.id, recommendations.value)
  } catch (error) {
    console.error('Recommendation error:', error)
    recommendations.value = []
  } finally {
    isLoading.value = false
  }
}

function handleAccept(scheme) {
  if (!selectedNode.value) return
  visualStore.setMapping(selectedNode.value.id, scheme)
  recommender.recordSelection(selectedNode.value, scheme, 'accept')
  preferencesStore.recordAccept(selectedNode.value.id, scheme.id)
  notify({ type: 'success', title: '方案已应用', message: `视觉方案已应用到 ${selectedNode.value.type}` })
}

function handleModify(scheme) {
  console.log('handleModify called with scheme:', scheme)
  editingScheme.value = { ...scheme }
  showEditor.value = true
  console.log('showEditor set to:', showEditor.value)
}

function handleReject(scheme) {
  if (!selectedNode.value) return
  recommender.recordSelection(selectedNode.value, scheme, 'reject')
  preferencesStore.recordReject(selectedNode.value.id, scheme.id)
  recommendations.value = recommendations.value.filter(r => r.id !== scheme.id)
}

function handleEditorSave(scheme) {
  if (!selectedNode.value) return
  visualStore.setMapping(selectedNode.value.id, scheme)
  if (editingScheme.value) {
    recommender.recordSelection(selectedNode.value, scheme, 'modify')
    preferencesStore.recordModify(selectedNode.value.id, scheme.id)
  }
  showEditor.value = false
  editingScheme.value = null
  notify({ type: 'success', title: '自定义方案已保存', message: '您的自定义视觉方案已应用' })
}

function handleEditorCancel() {
  showEditor.value = false
  editingScheme.value = null
}

function openCustomEditor() {
  editingScheme.value = null
  showEditor.value = true
}

function refreshRecommendations() {
  if (selectedNode.value) generateRecommendations(selectedNode.value)
}

function clearCurrentMapping() {
  if (selectedNode.value) {
    visualStore.removeMapping(selectedNode.value.id)
    notify({ type: 'info', title: '已清除', message: '当前节点的视觉方案已清除' })
  }
}

function applyToSimilar() {
  if (!selectedNode.value) return
  const count = visualStore.applyToSimilarNodes(selectedNode.value.id, structureStore.allNodes)
  notify({
    type: count > 0 ? 'success' : 'info',
    title: count > 0 ? '批量应用' : '无相似结构',
    message: count > 0 ? `已将方案应用到 ${count} 个相似结构` : '未找到可应用的相似结构'
  })
}

function getShapeIcon(type) {
  const icons = {
    circle: '●', square: '■', triangle: '▲', diamond: '◆',
    hexagon: '⬡', octagon: '⯃', star4: '✦', star5: '★',
    star6: '✶', note: '♪', clef: '𝄞', rest: '𝄽',
    wave: '〰', spiral: '🌀', burst: '💥', flower: '✿',
    leaf: '🍃', sun: '☀', heart: '♥', arrow: '➤'
  }
  return icons[type] || '●'
}
</script>

<template>
  <div class="recommendation-panel">
    <div class="panel-header">
      <h3>🎨 视觉推荐</h3>
      <div class="header-actions">
        <button class="btn-icon" @click="refreshRecommendations" :disabled="!selectedNode || isLoading" title="刷新">🔄</button>
        <button class="btn-icon" @click="openCustomEditor" :disabled="!selectedNode" title="自定义">✏️</button>
      </div>
    </div>

    <!-- 顶部信息区域 - 限制高度1/5 -->
    <div class="top-info-area" v-if="selectedNode">
      <div class="learning-status" v-if="preferencesStore.hasLearned">
        <div class="status-bar"><div class="status-fill" :style="{ width: (preferencesStore.learningProgress * 100) + '%' }"></div></div>
        <span class="status-text">🧠 {{ preferencesStore.exampleCount }} 个偏好已学习</span>
      </div>

      <div class="current-mapping" v-if="currentMapping">
        <div class="mapping-header">
          <span class="mapping-label">当前方案</span>
          <button class="btn-clear" @click="clearCurrentMapping">✕</button>
        </div>
        <div class="mapping-preview">
          <div class="preview-shapes" :class="`animate-${currentMapping.animation}`">
            <span v-for="(shape, idx) in currentMapping.shapes?.slice(0, 4)" :key="idx" class="preview-shape" :style="{ color: currentMapping.colors?.[idx] || currentMapping.colors?.[0] }">{{ getShapeIcon(shape.type) }}</span>
          </div>
          <div class="mapping-info">
            <span class="info-animation">{{ currentMapping.animation }}</span>
            <span class="info-modified" v-if="currentMapping.userModified">已修改</span>
          </div>
        </div>
      </div>

      <div class="emotion-features" v-if="currentEmotionFeatures">
      <div class="emotion-header">
        <span class="emotion-title">🎭 情绪分析 Emotion Analysis</span>
        <span class="emotion-overall" v-if="emotionConfidence">
          置信度 {{ emotionConfidence.overall }}%
        </span>
      </div>
      <div class="emotion-grid">
        <div class="emotion-item">
          <div class="emotion-label">🎵 速度/节奏密度</div>
          <div class="emotion-value-row">
            <span class="emotion-tag tempo">{{ emotionLabels.tempo[currentEmotionFeatures.tempo] }}</span>
            <span class="emotion-bar">
              <span class="emotion-bar-fill" :style="{ width: emotionConfidence?.tempo + '%' }"></span>
            </span>
            <span class="emotion-percent">{{ emotionConfidence?.tempo }}%</span>
          </div>
        </div>
        <div class="emotion-item">
          <div class="emotion-label">🔊 力度/强弱</div>
          <div class="emotion-value-row">
            <span class="emotion-tag dynamics">{{ emotionLabels.dynamics[currentEmotionFeatures.dynamics] }}</span>
            <span class="emotion-bar">
              <span class="emotion-bar-fill" :style="{ width: emotionConfidence?.dynamics + '%' }"></span>
            </span>
            <span class="emotion-percent">{{ emotionConfidence?.dynamics }}%</span>
          </div>
        </div>
        <div class="emotion-item">
          <div class="emotion-label">💫 张力/紧张度</div>
          <div class="emotion-value-row">
            <span class="emotion-tag tension">{{ emotionLabels.tension[currentEmotionFeatures.tension] }}</span>
            <span class="emotion-bar">
              <span class="emotion-bar-fill" :style="{ width: emotionConfidence?.tension + '%' }"></span>
            </span>
            <span class="emotion-percent">{{ emotionConfidence?.tension }}%</span>
          </div>
        </div>
      </div>
      </div>
    </div>

    <!-- Content Area -->
    <div class="content-area">
      <div class="empty-state" v-if="!selectedNode">
        <div class="empty-icon">👆</div>
        <p>请选择一个结构元素</p>
      </div>

      <div class="loading-state" v-else-if="isLoading">
        <div class="spinner"></div>
        <p>正在生成推荐...</p>
      </div>

      <div class="recommendations-list" v-else-if="recommendations.length > 0">
        <SchemeCard 
          v-for="scheme in recommendations" 
          :key="scheme.id" 
          :scheme="scheme" 
          :is-selected="currentMapping?.id === scheme.id" 
          @accept="handleAccept(scheme)" 
          @modify="handleModify(scheme)" 
          @reject="handleReject(scheme)" 
        />
        <div class="custom-option" @click="openCustomEditor">
          <span class="custom-icon">✨</span>
          <span class="custom-text">自定义方案</span>
        </div>
      </div>

      <div class="empty-state" v-else>
        <div class="empty-icon">🎨</div>
        <p>暂无推荐</p>
        <button class="btn-primary" @click="refreshRecommendations">生成推荐</button>
      </div>
    </div>

    <!-- Editor Modal (outside of v-if chain) -->
    <Teleport to="body">
      <div class="editor-modal" v-if="showEditor" @click.self="handleEditorCancel">
        <div class="editor-modal-content">
          <div class="editor-modal-header">
            <h3>🎨 自定义视觉方案 Custom Visual Scheme</h3>
            <button class="btn-close" @click="handleEditorCancel">✕</button>
          </div>
          <div class="editor-modal-body">
            <SchemeEditor 
              :scheme="editingScheme" 
              :node-type="selectedNode?.type" 
              @save="handleEditorSave" 
              @cancel="handleEditorCancel" 
            />
          </div>
        </div>
      </div>
    </Teleport>

    <div class="quick-actions" v-if="selectedNode && currentMapping && !showEditor">
      <button class="btn-action" @click="applyToSimilar">📋 应用到相似结构</button>
    </div>
  </div>
</template>


<style scoped>
.recommendation-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  overflow: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #1e293b;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-icon:hover:not(:disabled) { background: #f1f5f9; }
.btn-icon:disabled { opacity: 0.5; cursor: not-allowed; }

/* 顶部信息区域 - 限制高度1/5 */
.top-info-area {
  flex: 0 0 auto;
  max-height: 20%;
  overflow-y: auto;
  margin-bottom: 0.5rem;
  padding-right: 0.25rem;
}

.learning-status {
  margin-bottom: 0.4rem;
  padding: 0.3rem 0.5rem;
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
  border-radius: 6px;
  border: 1px solid #bbf7d0;
}

.status-bar {
  height: 3px;
  background: #dcfce7;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.status-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #22c55e);
}

.status-text {
  font-size: 0.7rem;
  color: #16a34a;
}

.current-mapping {
  margin-bottom: 0.4rem;
  padding: 0.4rem;
  background: linear-gradient(135deg, #eef2ff, #f5f3ff);
  border-radius: 6px;
  border: 1px solid #c7d2fe;
}

.mapping-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.mapping-label {
  font-size: 0.75rem;
  color: #6366f1;
  font-weight: 500;
}

.btn-clear {
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.7rem;
}

.mapping-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-shapes {
  display: flex;
  gap: 0.25rem;
}

.preview-shape {
  font-size: 1.5rem;
}

.mapping-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
}

.info-animation {
  font-size: 0.7rem;
  color: #64748b;
  text-transform: capitalize;
}

.info-modified {
  font-size: 0.65rem;
  padding: 0.1rem 0.3rem;
  background: #fef3c7;
  color: #d97706;
  border-radius: 3px;
}

.emotion-features {
  padding: 0.4rem;
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border-radius: 6px;
  border: 1px solid #fcd34d;
}

.emotion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px dashed #fcd34d;
}

.emotion-title {
  font-size: 0.75rem;
  color: #92400e;
  font-weight: 600;
}

.emotion-overall {
  font-size: 0.65rem;
  color: white;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  padding: 0.15rem 0.4rem;
  border-radius: 10px;
  font-weight: 600;
}

.emotion-grid {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.emotion-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.emotion-label {
  font-size: 0.6rem;
  color: #78350f;
  font-weight: 500;
  min-width: 70px;
  white-space: nowrap;
}

.emotion-value-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.emotion-tag {
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  font-size: 0.65rem;
  font-weight: 600;
  min-width: 55px;
  text-align: center;
}

.emotion-bar {
  flex: 1;
  height: 4px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.emotion-bar-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
  border-radius: 2px;
  transition: width 0.3s;
}

.emotion-percent {
  font-size: 0.6rem;
  color: #92400e;
  font-weight: 600;
  min-width: 28px;
  text-align: right;
}

.emotion-tag.tempo { background: #dbeafe; color: #1e40af; }
.emotion-tag.dynamics { background: #fce7f3; color: #9d174d; }
.emotion-tag.tension { background: #d1fae5; color: #065f46; }

/* Editor Modal */
.editor-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.editor-modal-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  min-width: 500px;
  max-width: 800px;
  width: 70vw;
  min-height: 500px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  resize: both;
}

.editor-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.editor-modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.editor-modal-body {
  flex: 1;
  overflow: auto;
  padding: 1rem;
  min-height: 400px;
}

.content-area {
  flex: 4;
  display: flex;
  flex-direction: column;
  overflow: auto;
  min-height: 0;
}

.empty-state, .loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #94a3b8;
  padding: 2rem 1rem;
}

.empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }

.loading-state .spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin { to { transform: rotate(360deg); } }

.btn-primary {
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}



.recommendations-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.custom-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  cursor: pointer;
  color: #64748b;
}

.custom-option:hover {
  border-color: #667eea;
  background: #f5f3ff;
  color: #667eea;
}

.custom-icon { font-size: 1.2rem; }
.custom-text { font-size: 0.9rem; font-weight: 500; }

.quick-actions {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e2e8f0;
}

.btn-action {
  width: 100%;
  padding: 0.6rem;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #475569;
}

.btn-action:hover { background: #e2e8f0; }

.animate-flash .preview-shape { animation: flash 1s infinite; }
.animate-pulse .preview-shape { animation: pulse 1.5s infinite; }
.animate-bounce .preview-shape { animation: bounce 1s infinite; }

@keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
</style>
