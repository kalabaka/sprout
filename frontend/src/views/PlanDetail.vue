<template>
  <div class="plan-detail-page">
    <div class="header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1 class="plan-title">{{ plan?.name || '加载中...' }}</h1>
        <el-tag 
          v-if="planRisk.level"
          :type="planRisk.levelType"
          size="small"
          effect="dark"
          class="risk-tag"
        >
          {{ planRisk.level }}
        </el-tag>
        <el-tag 
          v-if="planRisk.isDelayed"
          type="warning"
          size="small"
          effect="plain"
          class="delay-tag"
        >
          进度滞后
        </el-tag>
      </div>
      <div class="header-right">
        <el-button 
          v-if="planRisk.level && planRisk.level !== '低风险'"
          type="warning"
          size="small"
          plain
          @click="showRiskDetail"
        >
          <el-icon><Warning /></el-icon>
          查看风险详情
        </el-button>
        <el-dropdown @command="handleCommand">
          <el-button type="primary" plain>
            更多操作
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="edit">
                <el-icon><Edit /></el-icon>
                编辑计划
              </el-dropdown-item>
              <el-dropdown-item command="replan">
                <el-icon><Refresh /></el-icon>
                重新规划
              </el-dropdown-item>
              <el-dropdown-item command="export">
                <el-icon><Download /></el-icon>
                导出计划
              </el-dropdown-item>
              <el-dropdown-item divided command="delete">
                <el-icon><Delete /></el-icon>
                删除计划
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="10" animated />
    </div>

    <template v-else-if="plan">
      <PlanOverviewCard
        :plan="plan"
        :stats="stats"
        :risk-assessment="riskAssessment"
        :motivation="motivation"
        :exam="exam"
        @refresh="fetchData"
      />

      <StatCards :stats="stats" :plan="plan" />

      <div class="content-tabs">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="任务列表" name="tasks">
            <TaskGroupList
              :phases="phases"
              :plan-id="planId"
              :highlight-task-id="highlightTaskId"
              :plan-status="plan.status"
              @task-complete="handleTaskComplete"
              @task-edit="handleTaskEdit"
              @add-task="handleAddTask"
              @task-update="handleTaskUpdate"
            />
          </el-tab-pane>

          <el-tab-pane label="进度趋势" name="progress">
            <ProgressTrendChart
              :plan-id="planId"
              :progress-data="progressData"
            />
          </el-tab-pane>

          <el-tab-pane label="关联内容" name="related">
            <RelatedContent
              :course="course"
              :exam="exam"
              :ddl-tasks="ddlTasks"
            />
          </el-tab-pane>
        </el-tabs>
      </div>

      <div class="action-bar">
        <el-button type="primary" @click="showAddTaskDialog = true">
          <el-icon><Plus /></el-icon>
          添加任务
        </el-button>
        <el-button @click="handleReplan">
          <el-icon><Refresh /></el-icon>
          重新规划
        </el-button>
        <el-button
          v-if="plan.status === 'active'"
          @click="handlePause"
        >
          <el-icon><VideoPause /></el-icon>
          暂停计划
        </el-button>
        <el-button
          v-else-if="plan.status === 'paused'"
          type="success"
          @click="handleResume"
        >
          <el-icon><VideoPlay /></el-icon>
          继续计划
        </el-button>
        <el-button
          v-if="stats.progress >= 80"
          type="success"
          @click="handleComplete"
        >
          <el-icon><Check /></el-icon>
          完成计划
        </el-button>
      </div>
    </template>

    <el-empty v-else description="计划不存在" />

    <AddTaskDialog
      v-model="showAddTaskDialog"
      :plan-id="planId"
      :phases="phases"
      :edit-task="editingTask"
      @success="handleTaskAdded"
    />

    <ReplanConfirmDialog
      v-model="showReplanDialog"
      :plan-id="planId"
      trigger-reason="用户手动触发"
      @confirmed="handleReplanConfirmed"
    />

    <el-dialog
      v-model="showCompleteDialog"
      title="完成计划"
      width="500px"
    >
      <el-form :model="completeForm" label-width="80px">
        <el-form-item label="复盘笔记">
          <el-input
            v-model="completeForm.reviewNotes"
            type="textarea"
            :rows="5"
            placeholder="记录你的学习心得和收获..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCompleteDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmComplete">确认完成</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showEditDialog"
      title="编辑计划"
      width="500px"
    >
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="计划名称">
          <el-input v-model="editForm.name" placeholder="请输入计划名称" />
        </el-form-item>
        <el-form-item label="目标描述">
          <el-input
            v-model="editForm.goal"
            type="textarea"
            :rows="3"
            placeholder="请输入目标描述"
          />
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker
            v-model="editForm.target_date"
            type="date"
            placeholder="选择截止日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="每日学习">
          <el-input-number
            v-model="editForm.daily_study_minutes"
            :min="30"
            :max="480"
            :step="30"
          />
          <span style="margin-left: 8px; color: #909399;">分钟</span>
        </el-form-item>
        <el-form-item label="目标分数">
          <el-input-number
            v-model="editForm.target_score"
            :min="0"
            :max="150"
            :step="5"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="saveEdit" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft, ArrowDown, Edit, Refresh, Download, Delete,
  Plus, VideoPause, VideoPlay, Check, Warning
} from '@element-plus/icons-vue'
import { planApi, evaluationApi } from '../api'
import { useTimerStore } from '../stores/timer'
import PlanOverviewCard from '../components/PlanOverviewCard.vue'
import StatCards from '../components/StatCards.vue'
import TaskGroupList from '../components/TaskGroupList.vue'
import ProgressTrendChart from '../components/ProgressTrendChart.vue'
import RelatedContent from '../components/RelatedContent.vue'
import AddTaskDialog from '../components/AddTaskDialog.vue'
import ReplanConfirmDialog from '../components/ReplanConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const timerStore = useTimerStore()

