<template>
  <div class="admin-error-logs">
    <AdminPageHeader title="错误日志" />
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>错误日志</span>
          <div class="header-actions">
            <el-select v-model="errorLevel" placeholder="错误级别" size="small" style="width: 120px" clearable @change="fetchLogs">
              <el-option label="全部" value="" />
              <el-option label="ERROR" value="ERROR" />
              <el-option label="WARN" value="WARN" />
              <el-option label="INFO" value="INFO" />
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
          </div>
        </div>
      </template>
      <el-table :data="logs" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="level" label="级别" width="80">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.level)" size="small">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="错误信息" min-width="300" show-overflow-tooltip />
        <el-table-column prop="source" label="来源" width="120" />
        <el-table-column prop="request_url" label="请求URL" width="150" show-overflow-tooltip />
        <el-table-column prop="created_at" label="发生时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="viewDetail(row)">详情</el-button>
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
      <el-empty v-if="!loading && logs.length === 0" description="暂无错误日志" />
    </el-card>

    <el-dialog v-model="showDetail" title="错误详情" width="700px">
      <el-descriptions :column="1" border v-if="currentLog">
        <el-descriptions-item label="错误级别">
          <el-tag :type="getLevelType(currentLog.level)">{{ currentLog.level }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="错误信息">{{ currentLog.message }}</el-descriptions-item>
        <el-descriptions-item label="来源">{{ currentLog.source || '-' }}</el-descriptions-item>
        <el-descriptions-item label="请求URL">{{ currentLog.request_url || '-' }}</el-descriptions-item>
        <el-descriptions-item label="请求方法">{{ currentLog.request_method || '-' }}</el-descriptions-item>
        <el-descriptions-item label="用户ID">{{ currentLog.user_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="IP地址">{{ currentLog.ip_address || '-' }}</el-descriptions-item>
        <el-descriptions-item label="发生时间">{{ formatDate(currentLog.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="堆栈信息" v-if="currentLog.stack_trace">
          <pre class="stack-trace">{{ currentLog.stack_trace }}</pre>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
        <el-button type="success" @click="markResolved(currentLog)" v-if="!currentLog?.resolved">
          标记已解决
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { adminApi } from '../api'
import AdminPageHeader from '../components/AdminPageHeader.vue'

export default {
  name: 'AdminErrorLogs',
  components: { AdminPageHeader },
  data() {
    return {
      loading: false,
      logs: [],
      total: 0,
      page: 1,
      limit: 20,
      errorLevel: '',
      dateRange: null,
      showDetail: false,
      currentLog: null
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
          level: this.errorLevel
        }
        if (this.dateRange && this.dateRange.length === 2) {
          params.startDate = this.formatDateStr(this.dateRange[0])
          params.endDate = this.formatDateStr(this.dateRange[1])
        }
        
        const res = await adminApi.getErrorLogs(params)
        if (res.success) {
          this.logs = res.data || []
          this.total = res.total || 0
        }
      } catch (e) {
        console.error('获取错误日志失败:', e)
        this.$message.error('获取错误日志失败')
      } finally {
        this.loading = false
      }
    },
    
    handlePageChange(page) {
      this.page = page
      this.fetchLogs()
    },
    
    getLevelType(level) {
      const types = {
        'ERROR': 'danger',
        'WARN': 'warning',
        'INFO': 'info'
      }
      return types[level] || 'info'
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
    
    viewDetail(log) {
      this.currentLog = log
      this.showDetail = true
    },
    
    markResolved(log) {
      this.$message.success('已标记为已解决')
      this.showDetail = false
      this.fetchLogs()
    }
  }
}
</script>

<style scoped>
.admin-error-logs {
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

.stack-trace {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
}
</style>
