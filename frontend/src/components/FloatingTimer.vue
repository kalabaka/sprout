<template>
  <div 
    v-if="timerStore.showCard && timerStore.isRunning" 
    class="floating-timer" 
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    ref="timerRef"
  >
    <div class="timer-header" @mousedown="startDrag">
      <el-icon><Timer /></el-icon>
      <span class="header-title">学习中</span>
    </div>

    <div class="timer-body">
        <div class="time-display">
          <span class="time-value">{{ timerStore.formattedTime }}</span>
        </div>

        <div class="task-info">
          <div class="task-name" :title="timerStore.taskName">
            {{ timerStore.taskName || '未命名任务' }}
          </div>
          <div v-if="timerStore.courseName" class="course-name">
            <el-icon size="12"><Reading /></el-icon>
            {{ timerStore.courseName }}
          </div>
        </div>

        <div class="timer-actions">
          <el-button
            v-if="!timerStore.isPaused"
            type="warning"
            size="small"
            @click="handlePause"
          >
            <el-icon><VideoPause /></el-icon>
            暂停
          </el-button>
          <el-button
            v-else
            type="success"
            size="small"
            @click="handleResume"
          >
            <el-icon><VideoPlay /></el-icon>
            继续
          </el-button>

          <el-button type="primary" size="small" @click="handleLocate">
            <el-icon><Location /></el-icon>
            定位
          </el-button>

          <el-button type="danger" size="small" @click="handleStop">
            <el-icon><CircleClose /></el-icon>
            结束
          </el-button>
        </div>
      </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Timer, VideoPause, VideoPlay, Location, CircleClose, Reading } from '@element-plus/icons-vue'
import { useTimerStore } from '../stores/timer'

const timerStore = useTimerStore()
const timerRef = ref(null)

const position = ref({
  x: window.innerWidth - 240,
  y: window.innerHeight - 200
})

const dragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

function startDrag(e) {
  if (e.target.closest('.timer-actions') || e.target.closest('button')) return
  
  dragging.value = true
  dragStart.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y
  }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  e.preventDefault()
}

function onDrag(e) {
  if (!dragging.value) return
  
  let newX = e.clientX - dragStart.value.x
  let newY = e.clientY - dragStart.value.y
  
  const cardWidth = timerRef.value?.offsetWidth || 220
  const cardHeight = timerRef.value?.offsetHeight || 200
  
  newX = Math.max(0, Math.min(newX, window.innerWidth - cardWidth))
  newY = Math.max(0, Math.min(newY, window.innerHeight - cardHeight))
  
  position.value = { x: newX, y: newY }
}

function stopDrag() {
  dragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

async function handlePause() {
  await timerStore.pauseTimerWithSave()
  ElMessage.info('计时已暂停')
}

async function handleResume() {
  await timerStore.resumeTimerWithSave()
  ElMessage.success('计时已恢复')
}

async function handleStop() {
  try {
    await ElMessageBox.confirm(
      `本次学习时长 ${timerStore.formattedTime}，确认结束学习？`,
      '结束学习',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    await timerStore.stopTimer()
    ElMessage.success('学习记录已保存')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('结束学习失败:', error)
    }
  }
}

function handleLocate() {
  timerStore.locateTask()
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.floating-timer {
  position: fixed;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 220px;
  z-index: 9999;
  overflow: hidden;
  cursor: move;
  user-select: none;
}

.timer-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  color: #fff;
  cursor: move;
}

.header-title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.timer-body {
  padding: 16px;
  cursor: default;
}

.time-display {
  text-align: center;
  margin-bottom: 12px;
}

.time-value {
  font-size: 28px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: #303133;
  letter-spacing: 2px;
}

.task-info {
  margin-bottom: 16px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 8px;
}

.task-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.course-name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.timer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.timer-actions .el-button {
  flex: 1;
  min-width: 60px;
}
</style>
