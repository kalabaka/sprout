<template>
  <div class="data-center">
    <!-- 顶部导航 -->
    <div class="header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1>学习数据中心</h1>
      </div>
      <el-button type="primary" :loading="loading" @click="fetchData">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-wrapper">
      <el-icon class="loading-icon" :size="40"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <!-- 数据内容 -->
    <div v-else class="content">
      <!-- 统计卡片 -->
      <el-row :gutter="16" class="stats-row">
        <el-col :span="6">
          <div class="stat-card stat-card-primary">
            <div class="stat-icon">
              <el-icon :size="28"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ summary.avgDuration }}</div>
              <div class="stat-label">日均学习(分钟)</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card stat-card-success">
            <div class="stat-icon">
              <el-icon :size="28"><Check /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ summary.completionRate }}%</div>
              <div class="stat-label">任务完成率</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card stat-card-warning">
            <div class="stat-icon">
              <el-icon :size="28"><Timer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ summary.totalDuration }}</div>
              <div class="stat-label">总学习时长(分钟)</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card stat-card-info">
            <div class="stat-icon">
              <el-icon :size="28"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ summary.totalTasks }}</div>
              <div class="stat-label">总任务数</div>
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- 图表区域 -->
      <el-row :gutter="16" class="charts-row">
        <!-- 左侧：学习时长趋势 -->
        <el-col :span="14">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="card-header">
                <span>近7日学习时长趋势</span>
                <el-tag size="small" type="success">持续进步</el-tag>
              </div>
            </template>
            <div ref="trendChartRef" class="chart"></div>
          </el-card>
        </el-col>

        <!-- 右侧：能力雷达 -->
        <el-col :span="10">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="card-header">
                <span>能力评估雷达</span>
                <el-tag size="small" type="primary">5维度</el-tag>
              </div>
            </template>
            <div ref="radarChartRef" class="chart"></div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 能力详情 -->
      <el-row :gutter="16" class="ability-row">
        <el-col :span="24">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>能力维度详情</span>
              </div>
            </template>
            <div class="ability-list">
              <div
                v-for="(item, index) in radarData"
                :key="index"
                class="ability-item"
              >
                <div class="ability-name">{{ item.name }}</div>
                <div class="ability-bar">
                  <div
                    class="ability-progress"
                    :style="{ width: item.value + '%' }"
                  ></div>
                </div>
                <div class="ability-value">{{ item.value }}%</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script>
import echarts from '../utils/echarts'
import { analysisApi } from '../api'
import { ArrowLeft, Refresh, Loading, Clock, Check, Timer, Document } from '@element-plus/icons-vue'
import { useTimerStore } from '../stores/timer'

