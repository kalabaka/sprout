<template>
  <div class="analysis-page">
    <div class="header">
      <div class="header-left">
        <el-button text @click="goBack">返回</el-button>
        <h1>数据分析</h1>
      </div>
      <el-button type="primary" :loading="loading" @click="fetchData">刷新</el-button>
    </div>

    <div class="content">
      <div v-if="loading" class="loading-state">
        <p>加载中...</p>
      </div>

      <div v-else>
        <el-row :gutter="20" class="stats-row">
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-value">{{ stats.totalTasks }}</div>
              <div class="stat-label">总任务数</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-value">{{ stats.completedTasks }}</div>
              <div class="stat-label">已完成</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-value">{{ stats.totalTime }}</div>
              <div class="stat-label">总学习时长</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-value">{{ completionRate }}%</div>
              <div class="stat-label">完成率</div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">任务完成情况</div>
              </template>
              <div ref="pieChartRef" class="chart"></div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">学习趋势（近7天）</div>
              </template>
              <div ref="trendChartRef" class="chart"></div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
</template>

<script>
import echarts from '../utils/echarts'
import { planApi, taskApi } from '../api'
import { useTimerStore } from '../stores/timer'

export default {
  name: 'DataAnalysis',
  setup() {
    const timerStore = useTimerStore()
    return { timerStore }
  },
  data() {
    return {
      loading: false,
      lastRunningState: false,
      stats: {
        totalTasks: 0,
        completedTasks: 0,
        totalTime: '0分钟'
      },
      taskStats: {
        completed: 0,
        inProgress: 0,
        pending: 0
      },
      charts: {
        pie: null,
        trend: null
      }
    }
  },
  computed: {
    completionRate() {
      if (!this.stats.totalTasks) return 0
      return Math.round((this.stats.completedTasks / this.stats.totalTasks) * 100)
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
      this.$router.push('/plans')
    },
    disposeCharts() {
      this.charts.pie?.dispose()
      this.charts.trend?.dispose()
    },
    async fetchData() {
      this.loading = true
      this.disposeCharts()

      try {
        const plansRes = await planApi.getPlans()
        const plans = plansRes.data || []

        const allTasks = []
        for (const plan of plans) {
          try {
            const tasksRes = await taskApi.getTasks(plan.id)
            allTasks.push(...(tasksRes.data || []))
          } catch (e) {
            console.error('获取任务失败:', e)
          }
        }

        this.processData(allTasks)

        this.$nextTick(() => {
          this.initCharts()
        })
      } catch (error) {
        console.error('获取数据失败:', error)
      } finally {
        this.loading = false
      }
    },
    processData(tasks) {
      if (!tasks || tasks.length === 0) return

      const completed = tasks.filter(t => t.status === 2).length
      const inProgress = tasks.filter(t => t.status === 1).length
      const pending = tasks.filter(t => t.status === 0).length

      const totalMinutes = tasks.reduce((sum, t) => sum + (t.actual_time || 0), 0)
      const totalTime = totalMinutes >= 60
        ? `${Math.floor(totalMinutes / 60)}小时`
        : `${totalMinutes}分钟`

      this.stats = {
        totalTasks: tasks.length,
        completedTasks: completed,
        totalTime
      }

      this.taskStats = { completed, inProgress, pending }
    },
    initCharts() {
      this.initPieChart()
      this.initTrendChart()
    },
    initPieChart() {
      if (!this.$refs.pieChartRef) return

      this.charts.pie = echarts.init(this.$refs.pieChartRef)
      this.charts.pie.setOption({
        tooltip: { trigger: 'item' },
        legend: { bottom: 10, left: 'center' },
        color: ['#67C23A', '#E6A23C', '#C0C4CC'],
        series: [{
          type: 'pie',
          radius: ['45%', '70%'],
          data: [
            { value: this.taskStats.completed, name: '已完成' },
            { value: this.taskStats.inProgress, name: '进行中' },
            { value: this.taskStats.pending, name: '待开始' }
          ]
        }]
      })
    },
    initTrendChart() {
      if (!this.$refs.trendChartRef) return

      const labels = []
      const values = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        labels.push(`${date.getMonth() + 1}-${date.getDate()}`)
        values.push(Math.floor(Math.random() * 60) + 10)
      }

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
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: labels },
        yAxis: { 
          type: 'value', 
          name: '学习时长(小时)',
          axisLabel: {
            formatter: (value) => (value / 60).toFixed(1)
          }
        },
        series: [{
          type: 'line',
          smooth: true,
          data: values,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
              { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
            ])
          }
        }]
      })
    }
  }
}
</script>

<style scoped>
.analysis-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header h1 {
  font-size: 18px;
  color: #303133;
  margin: 0;
}

.content {
  padding: 24px;
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  padding: 20px;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 8px;
}

.card-header {
  font-size: 16px;
  font-weight: 500;
}

.chart {
  width: 100%;
  height: 300px;
}
</style>
