<template>
  <div class="plan-overview-card">
    <el-card shadow="hover" class="overview-card">
      <div class="card-content">
        <div class="plan-info">
          <div class="plan-header">
            <div class="plan-title-row">
              <el-tag 
                v-if="plan.goal_type"
                :color="getTypeTagColor(plan.goal_type)"
                effect="plain"
                size="small"
                class="type-tag"
              >
                {{ getTypeTagText(plan.goal_type) }}
              </el-tag>
              <h2 class="plan-name">{{ plan.name }}</h2>
            </div>
            <el-tag :type="getStatusType(plan.status)" size="large">
              {{ getStatusText(plan.status) }}
            </el-tag>
          </div>
          <p v-if="plan.goal" class="plan-goal">{{ plan.goal }}</p>

          <div v-if="plan.goal_type === 'exam'" class="exam-info-section">
            <div class="exam-info-grid">
              <div class="exam-info-item">
                <el-icon class="exam-icon"><Aim /></el-icon>
                <div class="exam-content">
                  <span class="exam-label">关联考试</span>
                  <span class="exam-value">{{ exam?.name || plan.exam_name || '未知考试' }}</span>
                </div>
              </div>
              <div class="exam-info-item">
                <el-icon class="exam-icon"><Calendar /></el-icon>
                <div class="exam-content">
                  <span class="exam-label">考试日期</span>
                  <span class="exam-value">{{ formatExamDate(plan.target_date) }}</span>
                </div>
              </div>
              <div class="exam-info-item">
                <el-icon class="exam-icon"><AlarmClock /></el-icon>
                <div class="exam-content">
                  <span class="exam-label">距离考试</span>
                  <span class="exam-value countdown" :class="getCountdownClass(daysRemaining)">
                    {{ daysRemaining }} 天
                  </span>
                </div>
              </div>
              <div v-if="plan.target_score" class="exam-info-item">
                <el-icon class="exam-icon"><TrendCharts /></el-icon>
                <div class="exam-content">
                  <span class="exam-label">目标分数</span>
                  <span class="exam-value">{{ plan.target_score }} 分</span>
                </div>
              </div>
            </div>
            <div v-if="daysRemaining <= 7 && daysRemaining > 0" class="exam-alert">
              <el-icon><WarningFilled /></el-icon>
              <span>考试临近，请抓紧复习！</span>
            </div>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-label">学习进度</span>
            <span class="progress-value">{{ stats.completedTasks }}/{{ stats.totalTasks }} 任务</span>
          </div>
          <el-progress
            :percentage="stats.progress"
            :stroke-width="16"
            :color="getProgressColor(stats.progress)"
          >
            <template #default="{ percentage }">
              <span class="progress-text">{{ percentage }}%</span>
            </template>
          </el-progress>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <el-icon class="info-icon"><Calendar /></el-icon>
            <div class="info-content">
              <span class="info-label">预计完成</span>
              <span class="info-value" :class="{ 'overdue': isOverdue }">
                {{ formatDate(plan.end_date) || '未设定' }}
              </span>
            </div>
          </div>

          <div class="info-item">
            <el-icon class="info-icon"><Clock /></el-icon>
            <div class="info-content">
              <span class="info-label">累计学习</span>
              <span class="info-value">{{ formatDuration(stats.totalMinutes) }}</span>
            </div>
          </div>

          <div class="info-item">
            <el-icon class="info-icon"><Timer /></el-icon>
            <div class="info-content">
              <span class="info-label">每日目标</span>
              <span class="info-value">{{ plan.daily_study_minutes || 60 }} 分钟</span>
            </div>
          </div>

          <div class="info-item">
            <el-icon class="info-icon"><Flag /></el-icon>
            <div class="info-content">
              <span class="info-label">优先级</span>
              <el-tag :type="getPriorityType(plan.priority)" size="small">
                {{ getPriorityText(plan.priority) }}
              </el-tag>
            </div>
          </div>
        </div>

        <div v-if="riskAssessment" class="risk-section">
          <div class="risk-header">
            <el-icon :class="['risk-icon', riskAssessment.riskLevel]">
              <component :is="getRiskIcon(riskAssessment.riskLevel)" />
            </el-icon>
            <span class="risk-label">风险评估</span>
            <el-tag :type="getRiskType(riskAssessment.riskLevel)" size="small">
              {{ getRiskText(riskAssessment.riskLevel) }}
            </el-tag>
          </div>
          <p class="risk-reason">{{ riskAssessment.riskReason }}</p>
          <div v-if="riskAssessment.recommendations?.length" class="recommendations">
            <span class="recommendations-label">建议：</span>
            <ul>
              <li v-for="(rec, index) in riskAssessment.recommendations.slice(0, 3)" :key="index">
                {{ rec }}
              </li>
            </ul>
          </div>
        </div>

        <div v-if="motivation" class="motivation-section">
          <div class="motivation-content">
            <el-icon class="motivation-icon"><Sunny /></el-icon>
            <span class="motivation-text">{{ motivation.message }}</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Calendar, Clock, Timer, Flag, Sunny,
  CircleCheck, Warning, CircleClose, TrendCharts,
  Aim, AlarmClock, WarningFilled
} from '@element-plus/icons-vue'

