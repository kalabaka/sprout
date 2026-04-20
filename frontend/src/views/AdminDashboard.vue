<template>
  <div class="admin-dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="8" :md="6" :lg="4" v-for="stat in stats" :key="stat.key">
        <el-card shadow="hover" class="stat-card" @click="handleStatClick(stat)">
          <div class="stat-header">
            <div class="stat-icon" :style="{ background: stat.bgColor }">
              {{ stat.icon }}
            </div>
            <div class="stat-trend" :class="stat.trend > 0 ? 'up' : 'down'" v-if="stat.trend !== undefined">
              {{ stat.trend > 0 ? '+' : '' }}{{ stat.trend }}%
            </div>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
          <div class="stat-sparkline" v-if="stat.sparkline">
            <svg viewBox="0 0 100 30" class="sparkline">
              <polyline
                :points="stat.sparkline"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              />
            </svg>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="16">
      <el-col :span="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>干预效果趋势</span>
              <el-radio-group v-model="chartRange" size="small">
                <el-radio-button label="7">近7天</el-radio-button>
                <el-radio-button label="30">近30天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container">
            <el-table :data="interventionData" style="width: 100%">
              <el-table-column prop="date" label="日期" width="120" />
              <el-table-column prop="total" label="发送数" width="100">
                <template #default="{ row }">
                  <el-tag type="info" size="small">{{ row.total }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="adopted" label="采纳数" width="100">
                <template #default="{ row }">
                  <el-tag type="success" size="small">{{ row.adopted }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="ignored" label="忽略数" width="100">
                <template #default="{ row }">
                  <el-tag type="danger" size="small">{{ row.ignored }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="采纳率">
                <template #default="{ row }">
                  <el-progress 
                    :percentage="row.total > 0 ? Math.round(row.adopted / row.total * 100) : 0" 
                    :stroke-width="8"
                    :color="getProgressColor(row.total > 0 ? Math.round(row.adopted / row.total * 100) : 0)"
                  />
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <ActivityStream />
      </el-col>
    </el-row>

    <!-- 快速操作 -->
    <el-row :gutter="16" class="action-row">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>快速操作</span>
            </div>
          </template>
          <div class="quick-actions">
            <el-button type="primary" @click="$router.push('/admin/users')">
              <el-icon><User /></el-icon>
              用户管理
            </el-button>
            <el-button type="success" @click="$router.push('/admin/plans')">
              <el-icon><Notebook /></el-icon>
              学习计划
            </el-button>
            <el-button type="warning" @click="$router.push('/admin/risk-users')">
              <el-icon><Warning /></el-icon>
              风险用户
            </el-button>
            <el-button type="info" @click="$router.push('/admin/feedback')">
              <el-icon><ChatDotSquare /></el-icon>
              用户反馈
            </el-button>
            <el-button @click="refreshStats">
              <el-icon><Refresh /></el-icon>
              刷新数据
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { User, Notebook, Warning, ChatDotSquare, Refresh } from '@element-plus/icons-vue'
import { adminApi } from '../api'
import ActivityStream from '../components/ActivityStream.vue'

export default {
  name: 'AdminDashboard',
  components: { User, Notebook, Warning, ChatDotSquare, Refresh, ActivityStream },
  data() {
    return {
      chartRange: '7',
      stats: [],
      interventionData: [],
      rawData: {
        totalUsers: 0,
        todayActive: 0,
        activePlans: 0,
        riskUsers: { high: 0, medium: 0, low: 0 },
        pendingFeedback: 0,
        completedTasks: 0
      }
    }
  },
  mounted() {
    this.fetchStats()
    this.fetchInterventions()
  },
  methods: {
    async fetchStats() {
      try {
        const res = await adminApi.getStats()
        const data = res.data || {}
        this.rawData = {
          totalUsers: data.totalUsers || 0,
          todayActive: data.todayActive || data.todayUsers || 0,
          activePlans: data.activePlans || data.totalPlans || 0,
          riskUsers: data.riskUsers || { high: 0, medium: 0, low: 0 },
          pendingFeedback: data.pendingFeedback || 0,
          completedTasks: data.completedTasks || 0
        }
        
        const totalRisk = (this.rawData.riskUsers.high || 0) + 
                          (this.rawData.riskUsers.medium || 0) + 
                          (this.rawData.riskUsers.low || 0)
        
        this.stats = [
          { 
            key: 'totalUsers',
            icon: '👥', 
            value: this.rawData.totalUsers, 
            label: '总用户数', 
            bgColor: 'linear-gradient(135deg, #409EFF, #67C23A)',
            trend: 5.2,
            sparkline: '10,15 20,12 30,18 40,22 50,20 60,25 70,28',
            route: '/admin/users'
          },
          { 
            key: 'todayActive',
            icon: '🔥', 
            value: this.rawData.todayActive, 
            label: '今日活跃', 
            bgColor: 'linear-gradient(135deg, #E6A23C, #F56C6C)',
            trend: 12.3,
            sparkline: '10,20 20,15 30,25 40,18 50,22 60,28 70,30',
            route: '/admin/users'
          },
          { 
            key: 'activePlans',
            icon: '📋', 
            value: this.rawData.activePlans, 
            label: '进行中计划', 
            bgColor: 'linear-gradient(135deg, #67C23A, #85CE61)',
            trend: 3.1,
            route: '/admin/plans'
          },
          { 
            key: 'riskUsers',
            icon: '⚠️', 
            value: totalRisk, 
            label: '风险用户', 
            bgColor: 'linear-gradient(135deg, #F56C6C, #E6A23C)',
            trend: -2.5,
            route: '/admin/risk-users',
            detail: `高${this.rawData.riskUsers.high || 0}/中${this.rawData.riskUsers.medium || 0}/低${this.rawData.riskUsers.low || 0}`
          },
          { 
            key: 'pendingFeedback',
            icon: '💬', 
            value: this.rawData.pendingFeedback, 
            label: '待处理反馈', 
            bgColor: 'linear-gradient(135deg, #9B59B6, #C39BD3)',
            route: '/admin/feedback'
          },
          { 
            key: 'completedTasks',
            icon: '✅', 
            value: this.rawData.completedTasks, 
            label: '完成任务', 
            bgColor: 'linear-gradient(135deg, #00BCD4, #4DD0E1)',
            trend: 8.7,
            sparkline: '10,10 20,15 30,12 40,20 50,18 60,25 70,30',
            route: '/admin/statistics'
          }
        ]
      } catch (e) {
        console.error('获取统计数据失败:', e)
        this.initDefaultStats()
      }
    },
    
    initDefaultStats() {
      this.stats = [
        { key: 'totalUsers', icon: '👥', value: 0, label: '总用户数', bgColor: 'linear-gradient(135deg, #409EFF, #67C23A)', route: '/admin/users' },
        { key: 'todayActive', icon: '🔥', value: 0, label: '今日活跃', bgColor: 'linear-gradient(135deg, #E6A23C, #F56C6C)', route: '/admin/users' },
        { key: 'activePlans', icon: '📋', value: 0, label: '进行中计划', bgColor: 'linear-gradient(135deg, #67C23A, #85CE61)', route: '/admin/plans' },
        { key: 'riskUsers', icon: '⚠️', value: 0, label: '风险用户', bgColor: 'linear-gradient(135deg, #F56C6C, #E6A23C)', route: '/admin/risk-users' },
        { key: 'pendingFeedback', icon: '💬', value: 0, label: '待处理反馈', bgColor: 'linear-gradient(135deg, #9B59B6, #C39BD3)', route: '/admin/feedback' },
        { key: 'completedTasks', icon: '✅', value: 0, label: '完成任务', bgColor: 'linear-gradient(135deg, #00BCD4, #4DD0E1)', route: '/admin/statistics' }
      ]
    },
    
    async fetchInterventions() {
      try {
        const res = await adminApi.getInterventions(parseInt(this.chartRange))
        this.interventionData = res.data || []
      } catch (e) {
        console.error('获取干预数据失败:', e)
        this.interventionData = []
      }
    },
    
    handleStatClick(stat) {
      if (stat.route) {
        this.$router.push(stat.route)
      }
    },
    
    getProgressColor(percentage) {
      if (percentage >= 80) return '#67C23A'
      if (percentage >= 50) return '#E6A23C'
      return '#F56C6C'
    },
    
    refreshStats() {
      this.fetchStats()
      this.fetchInterventions()
      this.$message.success('数据已刷新')
    }
  },
  watch: {
    chartRange() {
      this.fetchInterventions()
    }
  }
}
</script>

<style scoped>
.admin-dashboard {
  padding: 0;
}

.stats-row {
  margin-bottom: 16px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-trend {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
}

.stat-trend.up {
  color: #67C23A;
  background: #f0f9eb;
}

.stat-trend.down {
  color: #F56C6C;
  background: #fef0f0;
}

.stat-info {
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.stat-sparkline {
  height: 30px;
  margin-top: 8px;
}

.sparkline {
  width: 100%;
  height: 100%;
  color: #409EFF;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  font-size: 15px;
}

.chart-container {
  min-height: 200px;
}

.action-row {
  margin-top: 16px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.quick-actions .el-button {
  flex: 1;
  min-width: 120px;
}

@media (max-width: 768px) {
  .stat-value {
    font-size: 22px;
  }
  
  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
}
</style>