export default {
  name: 'DataCenter',
  components: {
    ArrowLeft,
    Refresh,
    Loading,
    Clock,
    Check,
    Timer,
    Document
  },
  setup() {
    const timerStore = useTimerStore()
    return { timerStore }
  },
  data() {
    return {
      loading: false,
      lastRunningState: false,
      summary: {
        totalDuration: 0,
        avgDuration: 0,
        totalTasks: 0,
        completionRate: 0
      },
      trendData: [],
      radarData: [],
      charts: {
        trend: null,
        radar: null
      }
    }
  },
  mounted() {
    this.fetchData()
    this.lastRunningState = this.timerStore.isRunning
    
    if (this.timerStore.needRefresh) {
      this.timerStore.needRefresh = false
    }
  },
  watch: {
    'timerStore.isRunning'(newVal) {
      if (this.lastRunningState && !newVal) {
        this.lastRunningState = newVal
        this.fetchData()
      } else {
        this.lastRunningState = newVal
      }
    },
    'timerStore.needRefresh'(newVal) {
      if (newVal) {
        this.fetchData()
        this.timerStore.needRefresh = false
      }
    }
  },
  beforeUnmount() {
    this.disposeCharts()
  },
  methods: {
    goBack() {
      this.$router.push('/home')
    },
    disposeCharts() {
      this.charts.trend?.dispose()
      this.charts.radar?.dispose()
    },
    async fetchData() {
      this.loading = true
      this.disposeCharts()

      try {
        // 并行请求数据
        const [trendRes, summaryRes, radarRes] = await Promise.all([
          analysisApi.getTrend(7),
          analysisApi.getSummary(),
          analysisApi.getRadar()
        ])

        // 处理数据
        this.trendData = trendRes.data?.days || []
        this.summary = summaryRes.data || this.summary
        this.radarData = radarRes.data?.dimensions || []

        this.$nextTick(() => {
          this.initCharts()
        })
      } catch (error) {
        console.error('获取数据中心失败:', error)
        this.$message.error('加载数据失败')
      } finally {
        this.loading = false
      }
    },
    initCharts() {
      this.initTrendChart()
      this.initRadarChart()
    },
    initTrendChart() {
      if (!this.$refs.trendChartRef || this.trendData.length === 0) return

      const labels = this.trendData.map(d => d.label)
      const values = this.trendData.map(d => d.duration)

      this.charts.trend = echarts.init(this.$refs.trendChartRef)
      this.charts.trend.setOption({
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
          data: labels,
          axisLine: { lineStyle: { color: '#E4E7ED' } },
          axisLabel: { color: '#909399' }
        },
        yAxis: {
          type: 'value',
          name: '小时',
          nameTextStyle: { color: '#909399' },
          axisLine: { show: false },
          axisLabel: { 
            color: '#909399',
            formatter: (value) => (value / 60).toFixed(1)
          },
          splitLine: { lineStyle: { color: '#F0F2F5' } }
        },
        series: [{
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          data: values,
          lineStyle: { color: '#67C23A', width: 3 },
          itemStyle: { color: '#67C23A' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(103, 194, 58, 0.35)' },
              { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
            ])
          }
        }]
      })
    },
    initRadarChart() {
      if (!this.$refs.radarChartRef || this.radarData.length === 0) return

      const indicator = this.radarData.map(d => ({
        name: d.name,
        max: 100
      }))
      const values = this.radarData.map(d => d.value)

      this.charts.radar = echarts.init(this.$refs.radarChartRef)
      this.charts.radar.setOption({
        tooltip: {},
        radar: {
          indicator,
          radius: '65%',
          axisName: {
            color: '#606266',
            fontSize: 12
          },
          splitArea: {
            areaStyle: {
              color: ['#F5F7FA', '#FAFAFA']
            }
          },
          axisLine: {
            lineStyle: { color: '#E4E7ED' }
          },
          splitLine: {
            lineStyle: { color: '#E4E7ED' }
          }
        },
        series: [{
          type: 'radar',
          data: [{
            value: values,
            name: '能力评估',
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: { color: '#409EFF' },
            areaStyle: {
              color: 'rgba(64, 158, 255, 0.2)'
            },
            lineStyle: { color: '#409EFF', width: 2 }
          }]
        }]
      })
    }
  }
}
</script>

<style scoped>
.data-center {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px;
  color: #909399;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.content {
  padding: 20px 24px;
}

.stats-row {
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 12px;
}

.stat-card-primary .stat-icon {
  background: linear-gradient(135deg, #409EFF, #66b1ff);
  color: #fff;
}

.stat-card-success .stat-icon {
  background: linear-gradient(135deg, #67C23A, #85ce61);
  color: #fff;
}

.stat-card-warning .stat-icon {
  background: linear-gradient(135deg, #E6A23C, #ebb563);
  color: #fff;
}

.stat-card-info .stat-icon {
  background: linear-gradient(135deg, #909399, #b1b3b8);
  color: #fff;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.charts-row {
  margin-bottom: 16px;
}

.chart-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.chart {
  width: 100%;
  height: 280px;
}

.ability-row {
  margin-bottom: 20px;
}

.ability-list {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
}

.ability-item {
  text-align: center;
}

.ability-name {
  font-size: 14px;
  color: #606266;
  margin-bottom: 10px;
}

.ability-bar {
  height: 8px;
  background: #F0F2F5;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.ability-progress {
  height: 100%;
  background: linear-gradient(90deg, #409EFF, #67C23A);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.ability-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

@media (max-width: 768px) {
  .stats-row .el-col {
    margin-bottom: 12px;
  }

  .charts-row .el-col {
    margin-bottom: 16px;
  }

  .ability-list {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>