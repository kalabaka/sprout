<template>
  <div class="exam-manage-page">
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1>考试管理</h1>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加考试
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="exam-tabs">
      <el-tab-pane label="即将到来" name="upcoming">
        <div v-if="upcomingExams.length === 0" class="empty-state">
          <el-empty description="暂无即将到来的考试" />
        </div>
        <div v-else class="exam-list">
          <el-card 
            v-for="exam in upcomingExams" 
            :key="exam.id" 
            class="exam-card"
            :class="getUrgencyClass(exam.daysRemaining)"
            shadow="hover"
          >
            <div class="exam-header">
              <div class="exam-title">
                <span class="priority-dot" :style="{ background: getPriorityColor(exam.priority) }"></span>
                <span class="title-text">{{ exam.name }}</span>
                <el-tag v-if="exam.courseName" size="small" :color="exam.courseColor || '#409EFF'" effect="plain">
                  {{ exam.courseName }}
                </el-tag>
              </div>
              <div class="exam-actions">
                <el-button 
                  v-if="exam.relatedPlanId" 
                  size="small" 
                  type="success" 
                  @click="viewPlan(exam.relatedPlanId)"
                >
                  查看复习计划
                </el-button>
                <el-button 
                  v-else 
                  size="small" 
                  type="primary" 
                  @click="openGenerateDialog(exam)"
                >
                  生成复习计划
                </el-button>
                <el-button size="small" @click="editExam(exam)">编辑</el-button>
                <el-button type="danger" size="small" @click="deleteExam(exam)">删除</el-button>
              </div>
            </div>
            
            <div class="exam-info">
              <span class="info-item">
                <el-icon><Calendar /></el-icon>
                {{ formatDate(exam.examDate) }}
              </span>
              <span v-if="exam.examTime" class="info-item">
                <el-icon><Clock /></el-icon>
                {{ exam.examTime }}
              </span>
              <span v-if="exam.location" class="info-item">
                <el-icon><Location /></el-icon>
                {{ exam.location }}
              </span>
            </div>

            <div class="countdown-section">
              <div class="countdown-display">
                <span class="countdown-label">距离考试还有</span>
                <span class="countdown-number">{{ exam.daysRemaining }}</span>
                <span class="countdown-unit">天</span>
              </div>
              <el-progress 
                :percentage="getExamProgress(exam)" 
                :color="getProgressColor(exam.daysRemaining)"
                :stroke-width="6"
              />
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="全部考试" name="all">
        <div v-if="allExams.length === 0" class="empty-state">
          <el-empty description="暂无考试记录" />
        </div>
        <div v-else class="exam-list">
          <el-card 
            v-for="exam in allExams" 
            :key="exam.id" 
            class="exam-card"
            :class="getUrgencyClass(exam.daysRemaining)"
            shadow="hover"
          >
            <div class="exam-header">
              <div class="exam-title">
                <span class="priority-dot" :style="{ background: getPriorityColor(exam.priority) }"></span>
                <span class="title-text">{{ exam.name }}</span>
              </div>
              <div class="exam-actions">
                <el-button 
                  v-if="exam.relatedPlanId" 
                  size="small" 
                  type="success" 
                  @click="viewPlan(exam.relatedPlanId)"
                >
                  查看复习计划
                </el-button>
                <el-button 
                  v-else-if="exam.daysRemaining > 0" 
                  size="small" 
                  type="primary" 
                  @click="openGenerateDialog(exam)"
                >
                  生成复习计划
                </el-button>
                <el-button size="small" @click="editExam(exam)">编辑</el-button>
                <el-button type="danger" size="small" @click="deleteExam(exam)">删除</el-button>
              </div>
            </div>
            
            <div class="exam-info">
              <span class="info-item">
                <el-icon><Calendar /></el-icon>
                {{ formatDate(exam.examDate) }}
              </span>
              <span class="info-item countdown" :class="getUrgencyClass(exam.daysRemaining)">
                {{ exam.daysRemaining > 0 ? `还有${exam.daysRemaining}天` : '已结束' }}
              </span>
            </div>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>

    <AddExamDialog v-model="showAddDialog" :edit-data="editingExam" @success="fetchExams" />

    <el-dialog v-model="showDetailDialog" title="考试详情" width="500px">
      <el-descriptions :column="1" border v-if="currentExam">
        <el-descriptions-item label="考试名称">{{ currentExam.name }}</el-descriptions-item>
        <el-descriptions-item label="关联课程">{{ currentExam.courseName || '无' }}</el-descriptions-item>
        <el-descriptions-item label="考试日期">{{ formatDate(currentExam.examDate) }}</el-descriptions-item>
        <el-descriptions-item label="考试时间">{{ currentExam.examTime || '未设置' }}</el-descriptions-item>
        <el-descriptions-item label="考试地点">{{ currentExam.location || '未设置' }}</el-descriptions-item>
        <el-descriptions-item label="优先级">{{ getPriorityText(currentExam.priority) }}</el-descriptions-item>
        <el-descriptions-item label="倒计时">{{ currentExam.daysRemaining }}天</el-descriptions-item>
        <el-descriptions-item label="备注">{{ currentExam.notes || '无' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <div class="detail-footer">
          <el-button 
            v-if="currentExam?.relatedPlanId" 
            type="success" 
            @click="viewPlan(currentExam.relatedPlanId)"
          >
            查看复习计划
          </el-button>
          <el-button 
            v-else-if="currentExam?.daysRemaining > 0" 
            type="primary" 
            @click="openGenerateFromDetail"
          >
            生成复习计划
          </el-button>
          <el-button @click="showDetailDialog = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <GenerateReviewPlanDialog 
      v-model="showGenerateDialog" 
      :exam="selectedExam"
      @success="handleGenerateSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { examApi } from '../api'
import AddExamDialog from '../components/AddExamDialog.vue'
import GenerateReviewPlanDialog from '../components/GenerateReviewPlanDialog.vue'

const router = useRouter()
const activeTab = ref('upcoming')
const showAddDialog = ref(false)
const showDetailDialog = ref(false)
const showGenerateDialog = ref(false)
const currentExam = ref(null)
const selectedExam = ref(null)
const editingExam = ref(null)
const upcomingExams = ref([])
const allExams = ref([])

const goBack = () => {
  router.push('/home')
}

const getUrgencyClass = (days) => {
  if (days <= 3) return 'urgent'
  if (days <= 7) return 'warning'
  return 'normal'
}

const getPriorityColor = (priority) => {
  const colors = { high: '#f56c6c', medium: '#e6a23c', low: '#67c23a' }
  return colors[priority] || '#909399'
}

const getPriorityText = (priority) => {
  const texts = { high: '高', medium: '中', low: '低' }
  return texts[priority] || '中'
}

const getProgressColor = (days) => {
  if (days <= 3) return '#f56c6c'
  if (days <= 7) return '#e6a23c'
  if (days <= 14) return '#409eff'
  return '#67c23a'
}

const getExamProgress = (exam) => {
  const totalDays = 60
  const remaining = exam.daysRemaining
  const progress = Math.max(0, Math.min(100, ((totalDays - remaining) / totalDays) * 100))
  return Math.round(progress)
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${weekdays[date.getDay()]}`
}

const fetchExams = async () => {
  try {
    const [upcomingRes, allRes] = await Promise.all([
      examApi.getUpcoming(10),
      examApi.getAll()
    ])
    
    if (upcomingRes.success) {
      upcomingExams.value = upcomingRes.data || []
    }
    if (allRes.success) {
      allExams.value = allRes.data || []
    }
    editingExam.value = null
  } catch (error) {
    console.error('获取考试列表失败:', error)
  }
}

const viewExam = (exam) => {
  currentExam.value = exam
  showDetailDialog.value = true
}

const editExam = (exam) => {
  editingExam.value = exam
  showAddDialog.value = true
}

const deleteExam = async (exam) => {
  try {
    await ElMessageBox.confirm('确定要删除这个考试吗？', '确认删除', {
      type: 'warning'
    })
    const res = await examApi.delete(exam.id)
    if (res.success) {
      ElMessage.success('考试已删除')
      fetchExams()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const openGenerateDialog = async (exam) => {
  try {
    const res = await examApi.getRelatedPlan(exam.id)
    if (res.success && res.hasPlan) {
      ElMessageBox.confirm(
        `已存在复习计划「${res.data.name}」，是否查看？`,
        '提示',
        {
          confirmButtonText: '查看',
          cancelButtonText: '取消',
          type: 'info'
        }
      ).then(() => {
        viewPlan(res.data.id)
      }).catch(() => {})
    } else {
      selectedExam.value = exam
      showGenerateDialog.value = true
    }
  } catch (error) {
    selectedExam.value = exam
    showGenerateDialog.value = true
  }
}

const openGenerateFromDetail = () => {
  showDetailDialog.value = false
  openGenerateDialog(currentExam.value)
}

const handleGenerateSuccess = (data) => {
  ElMessage.success('复习计划创建成功！')
  fetchExams()
  if (data.planId) {
    viewPlan(data.planId)
  }
}

const viewPlan = (planId) => {
  router.push(`/plan/${planId}`)
}

onMounted(() => {
  fetchExams()
})
</script>

<style scoped>
.exam-manage-page {
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

.exam-tabs {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.exam-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exam-card {
  border-radius: 8px;
}

.exam-card.urgent {
  border-left: 4px solid #f56c6c;
}

.exam-card.warning {
  border-left: 4px solid #e6a23c;
}

.exam-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.exam-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.priority-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.title-text {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.exam-actions {
  display: flex;
  gap: 8px;
}

.exam-info {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #606266;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-item.countdown.urgent {
  color: #f56c6c;
  font-weight: 500;
}

.info-item.countdown.warning {
  color: #e6a23c;
}

.countdown-section {
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.countdown-display {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.countdown-label {
  font-size: 14px;
  color: #606266;
}

.countdown-number {
  font-size: 28px;
  font-weight: 700;
  color: #409eff;
}

.exam-card.urgent .countdown-number {
  color: #f56c6c;
}

.exam-card.warning .countdown-number {
  color: #e6a23c;
}

.countdown-unit {
  font-size: 14px;
  color: #606266;
}

.empty-state {
  padding: 40px;
}

.detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