const planId = computed(() => parseInt(route.params.id))

const loading = ref(true)
const plan = ref(null)
const phases = ref([])
const ddlTasks = ref([])
const course = ref(null)
const exam = ref(null)
const stats = ref({
  totalTasks: 0,
  completedTasks: 0,
  totalMinutes: 0,
  progress: 0,
  remainingTasks: 0
})
const riskAssessment = ref(null)
const motivation = ref(null)
const progressData = ref(null)
const activeTab = ref('tasks')
const showAddTaskDialog = ref(false)
const showCompleteDialog = ref(false)
const showEditDialog = ref(false)
const highlightTaskId = ref(null)
const showRiskDialog = ref(false)
const showReplanDialog = ref(false)
const saving = ref(false)
const editingTask = ref(null)

const planRisk = ref({
  level: '',
  levelType: 'success',
  isDelayed: false,
  reason: '',
  metrics: {}
})
const completeForm = ref({
  reviewNotes: ''
})
const editForm = ref({
  name: '',
  goal: '',
  target_date: null,
  daily_study_minutes: 60,
  target_score: null
})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await planApi.getFullDetail(planId.value)
    plan.value = res.data.plan
    phases.value = res.data.phases || []
    ddlTasks.value = res.data.ddlTasks || []
    course.value = res.data.course
    exam.value = res.data.exam
    stats.value = res.data.stats
    riskAssessment.value = res.data.riskAssessment

    fetchMotivation()
    fetchProgressTrend()
    fetchPlanRisk()

    const taskId = route.query.taskId
    if (taskId) {
      highlightTaskId.value = parseInt(taskId)
      setTimeout(() => {
        const element = document.getElementById('task-' + taskId)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 300)
      setTimeout(() => {
        highlightTaskId.value = null
      }, 3000)
    }
  } catch (error) {
    console.error('获取计划详情失败:', error)
    ElMessage.error('获取计划详情失败')
  } finally {
    loading.value = false
  }
}

const fetchMotivation = async () => {
  try {
    const res = await planApi.getMotivation(planId.value)
    motivation.value = res.data
  } catch (error) {
    console.error('获取激励文案失败:', error)
  }
}

const fetchProgressTrend = async () => {
  try {
    const res = await planApi.getProgressTrend(planId.value)
    progressData.value = res.data
  } catch (error) {
    console.error('获取进度趋势失败:', error)
  }
}

const fetchPlanRisk = async () => {
  try {
    const res = await evaluationApi.getPlanRisk(planId.value)
    if (res.success) {
      const data = res.data
      planRisk.value = {
        level: data.riskLevel || '',
        levelType: data.riskLevel === '高风险' ? 'danger' : data.riskLevel === '中风险' ? 'warning' : 'success',
        isDelayed: data.isDelayed || false,
        reason: data.riskReason || '',
        metrics: data.metrics || {}
      }
    }
  } catch (error) {
    console.error('获取计划风险失败:', error)
  }
}

