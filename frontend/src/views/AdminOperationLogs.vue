<template>
  <div class="admin-operation-logs">
    <AdminPageHeader title="操作日志" />
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>操作日志</span>
          <div class="header-actions">
            <el-select v-model="actionFilter" placeholder="操作类型" size="small" style="width: 120px" clearable @change="fetchLogs">
              <el-option label="全部" value="" />
              <el-option label="登录" value="登录" />
              <el-option label="新增" value="新增" />
              <el-option label="修改" value="修改" />
              <el-option label="删除" value="删除" />
              <el-option label="导出" value="导出" />
            </el-select>
            <el-date-picker 
              v-model="dateRange" 
              type="daterange" 
              range-separator="至" 
              start-placeholder="开始日期" 
              end-placeholder="结束日期" 
              size="small"
              @change="fetchLogs"
            />
            <el-button type="primary" size="small" @click="fetchLogs">查询</el-button>
            <el-button size="small" @click="exportLogs">导出</el-button>
          </div>
        </div>
      </template>
      <el-table :data="logs" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="operator_name" label="操作人" width="100">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="24" class="user-avatar">{{ row.operator_name?.charAt(0) }}</el-avatar>
              <span>{{ row.operator_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getActionType(row.action)" size="small">{{ row.action }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target_type" label="对象类型" width="100">
          <template #default="{ row }">
            <span>{{ row.target_type || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="target_name" label="操作对象" min-width="150">
          <template #default="{ row }">
            <span>{{ row.target_name || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
        <el-table-column prop="ip_address" label="IP地址" width="130" />
        <el-table-column prop="created_at" label="操作时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-container">
        <el-pagination
          :current-page="page"
          :page-size="limit"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
      <el-empty v-if="!loading && logs.length === 0" description="暂无操作日志" />
    </el-card>
  </div>
</template>

<script>
import { adminApi } from '../api'
import AdminPageHeader from '../components/AdminPageHeader.vue'

export default {
  name: 'AdminOperationLogs',
  components: { AdminPageHeader },
  data() {
    return {
      loading: false,
      logs: [],
      total: 0,
      page: 1,
      limit: 20,
      actionFilter: '',
      dateRange: null
    }
  },
  mounted() {
    this.fetchLogs()
  },
  methods: {
    async fetchLogs() {
      this.loading = true
      try {
        const params = {
          page: this.page,
          limit: this.limit,
          action: this.actionFilter
        }
        if (this.dateRange && this.dateRange.length === 2) {
          params.startDate = this.formatDateStr(this.dateRange[0])
          params.endDate = this.formatDateStr(this.dateRange[1])
        }
        
        const res = await adminApi.getOperationLogs(params)
        if (res.success) {
          this.logs = res.data || []
          this.total = res.total || 0
        }
      } catch (e) {
        console.error('获取操作日志失败:', e)
        this.$message.error('获取操作日志失败')
      } finally {
        this.loading = false
      }
    },
    
    handlePageChange(page) {
      this.page = page
      this.fetchLogs()
    },
    
    getActionType(action) {
      const types = { 
        '登录': 'success', 
        '登出': 'info',
        '修改': 'warning', 
        '删除': 'danger', 
        '新增': 'primary',
        '导出': ''
      }
      return types[action] || 'info'
    },
    
    formatDate(date) {
      if (!date) return '-'
      return new Date(date).toLocaleString('zh-CN')
    },
    
    formatDateStr(date) {
      const d = new Date(date)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    
    exportLogs() {
      this.$message.success('日志导出中...')
    }
  }
}
</script>

<style scoped>
.admin-operation-logs {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  background: linear-gradient(135deg, #409EFF 0%, #67C23A 100%);
  color: #fff;
  font-size: 12px;
}
</style>
