<template>
  <div class="task-group-list">
    <div v-if="phases.length === 0" class="empty-state">
      <el-empty description="暂无任务">
        <el-button type="primary" @click="$emit('add-task')">添加任务</el-button>
      </el-empty>
    </div>

    <div v-else class="phases-container">
      <div
        v-for="(phase, phaseIndex) in phases"
        :key="phase.id || phaseIndex"
        class="phase-section"
      >
        <div class="phase-header">
          <div class="phase-info">
            <h3 class="phase-name">{{ phase.name }}</h3>
            <el-tag size="small" type="info">
              {{ getCompletedCount(phase) }}/{{ phase.tasks?.length || 0 }}
            </el-tag>
          </div>
          <el-progress
            :percentage="getPhaseProgress(phase)"
            :stroke-width="6"
            :show-text="false"
            :color="getPhaseColor(phaseIndex)"
            class="phase-progress"
          />
        </div>

        <draggable
          v-model="phase.tasks"
          item-key="id"
          handle=".drag-handle"
          animation="200"
          class="task-list"
          @end="handleDragEnd($event, phaseIndex)"
        >
          <template #item="{ element: task }">
            <div 
              :id="'task-' + task.id"
              class="task-item" 
              :class="{ completed: task.status === 2, paused: task.status === 4, highlight: highlightTaskId === task.id }"
            >
              <div class="task-main">
                <el-icon class="drag-handle"><Rank /></el-icon>

                <el-checkbox
                  :model-value="task.status === 2"
                  :disabled="task.status === 2"
                  @change="handleTaskComplete(task)"
                />

                <div class="task-content">
                  <span class="task-name">{{ task.name }}</span>
                  <div class="task-meta">
                    <span class="task-duration">
                      <el-icon><Clock /></el-icon>
                      {{ task.planned_duration || 60 }}分钟
                    </span>
                    <span v-if="task.planned_date" class="task-date" :class="{ 'not-today': !isTodayTask(task) && task.status === 0 }">
                      <el-icon><Calendar /></el-icon>
                      {{ formatDate(task.planned_date) }}
                      <span v-if="!isTodayTask(task) && task.status === 0" class="not-today-tip">(非当日)</span>
                    </span>
                  </div>
                </div>

                <el-tag
                  :type="getStatusType(task.status)"
                  size="small"
                >
                  {{ getStatusText(task.status) }}
                </el-tag>

                <el-button
                  v-if="task.status === 0"
                  type="success"
                  text
                  size="small"
                  :disabled="!canStartTask(task)"
                  @click="handleTaskStart(task)"
                >
                  <el-icon><VideoPlay /></el-icon>
                  开始
                </el-button>

                <el-button
                  v-if="task.status === 1"
                  type="warning"
                  text
                  size="small"
                  @click="handleTaskPause(task)"
                >
                  <el-icon><VideoPause /></el-icon>
                  暂停
                </el-button>

                <el-button
                  v-if="task.status === 4"
                  type="success"
                  text
                  size="small"
                  @click="handleTaskResume(task)"
                >
                  <el-icon><VideoPlay /></el-icon>
                  继续
                </el-button>

                <el-button
                  v-if="task.status !== 2"
                  type="primary"
                  text
                  size="small"
                  @click="handleTaskEdit(task)"
                >
                  编辑
                </el-button>

                <el-button
                  v-if="task.status !== 2"
                  type="danger"
                  text
                  size="small"
                  @click="handleTaskDelete(task)"
                >
                  删除
                </el-button>
              </div>

              <div v-if="timerStore.isRunning && timerStore.taskId === Number(task.id)" class="task-timer">
                <el-icon><Timer /></el-icon>
                <span>已用时: {{ timerStore.formattedTime }}</span>
              </div>
            </div>
          </template>
        </draggable>

        <el-button
          type="primary"
          plain
          size="small"
          class="add-task-btn"
          @click="handleAddTaskToPhase(phase)"
        >
          <el-icon><Plus /></el-icon>
          添加任务
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { Rank, Clock, Calendar, Plus, VideoPause, VideoPlay, Timer } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import { planApi, taskApi } from '../api'
import { useTimerStore } from '../stores/timer'

const timerStore = useTimerStore()

const props = defineProps({
  phases: {
    type: Array,
    default: () => []
  },
  planId: {
    type: [Number, String],
    required: true
  },
  highlightTaskId: {
    type: [Number, String],
    default: null
  },
  planStatus: {
    type: String,
    default: 'active'
  }
})

const emit = defineEmits(['task-complete', 'task-edit', 'add-task', 'task-update'])