const props = defineProps({
  plan: {
    type: Object,
    required: true
  },
  stats: {
    type: Object,
    default: () => ({})
  },
  riskAssessment: {
    type: Object,
    default: null
  },
  motivation: {
    type: Object,
    default: null
  },
  exam: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['refresh'])

const isOverdue = computed(() => {
  if (!props.plan.end_date) return false
  const endDate = new Date(props.plan.end_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return endDate < today && props.stats.progress < 100
})

const daysRemaining = computed(() => {
  if (!props.plan.target_date) return 0
  const targetDate = new Date(props.plan.target_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  targetDate.setHours(0, 0, 0, 0)
  const diff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
})

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatExamDate = (date) => {
  if (!date) return '未设定'
  const d = new Date(date)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${weekdays[d.getDay()]}`
}

const formatDuration = (minutes) => {
  if (!minutes) return '0分钟'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) {
    return `${hours}小时${mins}分钟`
  } else if (hours > 0) {
    return `${hours}小时`
  }
  return `${mins}分钟`
}

const getTypeTagColor = (goalType) => {
  const colors = {
    exam: '#E6A23C',
    skill: '#409EFF',
    course: '#67C23A',
    other: '#909399'
  }
  return colors[goalType] || colors.skill
}

const getTypeTagText = (goalType) => {
  const texts = {
    exam: '📝 复习',
    skill: '📚 学习',
    course: '🔧 技能',
    other: '📋 其他'
  }
  return texts[goalType] || '📚 学习'
}

const getCountdownClass = (days) => {
  if (days <= 3) return 'urgent'
  if (days <= 7) return 'warning'
  return ''
}

const getStatusType = (status) => {
  const map = {
    draft: 'info',
    active: 'primary',
    paused: 'warning',
    completed: 'success',
    archived: 'info'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    draft: '草稿',
    active: '进行中',
    paused: '已暂停',
    completed: '已完成',
    archived: '已归档'
  }
  return map[status] || status
}

const getProgressColor = (progress) => {
  if (progress >= 80) return '#67C23A'
  if (progress >= 50) return '#E6A23C'
  if (progress >= 30) return '#409EFF'
  return '#909399'
}

const getPriorityType = (priority) => {
  const map = {
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return map[priority] || 'info'
}

const getPriorityText = (priority) => {
  const map = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return map[priority] || '中'
}

const getRiskIcon = (level) => {
  const map = {
    normal: CircleCheck,
    ahead: TrendCharts,
    caution: Warning,
    warning: Warning,
    critical: CircleClose
  }
  return map[level] || CircleCheck
}

const getRiskType = (level) => {
  const map = {
    normal: 'success',
    ahead: 'primary',
    caution: 'warning',
    warning: 'warning',
    critical: 'danger'
  }
  return map[level] || 'info'
}

const getRiskText = (level) => {
  const map = {
    normal: '正常',
    ahead: '超前',
    caution: '注意',
    warning: '预警',
    critical: '滞后'
  }
  return map[level] || '未知'
}
</script>

<style scoped>
.plan-overview-card {
  padding: 16px 24px;
}

.overview-card {
  border-radius: 16px;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.plan-info {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 16px;
}

.plan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.plan-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.type-tag {
  border: none;
  color: #fff;
}

.plan-name {
  margin: 0;
  font-size: 22px;
  color: #303133;
}

.plan-goal {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
}

.exam-info-section {
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #FFF7E6 0%, #FFF2E0 100%);
  border-radius: 12px;
  border: 1px solid #FFD591;
}

.exam-info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.exam-info-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.exam-icon {
  font-size: 22px;
  color: #E6A23C;
}

.exam-content {
  display: flex;
  flex-direction: column;
}

.exam-label {
  font-size: 12px;
  color: #909399;
}

.exam-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.exam-value.countdown {
  font-size: 18px;
  font-weight: 700;
  color: #E6A23C;
}

.exam-value.countdown.warning {
  color: #F56C6C;
}

.exam-value.countdown.urgent {
  color: #F56C6C;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.exam-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  background: #FEF0F0;
  border-radius: 8px;
  color: #F56C6C;
  font-size: 13px;
  font-weight: 500;
}

.progress-section {
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  border-radius: 12px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.progress-label {
  font-size: 14px;
  color: #606266;
}

.progress-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
}

.info-icon {
  font-size: 24px;
  color: #409EFF;
}

.info-content {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 12px;
  color: #909399;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.info-value.overdue {
  color: #F56C6C;
}

.risk-section {
  padding: 16px;
  background: #fafafa;
  border-radius: 12px;
  border-left: 4px solid;
  border-left-color: var(--risk-color, #67C23A);
}

.risk-section .risk-icon.normal { color: #67C23A; }
.risk-section .risk-icon.ahead { color: #409EFF; }
.risk-section .risk-icon.caution { color: #E6A23C; }
.risk-section .risk-icon.warning { color: #E6A23C; }
.risk-section .risk-icon.critical { color: #F56C6C; }

.risk-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.risk-icon {
  font-size: 20px;
}

.risk-label {
  font-weight: 500;
  color: #303133;
}

.risk-reason {
  margin: 0 0 8px;
  color: #606266;
  font-size: 14px;
}

.recommendations-label {
  font-size: 13px;
  color: #909399;
}

.recommendations ul {
  margin: 4px 0 0;
  padding-left: 20px;
}

.recommendations li {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}

.motivation-section {
  padding: 16px;
  background: linear-gradient(135deg, #E3F2FD 0%, #F3E5F5 100%);
  border-radius: 12px;
}

.motivation-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.motivation-icon {
  font-size: 24px;
  color: #E6A23C;
}

.motivation-text {
  font-size: 15px;
  color: #303133;
  font-weight: 500;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .exam-info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
