<template>
  <div class="learning-prefs-form">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-position="top"
      class="prefs-form"
    >
      <el-form-item label="当前水平" prop="overallLevel">
        <el-radio-group v-model="formData.overallLevel" class="level-group">
          <el-radio-button value="beginner">
            <div class="level-option">
              <el-icon size="20"><Sunny /></el-icon>
              <span>零基础</span>
            </div>
          </el-radio-button>
          <el-radio-button value="intermediate">
            <div class="level-option">
              <el-icon size="20"><PartlyCloudy /></el-icon>
              <span>有一定基础</span>
            </div>
          </el-radio-button>
          <el-radio-button value="advanced">
            <div class="level-option">
              <el-icon size="20"><Cloudy /></el-icon>
              <span>比较熟练</span>
            </div>
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="subject" label="已掌握知识点（可选）">
        <div class="knowledge-section">
          <div class="knowledge-header">
            <span class="knowledge-count">
              已选择 {{ selectedTopics.length }} 个知识点
            </span>
            <el-button
              v-if="selectedTopics.length > 0"
              type="danger"
              text
              size="small"
              @click="clearSelection"
            >
              清空选择
            </el-button>
          </div>
          
          <div v-if="loadingKnowledge" class="loading-wrapper">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>加载知识点中...</span>
          </div>
          
          <div v-else-if="knowledgePoints.length === 0" class="empty-wrapper">
            <el-empty description="暂无知识点数据" :image-size="60" />
          </div>
          
          <div v-else class="knowledge-list">
            <div
              v-for="phase in phaseList"
              :key="phase.key"
              class="phase-group"
            >
              <div class="phase-header" @click="togglePhase(phase.key)">
                <el-icon>
                  <component :is="expandedPhases[phase.key] ? 'ArrowDown' : 'ArrowRight'" />
                </el-icon>
                <span class="phase-name">{{ phase.label }}</span>
                <span class="phase-count">
                  ({{ getPhasePoints(phase.key).length }}个知识点)
                </span>
              </div>
              
              <el-collapse-transition>
                <div v-show="expandedPhases[phase.key]" class="phase-content">
                  <el-checkbox-group v-model="selectedTopics">
                    <el-checkbox
                      v-for="point in getPhasePoints(phase.key)"
                      :key="point.id"
                      :label="point.id"
                      class="knowledge-checkbox"
                    >
                      <div class="knowledge-item">
                        <span class="knowledge-name">{{ point.name }}</span>
                        <el-tag
                          :type="getDifficultyType(point.difficulty)"
                          size="small"
                          effect="plain"
                        >
                          {{ getDifficultyLabel(point.difficulty) }}
                        </el-tag>
                      </div>
                    </el-checkbox>
                  </el-checkbox-group>
                </div>
              </el-collapse-transition>
            </div>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="学习节奏偏好" prop="learningPace">
        <el-radio-group v-model="formData.learningPace" class="pace-group">
          <el-radio-button value="slow">
            <div class="pace-option">
              <el-icon size="18"><Timer /></el-icon>
              <div class="pace-text">
                <span class="pace-title">慢速</span>
                <span class="pace-desc">稳扎稳打</span>
              </div>
            </div>
          </el-radio-button>
          <el-radio-button value="normal">
            <div class="pace-option">
              <el-icon size="18"><Clock /></el-icon>
              <div class="pace-text">
                <span class="pace-title">正常</span>
                <span class="pace-desc">平衡进度</span>
              </div>
            </div>
          </el-radio-button>
          <el-radio-button value="fast">
            <div class="pace-option">
              <el-icon size="18"><Stopwatch /></el-icon>
              <div class="pace-text">
                <span class="pace-title">快速</span>
                <span class="pace-desc">激进学习</span>
              </div>
            </div>
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="每日可用时长">
        <div class="time-wrapper">
          <el-slider
            v-model="formData.dailyAvailableMinutes"
            :min="30"
            :max="300"
            :step="15"
            :marks="timeMarks"
            show-stops
          />
          <div class="time-display">
            <span class="time-value">{{ formData.dailyAvailableMinutes }}</span>
            <span class="time-unit">分钟/天</span>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="可用学习日">
        <el-checkbox-group v-model="formData.availableWeekdays" class="weekday-group">
          <el-checkbox
            v-for="day in weekdayOptions"
            :key="day.value"
            :label="day.value"
            class="weekday-checkbox"
          >
            {{ day.label }}
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="资源偏好">
        <el-checkbox-group v-model="resourcePrefs" class="resource-group">
          <el-checkbox label="video">
            <div class="resource-option">
              <el-icon size="20"><VideoPlay /></el-icon>
              <span>视频</span>
            </div>
          </el-checkbox>
          <el-checkbox label="reading">
            <div class="resource-option">
              <el-icon size="20"><Reading /></el-icon>
              <span>文字</span>
            </div>
          </el-checkbox>
          <el-checkbox label="exercise">
            <div class="resource-option">
              <el-icon size="20"><EditPen /></el-icon>
              <span>练习题</span>
            </div>
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import {
  Sunny,
  PartlyCloudy,
  Cloudy,
  Timer,
  Clock,
  Stopwatch,
  VideoPlay,
  Reading,
  EditPen,
  Loading,
  ArrowDown,
  ArrowRight
} from '@element-plus/icons-vue'
import { profileApi } from '../api'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  },
  subject: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const formRef = ref(null)
