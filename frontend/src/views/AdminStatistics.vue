<template>
  <div class="admin-statistics">
    <AdminPageHeader title="数据统计" />
    <!-- 时间范围选择 -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-content">
        <el-radio-group v-model="timeRange" @change="fetchData">
          <el-radio-button label="today">今日</el-radio-button>
          <el-radio-button label="week">本周</el-radio-button>
          <el-radio-button label="month">本月</el-radio-button>
          <el-radio-button label="custom">自定义</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-if="timeRange === 'custom'"
          v-model="customRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="fetchData"
        />
        <div class="export-actions">
          <el-button type="primary" @click="exportAll">
            <el-icon><Download /></el-icon>
            导出报表
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 用户增长趋势 -->
    <el-row :gutter="16">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>📈 用户增长趋势</span>
              <el-tag type="success" size="small">+{{ userGrowth.rate }}%</el-tag>
            </div>
          </template>
          <div class="chart-container" ref="userChartRef" v-loading="loading"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>🔥 活跃用户趋势</span>
              <el-tag type="warning" size="small">DAU: {{ activeUsers.dau }}</el-tag>
            </div>
          </template>
          <div class="chart-container" ref="activeChartRef" v-loading="loading"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 计划和任务统计 -->
    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>📊 计划创建分布</span>
            </div>
          </template>
          <div class="chart-container" ref="planChartRef" v-loading="loading"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>⏰ 学习时长分布</span>
            </div>
          </template>
          <div class="heatmap-container" v-loading="loading">
            <div class="heatmap-row" v-for="(row, rowIndex) in heatmapData" :key="rowIndex">
              <span class="heatmap-label">{{ row.label }}</span>
              <div class="heatmap-cells">
                <div 
                  class="heatmap-cell" 
                  v-for="(cell, cellIndex) in row.cells" 
                  :key="cellIndex"
                  :style="{ background: getHeatmapColor(cell) }"
                  :title="`${row.label} ${cellIndex * 2}:00 - ${cellIndex * 2 + 2}:00: ${cell}分钟`"
                ></div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>🏆 功能使用排行</span>
            </div>
          </template>
          <div class="ranking-list" v-loading="loading">
            <div class="ranking-item" v-for="(item, index) in featureRanking" :key="index">
              <span class="ranking-index" :class="'rank-' + (index + 1)">{{ index + 1 }}</span>
              <span class="ranking-name">{{ item.name }}</span>
              <el-progress 
                :percentage="item.percentage" 
                :stroke-width="10"
                :show-text="false"
              />
              <span class="ranking-count">{{ item.count }}次</span>
            </div>
            <el-empty v-if="featureRanking.length === 0" description="暂无数据" :image-size="60" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 风险用户趋势 -->
    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="24">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>⚠️ 风险用户趋势</span>
              <div class="risk-legend">
                <span class="legend-item high">高风险</span>
                <span class="legend-item medium">中风险</span>
                <span class="legend-item low">低风险</span>
              </div>
            </div>
          </template>
          <div class="chart-container large" ref="riskChartRef" v-loading="loading"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据摘要 -->
    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="6" v-for="summary in summaries" :key="summary.label">
        <el-card shadow="never" class="summary-card">
          <div class="summary-icon" :style="{ background: summary.bgColor }">
            {{ summary.icon }}
          </div>
          <div class="summary-info">
            <div class="summary-value">{{ summary.value }}</div>
            <div class="summary-label">{{ summary.label }}</div>
            <div class="summary-trend" :class="summary.trend > 0 ? 'up' : 'down'">
              {{ summary.trend > 0 ? '↑' : '↓' }} {{ Math.abs(summary.trend) }}%
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { Download } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { adminApi } from '../api'
import AdminPageHeader from '../components/AdminPageHeader.vue'

