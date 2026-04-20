<template>
  <div class="create-plan-step2">
    <div v-if="loading" class="loading-container">
      <div class="loading-animation">
        <el-icon class="loading-icon" :size="60"><Loading /></el-icon>
      </div>
      <h3>正在生成学习路径...</h3>
      <p class="loading-tip">{{ loadingTip }}</p>
      <el-progress
        :percentage="loadingProgress"
        :stroke-width="8"
        :show-text="false"
        class="loading-progress"
      />
    </div>

    <div v-else-if="phases.length > 0" class="preview-container">
      <div class="preview-header">
        <h3>学习路径预览</h3>
        <el-button type="primary" plain @click="regenerate">
          <el-icon><Refresh /></el-icon>
          重新生成
        </el-button>
      </div>

      <p v-if="reason" class="generate-reason">
        <el-icon><InfoFilled /></el-icon>
        {{ reason }}
      </p>

      <div class="phases-container">
        <el-collapse v-model="activePhases" class="phase-collapse">
          <el-collapse-item
            v-for="(phase, phaseIndex) in phases"
            :key="phaseIndex"
            :name="phaseIndex"
          >
            <template #title>
              <div class="phase-header">
                <span class="phase-name">{{ phase.name }}</span>
                <el-tag type="info" size="small">
                  {{ phase.tasks.length }} 个任务
                </el-tag>
                <span class="phase-duration">
                  约 {{ calculatePhaseDuration(phase) }} 分钟
                </span>
              </div>
            </template>

            <div class="tasks-container">
              <draggable
                v-model="phase.tasks"
                item-key="id"
                handle=".drag-handle"
                animation="200"
                class="task-list"
              >
                <template #item="{ element: task, index }">
                  <div class="task-item">
                    <el-icon class="drag-handle"><Rank /></el-icon>
                    
                    <div class="task-content">
                      <el-input
                        v-model="task.name"
                        placeholder="任务名称"
                        class="task-name-input"
                      />
                      <div class="task-meta">
                        <el-input-number
                          v-model="task.estimatedMinutes"
                          :min="10"
                          :max="480"
                          :step="10"
                          size="small"
                          controls-position="right"
                        />
                        <span class="minute-label">分钟</span>
                        <el-date-picker
                          v-model="task.plannedDate"
                          type="date"
                          placeholder="计划日期"
                          size="small"
                          value-format="YYYY-MM-DD"
                          style="width: 140px"
                        />
                      </div>
                    </div>

                    <el-button
                      type="danger"
                      :icon="Delete"
                      circle
                      size="small"
                      @click="deleteTask(phaseIndex, index)"
                    />
                  </div>
                </template>
              </draggable>

              <el-button
                type="primary"
                plain
                class="add-task-btn"
                @click="addTask(phaseIndex)"
              >
                <el-icon><Plus /></el-icon>
                添加任务
              </el-button>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <div class="summary-bar">
        <div class="summary-item">
          <el-icon><Document /></el-icon>
          <span>总任务数: {{ totalTasks }}</span>
        </div>
        <div class="summary-item">
          <el-icon><Clock /></el-icon>
          <span>预计总时长: {{ formatDuration(totalMinutes) }}</span>
        </div>
        <div class="summary-item">
          <el-icon><Calendar /></el-icon>
          <span>预计天数: {{ estimatedDays }} 天</span>
        </div>
      </div>
    </div>

    <div v-else class="empty-container">
      <el-empty description="尚未生成学习路径">
        <el-button type="primary" @click="generate">
          开始生成
        </el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { 
  Loading, Refresh, InfoFilled, Rank, Delete, Plus, 
  Document, Clock, Calendar 
} from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import { planApi } from '../api'

const props = defineProps({
  planId: {
    type: [Number, String],
    default: null
  },
  step1Data: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:phases'])

const loading = ref(false)
const loadingProgress = ref(0)
const loadingTip = ref('分析学习目标...')
const phases = ref([])
const reason = ref('')
const activePhases = ref([0, 1, 2])

const totalTasks = computed(() => {
  return phases.value.reduce((sum, phase) => sum + phase.tasks.length, 0)
})

const totalMinutes = computed(() => {
  return phases.value.reduce((sum, phase) => {
    return sum + phase.tasks.reduce((s, task) => s + (task.estimatedMinutes || 0), 0)
  }, 0)
})

const estimatedDays = computed(() => {
  const dailyMinutes = props.step1Data.dailyStudyMinutes || 60
  return Math.ceil(totalMinutes.value / dailyMinutes)
})

watch(phases, (val) => {
  emit('update:phases', val)
}, { deep: true })

const calculatePhaseDuration = (phase) => {
  return phase.tasks.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0)
}

const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) {
    return `${hours}小时${mins}分钟`
  } else if (hours > 0) {
    return `${hours}小时`
  }
  return `${mins}分钟`
}

