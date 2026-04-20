<template>
  <div class="plan-page">
    <div class="header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🌱%3C/text%3E%3C/svg%3E" alt="logo" class="logo" />
        <h1>新芽学习规划系统</h1>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="goToDashboard">
          <el-icon><DataAnalysis /></el-icon>
          数据分析
        </el-button>
        <el-button @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          退出
        </el-button>
      </div>
    </div>

    <div class="content">
      <div class="welcome-section">
        <h2>我的学习计划</h2>
        <p>制定目标，智能规划，高效学习</p>
      </div>

      <div class="toolbar">
        <div class="toolbar-left">
          <el-radio-group v-model="filterType" size="large" @change="handleFilterChange">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="skill">📚 学习</el-radio-button>
            <el-radio-button value="exam">📝 复习</el-radio-button>
          </el-radio-group>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" size="large" :disabled="!canCreate" @click="showCreateDialog = true">
            <el-icon><Plus /></el-icon>
            创建学习计划
          </el-button>
          <p v-if="!canCreate" class="limit-tip">{{ limitReason }}</p>
        </div>
      </div>

      <el-skeleton :rows="3" animated v-if="loading" />

      <el-empty v-else-if="filteredPlans.length === 0" description="暂无学习计划">
        <el-button type="primary" :disabled="!canCreate" @click="showCreateDialog = true">
          立即创建
        </el-button>
        <p v-if="!canCreate" class="limit-tip">{{ limitReason }}</p>
      </el-empty>

      <div v-else class="plan-grid">
        <el-card
          v-for="plan in filteredPlans"
          :key="plan.id"
          shadow="hover"
          class="plan-card"
          @click="goToTasks(plan.id)"
        >
          <div class="card-header">
            <div class="type-badge">
              <el-tag 
                :type="getTypeTagType(plan.goal_type)" 
                :color="getTypeTagColor(plan.goal_type)"
                effect="plain"
                size="small"
              >
                {{ getTypeTagText(plan.goal_type) }}
              </el-tag>
            </div>
            <el-tag size="small" :type="getStatusType(plan.status)">
              {{ getStatusText(plan.status) }}
            </el-tag>
          </div>

          <div class="card-body">
            <h3 class="plan-name">{{ plan.name }}</h3>
            <p class="plan-goal">{{ plan.goal || '暂无目标描述' }}</p>

            <div class="progress-section">
              <div class="progress-info">
                <span>学习进度</span>
                <span class="progress-percent">{{ plan.taskStats?.completed || 0 }}/{{ plan.taskStats?.total || 0 }}</span>
              </div>
              <el-progress
                :percentage="getProgressPercent(plan)"
                :stroke-width="8"
                :show-text="false"
                :color="getProgressColor(plan)"
              />
            </div>

            <div class="card-meta">
              <template v-if="plan.goal_type === 'exam' && plan.target_date">
                <span class="exam-info">
                  <el-icon><Calendar /></el-icon>
                  考试日期 {{ formatDate(plan.target_date) }}
                </span>
                <span class="days-remaining" :class="{ urgent: getDaysRemaining(plan) <= 7 }">
                  剩余 {{ getDaysRemaining(plan) }} 天
                </span>
              </template>
              <template v-else>
                <span v-if="plan.target_date">
                  <el-icon><Calendar /></el-icon>
                  {{ formatDate(plan.target_date) }}
                </span>
                <span>
                  <el-icon><Document /></el-icon>
                  {{ plan.taskStats?.total || 0 }}个任务
                </span>
              </template>
            </div>
          </div>

          <div class="card-footer">
            <span class="create-time">创建于 {{ formatDate(plan.created_at) }}</span>
            <div class="footer-actions">
              <el-button
                v-if="plan.status === 'active'"
                type="warning"
                size="small"
                text
                @click.stop="pausePlan(plan)"
              >
                暂停
              </el-button>
              <el-button
                v-else-if="plan.status === 'paused'"
                type="success"
                size="small"
                text
                @click.stop="resumePlan(plan)"
              >
                恢复
              </el-button>
              <el-button
                type="primary"
                size="small"
                text
                @click.stop="replanPlan(plan)"
              >
                重新规划
              </el-button>
              <el-button
                type="danger"
                size="small"
                text
                @click.stop="deletePlan(plan.id)"
              >
                删除
              </el-button>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <CreatePlanWizard
      v-model="showCreateDialog"
      @success="handleCreateSuccess"
    />

    <el-dialog
      v-model="showReplanDialog"
      title="正在重新规划"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <div class="replan-loading">
        <div class="replan-spinner"></div>
        <h3>正在为您智能规划中...</h3>
        <p class="replan-tip">AI 正在分析您的学习情况，请稍候</p>
        
        <div class="replan-timer">
          <el-icon><Clock /></el-icon>
          <span>已等待</span>
          <span class="timer-value">{{ formattedReplanTime }}</span>
        </div>
        
        <div class="replan-steps">
          <div class="step" :class="{ active: replanCurrentStep >= 1, done: replanCurrentStep > 1 }">
            <span class="step-icon">{{ replanCurrentStep > 1 ? '✓' : '1' }}</span>
            <span class="step-text">分析学习进度</span>
          </div>
          <div class="step" :class="{ active: replanCurrentStep >= 2, done: replanCurrentStep > 2 }">
            <span class="step-icon">{{ replanCurrentStep > 2 ? '✓' : '2' }}</span>
            <span class="step-text">生成学习路径</span>
          </div>
          <div class="step" :class="{ active: replanCurrentStep >= 3 }">
            <span class="step-icon">3</span>
            <span class="step-text">优化任务安排</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { planApi } from '../api'