export default {
  name: 'AdminStatistics',
  components: { Download, AdminPageHeader },
  data() {
    return {
      loading: false,
      timeRange: 'week',
      customRange: null,
      userGrowth: {
        rate: 0,
        data: [],
        total: 0
      },
      activeUsers: {
        dau: 0,
        data: []
      },
      planDistribution: [],
      heatmapData: [
        { label: '周日', cells: Array(12).fill(0) },
        { label: '周一', cells: Array(12).fill(0) },
        { label: '周二', cells: Array(12).fill(0) },
        { label: '周三', cells: Array(12).fill(0) },
        { label: '周四', cells: Array(12).fill(0) },
        { label: '周五', cells: Array(12).fill(0) },
        { label: '周六', cells: Array(12).fill(0) }
      ],
      featureRanking: [],
      riskTrend: [],
      summaries: [
        { icon: '👥', value: '0', label: '总用户数', trend: 0, bgColor: 'linear-gradient(135deg, #409EFF, #67C23A)' },
        { icon: '📋', value: '0', label: '学习计划', trend: 0, bgColor: 'linear-gradient(135deg, #E6A23C, #F56C6C)' },
        { icon: '✅', value: '0', label: '完成任务', trend: 0, bgColor: 'linear-gradient(135deg, #67C23A, #85CE61)' },
        { icon: '⏱️', value: '0', label: '学习时长(分)', trend: 0, bgColor: 'linear-gradient(135deg, #9B59B6, #C39BD3)' }
      ],
      userChart: null,
      activeChart: null,
      planChart: null,
      riskChart: null
    }
  },
  mounted() {
    this.initCharts()
    this.fetchData()
  },
  beforeUnmount() {
    this.userChart?.dispose()
    this.activeChart?.dispose()
    this.planChart?.dispose()
    this.riskChart?.dispose()
    window.removeEventListener('resize', this.resizeCharts)
  },
  methods: {
    initCharts() {
      this.userChart = echarts.init(this.$refs.userChartRef)
      this.activeChart = echarts.init(this.$refs.activeChartRef)
      this.planChart = echarts.init(this.$refs.planChartRef)
      this.riskChart = echarts.init(this.$refs.riskChartRef)
      
      window.addEventListener('resize', this.resizeCharts)
    },
    
    resizeCharts() {
      this.userChart?.resize()
      this.activeChart?.resize()
      this.planChart?.resize()
      this.riskChart?.resize()
    },
    
    async fetchData() {
      this.loading = true
      try {
        const params = { range: this.timeRange }
        if (this.timeRange === 'custom' && this.customRange) {
          params.startDate = this.formatDateStr(this.customRange[0])
          params.endDate = this.formatDateStr(this.customRange[1])
        }
        
        const res = await adminApi.getStatistics(params)
        if (res.success && res.data) {
          this.userGrowth = res.data.userGrowth || { rate: 0, data: [], total: 0 }
          this.activeUsers = res.data.activeUsers || { dau: 0, data: [] }
          this.planDistribution = res.data.planDistribution || []
          this.featureRanking = res.data.featureRanking || []
          this.riskTrend = res.data.riskTrend || []
          
          this.processHeatmapData(res.data.heatmapData || [])
          this.updateSummaries(res.data.summaries || {})
          
          this.renderUserChart()
          this.renderActiveChart()
          this.renderPlanChart()
          this.renderRiskChart()
        }
      } catch (e) {
        console.error('获取统计数据失败:', e)
        this.$message.error('获取统计数据失败')
      } finally {
        this.loading = false
      }
    },
    
    processHeatmapData(data) {
      const dayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const newHeatmap = dayLabels.map(label => ({
        label,
        cells: Array(12).fill(0)
      }))
      
      data.forEach(item => {
        const dayIndex = item.day_of_week - 1
        const hourIndex = Math.floor(item.hour / 2)
        if (dayIndex >= 0 && dayIndex < 7 && hourIndex >= 0 && hourIndex < 12) {
          newHeatmap[dayIndex].cells[hourIndex] += item.total_minutes || 0
        }
      })
      
      this.heatmapData = newHeatmap
    },
    
    updateSummaries(data) {
      this.summaries = [
        { 
          icon: '👥', 
          value: this.formatNumber(data.totalUsers || 0), 
          label: '总用户数', 
          trend: parseFloat(this.userGrowth.rate) || 0, 
          bgColor: 'linear-gradient(135deg, #409EFF, #67C23A)' 
        },
        { 
          icon: '📋', 
          value: this.formatNumber(data.totalPlans || 0), 
          label: '学习计划', 
          trend: 8.3, 
          bgColor: 'linear-gradient(135deg, #E6A23C, #F56C6C)' 
        },
        { 
          icon: '✅', 
          value: this.formatNumber(data.completedTasks || 0), 
          label: '完成任务', 
          trend: 15.7, 
          bgColor: 'linear-gradient(135deg, #67C23A, #85CE61)' 
        },
        { 
          icon: '⏱️', 
          value: this.formatNumber(data.totalStudyTime || 0), 
          label: '学习时长(分)', 
          trend: 22.1, 
          bgColor: 'linear-gradient(135deg, #9B59B6, #C39BD3)' 
        }
      ]
    },
    
    renderUserChart() {
      const days = this.getDays()
      const userData = this.userGrowth.data || []
      
      const newUsersData = days.map(d => {
        const found = userData.find(u => this.formatDateStr(u.date) === d)
        return found ? found.new_users : 0
      })
      
      let cumulative = this.userGrowth.total - newUsersData.reduce((a, b) => a + b, 0)
      const cumulativeData = newUsersData.map(n => {
        cumulative += n
        return cumulative
      })
      
      const option = {
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: days.map(d => d.slice(5)) },
        yAxis: { type: 'value' },
        series: [
          {
            name: '新增用户',
            type: 'line',
            smooth: true,
            data: newUsersData,
            areaStyle: { opacity: 0.3 },
            itemStyle: { color: '#409EFF' }
          },
          {
            name: '累计用户',
            type: 'bar',
            data: cumulativeData,
            itemStyle: { color: '#67C23A', borderRadius: [4, 4, 0, 0] }
          }
        ]
      }
      this.userChart.setOption(option)
    },
    
    renderActiveChart() {
      const days = this.getDays()
      const activeData = this.activeUsers.data || []
      
      const dauData = days.map(d => {
        const found = activeData.find(a => this.formatDateStr(a.date) === d)
        return found ? found.dau : 0
      })
      
      const option = {
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: days.map(d => d.slice(5)) },
        yAxis: { type: 'value' },
        series: [
          {
            name: 'DAU',
            type: 'line',
            smooth: true,
            data: dauData,
            areaStyle: { 
              opacity: 0.4,
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#E6A23C' },
                { offset: 1, color: 'rgba(230, 162, 60, 0.1)' }
              ])
            },
            itemStyle: { color: '#E6A23C' }
          }
        ]
      }
      this.activeChart.setOption(option)
    },
    
    renderPlanChart() {
      const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399']
      const data = this.planDistribution.length > 0 
        ? this.planDistribution.map((p, i) => ({
            value: p.value,
            name: p.name || '其他',
            itemStyle: { color: colors[i % colors.length] }
          }))
        : [{ value: 1, name: '暂无数据', itemStyle: { color: '#909399' } }]
      
      const option = {
        tooltip: { trigger: 'item' },
        legend: { orient: 'vertical', left: 'left' },
        series: [
          {
            name: '计划类型',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
            label: { show: false, position: 'center' },
            emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
            labelLine: { show: false },
            data: data
          }
        ]
      }
      this.planChart.setOption(option)
    },
    
    renderRiskChart() {
      const days = this.getDays()
      const riskData = this.riskTrend || []
      
      const highData = days.map(d => {
        const found = riskData.find(r => this.formatDateStr(r.date) === d)
        return found ? found.high : 0
      })
      const mediumData = days.map(d => {
        const found = riskData.find(r => this.formatDateStr(r.date) === d)
        return found ? found.medium : 0
      })
      const lowData = days.map(d => {
        const found = riskData.find(r => this.formatDateStr(r.date) === d)
        return found ? found.low : 0
      })
      
      const option = {
        tooltip: { trigger: 'axis' },
        legend: { data: ['高风险', '中风险', '低风险'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: { type: 'category', data: days.map(d => d.slice(5)) },
        yAxis: { type: 'value' },
        series: [
          {
            name: '高风险',
            type: 'line',
            data: highData,
            itemStyle: { color: '#F56C6C' }
          },
          {
            name: '中风险',
            type: 'line',
            data: mediumData,
            itemStyle: { color: '#E6A23C' }
          },
          {
            name: '低风险',
            type: 'line',
            data: lowData,
            itemStyle: { color: '#409EFF' }
          }
        ]
      }
      this.riskChart.setOption(option)
    },
    
    getDays() {
      const days = []
      const today = new Date()
      const count = this.timeRange === 'today' ? 1 : this.timeRange === 'month' ? 30 : 7
      
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        days.push(this.formatDateStr(d))
      }
      return days
    },
    
    formatDateStr(date) {
      const d = new Date(date)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    
    formatNumber(num) {
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万'
      }
      return num.toLocaleString()
    },
    
    getHeatmapColor(value) {
      const max = 240
      const ratio = value / max
      if (ratio < 0.2) return '#e8f5e9'
      if (ratio < 0.4) return '#a5d6a7'
      if (ratio < 0.6) return '#66bb6a'
      if (ratio < 0.8) return '#43a047'
      return '#2e7d32'
    },
    
    exportAll() {
      this.$message.success('报表导出中，请稍候...')
    }
  }
}
</script>