const showRiskDetail = () => {
  ElMessageBox.alert(
    `<div style="line-height: 1.8;">
      <p><strong>风险等级：</strong>${planRisk.value.level}</p>
      <p><strong>风险原因：</strong>${planRisk.value.reason}</p>
      <p><strong>完成率：</strong>${planRisk.value.metrics.completionRate}%</p>
      <p><strong>正确率：</strong>${planRisk.value.metrics.avgScore}%</p>
      <p><strong>时间偏差：</strong>${planRisk.value.metrics.timeDeviation}%</p>
      <p><strong>剩余任务：</strong>${planRisk.value.metrics.remainingTasks} 项</p>
    </div>`,
    '风险详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '查看详细分析',
      callback: () => {
        router.push('/learning-analysis')
      }
    }
  )
}

const goBack = () => {
  router.push('/plans')
}

const handleCommand = async (command) => {
  switch (command) {
    case 'edit':
      openEditDialog()
      break
    case 'replan':
      handleReplan()
      break
    case 'export':
      ElMessage.info('导出功能开发中')
      break
    case 'delete':
      handleDelete()
      break
  }
}

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要删除这个计划吗？删除后无法恢复。', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await planApi.deletePlan(planId.value)
    ElMessage.success('删除成功')
    router.push('/plans')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const openEditDialog = () => {
  if (!plan.value) return
  editForm.value = {
    name: plan.value.name || '',
    goal: plan.value.goal || '',
    target_date: plan.value.target_date ? new Date(plan.value.target_date) : null,
    daily_study_minutes: plan.value.daily_study_minutes || 60,
    target_score: plan.value.target_score || null
  }
  showEditDialog.value = true
}

const saveEdit = async () => {
  if (!editForm.value.name.trim()) {
    ElMessage.warning('请输入计划名称')
    return
  }
  
  saving.value = true
  try {
    const updateData = {
      name: editForm.value.name,
      goal: editForm.value.goal,
      target_date: editForm.value.target_date ? editForm.value.target_date.toISOString().split('T')[0] : null,
      daily_study_minutes: editForm.value.daily_study_minutes,
      target_score: editForm.value.target_score
    }
    
    await planApi.updatePlan(planId.value, updateData)
    ElMessage.success('计划更新成功')
    showEditDialog.value = false
    fetchData()
  } catch (error) {
    ElMessage.error(error.message || '更新失败')
  } finally {
    saving.value = false
  }
}

const handleReplan = async () => {
  showReplanDialog.value = true
}

const handleReplanConfirmed = () => {
  fetchData()
}

const handlePause = async () => {
  try {
    await planApi.updateStatus(planId.value, { status: 'paused' })
    plan.value.status = 'paused'
    ElMessage.success('计划已暂停')
  } catch (error) {
    ElMessage.error(error.message || '暂停失败')
  }
}

const handleResume = async () => {
  try {
    await planApi.updateStatus(planId.value, { status: 'active' })
    plan.value.status = 'active'
    ElMessage.success('计划已恢复')
  } catch (error) {
    ElMessage.error(error.message || '恢复失败')
  }
}

const handleComplete = () => {
  showCompleteDialog.value = true
}

const confirmComplete = async () => {
  try {
    await planApi.updateStatus(planId.value, {
      status: 'completed',
      reviewNotes: completeForm.value.reviewNotes
    })
    ElMessage.success('恭喜完成计划！')
    showCompleteDialog.value = false
    router.push('/plans')
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

const handleTaskComplete = () => {
  fetchData()
}

const handleTaskUpdate = () => {
  fetchData()
}

const handleTaskEdit = (task) => {
  editingTask.value = task
  showAddTaskDialog.value = true
}

const handleAddTask = () => {
  editingTask.value = null
  showAddTaskDialog.value = true
}

const handleTaskAdded = () => {
  editingTask.value = null
  fetchData()
}

watch(planId, () => {
  if (planId.value) {
    fetchData()
  }
}, { immediate: true })

let lastPausedState = timerStore.isPaused
watchEffect(() => {
  const currentPaused = timerStore.isPaused
  if (currentPaused !== lastPausedState && planId.value) {
    lastPausedState = currentPaused
    fetchData()
  }
})

onMounted(() => {
  if (planId.value) {
    fetchData()
  }
})
</script>

<style scoped>
.plan-detail-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  padding-bottom: 80px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.plan-title {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.risk-tag {
  margin-left: 12px;
}

.delay-tag {
  margin-left: 8px;
}

.header-right {
  display: flex;
  gap: 12px;
}

.loading-container {
  padding: 40px 24px;
}

.content-tabs {
  background: #fff;
  margin: 16px 24px;
  border-radius: 12px;
  padding: 16px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 16px 24px;
  background: #fff;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
  z-index: 100;
}
</style>
