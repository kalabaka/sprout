<template>
  <div class="achievement-wall">
    <div class="header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1>🏆 我的勋章墙</h1>
      </div>
      <div class="header-right">
        <el-radio-group v-model="filter" size="small">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="earned">已获得</el-radio-button>
          <el-radio-button value="locked">未获得</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ earnedCount }}</span>
        <span class="stat-label">已获得</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ totalCount }}</span>
        <span class="stat-label">总勋章</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ Math.round(earnedCount / totalCount * 100) || 0 }}%</span>
        <span class="stat-label">完成度</span>
      </div>
    </div>

    <div v-loading="loading" class="badges-grid">
      <div 
        v-for="badge in filteredBadges" 
        :key="badge.code"
        class="badge-card"
        :class="[badge.rarity, { earned: badge.earned }]"
      >
        <div class="badge-icon-wrapper">
          <span class="badge-icon">{{ badge.earned ? badge.icon : '🔒' }}</span>
          <div v-if="badge.earned" class="earned-badge">
            <el-icon><Check /></el-icon>
          </div>
        </div>
        <div class="badge-content">
          <div class="badge-name">{{ badge.name }}</div>
          <div class="badge-desc">{{ badge.description }}</div>
          <div class="badge-rarity">
            <el-tag :type="getRarityType(badge.rarity)" size="small" effect="dark">
              {{ getRarityText(badge.rarity) }}
            </el-tag>
          </div>
        </div>
        <div class="badge-status">
          <template v-if="badge.earned">
            <div class="earned-info">
              <el-icon color="#67c23a"><CircleCheck /></el-icon>
              <span>{{ formatDate(badge.earnedAt) }} 获得</span>
            </div>
          </template>
          <template v-else>
            <div class="progress-info">
              <div class="progress-text">
                {{ getProgressText(badge) }}
              </div>
              <el-progress 
                :percentage="getProgress(badge)" 
                :stroke-width="6"
                :color="getProgressColor(badge.rarity)"
              />
            </div>
          </template>
        </div>
      </div>
    </div>

    <div v-if="filteredBadges.length === 0 && !loading" class="empty-state">
      <el-icon :size="64"><Medal /></el-icon>
      <p>暂无{{ filter === 'earned' ? '已获得' : '未获得' }}的勋章</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { achievementApi, statsApi } from '../api'
import { ElMessage } from 'element-plus'

const router = useRouter()

const loading = ref(false)
const badges = ref([])
const filter = ref('all')
const progressData = ref({
  todayMinutes: 0,
  totalMinutes: 0,
  currentStreak: 0,
  totalCheckins: 0
})

const filteredBadges = computed(() => {
  if (filter.value === 'all') return badges.value
  if (filter.value === 'earned') return badges.value.filter(b => b.earned)
  return badges.value.filter(b => !b.earned)
})

const earnedCount = computed(() => badges.value.filter(b => b.earned).length)
const totalCount = computed(() => badges.value.length)

const getRarityType = (rarity) => {
  const map = {
    common: 'info',
    rare: 'primary',
    epic: 'warning',
    legendary: 'danger'
  }
  return map[rarity] || 'info'
}