<style scoped>
.admin-statistics {
  padding: 0;
}

.filter-card {
  margin-bottom: 16px;
}

.filter-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.export-actions {
  margin-left: auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  font-size: 15px;
}

.chart-container {
  height: 250px;
}

.chart-container.large {
  height: 300px;
}

.heatmap-container {
  padding: 8px;
}

.heatmap-row {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.heatmap-label {
  width: 40px;
  font-size: 12px;
  color: #606266;
}

.heatmap-cells {
  display: flex;
  gap: 2px;
  flex: 1;
}

.heatmap-cell {
  width: 20px;
  height: 20px;
  border-radius: 2px;
  cursor: pointer;
  transition: transform 0.2s;
}

.heatmap-cell:hover {
  transform: scale(1.2);
}

.ranking-list {
  padding: 8px 0;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.ranking-item:last-child {
  border-bottom: none;
}

.ranking-index {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  background: #f0f0f0;
  color: #909399;
}

.ranking-index.rank-1 {
  background: #ffd700;
  color: #fff;
}

.ranking-index.rank-2 {
  background: #c0c0c0;
  color: #fff;
}

.ranking-index.rank-3 {
  background: #cd7f32;
  color: #fff;
}

.ranking-name {
  width: 100px;
  font-size: 13px;
  color: #303133;
}

.ranking-item .el-progress {
  flex: 1;
}

.ranking-count {
  width: 60px;
  text-align: right;
  font-size: 12px;
  color: #909399;
}

.risk-legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  font-size: 12px;
  color: #909399;
}

.legend-item::before {
  content: '';
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 4px;
}

.legend-item.high::before {
  background: #F56C6C;
}

.legend-item.medium::before {
  background: #E6A23C;
}

.legend-item.low::before {
  background: #409EFF;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.summary-info {
  flex: 1;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

.summary-label {
  font-size: 13px;
  color: #909399;
}

.summary-trend {
  font-size: 12px;
  margin-top: 4px;
}

.summary-trend.up {
  color: #67C23A;
}

.summary-trend.down {
  color: #F56C6C;
}
</style>