const generate = async () => {
  if (!props.planId) {
    console.error('planId is required')
    return
  }

  loading.value = true
  loadingProgress.value = 0
  loadingTip.value = '分析学习目标...'

  const tips = [
    '分析学习目标...',
    '匹配知识图谱模板...',
    '拆分学习阶段...',
    '生成任务列表...',
    '优化学习路径...'
  ]

  const tipInterval = setInterval(() => {
    const tipIndex = Math.floor(loadingProgress.value / 20)
    if (tipIndex < tips.length) {
      loadingTip.value = tips[tipIndex]
    }
    loadingProgress.value += 5
  }, 200)

  try {
    const res = await planApi.generate(props.planId)
    
    clearInterval(tipInterval)
    loadingProgress.value = 100
    loadingTip.value = '生成完成！'

    setTimeout(() => {
      phases.value = res.data.plan?.phases || []
      const explanation = res.data.explanation || {}
      if (explanation.summary) {
        reason.value = explanation.summary
      } else if (explanation.phaseDistribution) {
        reason.value = explanation.phaseDistribution
      } else {
        reason.value = '已为您生成个性化学习计划'
      }
      activePhases.value = phases.value.map((_, i) => i)
      loading.value = false
    }, 500)
  } catch (error) {
    clearInterval(tipInterval)
    loading.value = false
    console.error('生成学习路径失败:', error)
  }
}

const regenerate = () => {
  generate()
}

const addTask = (phaseIndex) => {
  const phase = phases.value[phaseIndex]
  const lastTask = phase.tasks[phase.tasks.length - 1]
  const newTask = {
    id: `temp_${Date.now()}`,
    name: '',
    estimatedMinutes: 60,
    plannedDate: lastTask?.plannedDate || null
  }
  phase.tasks.push(newTask)
}

const deleteTask = (phaseIndex, taskIndex) => {
  phases.value[phaseIndex].tasks.splice(taskIndex, 1)
}

const getData = () => {
  return {
    phases: phases.value,
    reason: reason.value
  }
}

onMounted(() => {
  if (props.planId) {
    generate()
  }
})

defineExpose({
  generate,
  getData
})
</script>

<style scoped>
.create-plan-step2 {
  min-height: 400px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.loading-animation {
  margin-bottom: 24px;
}

.loading-icon {
  color: #409EFF;
  animation: rotate 1.5s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-container h3 {
  margin: 0 0 8px;
  color: #303133;
}

.loading-tip {
  color: #909399;
  margin: 0 0 24px;
}

.loading-progress {
  width: 300px;
}

.preview-container {
  padding: 0 20px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.preview-header h3 {
  margin: 0;
  color: #303133;
}

.generate-reason {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f4f4f5;
  border-radius: 8px;
  color: #606266;
  font-size: 14px;
  margin-bottom: 20px;
}

.phase-collapse {
  border: none;
}

.phase-header {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.phase-name {
  font-weight: 500;
  font-size: 16px;
}

.phase-duration {
  color: #909399;
  font-size: 14px;
}

.tasks-container {
  padding: 8px 0;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  transition: all 0.3s;
}

.task-item:hover {
  background: #f0f0f0;
}

.drag-handle {
  cursor: move;
  color: #909399;
  margin-top: 8px;
}

.task-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-name-input {
  width: 100%;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.minute-label {
  color: #909399;
  font-size: 12px;
}

.add-task-btn {
  width: 100%;
  margin-top: 12px;
  border-style: dashed;
}

.summary-bar {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 24px;
  padding: 16px;
  background: linear-gradient(135deg, #E3F2FD, #F3E5F5);
  border-radius: 12px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
}

.empty-container {
  display: flex;
  justify-content: center;
  padding: 60px 20px;
}
</style>
