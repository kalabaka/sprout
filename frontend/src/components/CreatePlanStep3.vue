<template>
  <div class="create-plan-step3">
    <div class="overview-section">
      <h3>计划总览</h3>
      <el-card shadow="never" class="info-card">
        <div class="info-grid">
          <div class="info-item">
            <span class="label">计划名称</span>
            <span class="value">{{ step1Data.name }}</span>
          </div>
          <div class="info-item">
            <span class="label">目标类型</span>
            <el-tag :type="getGoalTypeTag(step1Data.goalType)">
              {{ getGoalTypeText(step1Data.goalType) }}
            </el-tag>
          </div>
          <div class="info-item">
            <span class="label">预计完成日期</span>
            <span class="value">{{ step1Data.endDate }}</span>
          </div>
          <div class="info-item">
            <span class="label">每日学习时长</span>
            <span class="value">{{ step1Data.dailyStudyMinutes }} 分钟</span>
          </div>
          <div class="info-item">
            <span class="label">优先级</span>
            <el-tag :type="getPriorityType(step1Data.priority)">
              {{ getPriorityText(step1Data.priority) }}
            </el-tag>
          </div>
          <div v-if="step1Data.courseId" class="info-item">
            <span class="label">关联课程</span>
            <span class="value">{{ getCourseName(step1Data.courseId) }}</span>
          </div>
          <div v-if="step1Data.examId" class="info-item">
            <span class="label">关联考试</span>
            <span class="value">{{ getExamName(step1Data.examId) }}</span>
          </div>
          <div v-if="step1Data.targetScore" class="info-item">
            <span class="label">目标分数</span>
            <span class="value">{{ step1Data.targetScore }} 分</span>
          </div>
        </div>
        <div v-if="step1Data.description" class="description">
          <span class="label">计划描述</span>
          <p>{{ step1Data.description }}</p>
        </div>
      </el-card>
    </div>

    <div class="stats-section">
      <h3>任务统计</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #409EFF, #67C23A)">
            <el-icon :size="24"><Document /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ totalTasks }}</span>
            <span class="stat-label">总任务数</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #E6A23C, #F56C6C)">
            <el-icon :size="24"><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ formatDuration(totalMinutes) }}</span>
            <span class="stat-label">预计总时长</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #67C23A, #409EFF)">
            <el-icon :size="24"><Calendar /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ estimatedDays }} 天</span>
            <span class="stat-label">预计学习天数</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #909399, #C0C4CC)">
            <el-icon :size="24"><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ phases.length }}</span>
            <span class="stat-label">学习阶段</span>
          </div>
        </div>
      </div>
    </div>

    <div class="schedule-section">
      <h3>日程预览</h3>
      <el-card shadow="never" class="schedule-card">
        <div class="schedule-timeline">
          <div
            v-for="(day, index) in schedulePreview"
            :key="index"
            class="schedule-day"
          >
            <div class="day-header">
              <span class="day-date">{{ day.date }}</span>
              <span class="day-tasks">{{ day.tasks.length }} 个任务</span>
            </div>
            <div class="day-tasks-list">
              <div
                v-for="task in day.tasks"
                :key="task.id"
                class="day-task-item"
              >
                <span class="task-dot"></span>
                <span class="task-name">{{ task.name }}</span>
                <span class="task-duration">{{ task.estimatedMinutes }}分钟</span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="schedulePreview.length === 0" class="empty-schedule">
          <el-empty description="暂无日程安排" :image-size="80" />
        </div>
      </el-card>
    </div>

    <div class="phase-summary-section">
      <h3>阶段任务分布</h3>
      <div class="phase-bars">
        <div
          v-for="(phase, index) in phases"
          :key="index"
          class="phase-bar"
        >
          <div class="phase-info">
            <span class="phase-name">{{ phase.name }}</span>
            <span class="phase-count">{{ phase.tasks.length }} 个任务</span>
          </div>
          <el-progress
            :percentage="getPhasePercentage(phase)"
            :stroke-width="12"
            :color="getPhaseColor(index)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Document, Clock, Calendar, TrendCharts } from '@element-plus/icons-vue'

