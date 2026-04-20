<template>
  <el-card class="exam-countdown-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <div class="header-left">
          <el-icon><Timer /></el-icon>
          <span>考试倒计时</span>
        </div>
        <el-button type="primary" link @click="openAddExamDialog">+ 添加考试</el-button>
      </div>
    </template>

    <div v-if="nearestExam" class="nearest-exam" :class="getUrgencyClass(nearestExam.daysRemaining)">
      <div class="exam-header">
        <span class="priority-dot" :style="{ background: getPriorityColor(nearestExam.priority) }"></span>
        <span class="exam-name">{{ nearestExam.name }}</span>
        <el-tag v-if="nearestExam.courseName" size="small" :color="nearestExam.courseColor || '#409EFF'" effect="plain">
          {{ nearestExam.courseName }}
        </el-tag>
      </div>
      
      <div class="exam-info">
        <span class="info-item">
          <el-icon><Calendar /></el-icon>
          考试时间：{{ formatDate(nearestExam.examDate) }}
        </span>
        <span v-if="nearestExam.location" class="info-item">
          <el-icon><Location /></el-icon>
          {{ nearestExam.location }}
        </span>
      </div>

      <div class="countdown-display">
        <div class="countdown-main">
          <span class="countdown-label">距离考试还有</span>
          <span class="countdown-number">{{ nearestExam.daysRemaining }}</span>
          <span class="countdown-unit">天</span>
        </div>
        <el-progress 
          :percentage="getExamProgress(nearestExam)" 
          :color="getProgressColor(nearestExam.daysRemaining)"
          :stroke-width="8"
        />
      </div>

      <div v-if="reviewSuggestion" class="review-tip">
        <div class="tip-header">
          <el-icon><Reading /></el-icon>
          <span>今日复习建议</span>
        </div>
        <div class="tip-content">{{ reviewSuggestion.todayPlan }}（约{{ reviewSuggestion.suggestedMinutes }}分钟）</div>
      </div>
    </div>

    <div v-if="otherExams.length > 0" class="other-exams">
      <div v-for="exam in otherExams" :key="exam.id" class="exam-item">
        <div class="exam-item-left">
          <span class="priority-dot small" :style="{ background: getPriorityColor(exam.priority) }"></span>
          <span class="exam-item-name">{{ exam.name }}</span>
        </div>
        <span class="exam-countdown" :class="getUrgencyClass(exam.daysRemaining)">
          还有 {{ exam.daysRemaining }} 天
        </span>
      </div>
    </div>

    <el-empty v-if="!nearestExam && otherExams.length === 0" description="暂无考试，点击上方添加" :image-size="80" />
  </el-card>

  <el-dialog v-model="addExamDialogVisible" title="添加考试" width="500px">
    <el-form :model="examForm" label-width="100px" label-position="top">
      <el-form-item label="考试名称" required>
        <el-input v-model="examForm.name" placeholder="如：高等数学期中考试" id="countdown-exam-name" />
      </el-form-item>
      <el-form-item label="关联课程">
        <el-select v-model="examForm.course_id" placeholder="选择关联课程（可选）" clearable style="width: 100%" id="countdown-exam-course">
          <el-option 
            v-for="course in courseList" 
            :key="course.id" 
            :label="course.name" 
            :value="course.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="考试日期" required>
        <el-date-picker 
          v-model="examForm.exam_date" 
          type="date" 
          placeholder="选择考试日期"
          style="width: 100%"
          value-format="YYYY-MM-DD"
          id="countdown-exam-date"
        />
      </el-form-item>
      <el-form-item label="考试时间">
        <el-time-select 
          v-model="examForm.exam_time" 
          placeholder="选择考试时间"
          start="08:00"
          step="00:30"
          end="22:00"
          style="width: 100%"
          id="countdown-exam-time"
        />
      </el-form-item>
      <el-form-item label="考试地点">
        <el-input v-model="examForm.location" placeholder="如：A101教室" id="countdown-exam-location" />
      </el-form-item>
      <el-form-item label="优先级">
        <el-radio-group v-model="examForm.priority" id="countdown-exam-priority">
          <el-radio value="high">高</el-radio>
          <el-radio value="medium">中</el-radio>
          <el-radio value="low">低</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="总章节数">
        <el-input-number v-model="examForm.total_chapters" :min="1" :max="30" id="countdown-exam-chapters" />
        <span class="form-hint">用于生成复习计划</span>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="examForm.notes" type="textarea" :rows="2" placeholder="备注信息" id="countdown-exam-notes" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="addExamDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitExam">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { examApi, courseApi } from '../api'

