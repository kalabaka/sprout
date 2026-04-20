<template>
  <div class="admin-plans">
    <AdminPageHeader title="学习计划管理" />
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>学习计划管理</span>
          <div class="header-actions">
            <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width: 120px; margin-right: 10px" @change="fetchPlans">
              <el-option label="全部" value="" />
              <el-option label="草稿" value="draft" />
              <el-option label="进行中" value="active" />
              <el-option label="暂停" value="paused" />
              <el-option label="已完成" value="completed" />
              <el-option label="已归档" value="archived" />
            </el-select>
            <el-input v-model="searchKeyword" placeholder="搜索计划..." style="width: 200px" clearable @keyup.enter="fetchPlans" />
          </div>
        </div>
      </template>
      <el-table :data="plans" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="title" label="计划标题" min-width="200" />
        <el-table-column prop="username" label="创建者" width="100" />
        <el-table-column prop="statusText" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="150">
          <template #default="{ row }">
            <div class="progress-cell">
              <el-progress :percentage="row.progress" :stroke-width="8" />
              <span class="progress-text">{{ row.completedTasks }}/{{ row.totalTasks }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="viewPlan(row)">查看</el-button>
            <el-button type="danger" size="small" text @click="deletePlan(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-container" v-if="total > limit">
        <el-pagination
          :current-page="page"
          :page-size="limit"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
      
      <el-empty v-if="!loading && plans.length === 0" description="暂无学习计划" />
    </el-card>

    <!-- 计划详情弹窗 -->
    <el-dialog v-model="showDetailDialog" title="计划详情" width="700px">
      <el-descriptions :column="2" border v-if="currentPlan">
        <el-descriptions-item label="计划ID">{{ currentPlan.id }}</el-descriptions-item>
        <el-descriptions-item label="计划标题">{{ currentPlan.title }}</el-descriptions-item>
        <el-descriptions-item label="创建者">{{ currentPlan.username }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(currentPlan.status)">{{ currentPlan.statusText }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="开始日期">{{ currentPlan.start_date || '-' }}</el-descriptions-item>
        <el-descriptions-item label="结束日期">{{ currentPlan.end_date || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(currentPlan.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="进度">{{ currentPlan.progress }}%</el-descriptions-item>
      </el-descriptions>
      
      <div class="tasks-section" v-if="currentPlan?.tasks?.length > 0">
        <h4>任务列表</h4>
        <el-table :data="currentPlan.tasks" max-height="300">
          <el-table-column prop="task_name" label="任务名称" min-width="200" />
          <el-table-column prop="status" label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="getTaskStatusType(row.status)" size="small">
                {{ getTaskStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="scheduled_date" label="计划日期" width="120" />
          <el-table-column prop="completed_at" label="完成时间" width="160">
            <template #default="{ row }">
              {{ row.completed_at ? formatDate(row.completed_at) : '-' }}
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import AdminPageHeader from '../components/AdminPageHeader.vue'
import { adminApi } from '../api'

export default {
  name: 'AdminPlans',
  components: { AdminPageHeader },
  data() {
    return {
      loading: false,
      searchKeyword: '',
      statusFilter: '',
      plans: [],
      total: 0,
      page: 1,
      limit: 20,
      showDetailDialog: false,
      currentPlan: null
    }
  },
  mounted() {
    this.fetchPlans()
  },
  methods: {
    async fetchPlans() {
      this.loading = true
      try {
        const res = await adminApi.getPlans({
          keyword: this.searchKeyword,
          status: this.statusFilter,
          page: this.page,
          limit: this.limit
        })
        if (res.success) {
          this.plans = res.data || []
          this.total = res.total || 0
        }
      } catch (e) {
        this.$message.error('获取计划列表失败')
      } finally {
        this.loading = false
      }
    },
    getStatusType(status) {
      const types = {
        'draft': 'info',
        'active': 'success',
        'paused': 'warning',
        'completed': 'primary',
        'archived': 'default'
      }
      return types[status] || 'info'
    },
    getTaskStatusType(status) {
      const types = {
        0: 'info',
        1: 'warning',
        2: 'success'
      }
      return types[status] || 'info'
    },
    getTaskStatusText(status) {
      const texts = {
        0: '未开始',
        1: '进行中',
        2: '已完成'
      }
      return texts[status] || '未知'
    },
    async viewPlan(plan) {
      try {
        const res = await adminApi.getPlanDetail(plan.id)
        if (res.success) {
          this.currentPlan = {
            ...plan,
            ...res.data
          }
          this.showDetailDialog = true
        }
      } catch (e) {
        this.$message.error('获取计划详情失败')
      }
    },
    async deletePlan(plan) {
      try {
        await this.$confirm(`确定要删除计划 "${plan.title}" 吗？此操作将同时删除该计划下的所有任务！`, '警告', {
          type: 'warning',
          confirmButtonText: '确定删除',
          cancelButtonText: '取消'
        })
        
        const res = await adminApi.deletePlan(plan.id)
        if (res.success) {
          this.$message.success('删除成功')
          this.fetchPlans()
        }
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error(e.message || '删除失败')
        }
      }
    },
    handlePageChange(page) {
      this.page = page
      this.fetchPlans()
    },
    formatDate(dateStr) {
      if (!dateStr) return '-'
      const date = new Date(dateStr)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
}
</script>

<style scoped>
.admin-plans {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}

.progress-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-text {
  font-size: 12px;
  color: #909399;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.tasks-section {
  margin-top: 20px;
}

.tasks-section h4 {
  margin-bottom: 12px;
  font-size: 14px;
  color: #303133;
}
</style>
