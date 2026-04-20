<template>
  <div class="dashboard-container">
    <div class="header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1>今日概览</h1>
      </div>
      <div class="header-right">
        <el-button type="primary" :loading="loading" @click="fetchData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <el-card class="semester-card" shadow="hover">
      <div class="semester-info">
        <div class="semester-left">
          <el-icon :size="24" class="semester-icon"><Calendar /></el-icon>
          <div class="semester-text">
            <span class="semester-name">{{ semesterInfo?.name || '未设置学期' }}</span>
            <span class="week-info">第 {{ currentWeek }} 周 / 共 {{ totalWeeks }} 周</span>
          </div>
        </div>
        <div class="semester-right">
          <el-progress 
            :percentage="progress" 
            :stroke-width="8" 
            :color="progressColor"
            class="semester-progress"
          />
        </div>
      </div>
    </el-card>

    <ExamCountdown class="exam-section" />

    <el-row :gutter="20" class="study-stats-row">
      <el-col :span="12">
        <el-card class="study-stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon today-study">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatDuration(studyStats.todayMinutes) }}</div>
              <div class="stat-label">今日学习</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="study-stat-card" shadow="hover" @click="goToStudyStats">
          <div class="stat-content">
            <div class="stat-icon week-study">
              <el-icon><DataLine /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatDuration(studyStats.weekMinutes) }}</div>
              <div class="stat-label">本周累计</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="achievement-row">
      <el-col :span="12">
        <el-card class="checkin-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><Calendar /></el-icon>
              <span>打卡状态</span>
            </div>
          </template>
          <div class="checkin-content">
            <div class="checkin-streak">
              <span class="streak-icon">🔥</span>
              <div class="streak-info">
                <div class="streak-number">{{ checkinData.currentStreak }}</div>
                <div class="streak-label">连续打卡天数</div>
              </div>
            </div>
            <div class="checkin-stats">
              <div class="stat-item">
                <span class="stat-num">{{ checkinData.longestStreak }}</span>
                <span class="stat-text">最长连续</span>
              </div>
              <div class="stat-item">
                <span class="stat-num">{{ checkinData.totalCheckins }}</span>
                <span class="stat-text">累计打卡</span>
              </div>
            </div>
            <div class="checkin-status">
              <div v-if="checkinData.todayCheckedIn" class="checked-in">
                <el-icon :size="20" color="#67c23a"><CircleCheck /></el-icon>
                <span>今日已打卡</span>
              </div>
              <el-button v-else type="primary" @click="openTimer">
                去学习打卡
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="badges-card" shadow="hover" @click="goToBadgeWall">
          <template #header>
            <div class="card-header">
              <el-icon><Medal /></el-icon>
              <span>最新勋章</span>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
            </div>
          </template>
          <div class="badges-content">
            <div v-if="recentBadges.length === 0" class="empty-badges">
              <span class="empty-icon">🏆</span>
              <p>暂无勋章，开始学习获取吧！</p>
            </div>
            <div v-else class="badges-list">
              <div 
                v-for="badge in recentBadges" 
                :key="badge.code" 
                class="badge-item"
                :class="badge.rarity"
              >
                <span class="badge-icon">{{ badge.icon }}</span>
                <div class="badge-info">
                  <div class="badge-name">{{ badge.name }}</div>
                  <div class="badge-desc">{{ badge.description }}</div>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="risk-card" shadow="hover" :class="'risk-level-' + riskData.levelType">
      <template #header>
        <div class="card-header">
          <el-icon><Warning /></el-icon>
          <span>学习风险自查</span>
          <el-tag 
            :type="riskData.levelType" 
            size="small"
            effect="dark"
            class="risk-tag"
          >
            {{ riskData.level }}
          </el-tag>
        </div>
      </template>
      <div v-if="riskLoading" class="risk-loading">
        <el-skeleton :rows="2" animated />
      </div>
      <div v-else class="risk-content">
        <div class="risk-summary">
          <div class="risk-score">
            <el-progress 
              type="dashboard" 
              :percentage="Math.round(riskData.score * 100)" 
              :color="riskColor"
              :width="80"
            />
            <span class="score-label">风险得分</span>
          </div>
          <div class="risk-info">
            <div class="risk-reason">{{ riskData.reason }}</div>
            <div class="risk-metrics">
              <div class="metric-item">
                <span class="metric-label">完成率</span>
                <span class="metric-value">{{ riskData.metrics?.completionRate || 0 }}%</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">正确率</span>
                <span class="metric-value">{{ riskData.metrics?.avgScore || 0 }}%</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">时间偏差</span>
                <span class="metric-value">{{ riskData.metrics?.timeDeviation || 0 }}%</span>
              </div>
            </div>
          </div>
        </div>
        <div class="risk-suggestions">
          <div class="suggestion-title">改进建议</div>
          <div class="suggestion-list">
            <div 
              v-for="(suggestion, index) in riskData.suggestions?.action?.slice(0, 2)" 
              :key="index"
              class="suggestion-item"
            >
              <el-icon><InfoFilled /></el-icon>
              <span>{{ suggestion }}</span>
            </div>
          </div>
        </div>
        <div class="risk-actions">
          <el-button type="primary" size="small" @click="goToAnalysis">
            查看详细分析
          </el-button>
        </div>
      </div>
    </el-card>

    <el-row :gutter="20" class="content-row">
      <el-col :span="12">
        <el-card class="today-courses" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><Reading /></el-icon>
              <span>今日课程 ({{ todayCourses.length }}节)</span>
            </div>
          </template>
          <div v-if="todayCourses.length === 0" class="empty-state">
            <el-icon :size="48"><Coffee /></el-icon>
            <p>今天没有课程安排~</p>
          </div>
          <div v-else class="courses-list">
            <div 
              v-for="course in todayCourses" 
              :key="course.id" 
              class="course-item"
              :style="{ borderLeftColor: course.color || '#409EFF' }"
            >
              <div class="course-header">
                <span class="course-name">{{ course.name }}</span>
                <el-tag size="small" :color="course.color || '#409EFF'" effect="dark">
                  {{ course.startTime }}-{{ course.endTime }}
                </el-tag>
              </div>
              <div class="course-info">
                <span class="info-item">
                  <el-icon><Location /></el-icon>
                  {{ course.classroom || '未设置教室' }}
                </span>
                <span class="info-item">
                  <el-icon><User /></el-icon>
                  {{ course.teacher || '未设置教师' }}
                </span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="today-tasks" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><Clock /></el-icon>
              <span>今日待办 ({{ pendingTasks.length }}项)</span>
            </div>
          </template>
          <div v-if="pendingTasks.length === 0" class="empty-state">
            <el-icon :size="48"><CircleCheck /></el-icon>
            <p>今天没有待办任务~</p>
          </div>
          <div v-else class="tasks-list">
            <div 
              v-for="task in pendingTasks" 
              :key="task.id" 
              class="task-item"
            >
              <div class="task-left">
                <el-tag 
                  :type="getPriorityType(task.priority)" 
                  size="small"
                  effect="dark"
                >
                  {{ getPriorityText(task.priority) }}
                </el-tag>
                <span class="task-title">{{ task.title }}</span>
              </div>
              <div class="task-right">
                <span class="task-deadline">截止 {{ formatDeadline(task.deadline) }}</span>
                <el-tag 
                  v-if="task.courseName" 
                  size="small" 
                  :color="task.courseColor || '#409EFF'"
                  effect="plain"
                >
                  {{ task.courseName }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="week-stats" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><TrendCharts /></el-icon>
          <span>本周进度</span>
        </div>
      </template>
      <div class="stats-content">
        <div class="stats-text">
          <span class="stats-label">已完成</span>
          <span class="stats-value">{{ weekStats.completedTasks }} / {{ weekStats.totalTasks }} 项任务</span>
        </div>
        <el-progress 
          :percentage="weekProgress" 
          :stroke-width="12"
          :color="progressColors"
        />
        <div class="stats-detail">
          <div class="detail-item">
            <el-icon><Clock /></el-icon>
            <span>即将到期: {{ weekStats.upcomingDeadlines }} 项</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { dashboardApi, statsApi, achievementApi, evaluationApi } from '../api'
import { ElMessage } from 'element-plus'
import ExamCountdown from '../components/ExamCountdown.vue'
import { useTimerStore } from '../stores/timer'

const router = useRouter()
const timerStore = useTimerStore()

const loading = ref(false)
const semesterInfo = ref(null)
const todayCourses = ref([])
const pendingTasks = ref([])
const weekStats = ref({ totalTasks: 0, completedTasks: 0, upcomingDeadlines: 0 })
const studyStats = ref({
  todayMinutes: 0,
  weekMinutes: 0,
  streak: 0
})

const checkinData = ref({
  currentStreak: 0,
  longestStreak: 0,
  totalCheckins: 0,
  todayCheckedIn: false
})

const recentBadges = ref([])

const riskLoading = ref(false)
const riskData = ref({
  score: 0,
  level: '低风险',
  levelType: 'success',
  reason: '暂无数据',
  metrics: {
    completionRate: 0,
    avgScore: 0,
    timeDeviation: 0
  },
  suggestions: {
    action: []
  }
})

const riskColor = computed(() => {
  if (riskData.value.score < 0.3) return '#67c23a'
  if (riskData.value.score < 0.6) return '#e6a23c'
  return '#f56c6c'
})

const currentWeek = computed(() => semesterInfo.value?.currentWeek || '-')
const totalWeeks = computed(() => semesterInfo.value?.totalWeeks || '-')
const progress = computed(() => {
  if (!semesterInfo.value) return 0
  return Math.round((currentWeek.value / totalWeeks.value) * 100)
})

const weekProgress = computed(() => {
  if (weekStats.value.totalTasks === 0) return 0
  return Math.round((weekStats.value.completedTasks / weekStats.value.totalTasks) * 100)
})

const progressColor = computed(() => {
  const p = progress.value
  if (p < 30) return '#f56c6c'
  if (p < 60) return '#e6a23c'
  if (p < 80) return '#409eff'
  return '#67c23a'
})

const progressColors = computed(() => {
  const p = weekProgress.value
  if (p < 30) return '#f56c6c'
  if (p < 60) return '#e6a23c'
  if (p < 80) return '#409eff'
  return '#67c23a'
})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await dashboardApi.getTodayOverview()
    if (res.success) {
      semesterInfo.value = res.data.currentSemester
      todayCourses.value = res.data.courses || []
      pendingTasks.value = res.data.pendingTasks || []
      weekStats.value = res.data.weekStats || { totalTasks: 0, completedTasks: 0, upcomingDeadlines: 0 }
    }
  } catch (error) {
    console.error('获取仪表盘数据失败', error)
    ElMessage.error('获取数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const fetchStudyStats = async () => {
  try {
    const res = await statsApi.getOverview()
    if (res.success) {
      studyStats.value = {
        todayMinutes: res.data.todayMinutes || 0,
        weekMinutes: res.data.weekMinutes || 0,
        streak: res.data.streak || 0
      }
    }
  } catch (error) {
    console.error('获取学习统计失败', error)
  }
}

const fetchCheckinData = async () => {
  try {
    const res = await achievementApi.getStreak()
    if (res.success) {
      const today = new Date().toISOString().split('T')[0]
      checkinData.value = {
        currentStreak: res.data.currentStreak || 0,
        longestStreak: res.data.longestStreak || 0,
        totalCheckins: res.data.totalCheckins || 0,
        todayCheckedIn: res.data.lastCheckinDate === today
      }
    }
  } catch (error) {
    console.error('获取打卡数据失败', error)
  }
}

const fetchRecentBadges = async () => {
  try {
    const res = await achievementApi.getRecentBadges()
    if (res.success) {
      recentBadges.value = res.data || []
    }
  } catch (error) {
    console.error('获取最近勋章失败', error)
  }
}

const fetchRiskData = async () => {
  riskLoading.value = true
  try {
    const res = await evaluationApi.getCurrentRisk()
    if (res.success) {
      const data = res.data
      riskData.value = {
        score: data.riskScore || 0,
        level: data.riskLevel || '低风险',
        levelType: data.riskLevel === '高风险' ? 'danger' : data.riskLevel === '中风险' ? 'warning' : 'success',
        reason: data.riskReason || '暂无数据',
        metrics: data.metrics || {},
        suggestions: data.suggestions || { action: [] }
      }
    }
  } catch (error) {
    console.error('获取风险数据失败', error)
  } finally {
    riskLoading.value = false
  }
}

const formatDuration = (minutes) => {
  if (!minutes || minutes === 0) return '0分钟'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
  }
  return `${mins}分钟`
}