const props = defineProps({
  step1Data: {
    type: Object,
    default: () => ({})
  },
  phases: {
    type: Array,
    default: () => []
  },
  courseList: {
    type: Array,
    default: () => []
  },
  examList: {
    type: Array,
    default: () => []
  }
})

const totalTasks = computed(() => {
  return props.phases.reduce((sum, phase) => sum + phase.tasks.length, 0)
})

const totalMinutes = computed(() => {
  return props.phases.reduce((sum, phase) => {
    return sum + phase.tasks.reduce((s, task) => s + (task.estimatedMinutes || 0), 0)
  }, 0)
})

const estimatedDays = computed(() => {
  const dailyMinutes = props.step1Data.dailyStudyMinutes || 60
  return Math.ceil(totalMinutes.value / dailyMinutes)
})

const schedulePreview = computed(() => {
  const allTasks = []
  props.phases.forEach(phase => {
    phase.tasks.forEach(task => {
      if (task.plannedDate) {
        allTasks.push({
          ...task,
          phaseName: phase.name
        })
      }
    })
  })

  const groupedByDate = {}
  allTasks.forEach(task => {
    if (!groupedByDate[task.plannedDate]) {
      groupedByDate[task.plannedDate] = []
    }
    groupedByDate[task.plannedDate].push(task)
  })

  return Object.entries(groupedByDate)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([date, tasks]) => ({
      date,
      tasks
    }))
    .slice(0, 7)
})

const getGoalTypeText = (type) => {
  const map = {
    exam: '考试',
    skill: '技能',
    course: '课程',
    other: '其他'
  }
  return map[type] || '其他'
}

const getGoalTypeTag = (type) => {
  const map = {
    exam: 'danger',
    skill: 'success',
    course: 'primary',
    other: 'info'
  }
  return map[type] || 'info'
}

const getPriorityText = (priority) => {
  const map = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return map[priority] || '中'
}

const getPriorityType = (priority) => {
  const map = {
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return map[priority] || 'warning'
}

const getCourseName = (courseId) => {
  const course = props.courseList.find(c => c.id === courseId)
  return course?.name || ''
}

const getExamName = (examId) => {
  const exam = props.examList.find(e => e.id === examId)
  return exam?.name || ''
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

const getPhasePercentage = (phase) => {
  if (totalMinutes.value === 0) return 0
  const phaseMinutes = phase.tasks.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0)
  return Math.round((phaseMinutes / totalMinutes.value) * 100)
}

const getPhaseColor = (index) => {
  const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399']
  return colors[index % colors.length]
}
</script>

<style scoped>
.create-plan-step3 {
  padding: 0 20px;
}

.overview-section,
.stats-section,
.schedule-section,
.phase-summary-section {
  margin-bottom: 24px;
}

h3 {
  margin: 0 0 16px;
  color: #303133;
  font-size: 16px;
}

.info-card {
  border-radius: 12px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-item .label {
  color: #909399;
  font-size: 14px;
  min-width: 80px;
}

.info-item .value {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

.description {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.description .label {
  color: #909399;
  font-size: 14px;
  display: block;
  margin-bottom: 8px;
}

.description p {
  color: #606266;
  margin: 0;
  line-height: 1.6;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.schedule-card {
  border-radius: 12px;
}

.schedule-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.schedule-day {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.day-date {
  font-weight: 500;
  color: #303133;
}

.day-tasks {
  font-size: 12px;
  color: #909399;
}

.day-tasks-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.day-task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #fff;
  border-radius: 6px;
  font-size: 13px;
}

.task-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #409EFF;
}

.day-task-item .task-name {
  flex: 1;
  color: #606266;
}

.day-task-item .task-duration {
  color: #909399;
  font-size: 12px;
}

.empty-schedule {
  padding: 20px;
}

.phase-bars {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.phase-bar {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.phase-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.phase-info .phase-name {
  font-weight: 500;
  color: #303133;
}

.phase-info .phase-count {
  color: #909399;
  font-size: 13px;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
