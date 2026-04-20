<template>
  <div class="stat-cards">
    <div class="stat-card">
      <div class="stat-icon" style="background: linear-gradient(135deg, #409EFF, #67C23A)">
        <el-icon :size="24"><CircleCheck /></el-icon>
      </div>
      <div class="stat-content">
        <span class="stat-value">{{ stats.progress?.toFixed(1) || 0 }}%</span>
        <span class="stat-label">任务完成率</span>
      </div>
      <el-progress
        :percentage="stats.progress || 0"
        :stroke-width="4"
        :show-text="false"
        :color="getProgressColor(stats.progress)"
        class="stat-progress"
      />
    </div>

    <div class="stat-card">
      <div class="stat-icon" style="background: linear-gradient(135deg, #E6A23C, #F56C6C)">
        <el-icon :size="24"><Timer /></el-icon>
      </div>
      <div class="stat-content">
        <span class="stat-value">{{ avgDailyMinutes }}</span>
        <span class="stat-label">日均学习时长(分钟)</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon" style="background: linear-gradient(135deg, #67C23A, #409EFF)">
        <el-icon :size="24"><TrendCharts /></el-icon>
      </div>
      <div class="stat-content">
        <span class="stat-value">{{ streakDays }}</span>
        <span class="stat-label">连续执行天数</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon" style="background: linear-gradient(135deg, #909399, #C0C4CC)">
        <el-icon :size="24"><Document /></el-icon>
      </div>
      <div class="stat-content">
        <span class="stat-value">{{ stats.remainingTasks || 0 }}</span>
        <span class="stat-label">剩余任务数</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CircleCheck, Timer, TrendCharts, Document } from '@element-plus/icons-vue'

const props = defineProps({
  stats: {
    type: Object,
    default: () => ({})
  },
  plan: {
    type: Object,
    default: () => ({})
  }
})

const avgDailyMinutes = computed(() => {
  if (!props.plan.start_date && !props.plan.created_at) return 0
  const startDate = new Date(props.plan.start_date || props.plan.created_at)
  const today = new Date()
  const days = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)) || 1
  return Math.round((props.stats.totalMinutes || 0) / days)
})

const streakDays = computed(() => {
  return props.plan.streakDays || 0
})

const getProgressColor = (progress) => {
  if (progress >= 80) return '#67C23A'
  if (progress >= 50) return '#E6A23C'
  if (progress >= 30) return '#409EFF'
  return '#909399'
}
</script>

<style scoped>
.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 0 24px 16px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
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
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.stat-progress {
  margin-top: auto;
}

@media (max-width: 1024px) {
  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .stat-cards {
    grid-template-columns: 1fr;
  }
}
</style>
