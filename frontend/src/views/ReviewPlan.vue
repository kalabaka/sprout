<template>
  <div class="review-plan-page">
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1>复习计划</h1>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="generatePlan" :loading="generating">
          <el-icon><Refresh /></el-icon>
          生成计划
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="exam-select-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><Document /></el-icon>
              <span>选择考试</span>
            </div>
          </template>
          
          <div v-if="exams.length === 0" class="empty-state">
            <el-empty description="暂无考试，请先添加考试" :image-size="60" />
          </div>
          <div v-else class="exam-list">
            <div 
              v-for="exam in exams" 
              :key="exam.id" 
              class="exam-item"
              :class="{ active: selectedExam?.id === exam.id }"
              @click="selectExam(exam)"
            >
              <div class="exam-name">{{ exam.name }}</div>
              <div class="exam-date">{{ formatDate(exam.examDate) }}</div>
              <el-tag size="small" :type="getUrgencyType(exam.daysRemaining)">
                {{ exam.daysRemaining }}天
              </el-tag>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card class="plan-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><Calendar /></el-icon>
              <span>复习计划详情</span>
            </div>
          </template>

          <div v-if="!selectedExam" class="empty-state">
            <el-empty description="请选择一个考试查看复习计划" :image-size="80" />
          </div>
          <div v-else-if="!reviewPlan" class="empty-state">
            <el-empty description="暂无复习计划，点击生成按钮创建" :image-size="80" />
          </div>
          <div v-else class="plan-content">
            <div class="plan-header">
              <h3>{{ reviewPlan.examName }}</h3>
              <div class="plan-meta">
                <span>考试日期：{{ formatDate(reviewPlan.examDate) }}</span>
                <span>剩余天数：{{ reviewPlan.daysRemaining }}天</span>
                <span>总章节：{{ reviewPlan.totalChapters }}章</span>
              </div>
              <div class="plan-reason">{{ reviewPlan.reason }}</div>
            </div>

            <el-table :data="reviewPlan.plan" stripe max-height="500">
              <el-table-column prop="dayIndex" label="天数" width="80" />
              <el-table-column prop="date" label="日期" width="120">
                <template #default="{ row }">
                  {{ formatShortDate(row.date) }}
                </template>
              </el-table-column>
              <el-table-column prop="content" label="复习内容" />
              <el-table-column prop="suggestedMinutes" label="建议时长" width="100">
                <template #default="{ row }">
                  {{ row.suggestedMinutes }}分钟
                </template>
              </el-table-column>
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row.status)" size="small">
                    {{ getStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-button
                    v-if="row.status === 0 || !row.status"
                    type="primary"
                    size="small"
                    @click="startTask(row)"
                  >
                    <el-icon><VideoPlay /></el-icon>
                    开始
                  </el-button>
                  <el-button
                    v-if="row.status === 1"
                    type="warning"
                    size="small"
                    @click="pauseTask(row)"
                  >
                    <el-icon><VideoPause /></el-icon>
                    暂停
                  </el-button>
                  <el-button
                    v-if="row.status === 4"
                    type="primary"
                    size="small"
                    @click="resumeTask(row)"
                  >
                    <el-icon><VideoPlay /></el-icon>
                    继续
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { examApi } from '../api'
import { useTimerStore } from '../stores/timer'

const router = useRouter()
const timerStore = useTimerStore()
const exams = ref([])
const selectedExam = ref(null)
const reviewPlan = ref(null)
const generating = ref(false)

const goBack = () => {
  router.push('/home')
}

const getUrgencyType = (days) => {
  if (days <= 3) return 'danger'
  if (days <= 7) return 'warning'
  return 'success'
}

const getStatusType = (status) => {
  const types = {
    0: 'info',
    1: 'primary',
    2: 'success',
    4: 'warning'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    0: '待开始',
    1: '进行中',
    2: '已完成',
    4: '已暂停'
  }
  return texts[status] || '待开始'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

const formatShortDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const fetchExams = async () => {
  try {
    const res = await examApi.getUpcoming(10)
    if (res.success) {
      exams.value = res.data || []
    }
  } catch (error) {
    console.error('获取考试列表失败:', error)
  }
}

const selectExam = (exam) => {
  selectedExam.value = exam
  reviewPlan.value = null
}

const generatePlan = async () => {
  if (!selectedExam.value) {
    ElMessage.warning('请先选择一个考试')
    return
  }

  generating.value = true
  try {
    const res = await examApi.getReviewSuggestion()
    if (res.success && res.data) {
      reviewPlan.value = {
        examId: selectedExam.value.id,
        examName: selectedExam.value.name,
        examDate: selectedExam.value.examDate,
        daysRemaining: selectedExam.value.daysRemaining,
        totalChapters: 10,
        reason: res.data.reason || '根据剩余时间均分章节内容',
        plan: generateMockPlan(selectedExam.value)
      }
      ElMessage.success('复习计划生成成功')
    }
  } catch (error) {
    ElMessage.error('生成复习计划失败')
  } finally {
    generating.value = false
  }
}

const generateMockPlan = (exam) => {
  const plans = []
  const days = exam.daysRemaining
  const chaptersPerDay = 10 / days
  
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    
    const startChapter = Math.floor(i * chaptersPerDay) + 1
    const endChapter = Math.min(Math.floor((i + 1) * chaptersPerDay), 10)
    
    plans.push({
      id: `review-${exam.id}-${i}`,
      dayIndex: i + 1,
      date: date.toISOString().split('T')[0],
      content: startChapter === endChapter ? `复习第${startChapter}章` : `复习第${startChapter}-${endChapter}章`,
      suggestedMinutes: Math.min(120, Math.round(60 * chaptersPerDay)),
      status: 0
    })
  }
  
  return plans
}

const startTask = async (row) => {
  try {
    if (timerStore.isRunning && timerStore.taskId !== row.id) {
      ElMessage.warning('请先结束当前任务')
      return
    }

    const taskData = {
      id: row.id,
      name: row.content,
      courseName: selectedExam.value?.name || '',
      planId: null
    }

    const result = await timerStore.startTimer(taskData)
    if (!result.success) {
      ElMessage.error(result.message || '开始失败')
      return
    }

    row.status = 1
    ElMessage.success('任务已开始')
  } catch (error) {
    console.error('startTask error:', error)
    ElMessage.error(error.message || '操作失败')
  }
}

const pauseTask = async (row) => {
  try {
    timerStore.pauseTimer()
    row.status = 4
    ElMessage.success('任务已暂停')
  } catch (error) {
    ElMessage.error(error.message || '暂停失败')
  }
}

const resumeTask = async (row) => {
  try {
    if (timerStore.isRunning && timerStore.taskId !== row.id) {
      ElMessage.warning('请先结束当前任务')
      return
    }

    if (timerStore.isRunning && timerStore.taskId === row.id && timerStore.isPaused) {
      timerStore.resumeTimer()
    } else if (!timerStore.isRunning) {
      const taskData = {
        id: row.id,
        name: row.content,
        courseName: selectedExam.value?.name || '',
        planId: null
      }
      const result = await timerStore.startTimer(taskData)
      if (!result.success) {
        ElMessage.error(result.message || '恢复失败')
        return
      }
    }
    
    row.status = 1
    ElMessage.success('任务已恢复')
  } catch (error) {
    console.error('resumeTask error:', error)
    ElMessage.error(error.message || '恢复失败')
  }
}

onMounted(() => {
  fetchExams()
})
</script>

<style scoped>
.review-plan-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
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

.header-left h1 {
  font-size: 20px;
  color: #303133;
  margin: 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.exam-select-card,
.plan-card {
  border-radius: 12px;
  min-height: 500px;
}

.exam-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.exam-item {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  cursor: pointer;
  transition: all 0.3s;
}

.exam-item:hover {
  border-color: #409eff;
  background: #f5f7fa;
}

.exam-item.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.exam-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.exam-date {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.plan-content {
  padding: 0;
}

.plan-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.plan-header h3 {
  font-size: 18px;
  color: #303133;
  margin: 0 0 12px 0;
}

.plan-meta {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

.plan-reason {
  font-size: 13px;
  color: #909399;
}

.empty-state {
  padding: 40px;
  display: flex;
  justify-content: center;
}
</style>
