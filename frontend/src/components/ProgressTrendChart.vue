<template>
  <div class="progress-trend-chart">
    <div ref="chartRef" class="chart-container"></div>
    <div v-if="!progressData" class="chart-empty">
      <el-empty description="暂无进度数据" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import echarts from '../utils/echarts'

const props = defineProps({
  planId: {
    type: [Number, String],
    required: true
  },
  progressData: {
    type: Object,
    default: null
  }
})

const chartRef = ref(null)
let chartInstance = null

const initChart = () => {
  if (!chartRef.value || !props.progressData) return

  if (chartInstance) {
    chartInstance.dispose()
  }

  chartInstance = echarts.init(chartRef.value)

  const { planned, actual, totalTasks } = props.progressData

  const plannedDates = planned.map(item => item.date)
  const plannedCounts = planned.map(item => item.count)
  const actualDates = actual.map(item => item.date)
  const actualCounts = actual.map(item => item.count)

  const allDates = [...new Set([...plannedDates, ...actualDates])].sort()

  const option = {
    title: {
      text: '进度趋势',
      left: 'center',
      textStyle: {
        fontSize: 16,
        color: '#303133'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        let result = `<div style="font-weight:500">${params[0].axisValue}</div>`
        params.forEach(param => {
          result += `<div style="display:flex;align-items:center;gap:8px;margin-top:4px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${param.color}"></span>
            <span>${param.seriesName}: ${param.value} 个任务</span>
          </div>`
        })
        return result
      }
    },
    legend: {
      data: ['计划进度', '实际进度'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: allDates,
      axisLabel: {
        formatter: (value) => {
          const date = new Date(value)
          return `${date.getMonth() + 1}/${date.getDate()}`
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '累计完成任务',
      min: 0,
      max: totalTasks || 10,
      axisLine: {
        show: false
      },
      splitLine: {
        lineStyle: {
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: '计划进度',
        type: 'line',
        data: allDates.map(date => {
          const item = planned.find(p => p.date === date)
          return item ? item.count : null
        }),
        smooth: true,
        lineStyle: {
          color: '#C0C4CC',
          width: 2,
          type: 'dashed'
        },
        itemStyle: {
          color: '#C0C4CC'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(192, 196, 204, 0.3)' },
            { offset: 1, color: 'rgba(192, 196, 204, 0.05)' }
          ])
        }
      },
      {
        name: '实际进度',
        type: 'line',
        data: allDates.map(date => {
          const item = actual.find(a => a.date === date)
          return item ? item.count : null
        }),
        smooth: true,
        lineStyle: {
          color: '#409EFF',
          width: 3
        },
        itemStyle: {
          color: '#409EFF'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
          ])
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            borderWidth: 3,
            borderColor: '#fff'
          }
        }
      }
    ]
  }

  chartInstance.setOption(option)
}

const handleResize = () => {
  chartInstance?.resize()
}

watch(() => props.progressData, () => {
  initChart()
}, { deep: true })

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped>
.progress-trend-chart {
  padding: 20px;
}

.chart-container {
  width: 100%;
  height: 400px;
}

.chart-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}
</style>
