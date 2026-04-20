<template>
  <div class="related-content">
    <div class="content-grid">
      <div v-if="course" class="content-section">
        <h3 class="section-title">
          <el-icon><Reading /></el-icon>
          关联课程
        </h3>
        <el-card shadow="hover" class="content-card">
          <div class="course-info">
            <div class="course-color" :style="{ background: course.color || '#409EFF' }"></div>
            <div class="course-details">
              <h4>{{ course.name }}</h4>
              <p v-if="course.teacher">授课教师: {{ course.teacher }}</p>
            </div>
          </div>
          <el-button type="primary" text @click="goToCourse">
            查看课程
          </el-button>
        </el-card>
      </div>

      <div v-if="exam" class="content-section">
        <h3 class="section-title">
          <el-icon><Document /></el-icon>
          关联考试
        </h3>
        <el-card shadow="hover" class="content-card">
          <div class="exam-info">
            <h4>{{ exam.name }}</h4>
            <div class="exam-meta">
              <span v-if="exam.exam_date">
                <el-icon><Calendar /></el-icon>
                {{ formatDate(exam.exam_date) }}
              </span>
              <el-tag v-if="examCountdown" :type="getCountdownType(examCountdown)">
                {{ examCountdown }}天后
              </el-tag>
            </div>
          </div>
        </el-card>
      </div>

      <div v-if="ddlTasks.length > 0" class="content-section">
        <h3 class="section-title">
          <el-icon><Clock /></el-icon>
          关联 DDL 任务
          <el-tag size="small" type="info">{{ ddlTasks.length }}</el-tag>
        </h3>
        <div class="ddl-list">
          <div
            v-for="task in ddlTasks"
            :key="task.id"
            class="ddl-item"
            :class="{ overdue: isOverdue(task.deadline) }"
          >
            <div class="ddl-content">
              <span class="ddl-name">{{ task.name }}</span>
              <span class="ddl-deadline">
                截止: {{ formatDate(task.deadline) }}
              </span>
            </div>
            <el-tag :type="getDDLStatus(task.deadline)" size="small">
              {{ getDDLStatusText(task.deadline) }}
            </el-tag>
          </div>
        </div>
      </div>

      <div v-if="!course && !exam && ddlTasks.length === 0" class="empty-content">
        <el-empty description="暂无关联内容" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Reading, Document, Calendar, Clock } from '@element-plus/icons-vue'

const props = defineProps({
  course: {
    type: Object,
    default: null
  },
  exam: {
    type: Object,
    default: null
  },
  ddlTasks: {
    type: Array,
    default: () => []
  }
})

const examCountdown = computed(() => {
  if (!props.exam?.exam_date) return null
  const examDate = new Date(props.exam.exam_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  examDate.setHours(0, 0, 0, 0)
  const diff = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
})

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const isOverdue = (deadline) => {
  if (!deadline) return false
  const date = new Date(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

const getCountdownType = (days) => {
  if (days <= 3) return 'danger'
  if (days <= 7) return 'warning'
  return 'success'
}

const getDDLStatus = (deadline) => {
  if (!deadline) return 'info'
  const date = new Date(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24))
  
  if (diff < 0) return 'danger'
  if (diff === 0) return 'danger'
  if (diff <= 3) return 'warning'
  return 'success'
}

const getDDLStatusText = (deadline) => {
  if (!deadline) return '未设定'
  const date = new Date(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24))
  
  if (diff < 0) return '已逾期'
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  return `${diff}天后`
}

const goToCourse = () => {
  if (props.course?.id) {
    console.log('Navigate to course:', props.course.id)
  }
}
</script>

<style scoped>
.related-content {
  padding: 20px;
}

.content-grid {
  display: grid;
  gap: 24px;
}

.content-section {
  background: #fafafa;
  border-radius: 12px;
  padding: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 16px;
  color: #303133;
}

.content-card {
  border-radius: 8px;
}

.course-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.course-color {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.course-details h4 {
  margin: 0;
  font-size: 15px;
  color: #303133;
}

.course-details p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #909399;
}

.exam-info h4 {
  margin: 0 0 8px;
  font-size: 15px;
  color: #303133;
}

.exam-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #606266;
}

.exam-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ddl-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ddl-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  border-left: 3px solid #409EFF;
}

.ddl-item.overdue {
  border-left-color: #F56C6C;
  background: #FEF0F0;
}

.ddl-content {
  display: flex;
  flex-direction: column;
}

.ddl-name {
  font-size: 14px;
  color: #303133;
}

.ddl-deadline {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.empty-content {
  display: flex;
  justify-content: center;
  padding: 40px;
}
</style>