import { removeToken } from '../utils/token'
import CreatePlanWizard from '../components/CreatePlanWizard.vue'
import { Clock, ArrowLeft } from '@element-plus/icons-vue'

export default {
  name: 'PlanList',
  components: {
    CreatePlanWizard,
    Clock
  },
  data() {
    return {
      loading: false,
      plans: [],
      showCreateDialog: false,
      filterType: 'all',
      canCreate: true,
      limitReason: '',
      limitCounts: { total: 0, active: 0 },
      showReplanDialog: false,
      replanPlanId: null,
      replanning: false,
      replanElapsedTime: 0,
      replanCurrentStep: 1
    }
  },
  computed: {
    filteredPlans() {
      if (this.filterType === 'all') {
        return this.plans
      }
      return this.plans.filter(plan => {
        if (this.filterType === 'exam') {
          return plan.goal_type === 'exam'
        }
        return plan.goal_type !== 'exam'
      })
    },
    createButtonText() {
      if (!this.canCreate) {
        return this.limitReason
      }
      return '创建学习计划'
    },
    formattedReplanTime() {
      const minutes = Math.floor(this.replanElapsedTime / 60)
      const seconds = this.replanElapsedTime % 60
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
  },
  mounted() {
    this.fetchPlans()
    this.checkCreateLimit()
  },
  beforeUnmount() {
    this.stopReplanTimer()
  },
  methods: {
    startReplanTimer() {
      this.replanElapsedTime = 0
      this.replanCurrentStep = 1
      this.replanTimer = setInterval(() => {
        this.replanElapsedTime++
      }, 1000)
      this.replanStepTimer = setInterval(() => {
        if (this.replanCurrentStep < 3) {
          this.replanCurrentStep++
        }
      }, 5000)
    },
    stopReplanTimer() {
      if (this.replanTimer) {
        clearInterval(this.replanTimer)
        this.replanTimer = null
      }
      if (this.replanStepTimer) {
        clearInterval(this.replanStepTimer)
        this.replanStepTimer = null
      }
    },
    async checkCreateLimit() {
      try {
        const res = await planApi.checkCreateLimit()
        if (res.code === 200 && res.data) {
          this.canCreate = res.data.canCreate
          this.limitReason = res.data.reason || ''
          this.limitCounts = res.data.counts || { total: 0, active: 0 }
        }
      } catch (error) {
        console.error('检查创建限制失败:', error)
      }
    },
    async fetchPlans() {
      this.loading = true
      try {
        const res = await planApi.getPlans()
        this.plans = res.data || []
      } catch (error) {
        console.error('获取计划失败:', error)
        this.$message.error('加载失败')
      } finally {
        this.loading = false
      }
    },
    handleFilterChange() {
    },
    getTypeTagType(goalType) {
      return undefined
    },
    getTypeTagColor(goalType) {
      const colors = {
        exam: '#E6A23C',
        skill: '#409EFF',
        course: '#67C23A',
        other: '#909399'
      }
      return colors[goalType] || colors.skill
    },
    getTypeTagText(goalType) {
      const texts = {
        exam: '📝 复习',
        skill: '📚 学习',
        course: '🔧 技能',
        other: '📋 其他'
      }
      return texts[goalType] || '📚 学习'
    },
    getStatusType(status) {
      const map = {
        'draft': 'info',
        'active': 'primary',
        'paused': 'warning',
        'completed': 'success',
        'archived': 'info'
      }
      return map[status] || 'info'
    },
    getStatusText(status) {
      const texts = {
        'draft': '草稿',
        'active': '进行中',
        'paused': '已暂停',
        'completed': '已完成',
        'archived': '已归档'
      }
      return texts[status] || '未知'
    },
    getProgressPercent(plan) {
      const total = plan.taskStats?.total || 0
      const completed = plan.taskStats?.completed || 0
      if (total === 0) return 0
      return Math.round((completed / total) * 100)
    },
    getProgressColor(plan) {
      const percent = this.getProgressPercent(plan)
      if (percent >= 80) return '#67C23A'
      if (percent >= 50) return '#E6A23C'
      return '#409EFF'
    },
    getDaysRemaining(plan) {
      if (!plan.target_date) return 0
      const targetDate = new Date(plan.target_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      targetDate.setHours(0, 0, 0, 0)
      const diff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24))
      return Math.max(0, diff)
    },
    formatDate(date) {
      if (!date) return ''
      const d = new Date(date)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },
    goToTasks(planId) {
      this.$router.push(`/plan/${planId}`)
    },
    goToDashboard() {
      this.$router.push('/dashboard')
    },
    goBack() {
      this.$router.push('/')
    },
    handleCreateSuccess(plan) {
      this.$message.success('计划创建成功！')
      this.showCreateDialog = false
      this.fetchPlans()
      if (plan?.id) {
        this.$router.push(`/plan/${plan.id}`)
      }
    },
    async deletePlan(id) {
      try {
        await this.$confirm('确认删除该学习计划吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        await planApi.deletePlan(id)
        this.$message.success('删除成功')
        this.fetchPlans()
        this.checkCreateLimit()
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error(error.message || '删除失败')
        }
      }
    },
    async pausePlan(plan) {
      try {
        await planApi.updateStatus(plan.id, { status: 'paused' })
        this.$message.success('计划已暂停')
        this.fetchPlans()
        this.checkCreateLimit()
      } catch (error) {
        this.$message.error(error.message || '暂停失败')
      }
    },
    async resumePlan(plan) {
      try {
        await planApi.updateStatus(plan.id, { status: 'active' })
        this.$message.success('计划已恢复')
        this.fetchPlans()
        this.checkCreateLimit()
      } catch (error) {
        this.$message.error(error.message || '恢复失败')
      }
    },
    async replanPlan(plan) {
      try {
        await this.$confirm('重新规划将保留已完成的任务，重新生成剩余任务。确定继续吗？', '重新规划', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'info'
        })

        this.replanPlanId = plan.id
        this.showReplanDialog = true
        this.replanning = true
        this.startReplanTimer()

        const res = await planApi.replan(plan.id, { keepCompleted: true })
        
        this.stopReplanTimer()
        this.replanning = false
        this.showReplanDialog = false
        
        this.$message.success('重新规划成功')
        this.fetchPlans()
      } catch (error) {
        this.stopReplanTimer()
        this.replanning = false
        this.showReplanDialog = false
        if (error !== 'cancel') {
          this.$message.error(error.message || '重新规划失败')
        }
      }
    },
    handleLogout() {
      this.$confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        removeToken()
        this.$router.push('/login')
        this.$message.success('已退出登录')
      }).catch(() => {})
    }
  }
}
</script>