const exams = ref([])
const reviewSuggestion = ref(null)
const courseList = ref([])
const addExamDialogVisible = ref(false)
const submitting = ref(false)

const examForm = ref({
  name: '',
  course_id: null,
  exam_date: '',
  exam_time: '09:00',
  location: '',
  priority: 'medium',
  total_chapters: 10,
  notes: ''
})

const nearestExam = computed(() => exams.value[0] || null)
const otherExams = computed(() => exams.value.slice(1, 4))

const getUrgencyClass = (days) => {
  if (days <= 3) return 'urgent'
  if (days <= 7) return 'warning'
  return 'normal'
}

const getPriorityColor = (priority) => {
  const colors = { high: '#f56c6c', medium: '#e6a23c', low: '#67c23a' }
  return colors[priority] || '#909399'
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
    const res = await examApi.getUpcoming()
    if (res.success) {
      exams.value = res.data || []
    }
  } catch (error) {
    console.error('获取考试列表失败:', error)
  }
}

const fetchReviewSuggestion = async () => {
  try {
    const res = await examApi.getReviewSuggestion()
    if (res.success && res.data) {
      reviewSuggestion.value = res.data
    }
  } catch (error) {
    console.error('获取复习建议失败:', error)
  }
}

const fetchCourses = async () => {
  try {
    const res = await courseApi.getAll()
    if (res.success) {
      courseList.value = res.data || []
    }
  } catch (error) {
    console.error('获取课程列表失败:', error)
  }
}

const openAddExamDialog = () => {
  examForm.value = {
    name: '',
    course_id: null,
    exam_date: '',
    exam_time: '09:00',
    location: '',
    priority: 'medium',
    total_chapters: 10,
    notes: ''
  }
  addExamDialogVisible.value = true
}

const submitExam = async () => {
  if (!examForm.value.name || !examForm.value.exam_date) {
    ElMessage.warning('请填写考试名称和考试日期')
    return
  }

  submitting.value = true
  try {
    await examApi.create(examForm.value)
    ElMessage.success('考试添加成功')
    addExamDialogVisible.value = false
    fetchExams()
    fetchReviewSuggestion()
  } catch (error) {
    ElMessage.error(error.message || '添加考试失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchExams()
  fetchReviewSuggestion()
  fetchCourses()
})
</script>

<style scoped>
.exam-countdown-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.nearest-exam {
  padding: 16px;
  border-radius: 8px;
  background: #f5f7fa;
  margin-bottom: 16px;
}

.nearest-exam.urgent {
  background: linear-gradient(135deg, #fff5f5 0%, #fff0f0 100%);
  border: 1px solid #fde2e2;
}

.nearest-exam.warning {
  background: linear-gradient(135deg, #fdf6ec 0%, #fef9f3 100%);
  border: 1px solid #faecd8;
}

.exam-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.priority-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.priority-dot.small {
  width: 8px;
  height: 8px;
}

.exam-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.exam-info {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #606266;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.countdown-display {
  margin-bottom: 16px;
}

.countdown-main {
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
  font-size: 36px;
  font-weight: 700;
  color: #409eff;
}

.nearest-exam.urgent .countdown-number {
  color: #f56c6c;
}

.nearest-exam.warning .countdown-number {
  color: #e6a23c;
}

.countdown-unit {
  font-size: 16px;
  color: #606266;
}

.review-tip {
  padding: 12px;
  background: #ecf5ff;
  border-radius: 6px;
  border-left: 3px solid #409eff;
}

.tip-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 6px;
}

.tip-content {
  font-size: 14px;
  color: #606266;
}

.other-exams {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.exam-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
}

.exam-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.exam-item-name {
  font-size: 14px;
  color: #303133;
}

.exam-countdown {
  font-size: 13px;
  font-weight: 500;
}

.exam-countdown.urgent {
  color: #f56c6c;
}

.exam-countdown.warning {
  color: #e6a23c;
}

.exam-countdown.normal {
  color: #67c23a;
}

.form-hint {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}
</style>