const getRarityText = (rarity) => {
  const map = {
    common: '普通',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说'
  }
  return map[rarity] || '普通'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const getProgress = (badge) => {
  const { conditionType, conditionValue } = badge
  let current = 0
  let target = conditionValue

  switch (conditionType) {
    case 'daily_duration':
      current = progressData.value.todayMinutes
      break
    case 'streak_days':
      current = progressData.value.currentStreak
      break
    case 'total_hours':
      current = Math.floor(progressData.value.totalMinutes / 60)
      break
    case 'total_checkins':
      current = progressData.value.totalCheckins
      break
    case 'start_time_before':
    case 'start_time_after':
    case 'perfect_week':
      return 0
    default:
      return 0
  }

  return Math.min(100, Math.round(current / target * 100))
}

const getProgressText = (badge) => {
  const { conditionType, conditionValue } = badge
  let current = 0

  switch (conditionType) {
    case 'daily_duration':
      current = progressData.value.todayMinutes
      return `今日学习 ${current} / ${conditionValue} 分钟`
    case 'streak_days':
      current = progressData.value.currentStreak
      return `连续打卡 ${current} / ${conditionValue} 天`
    case 'total_hours':
      current = Math.floor(progressData.value.totalMinutes / 60)
      return `累计学习 ${current} / ${conditionValue} 小时`
    case 'total_checkins':
      current = progressData.value.totalCheckins
      return `累计打卡 ${current} / ${conditionValue} 次`
    case 'start_time_before':
      return `需要在 08:00 前开始学习`
    case 'start_time_after':
      return `需要在 22:00 后仍在学习`
    case 'perfect_week':
      return `连续7天每天学习超2小时`
    default:
      return badge.description
  }
}

const getProgressColor = (rarity) => {
  const map = {
    common: '#909399',
    rare: '#409eff',
    epic: '#a855f7',
    legendary: '#e6a23c'
  }
  return map[rarity] || '#409eff'
}

const fetchBadges = async () => {
  loading.value = true
  try {
    const res = await achievementApi.getAllBadges()
    if (res.success) {
      badges.value = res.data || []
    }
  } catch (error) {
    console.error('获取勋章失败', error)
    ElMessage.error('获取勋章失败')
  } finally {
    loading.value = false
  }
}

const fetchProgressData = async () => {
  try {
    const [overviewRes, streakRes] = await Promise.all([
      statsApi.getOverview(),
      achievementApi.getStreak()
    ])

    if (overviewRes.success) {
      progressData.value.todayMinutes = overviewRes.data.todayMinutes || 0
      progressData.value.totalMinutes = overviewRes.data.totalMinutes || 0
    }

    if (streakRes.success) {
      progressData.value.currentStreak = streakRes.data.currentStreak || 0
      progressData.value.totalCheckins = streakRes.data.totalCheckins || 0
    }
  } catch (error) {
    console.error('获取进度数据失败', error)
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  fetchBadges()
  fetchProgressData()
})
</script>

<style scoped>
.achievement-wall {
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

.stats-bar {
  display: flex;
  gap: 24px;
  background: #fff;
  padding: 16px 24px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stats-bar .stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-bar .stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

.stats-bar .stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.badges-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

@media (max-width: 1200px) {
  .badges-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .badges-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .badges-grid {
    grid-template-columns: 1fr;
  }
}

.badge-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  border: 2px solid transparent;
}

.badge-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.badge-card.common {
  border-color: #e4e7ed;
}

.badge-card.rare {
  border-color: #409eff;
}

.badge-card.epic {
  border-color: #a855f7;
}

.badge-card.legendary {
  border-color: #e6a23c;
  background: linear-gradient(135deg, #fffbf0 0%, #fff5e6 100%);
}

.badge-card.earned {
  background: linear-gradient(135deg, #f0f9eb 0%, #e1f3d8 100%);
}

.badge-card.earned.legendary {
  background: linear-gradient(135deg, #fffbf0 0%, #fff5e6 100%);
}

.badge-icon-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.badge-icon {
  font-size: 56px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

.badge-card:not(.earned) .badge-icon {
  filter: grayscale(100%) opacity(0.5);
}

.earned-badge {
  position: absolute;
  top: -4px;
  right: calc(50% - 40px);
  width: 24px;
  height: 24px;
  background: #67c23a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
}

.badge-content {
  text-align: center;
  margin-bottom: 16px;
}

.badge-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.badge-desc {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
  line-height: 1.5;
}

.badge-rarity {
  display: flex;
  justify-content: center;
}

.badge-status {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.earned-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #67c23a;
  font-size: 13px;
  font-weight: 500;
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-text {
  font-size: 12px;
  color: #606266;
  text-align: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #909399;
}

.empty-state p {
  margin-top: 16px;
  font-size: 14px;
}
</style>