<style scoped>
.plan-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 40px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 36px;
  height: 36px;
}

.header h1 {
  font-size: 20px;
  color: #303133;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 12px;
}

.content {
  padding: 30px 40px;
  max-width: 1400px;
  margin: 0 auto;
}

.welcome-section {
  margin-bottom: 30px;
}

.welcome-section h2 {
  font-size: 28px;
  color: #303133;
  margin: 0 0 8px;
}

.welcome-section p {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.plan-card {
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.type-badge :deep(.el-tag) {
  border: none;
  color: #fff;
}

.card-body {
  margin-bottom: 16px;
}

.plan-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px;
}

.plan-goal {
  font-size: 14px;
  color: #606266;
  margin: 0 0 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.progress-section {
  margin-bottom: 16px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.progress-percent {
  font-weight: 500;
  color: #303133;
}

.card-meta {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #909399;
  flex-wrap: wrap;
}

.card-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.exam-info {
  color: #606266;
}

.days-remaining {
  font-weight: 500;
  color: #409EFF;
}

.days-remaining.urgent {
  color: #F56C6C;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.create-time {
  font-size: 12px;
  color: #C0C4CC;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.limit-tip {
  font-size: 12px;
  color: #F56C6C;
  margin: 8px 0 0;
}

@media (max-width: 768px) {
  .header {
    padding: 12px 20px;
  }

  .content {
    padding: 20px;
  }

  .plan-grid {
    grid-template-columns: 1fr;
  }

  .toolbar {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .toolbar-right {
    width: 100%;
  }

  .toolbar-right .el-button {
    width: 100%;
  }
}

.replan-loading {
  padding: 30px 20px;
  text-align: center;
}

.replan-spinner {
  width: 60px;
  height: 60px;
  margin: 0 auto 24px;
  border: 3px solid #e4e7ed;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.replan-loading h3 {
  font-size: 18px;
  color: #303133;
  margin: 0 0 8px;
}

.replan-tip {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.replan-timer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 24px 0;
  padding: 12px 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.replan-timer .timer-value {
  font-size: 20px;
  font-weight: 600;
  color: #409eff;
  font-family: 'Monaco', 'Menlo', monospace;
}

.replan-steps {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 24px;
}

.replan-steps .step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.4;
  transition: all 0.3s;
}

.replan-steps .step.active {
  opacity: 1;
}

.replan-steps .step.done {
  opacity: 0.7;
}

.replan-steps .step-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #e4e7ed;
  color: #909399;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.replan-steps .step.active .step-icon {
  background: #409eff;
  color: #fff;
}

.replan-steps .step.done .step-icon {
  background: #67c23a;
  color: #fff;
}

.replan-steps .step-text {
  font-size: 12px;
  color: #909399;
}

.replan-steps .step.active .step-text {
  color: #409eff;
  font-weight: 500;
}
</style>
