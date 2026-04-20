<template>
  <div class="study-stats-page">
    <header class="page-header">
      <div class="header-left">
        <h1>学习统计</h1>
        <p>查看你的学习数据和趋势分析</p>
      </div>
      <div class="header-right">
        <el-radio-group v-model="timeRange" @change="handleTimeRangeChange">
          <el-radio-button value="7">本周</el-radio-button>
          <el-radio-button value="30">本月</el-radio-button>
          <el-radio-button value="all">全部</el-radio-button>
        </el-radio-group>
      </div>
    </header>

    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon total">
          <el-icon><Timer /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ formatDuration(overview.totalMinutes) }}</div>
          <div class="stat-label">总学习时长</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon today">
          <el-icon><Calendar /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ overview.todayMinutes }} 分钟</div>
          <div class="stat-label">今日学习</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon streak">
          <el-icon><Trophy /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ overview.streak }} 天</div>
          <div class="stat-label">连续打卡</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon sessions">
          <el-icon><DataLine /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ overview.totalSessions }}</div>
          <div class="stat-label">学习次数</div>
        </div>
      </div>
    </div>

    <div class="charts-row">
      <el-card class="chart-card pie-chart-card">
        <template #header>
          <div class="card-header">
            <span>课程学习分布</span>
            <el-tag size="small" type="info">{{ distribution.period }}</el-tag>
          </div>
        </template>
        <div v-if="distribution.distribution.length > 0" class="chart-container">
          <v-chart :option="pieChartOption" autoresize />
        </div>
        <el-empty v-else description="暂无学习数据" :image-size="100" />
      </el-card>

      <el-card class="chart-card line-chart-card">
        <template #header>
          <div class="card-header">
            <span>学习趋势</span>
            <el-tag size="small" type="info">{{ trend.summary?.period || '近7天' }}</el-tag>
          </div>
        </template>
        <div v-if="trend.trend && trend.trend.length > 0" class="chart-container">
          <v-chart :option="lineChartOption" autoresize />
        </div>
        <el-empty v-else description="暂无学习数据" :image-size="100" />
      </el-card>
    </div>

    <el-card class="detail-card">
      <template #header>
        <div class="card-header">
          <span>课程学习详情</span>
        </div>
      </template>
      <div v-if="distribution.distribution.length > 0" class="course-detail-list">
        <div 
          v-for="(item, index) in distribution.distribution" 
          :key="index" 
          class="course-detail-item"
        >
          <div class="course-info">
            <span class="course-color" :style="{ background: item.color }"></span>
            <span class="course-name">{{ item.courseName }}</span>
          </div>
          <div class="course-stats">
            <span class="course-time">{{ formatDuration(item.minutes) }}</span>
            <el-progress 
              :percentage="item.percentage" 
              :stroke-width="8"
              :color="item.color"
              :show-text="false"
              style="width: 120px"
            />
            <span class="course-percent">{{ item.percentage }}%</span>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无课程学习数据" :image-size="80" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, watchEffect } from 'vue'
import { registerECharts } from '../utils/echarts'
import VChart from 'vue-echarts'
import { statsApi } from '../api'
import { useTimerStore } from '../stores/timer'

registerECharts()

const timerStore = useTimerStore()

const timeRange = ref('7')
const loading = ref(false)

const overview = ref({
  totalMinutes: 0,
  todayMinutes: 0,
  streak: 0,
  totalSessions: 0,
  weekMinutes: 0,
  monthMinutes: 0
})

const distribution = ref({
  distribution: [],
  totalMinutes: 0,
  period: '近7天'
})

const trend = ref({
  trend: [],
  summary: {
    totalMinutes: 0,
    avgMinutes: 0,
    maxMinutes: 0,
    period: '近7天'
  }
})

const pieChartOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c}分钟 ({d}%)'
  },
  legend: {
    orient: 'vertical',
    right: 10,
    top: 'center',
    textStyle: {
      fontSize: 12
    }
  },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    center: ['40%', '50%'],
    avoidLabelOverlap: false,
    itemStyle: {
      borderRadius: 8,
      borderColor: '#fff',
      borderWidth: 2
    },
    label: {
      show: false
    },
    emphasis: {
      label: {
        show: true,
        fontSize: 14,
        fontWeight: 'bold'
      }
    },
    labelLine: {
      show: false
    },
    data: distribution.value.distribution.map(item => ({
      value: item.minutes,
      name: item.courseName,
      itemStyle: { color: item.color }
    }))
  }]
}))

const lineChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      const data = params[0]
      const hours = (data.value / 60).toFixed(1)
      return `${data.name}<br/>学习时长: ${hours} 小时`
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '10%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: trend.value.trend.map(item => item.dayLabel),
    axisLabel: {
      fontSize: 11,
      rotate: 30
    }
  },
  yAxis: {
    type: 'value',
    name: '小时',
    axisLabel: {
      formatter: (value) => (value / 60).toFixed(1)
    }
  },
  series: [{
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 8,
    lineStyle: {
      width: 3,
      color: '#409eff'
    },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
          { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
        ]
      }
    },
    itemStyle: {
      color: '#409eff'
    },
    data: trend.value.trend.map(item => item.totalMinutes)
  }]
}))

const formatDuration = (minutes) => {
  if (!minutes || minutes === 0) return '0分钟'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
  }
  return `${mins}分钟`
}

const fetchOverview = async () => {
  try {
    const res = await statsApi.getOverview()
    if (res.success) {
      overview.value = res.data
    }
  } catch (error) {
    console.error('获取总览数据失败:', error)
  }
}

const fetchDistribution = async () => {
  try {
    const days = timeRange.value === 'all' ? 365 : parseInt(timeRange.value)
    const res = await statsApi.getDistribution(days)
    if (res.success) {
      distribution.value = res.data
    }
  } catch (error) {
    console.error('获取课程分布失败:', error)
  }
}

const fetchTrend = async () => {
  try {
    const days = timeRange.value === 'all' ? 30 : parseInt(timeRange.value)
    const res = await statsApi.getTrend(days)
    if (res.success) {
      trend.value = res.data
    }
  } catch (error) {
    console.error('获取学习趋势失败:', error)
  }
}

const handleTimeRangeChange = () => {
  fetchDistribution()
  fetchTrend()
}

const fetchData = async () => {
  loading.value = true
  await Promise.all([
    fetchOverview(),
    fetchDistribution(),
    fetchTrend()
  ])
  loading.value = false
}

onMounted(() => {
  fetchData()
  
  if (timerStore.needRefresh) {
    timerStore.needRefresh = false
  }
})

let lastRunningState = timerStore.isRunning
watchEffect(() => {
  const currentRunning = timerStore.isRunning
  if (currentRunning !== lastRunningState && !currentRunning) {
    lastRunningState = currentRunning
    fetchData()
  }
})

watch(() => timerStore.needRefresh, (newVal) => {
  if (newVal) {
    fetchData()
    timerStore.needRefresh = false
  }
})
</script>

<style scoped>
.study-stats-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left h1 {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.header-left p {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon.total {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: #fff;
}

.stat-icon.today {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  color: #fff;
}

.stat-icon.streak {
  background: linear-gradient(135deg, #e6a23c 0%, #ebb563 100%);
  color: #fff;
}

.stat-icon.sessions {
  background: linear-gradient(135deg, #909399 0%, #a6a9ad 100%);
  color: #fff;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.chart-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.chart-container {
  height: 300px;
}

.detail-card {
  border-radius: 12px;
}

.course-detail-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.course-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.course-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.course-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.course-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.course-stats {
  display: flex;
  align-items: center;
  gap: 16px;
}

.course-time {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  min-width: 80px;
  text-align: right;
}

.course-percent {
  font-size: 13px;
  color: #909399;
  min-width: 45px;
  text-align: right;
}

@media (max-width: 1200px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .charts-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .study-stats-page {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .stats-cards {
    grid-template-columns: 1fr;
  }
}
</style>
