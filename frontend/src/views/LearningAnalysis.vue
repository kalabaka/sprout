<template>
  <div class="analysis-container">
    <div class="header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1>学习分析</h1>
      </div>
      <div class="header-right">
        <el-radio-group v-model="period" @change="fetchTrendData">
          <el-radio-button value="week">近7天</el-radio-button>
          <el-radio-button value="month">近30天</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <el-row :gutter="20" class="metrics-row">
      <el-col :span="6">
        <el-card class="metric-card" shadow="hover">
          <div class="metric-content">
            <div class="metric-icon risk-icon">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">
                <el-tag :type="summary.levelType" effect="dark" size="large">
                  {{ summary.level }}
                </el-tag>
              </div>
              <div class="metric-label">综合风险</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card" shadow="hover">
          <div class="metric-content">
            <div class="metric-icon completion-icon">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ metrics.completionRate }}%</div>
              <div class="metric-label">完成率</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card" shadow="hover">
          <div class="metric-content">
            <div class="metric-icon time-icon">
              <el-icon><Timer /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ metrics.timeDeviation }}%</div>
              <div class="metric-label">时间偏差</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card" shadow="hover">
          <div class="metric-content">
            <div class="metric-icon score-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ metrics.avgScore }}%</div>
              <div class="metric-label">正确率</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="chart-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><DataLine /></el-icon>
            <span>风险趋势</span>
          </div>
          <div class="header-right">
            <el-radio-group v-model="period" size="small" @change="fetchTrendData">
              <el-radio-button value="week">本周</el-radio-button>
              <el-radio-button value="month">本月</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>
      <div v-if="trendLoading" class="chart-loading">
        <el-skeleton :rows="6" animated />
      </div>
      <div v-else-if="!trendData.length" class="chart-empty">
        <el-empty description="暂无趋势数据" />
      </div>
      <div v-else>
        <div ref="chartRef" class="chart-container"></div>
        <div class="trend-summary">
          <el-icon><InfoFilled /></el-icon>
          <span>{{ trendSummary }}</span>
        </div>
      </div>
    </el-card>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="table-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><List /></el-icon>
              <span>风险明细</span>
            </div>
          </template>
          <el-table :data="metricsTable" style="width: 100%">
            <el-table-column prop="name" label="指标" width="100" />
            <el-table-column prop="current" label="当前值" width="80" />
            <el-table-column prop="normalRange" label="正常范围" width="100" />
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag :type="row.statusType" size="small">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="suggestions-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><Document /></el-icon>
              <span>改进建议</span>
            </div>
          </template>
          <div class="suggestions-list">
            <div 
              v-for="(item, index) in improvementSuggestions" 
              :key="index"
              class="suggestion-item"
            >
              <div class="suggestion-header">
                <el-tag 
                  :type="item.priority <= 1 ? 'danger' : item.priority <= 2 ? 'warning' : 'info'" 
                  size="small"
                >
                  优先级 {{ item.priority }}
                </el-tag>
                <span class="suggestion-category">{{ item.category }}</span>
              </div>
              <div class="suggestion-content">{{ item.suggestion }}</div>
              <div class="suggestion-reason">{{ item.reason }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { evaluationApi } from '../api'
import { ElMessage } from 'element-plus'
import echarts from '../utils/echarts'
import { useTimerStore } from '../stores/timer'

const router = useRouter()
const timerStore = useTimerStore()
const chartRef = ref(null)
let chartInstance = null

const period = ref('week')
const loading = ref(false)
const trendLoading = ref(false)
const trendData = ref([])
const metricsTable = ref([])
const improvementSuggestions = ref([])
const selectedDate = ref(null)

const summary = ref({
  level: '低风险',
  levelType: 'success',
  avgRiskScore: 0
})

const metrics = ref({
  completionRate: 0,
  timeDeviation: 0,
  avgScore: 0
})

const trendSummary = computed(() => {
  if (!trendData.value.length) return ''
  
  const scores = trendData.value.map(d => d.riskScore)
  const firstScore = scores[0]
  const lastScore = scores[scores.length - 1]
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
  
  let trend = ''
  if (lastScore > firstScore + 0.1) {
    trend = '整体呈上升趋势，建议关注任务完成率'
  } else if (lastScore < firstScore - 0.1) {
    trend = '整体呈下降趋势，学习状态良好'
  } else {
    trend = '整体保持稳定'
  }
  
  return `近${period.value === 'week' ? '7' : '30'}天风险趋势：${trend}，平均风险指数${(avgScore * 100).toFixed(1)}%`
})

const goBack = () => {
  router.push('/dashboard')
}

const fetchTrendData = async () => {
  trendLoading.value = true
  try {
    const res = await evaluationApi.getRiskTrend(period.value)
    console.log('fetchTrendData response:', res)
    if (res.code === 200 && res.data) {
      trendData.value = res.data.trend || []
      summary.value = {
        level: res.data.summary.avgRiskScore < 0.3 ? '低风险' : 
               res.data.summary.avgRiskScore < 0.6 ? '中风险' : '高风险',
        levelType: res.data.summary.avgRiskScore < 0.3 ? 'success' : 
                   res.data.summary.avgRiskScore < 0.6 ? 'warning' : 'danger',
        avgRiskScore: res.data.summary.avgRiskScore
      }
    }
  } catch (error) {
    console.error('获取趋势数据失败', error)
    ElMessage.error('获取趋势数据失败')
  } finally {
    trendLoading.value = false
  }
}

const fetchDetailedMetrics = async () => {
  try {
    const res = await evaluationApi.getDetailedMetrics()
    if (res.code === 200 && res.data) {
      metricsTable.value = res.data.metricsTable || []
      improvementSuggestions.value = res.data.improvementSuggestions || []
      
      const completionMetric = res.data.metricsTable?.find(m => m.name === '完成率')
      const timeMetric = res.data.metricsTable?.find(m => m.name === '时间偏差')
      const scoreMetric = res.data.metricsTable?.find(m => m.name === '正确率')
      
      metrics.value = {
        completionRate: parseInt(completionMetric?.current) || 0,
        timeDeviation: parseInt(timeMetric?.current) || 0,
        avgScore: parseInt(scoreMetric?.current) || 0
      }
    }
  } catch (error) {
    console.error('获取详细指标失败', error)
  }
}

const initChart = () => {
  if (!chartRef.value) {
    console.log('chartRef not ready')
    return
  }
  
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  chartInstance = echarts.init(chartRef.value)
  updateChart()
}

const updateChart = () => {
  if (!chartInstance || !trendData.value.length) {
    console.log('updateChart skipped:', { hasInstance: !!chartInstance, dataLength: trendData.value.length })
    return
  }

  console.log('trendData:', trendData.value)

  const dates = trendData.value.map(d => d.date ? d.date.slice(5) : '')
  const riskScores = trendData.value.map(d => Math.round((d.riskScore || 0) * 100))
  const completionRates = trendData.value.map(d => d.taskCount > 0 ? 100 : 0)
  const riskLevels = trendData.value.map(d => d.riskLevel || '未知')

  console.log('chart data:', { dates, riskScores, completionRates, riskLevels })

  const getRiskColor = (score) => {
    if (score < 30) return '#67c23a'
    if (score < 70) return '#e6a23c'
    return '#f56c6c'
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const dataIndex = params[0].dataIndex
        const date = trendData.value[dataIndex].date
        const riskScore = riskScores[dataIndex]
        const completionRate = completionRates[dataIndex]
        const riskLevel = riskLevels[dataIndex]
        
        return `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 8px;">${date}</div>
            <div style="margin-bottom: 4px;">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${getRiskColor(riskScore)};margin-right:8px;"></span>
              风险指数: ${riskScore}%
            </div>
            <div style="margin-bottom: 4px;">完成率: ${completionRate}%</div>
            <div>风险等级: ${riskLevel}</div>
          </div>
        `
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: {
        lineStyle: {
          color: '#dcdfe6'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '风险指数',
      min: 0,
      max: 100,
      axisLabel: {
        formatter: '{value}'
      },
      splitLine: {
        lineStyle: {
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: '风险指数',
        type: 'line',
        smooth: true,
        data: riskScores.map((score, index) => ({
          value: score,
          itemStyle: {
            color: getRiskColor(score)
          }
        })),
        lineStyle: {
          width: 3
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
          ])
        },
        markLine: {
          silent: true,
          data: [
            { 
              yAxis: 30, 
              lineStyle: { color: '#67c23a', type: 'dashed' }, 
              label: { formatter: '低风险线', position: 'end' }
            },
            { 
              yAxis: 70, 
              lineStyle: { color: '#f56c6c', type: 'dashed' }, 
              label: { formatter: '高风险线', position: 'end' }
            }
          ]
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }

  chartInstance.setOption(option)
  
  chartInstance.off('click')
  chartInstance.on('click', (params) => {
    if (params.componentType === 'series') {
      const dataIndex = params.dataIndex
      const selectedData = trendData.value[dataIndex]
      
      selectedDate.value = selectedData.date
      
      metrics.value = {
        completionRate: selectedData.taskCount > 0 ? 100 : 0,
        timeDeviation: 0,
        avgScore: selectedData.avgScore || 0
      }
      
      summary.value = {
        level: selectedData.riskLevel,
        levelType: selectedData.riskScore < 0.3 ? 'success' : 
                   selectedData.riskScore < 0.7 ? 'warning' : 'danger',
        avgRiskScore: selectedData.riskScore
      }
    }
  })
}

const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

watch(trendData, (newData) => {
  if (newData && newData.length > 0) {
    nextTick(() => {
      initChart()
    })
  }
})

onMounted(() => {
  fetchTrendData()
  fetchDetailedMetrics()
  window.addEventListener('resize', handleResize)
  
  if (timerStore.needRefresh) {
    timerStore.needRefresh = false
  }
})

let lastRunningState = timerStore.isRunning
watchEffect(() => {
  const currentRunning = timerStore.isRunning
  if (currentRunning !== lastRunningState && !currentRunning) {
    lastRunningState = currentRunning
    fetchTrendData()
    fetchDetailedMetrics()
  }
})

watch(() => timerStore.needRefresh, (newVal) => {
  if (newVal) {
    fetchTrendData()
    fetchDetailedMetrics()
    timerStore.needRefresh = false
  }
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.analysis-container {
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

.metrics-row {
  margin-bottom: 20px;
}

.metric-card {
  border-radius: 12px;
}

.metric-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #fff;
}

.metric-icon.risk-icon {
  background: linear-gradient(135deg, #f56c6c 0%, #f89898 100%);
}

.metric-icon.completion-icon {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
}

.metric-icon.time-icon {
  background: linear-gradient(135deg, #e6a23c 0%, #ebb563 100%);
}

.metric-icon.score-icon {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
}

.metric-info {
  flex: 1;
}

.metric-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 13px;
  color: #909399;
}

.chart-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.card-header .header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-loading,
.chart-empty {
  padding: 40px;
  text-align: center;
}

.chart-container {
  height: 350px;
}

.trend-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f0f9ff;
  border-radius: 8px;
  margin-top: 16px;
  color: #409eff;
  font-size: 14px;
}

.table-card,
.suggestions-card {
  border-radius: 12px;
  height: 400px;
}

.suggestions-list {
  max-height: 300px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 16px;
  margin-bottom: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border-left: 3px solid #409eff;
}

.suggestion-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.suggestion-category {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.suggestion-content {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.suggestion-reason {
  font-size: 12px;
  color: #909399;
}
</style>