const getPriorityType = (priority) => {
  const map = { 
    high: 'danger', 
    medium: 'warning', 
    low: 'success' 
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

const formatDeadline = (deadline) => {
  if (!deadline) return '未设置'
  const date = new Date(deadline)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const deadlineDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  if (deadlineDate.getTime() === today.getTime()) {
    return `今天 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  } else if (deadlineDate.getTime() === tomorrow.getTime()) {
    return `明天 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  } else {
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  }
}

const goBack = () => {
  router.push('/home')
}

const goToStudyStats = () => {
  router.push('/study-stats')
}

const goToBadgeWall = () => {
  router.push('/badge-wall')
}

const goToAnalysis = () => {
  router.push('/learning-analysis')
}

const openTimer = () => {
  router.push('/plans')
}

let lastRunningState = timerStore.isRunning
watchEffect(() => {
  const currentRunning = timerStore.isRunning
  if (currentRunning !== lastRunningState && !currentRunning) {
    lastRunningState = currentRunning
    fetchStudyStats()
    fetchCheckinData()
  }
})

watch(() => timerStore.needRefresh, (newVal) => {
  if (newVal) {
    fetchStudyStats()
    fetchCheckinData()
    timerStore.needRefresh = false
  }
})

onMounted(() => {
  fetchData()
  fetchStudyStats()
  fetchCheckinData()
  fetchRecentBadges()
  fetchRiskData()
  
  if (timerStore.needRefresh) {
    timerStore.needRefresh = false
  }
})
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: #fff;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-right {
  display: flex;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header h1 {
  font-size: 20px;
  color: #303133;
  margin: 0;
}

.semester-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.semester-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.semester-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.semester-icon {
  color: #409eff;
}

.semester-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.semester-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.week-info {
  font-size: 14px;
  color: #606266;
}

.semester-right {
  flex: 1;
  max-width: 400px;
  margin-left: 40px;
}

.semester-progress {
  width: 100%;
}

.exam-section {
  margin-bottom: 20px;
  border-radius: 12px;
}

.content-row {
  margin-bottom: 20px;
}

.today-courses,
.today-tasks {
  height: 400px;
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 280px;
  color: #909399;
}

.empty-state p {
  margin-top: 16px;
  font-size: 14px;
}

.courses-list {
  max-height: 300px;
  overflow-y: auto;
}

.course-item {
  padding: 16px;
  margin-bottom: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
  transition: all 0.3s;
}

.course-item:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.course-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.course-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.course-info {
  display: flex;
  gap: 16px;
  color: #606266;
  font-size: 13px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tasks-list {
  max-height: 300px;
  overflow-y: auto;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: #f5f7fa;
  border-radius: 8px;
  transition: all 0.3s;
}

.task-item:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.task-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.task-title {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.task-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-deadline {
  font-size: 12px;
  color: #909399;
}

.week-stats {
  border-radius: 12px;
}

.stats-content {
  padding: 10px 0;
}

.stats-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.stats-label {
  font-size: 14px;
  color: #606266;
}

.stats-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.stats-detail {
  margin-top: 16px;
  display: flex;
  gap: 24px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.study-stats-row {
  margin-bottom: 20px;
}

.study-stat-card {
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.study-stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.study-stat-card .stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}

.study-stat-card .stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.study-stat-card .stat-icon.today-study {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  color: #fff;
}

.study-stat-card .stat-icon.week-study {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: #fff;
}

.study-stat-card .stat-info {
  flex: 1;
}

.study-stat-card .stat-info .stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.study-stat-card .stat-info .stat-label {
  font-size: 13px;
  color: #909399;
}

.achievement-row {
  margin-bottom: 20px;
}

.checkin-card,
.badges-card {
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.checkin-card:hover,
.badges-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.checkin-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.checkin-streak {
  display: flex;
  align-items: center;
  gap: 16px;
}

.streak-icon {
  font-size: 48px;
}

.streak-info {
  flex: 1;
}

.streak-number {
  font-size: 36px;
  font-weight: 700;
  color: #e6a23c;
  line-height: 1;
}

.streak-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.checkin-stats {
  display: flex;
  gap: 24px;
}

.checkin-stats .stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.checkin-stats .stat-num {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.checkin-stats .stat-text {
  font-size: 12px;
  color: #909399;
}

.risk-card {
  margin-bottom: 20px;
  border-radius: 12px;
  border-left: 4px solid #67c23a;
}

.risk-card.risk-level-warning {
  border-left-color: #e6a23c;
}

.risk-card.risk-level-danger {
  border-left-color: #f56c6c;
}

.risk-tag {
  margin-left: auto;
}

.risk-loading {
  padding: 20px;
}

.risk-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.risk-summary {
  display: flex;
  gap: 24px;
  align-items: center;
}

.risk-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.score-label {
  font-size: 12px;
  color: #909399;
}

.risk-info {
  flex: 1;
}

.risk-reason {
  font-size: 14px;
  color: #303133;
  margin-bottom: 12px;
}

.risk-metrics {
  display: flex;
  gap: 24px;
}

.risk-metrics .metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.risk-metrics .metric-label {
  font-size: 12px;
  color: #909399;
}

.risk-metrics .metric-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.risk-suggestions {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px 16px;
}

.suggestion-title {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
  font-weight: 500;
}

.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}

.risk-actions {
  display: flex;
  justify-content: flex-end;
}

.checkin-status {
  display: flex;
  justify-content: center;
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
}

.checked-in {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #67c23a;
  font-weight: 500;
}

.badges-content {
  min-height: 120px;
}

.empty-badges {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: #909399;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.empty-badges p {
  font-size: 14px;
}

.badges-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.badge-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  transition: all 0.3s;
}

.badge-item:hover {
  background: #ecf5ff;
}

.badge-item.common {
  border-left: 3px solid #909399;
}

.badge-item.rare {
  border-left: 3px solid #409eff;
}

.badge-item.epic {
  border-left: 3px solid #a855f7;
}

.badge-item.legendary {
  border-left: 3px solid #e6a23c;
  background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);
}

.badge-icon {
  font-size: 28px;
}

.badge-info {
  flex: 1;
}

.badge-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.badge-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.arrow-icon {
  margin-left: auto;
  color: #909399;
}
</style>