const loadingKnowledge = ref(false)
const knowledgePoints = ref([])
const selectedTopics = ref([])
const expandedPhases = ref({
  foundation: true,
  advanced: false,
  application: false
})

const formData = reactive({
  overallLevel: 'beginner',
  learningPace: 'normal',
  dailyAvailableMinutes: 60,
  availableWeekdays: [1, 2, 3, 4, 5, 6, 7]
})

const resourcePrefs = ref(['video', 'exercise'])

const rules = {
  overallLevel: [
    { required: true, message: '请选择当前水平', trigger: 'change' }
  ],
  learningPace: [
    { required: true, message: '请选择学习节奏偏好', trigger: 'change' }
  ]
}

const timeMarks = {
  30: '30分钟',
  60: '1小时',
  120: '2小时',
  180: '3小时',
  240: '4小时',
  300: '5小时'
}

const weekdayOptions = [
  { value: 0, label: '周日' },
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' }
]

const phaseList = [
  { key: 'foundation', label: '基础阶段' },
  { key: 'advanced', label: '进阶阶段' },
  { key: 'application', label: '实战阶段' }
]

const getPhasePoints = (phase) => {
  return knowledgePoints.value.filter(p => p.phase === phase)
}

const togglePhase = (phase) => {
  expandedPhases.value[phase] = !expandedPhases.value[phase]
}

const getDifficultyType = (difficulty) => {
  const types = { 1: 'success', 2: 'warning', 3: 'danger' }
  return types[difficulty] || 'info'
}

const getDifficultyLabel = (difficulty) => {
  const labels = { 1: '简单', 2: '中等', 3: '困难' }
  return labels[difficulty] || '未知'
}

const clearSelection = () => {
  selectedTopics.value = []
}

const fetchKnowledgePoints = async () => {
  if (!props.subject) return
  
  loadingKnowledge.value = true
  try {
    const res = await profileApi.getSubjectKnowledge(props.subject)
    if (res.success) {
      knowledgePoints.value = res.data.points || []
      selectedTopics.value = res.data.points
        .filter(p => p.mastered)
        .map(p => p.id)
    }
  } catch (error) {
    console.error('获取知识点失败:', error)
  } finally {
    loadingKnowledge.value = false
  }
}