const formatLocalDate = (date) => {
  const d = date || new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const parseLocalDate = (dateStr) => {
  if (!dateStr) return null
  if (dateStr.includes('T')) {
    const d = new Date(dateStr)
    return formatLocalDate(d)
  }
  return dateStr
}

const isTodayTask = (task) => {
  if (!task.planned_date) return true
  const today = formatLocalDate()
  const taskDate = parseLocalDate(task.planned_date)
  return taskDate === today
}

const canStartTask = (task) => {
  if (props.planStatus === 'paused') return false
  if (!task.planned_date) return true
  const today = formatLocalDate()
  const taskDate = parseLocalDate(task.planned_date)
  return taskDate <= today
}

const handleTaskComplete = async (task) => {
  if (task.status === 2) return

  try {
    await taskApi.completeTask(task.id, {
      actualDuration: task.planned_duration || 60
    })
    ElMessage.success('任务已完成')
    emit('task-complete', task)
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

const handleTaskStart = async (task) => {
  try {
    if (timerStore.isRunning && timerStore.taskId !== Number(task.id)) {
      await timerStore.stopTimer()
    }

    await taskApi.startTask(task.id)
    
    const taskData = {
      id: task.id,
      name: task.name,
      courseName: task.course_name || '',
      planId: props.planId
    }
    
    const result = await timerStore.startTimer(taskData)
    if (!result.success) {
      ElMessage.warning(result.message || '启动计时器失败')
    }
    
    emit('task-update', task)
  } catch (error) {
    ElMessage.error(error.message || '开始失败')
  }
}

const handleTaskPause = async (task) => {
  try {
    await taskApi.pauseTask(task.id)
    await timerStore.pauseTimerWithSave()
    ElMessage.success('任务已暂停')
    emit('task-update', task)
  } catch (error) {
    ElMessage.error(error.message || '暂停失败')
  }
}

const handleTaskResume = async (task) => {
  try {
    if (timerStore.isRunning && timerStore.taskId !== Number(task.id)) {
      await timerStore.stopTimer()
    }

    await taskApi.resumeTask(task.id)
    
    if (timerStore.isRunning && timerStore.taskId === Number(task.id) && timerStore.isPaused) {
      timerStore.resumeTimer()
    } else {
      const taskData = {
        id: task.id,
        name: task.name,
        courseName: task.course_name || '',
        planId: props.planId
      }
      
      let initialElapsedSeconds = timerStore.elapsedSeconds
      if (!timerStore.isRunning && task.status === 4 && task.elapsed_seconds) {
        initialElapsedSeconds = task.elapsed_seconds
      }
      
      const result = await timerStore.startTimer(taskData, initialElapsedSeconds)
      if (!result.success) {
        ElMessage.warning(result.message || '启动计时器失败')
      }
    }
    
    emit('task-update', task)
  } catch (error) {
    ElMessage.error(error.message || '恢复失败')
  }
}

const handleTaskEdit = (task) => {
  emit('task-edit', task)
}

const handleTaskDelete = async (task) => {
  try {
    const { ElMessageBox } = await import('element-plus')
    await ElMessageBox.confirm('确定要删除这个任务吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await taskApi.deleteTask(task.id)
    ElMessage.success('任务已删除')
    emit('task-update', task)
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const handleAddTaskToPhase = (phase) => {
  emit('add-task', phase.id)
}

const handleDragEnd = async (_event, phaseIndex) => {
  const taskOrders = props.phases[phaseIndex].tasks.map((task, index) => ({
    taskId: task.id,
    sortOrder: index,
    phaseId: props.phases[phaseIndex].id
  }))

  try {
    await planApi.reorderTasks(props.planId, { taskOrders })
  } catch (error) {
    console.error('更新排序失败:', error)
  }
}

const getCompletedCount = (phase) => {
  return phase.tasks?.filter(t => t.status === 2).length || 0
}

const getPhaseProgress = (phase) => {
  const total = phase.tasks?.length || 0
  const completed = getCompletedCount(phase)
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

const getPhaseColor = (index) => {
  const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399']
  return colors[index % colors.length]
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const getStatusType = (status) => {
  const map = {
    0: 'info',
    1: 'warning',
    2: 'success',
    4: 'danger'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    0: '待开始',
    1: '进行中',
    2: '已完成',
    4: '已暂停'
  }
  return map[status] || '未知'
}
</script>

<style scoped>
.task-group-list {
  min-height: 300px;
}

.empty-state {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.phases-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.phase-section {
  background: #fafafa;
  border-radius: 12px;
  padding: 16px;
}

.phase-header {
  margin-bottom: 16px;
}

.phase-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.phase-name {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.phase-progress {
  width: 200px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  transition: all 0.2s;
}

.task-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.task-item.completed {
  opacity: 0.7;
}

.task-item.completed .task-name {
  text-decoration: line-through;
  color: #909399;
}

.task-item.paused {
  background: #fef0f0;
  border: 1px solid #fbc4c4;
}

.task-item.highlight {
  animation: highlight-pulse 2s ease-out;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.3);
}

@keyframes highlight-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.6);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(64, 158, 255, 0.3);
  }
  100% {
    box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
  }
}

.drag-handle {
  cursor: move;
  color: #C0C4CC;
}

.drag-handle:hover {
  color: #909399;
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-name {
  font-size: 14px;
  color: #303133;
  display: block;
  margin-bottom: 4px;
}

.task-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.task-timer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e4e7ed;
  font-size: 13px;
  color: #409eff;
  font-weight: 600;
  background: linear-gradient(90deg, #ecf5ff 0%, #f5f7fa 100%);
  border-radius: 4px;
  padding: 6px 12px;
}

.task-duration,
.task-date {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-date.not-today {
  color: #f56c6c;
}

.not-today-tip {
  font-size: 11px;
  color: #f56c6c;
  margin-left: 2px;
}

.add-task-btn {
  margin-top: 12px;
  width: 100%;
}
</style>
