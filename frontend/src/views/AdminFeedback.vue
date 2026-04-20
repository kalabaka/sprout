<template>
  <div class="admin-feedback">
    <AdminPageHeader title="用户反馈" />
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>用户反馈</span>
          <div class="header-right">
            <el-select v-model="statusFilter" size="small" style="width: 100px" @change="fetchFeedback">
              <el-option label="全部" value="" />
              <el-option label="待处理" value="pending" />
              <el-option label="已处理" value="handled" />
            </el-select>
            <el-tag type="warning">{{ pendingCount }} 条待处理</el-tag>
          </div>
        </div>
      </template>
      <el-table :data="feedbackList" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="用户" width="100">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="24" class="user-avatar">{{ row.username?.charAt(0) }}</el-avatar>
              <span>{{ row.username }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getFeedbackTagType(row.type)" size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="内容" min-width="250" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="提交时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'pending' ? 'warning' : 'success'" size="small">
              {{ row.status === 'pending' ? '待处理' : '已处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="viewFeedback(row)">查看</el-button>
            <el-button 
              v-if="row.status === 'pending'"
              type="success" 
              size="small" 
              text 
              @click="handleFeedback(row)"
            >
              处理
            </el-button>
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
      
      <el-empty v-if="!loading && feedbackList.length === 0" description="暂无用户反馈" />
    </el-card>

    <el-dialog v-model="showDetailDialog" title="反馈详情" width="600px">
      <el-descriptions :column="1" border v-if="currentFeedback">
        <el-descriptions-item label="反馈ID">{{ currentFeedback.id }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ currentFeedback.username }}</el-descriptions-item>
        <el-descriptions-item label="类型">
          <el-tag :type="getFeedbackTagType(currentFeedback.type)" size="small">
            {{ currentFeedback.type }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ formatDate(currentFeedback.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="反馈内容">{{ currentFeedback.content }}</el-descriptions-item>
        <el-descriptions-item label="原始内容" v-if="currentFeedback.originalContent">
          {{ currentFeedback.originalContent }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentFeedback.status === 'pending' ? 'warning' : 'success'">
            {{ currentFeedback.status === 'pending' ? '待处理' : '已处理' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
        <el-button 
          v-if="currentFeedback?.status === 'pending'"
          type="primary" 
          @click="confirmHandleFeedback"
        >
          标记为已处理
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { adminApi } from '../api'
import AdminPageHeader from '../components/AdminPageHeader.vue'

export default {
  name: 'AdminFeedback',
  components: { AdminPageHeader },
  data() {
    return {
      loading: false,
      feedbackList: [],
      pendingCount: 0,
      total: 0,
      page: 1,
      limit: 20,
      statusFilter: '',
      showDetailDialog: false,
      currentFeedback: null
    }
  },
  mounted() {
    this.fetchFeedback()
  },
  methods: {
    async fetchFeedback() {
      this.loading = true
      try {
        const res = await adminApi.getFeedback({
          page: this.page,
          limit: this.limit,
          status: this.statusFilter
        })
        if (res.success) {
          this.feedbackList = res.data || []
          this.total = res.total || 0
          this.pendingCount = res.pendingCount || 0
        }
      } catch (e) {
        console.error('获取反馈列表失败:', e)
        this.$message.error('获取反馈列表失败')
      } finally {
        this.loading = false
      }
    },
    
    handlePageChange(page) {
      this.page = page
      this.fetchFeedback()
    },
    
    getFeedbackTagType(type) {
      const types = {
        '正面反馈': 'success',
        '负面反馈': 'danger',
        '风险预警': 'danger',
        '学习建议': 'warning',
        '激励鼓励': 'primary',
        '任务反馈': 'info'
      }
      return types[type] || 'info'
    },
    
    formatDate(date) {
      if (!date) return '-'
      return new Date(date).toLocaleString('zh-CN')
    },
    
    viewFeedback(item) {
      this.currentFeedback = item
      this.showDetailDialog = true
    },
    
    async handleFeedback(item) {
      try {
        await this.$confirm('确定要将此反馈标记为已处理吗？', '提示', { type: 'info' })
        await adminApi.handleFeedback(item.id)
        this.$message.success('反馈已处理')
        this.fetchFeedback()
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error('处理失败')
        }
      }
    },
    
    async confirmHandleFeedback() {
      if (!this.currentFeedback) return
      try {
        await adminApi.handleFeedback(this.currentFeedback.id)
        this.$message.success('反馈已处理')
        this.showDetailDialog = false
        this.fetchFeedback()
      } catch (e) {
        this.$message.error('处理失败')
      }
    }
  }
}
</script>

<style scoped>
.admin-feedback {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  background: linear-gradient(135deg, #9B59B6 0%, #C39BD3 100%);
  color: #fff;
  font-size: 12px;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
