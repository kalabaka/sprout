<template>
  <div class="ddl-tasks-page">
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1>DDL 任务管理</h1>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加 DDL
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="task-tabs">
      <el-tab-pane label="即将截止" name="upcoming">
        <div v-if="upcomingTasks.length === 0" class="empty-state">
          <el-empty description="暂无即将截止的任务" />
        </div>
        <div v-else class="task-list">
          <el-card 
            v-for="task in upcomingTasks" 
            :key="task.id" 
            class="task-card"
            :class="{ urgent: task.isUrgent }"
            shadow="hover"
          >
            <div class="task-header">
              <div class="task-title">
                <el-tag 
                  :type="getPriorityType(task.priority)" 
                  size="small"
                  effect="dark"
                >
                  {{ getPriorityText(task.priority) }}
                </el-tag>
                <span class="title-text">{{ task.title }}</span>
              </div>
              <div class="task-actions">
                <el-button type="primary" size="small" @click="completeTask(task)">
                  完成
                </el-button>
                <el-button size="small" @click="editTask(task)">编辑</el-button>
                <el-button type="danger" size="small" @click="deleteTask(task)">删除</el-button>
              </div>
            </div>
            <div class="task-info">
              <span v-if="task.courseName" class="info-item">
                <el-icon><Reading /></el-icon>
                {{ task.courseName }}
              </span>
              <span class="info-item deadline" :class="{ urgent: task.isUrgent }">
                <el-icon><Clock /></el-icon>
                截止：{{ formatDeadline(task.deadline) }}
                <el-tag v-if="task.isUrgent" type="danger" size="small" effect="plain">紧急</el-tag>
              </span>
              <span class="info-item">
                <el-icon><Timer /></el-icon>
                预估：{{ task.estimatedMinutes || 60 }}分钟
              </span>
            </div>
            <div v-if="task.description" class="task-desc">
              {{ task.description }}
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="已逾期" name="overdue">
        <div v-if="overdueTasks.length === 0" class="empty-state">
          <el-empty description="没有逾期任务，太棒了！" />
        </div>
        <div v-else class="task-list">
          <el-card 
            v-for="task in overdueTasks" 
            :key="task.id" 
            class="task-card overdue"
            shadow="hover"
          >
            <div class="task-header">
              <div class="task-title">
                <el-tag type="danger" size="small" effect="dark">逾期</el-tag>
                <span class="title-text">{{ task.title }}</span>
              </div>
              <div class="task-actions">
                <el-button type="primary" size="small" @click="completeTask(task)">
                  完成
                </el-button>
                <el-button size="small" @click="editTask(task)">编辑</el-button>
                <el-button type="danger" size="small" @click="deleteTask(task)">删除</el-button>
              </div>
            </div>
            <div class="task-info">
              <span class="info-item deadline overdue">
                <el-icon><Clock /></el-icon>
                已逾期：{{ formatDeadline(task.deadline) }}
              </span>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="全部任务" name="all">
        <div v-if="allTasks.length === 0" class="empty-state">
          <el-empty description="暂无DDL任务" />
        </div>
        <div v-else class="task-list">
          <el-card 
            v-for="task in allTasks" 
            :key="task.id" 
            class="task-card"
            :class="{ urgent: task.isUrgent, overdue: isOverdue(task.deadline) }"
            shadow="hover"
          >
            <div class="task-header">
              <div class="task-title">
                <el-tag 
                  :type="getPriorityType(task.priority)" 
                  size="small"
                  effect="dark"
                >
                  {{ getPriorityText(task.priority) }}
                </el-tag>
                <span class="title-text">{{ task.title }}</span>
              </div>
              <div class="task-actions">
                <el-button type="primary" size="small" @click="completeTask(task)">
                  完成
                </el-button>
                <el-button size="small" @click="editTask(task)">编辑</el-button>
                <el-button type="danger" size="small" @click="deleteTask(task)">删除</el-button>
              </div>
            </div>
            <div class="task-info">
              <span v-if="task.courseName" class="info-item">
                <el-icon><Reading /></el-icon>
                {{ task.courseName }}
              </span>
              <span class="info-item deadline" :class="{ urgent: task.isUrgent, overdue: isOverdue(task.deadline) }">
                <el-icon><Clock /></el-icon>
                {{ isOverdue(task.deadline) ? '已逾期' : '截止' }}：{{ formatDeadline(task.deadline) }}
              </span>
            </div>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>

    <AddDDLDialog v-model="showAddDialog" :edit-task="editingTask" @success="fetchTasks" @update:model-value="handleDialogClose" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { taskApi } from '../api'
import AddDDLDialog from '../components/AddDDLDialog.vue'

const router = useRouter()
const activeTab = ref('upcoming')
const showAddDialog = ref(false)
const editingTask = ref(null)
const upcomingTasks = ref([])
const overdueTasks = ref([])
const allTasks = ref([])

const goBack = () => {
  router.push('/home')
}

const getPriorityType = (priority) => {
  if (priority >= 8) return 'danger'
  if (priority >= 5) return 'warning'
  return 'success'
}

const getPriorityText = (priority) => {
  if (priority >= 8) return '紧急'
  if (priority >= 5) return '中等'
  return '一般'
}

const formatDeadline = (deadline) => {
  if (!deadline) return '未设置'
  const date = new Date(deadline)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

const isOverdue = (deadline) => {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

const formatTask = (task) => {
  const now = new Date()
  const deadline = new Date(task.deadline)
  const hoursRemaining = (deadline - now) / (1000 * 60 * 60)
  
  return {
    ...task,
    title: task.name,
    courseName: task.course_name,
    estimatedMinutes: task.estimated_minutes,
    isUrgent: hoursRemaining <= 24 && hoursRemaining > 0
  }
}

const fetchTasks = async () => {
  try {
    const [upcomingRes, overdueRes, allRes] = await Promise.all([
      taskApi.getUpcomingDDL(20),
      taskApi.getOverdueDDL(),
      taskApi.getUpcomingDDL(100)
    ])
    
    upcomingTasks.value = (upcomingRes.data || []).map(formatTask)
    overdueTasks.value = (overdueRes.data || []).map(formatTask)
    allTasks.value = (allRes.data || []).map(formatTask)
  } catch (error) {
    console.error('获取DDL任务失败:', error)
  }
}

const completeTask = async (task) => {
  try {
    await taskApi.updateProgress(task.id, 100)
    ElMessage.success('任务已完成')
    fetchTasks()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const editTask = (task) => {
  editingTask.value = task
  showAddDialog.value = true
}

const handleDialogClose = () => {
  editingTask.value = null
}

const deleteTask = async (task) => {
  try {
    await ElMessageBox.confirm('确定要删除这个DDL任务吗？', '确认删除', {
      type: 'warning'
    })
    await taskApi.deleteTask(task.id)
    ElMessage.success('任务已删除')
    fetchTasks()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

onMounted(() => {
  fetchTasks()
})
</script>

<style scoped>
.ddl-tasks-page {
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

.task-tabs {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  border-radius: 8px;
}

.task-card.urgent {
  border-left: 4px solid #f56c6c;
}

.task-card.overdue {
  border-left: 4px solid #f56c6c;
  background: #fff5f5;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-text {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.task-actions {
  display: flex;
  gap: 8px;
}

.task-info {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #606266;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-item.deadline.urgent {
  color: #f56c6c;
}

.info-item.deadline.overdue {
  color: #f56c6c;
}

.task-desc {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
  font-size: 14px;
  color: #606266;
}

.empty-state {
  padding: 40px;
}
</style>