const fetchExistingPrefs = async () => {
  try {
    const res = await profileApi.getLearningPrefs()
    if (res.success && res.data.profile) {
      const profile = res.data.profile
      formData.overallLevel = profile.overall_level || 'beginner'
      formData.learningPace = profile.learning_pace || 'normal'
      formData.dailyAvailableMinutes = profile.daily_available_minutes || 60
      formData.availableWeekdays = profile.available_weekdays || [1, 2, 3, 4, 5, 6, 7]
      
      resourcePrefs.value = []
      if (profile.prefer_video) resourcePrefs.value.push('video')
      if (profile.prefer_reading) resourcePrefs.value.push('reading')
      if (profile.prefer_exercise) resourcePrefs.value.push('exercise')
    }
  } catch (error) {
    console.error('获取学习偏好失败:', error)
  }
}

watch([formData, resourcePrefs, selectedTopics], () => {
  const data = {
    ...formData,
    preferVideo: resourcePrefs.value.includes('video'),
    preferReading: resourcePrefs.value.includes('reading'),
    preferExercise: resourcePrefs.value.includes('exercise'),
    masteredTopicIds: selectedTopics.value
  }
  emit('update:modelValue', data)
}, { deep: true })

watch(() => props.subject, (newSubject) => {
  if (newSubject) {
    fetchKnowledgePoints()
  }
}, { immediate: true })

watch(() => props.modelValue, (val) => {
  if (val && Object.keys(val).length > 0) {
    Object.assign(formData, val)
    if (val.masteredTopicIds) {
      selectedTopics.value = val.masteredTopicIds
    }
  }
}, { immediate: true })

const validate = async () => {
  if (!formRef.value) return false
  return await formRef.value.validate().catch(() => false)
}

const getData = () => {
  return {
    ...formData,
    preferVideo: resourcePrefs.value.includes('video'),
    preferReading: resourcePrefs.value.includes('reading'),
    preferExercise: resourcePrefs.value.includes('exercise'),
    masteredTopicIds: selectedTopics.value
  }
}

onMounted(() => {
  fetchExistingPrefs()
})

defineExpose({
  validate,
  getData
})
</script>

<style scoped>
.learning-prefs-form {
  padding: 20px 0;
}

.prefs-form {
  max-width: 600px;
  margin: 0 auto;
}

.level-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.level-group :deep(.el-radio-button__inner) {
  padding: 16px 24px;
}

.level-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.knowledge-section {
  width: 100%;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.knowledge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.knowledge-count {
  font-size: 14px;
  color: #606266;
}

.loading-wrapper,
.empty-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #909399;
  gap: 8px;
}

.phase-group {
  margin-bottom: 8px;
}

.phase-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
}

.phase-header:hover {
  background: #e9ecf0;
}

.phase-name {
  font-weight: 500;
  color: #303133;
}

.phase-count {
  font-size: 12px;
  color: #909399;
}

.phase-content {
  padding: 12px 0 0 24px;
}

.knowledge-checkbox {
  display: flex;
  margin-bottom: 8px;
}

.knowledge-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.knowledge-name {
  font-size: 14px;
}

.pace-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.pace-group :deep(.el-radio-button__inner) {
  padding: 12px 20px;
}

.pace-option {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pace-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.pace-title {
  font-weight: 500;
}

.pace-desc {
  font-size: 12px;
  color: #909399;
}

.time-wrapper {
  width: 100%;
}

.time-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #E3F2FD, #F3E5F5);
  border-radius: 8px;
}

.time-value {
  font-size: 32px;
  font-weight: 600;
  color: #409EFF;
}

.time-unit {
  margin-left: 8px;
  font-size: 14px;
  color: #606266;
}

.weekday-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.weekday-checkbox {
  margin-right: 0;
}

.weekday-checkbox :deep(.el-checkbox__label) {
  padding-left: 8px;
}

.resource-group {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.resource-group :deep(.el-checkbox__label) {
  padding-left: 8px;
}

.resource-option {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
