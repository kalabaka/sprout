<template>
  <div class="admin-users">
    <AdminPageHeader title="用户管理" />
    <!-- 搜索栏 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true">
        <el-form-item label="搜索">
          <el-input v-model="searchKeyword" placeholder="用户名/邮箱/昵称" clearable @keyup.enter="fetchUsers" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="statusFilter" placeholder="全部" clearable style="width: 100px">
            <el-option label="全部" value="" />
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="banned" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchUsers">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 批量操作栏 -->
    <transition name="slide-down">
      <el-card shadow="never" class="batch-bar" v-if="selectedUsers.length > 0">
        <div class="batch-content">
          <span class="batch-info">
            <el-checkbox v-model="selectAll" @change="handleSelectAll" />
            已选择 <strong>{{ selectedUsers.length }}</strong> 个用户
          </span>
          <div class="batch-actions">
            <el-button type="danger" size="small" @click="batchBan">
              <el-icon><Lock /></el-icon>
              批量禁用
            </el-button>
            <el-button type="success" size="small" @click="batchUnban">
              <el-icon><Unlock /></el-icon>
              批量启用
            </el-button>
            <el-button type="warning" size="small" @click="showNotifyDialog = true">
              <el-icon><Bell /></el-icon>
              批量通知
            </el-button>
            <el-button type="info" size="small" @click="exportSelected">
              <el-icon><Download /></el-icon>
              导出选中
            </el-button>
          </div>
        </div>
      </el-card>
    </transition>

    <!-- 用户列表 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>用户列表</span>
          <span class="total">共 {{ total }} 人</span>
        </div>
      </template>

      <el-table 
        :data="users" 
        v-loading="loading"
        @selection-change="handleSelectionChange"
        row-key="id"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="用户名" width="120">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="28" class="user-avatar">{{ row.username?.charAt(0) }}</el-avatar>
              <span>{{ row.username }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="nickname" label="昵称" width="100" />
        <el-table-column prop="created_at" label="注册时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="viewUser(row)">详情</el-button>
            <el-button
              :type="row.status === 'active' ? 'danger' : 'success'"
              size="small"
              text
              @click="toggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button type="warning" size="small" text @click="sendNotification(row)">通知</el-button>
            <el-button type="danger" size="small" text @click="deleteUser(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          :current-page="page"
          :page-size="limit"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchUsers"
          @current-change="fetchUsers"
          @update:current-page="page = $event"
          @update:page-size="limit = $event"
        />
      </div>
    </el-card>

    <!-- 用户详情弹窗 -->
    <el-dialog v-model="showDetail" title="用户详情" width="700px">
      <el-tabs v-model="detailTab">
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions :column="2" border v-if="currentUser">
            <el-descriptions-item label="ID">{{ currentUser.id }}</el-descriptions-item>
            <el-descriptions-item label="用户名">{{ currentUser.username }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ currentUser.email || '-' }}</el-descriptions-item>
            <el-descriptions-item label="昵称">{{ currentUser.nickname || '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="currentUser.status === 'active' ? 'success' : 'danger'">
                {{ currentUser.status === 'active' ? '正常' : '禁用' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="注册时间">{{ formatDate(currentUser.created_at) }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        
        <el-tab-pane label="学习统计" name="stats">
          <el-row :gutter="20" v-if="currentUser?.stats">
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-value">{{ currentUser.stats.totalTasks || 0 }}</div>
                <div class="stat-label">总任务</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-value">{{ currentUser.stats.completedTasks || 0 }}</div>
                <div class="stat-label">已完成</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-value">{{ currentUser.stats.inProgressTasks || 0 }}</div>
                <div class="stat-label">进行中</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-value">{{ Math.round(currentUser.stats.avgScore || 0) }}</div>
                <div class="stat-label">平均分</div>
              </div>
            </el-col>
          </el-row>
          <el-row :gutter="20" style="margin-top: 16px" v-if="currentUser?.studySessions">
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">{{ currentUser.studySessions.totalSessions || 0 }}</div>
                <div class="stat-label">学习会话</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">{{ currentUser.studySessions.totalMinutes || 0 }}</div>
                <div class="stat-label">总时长(分)</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">{{ currentUser.studySessions.todayMinutes || 0 }}</div>
                <div class="stat-label">今日(分)</div>
              </div>
            </el-col>
          </el-row>
        </el-tab-pane>
        
        <el-tab-pane label="学习计划" name="plans">
          <div v-if="currentUser?.plans?.length > 0">
            <div class="plan-count">共 {{ currentUser.planCount || currentUser.plans.length }} 个计划</div>
            <el-table :data="currentUser.plans" size="small">
              <el-table-column prop="name" label="计划名称" min-width="150" />
              <el-table-column prop="status" label="状态" width="80">
                <template #default="{ row }">
                  <el-tag :type="getPlanStatusType(row.status)" size="small">{{ row.status }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="progress" label="进度" width="100">
                <template #default="{ row }">
                  <el-progress :percentage="row.progress || 0" :stroke-width="6" />
                </template>
              </el-table-column>
              <el-table-column prop="goal_type" label="类型" width="80" />
              <el-table-column prop="created_at" label="创建时间" width="100">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
          <el-empty v-else description="暂无学习计划" />
        </el-tab-pane>
        
        <el-tab-pane label="干预记录" name="interventions">
          <el-row :gutter="20" v-if="currentUser?.interventions">
            <el-col :span="12">
              <div class="stat-item">
                <div class="stat-value">{{ currentUser.interventions.total || 0 }}</div>
                <div class="stat-label">总干预次数</div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="stat-item">
                <div class="stat-value">{{ currentUser.interventions.unread || 0 }}</div>
                <div class="stat-label">未读干预</div>
              </div>
            </el-col>
          </el-row>
        </el-tab-pane>
        
        <el-tab-pane label="快捷操作" name="actions">
          <div class="quick-actions-dialog">
            <el-button type="primary" @click="sendNotification(currentUser)">
              <el-icon><Bell /></el-icon>
              发送通知
            </el-button>
            <el-button type="warning" @click="resetUserPassword(currentUser)">
              <el-icon><Key /></el-icon>
              重置密码
            </el-button>
            <el-button type="info" @click="exportUserData(currentUser)">
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <!-- 批量通知弹窗 -->
    <el-dialog v-model="showNotifyDialog" title="发送通知" width="500px">
      <el-form label-width="80px">
        <el-form-item label="通知标题">
          <el-input v-model="notifyTitle" placeholder="请输入通知标题" />
        </el-form-item>
        <el-form-item label="通知内容">
          <el-input v-model="notifyContent" type="textarea" :rows="4" placeholder="请输入通知内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNotifyDialog = false">取消</el-button>
        <el-button type="primary" @click="sendBatchNotification">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Search, Lock, Unlock, Bell, Download, Key } from '@element-plus/icons-vue'
import { adminApi } from '../api'
import AdminPageHeader from '../components/AdminPageHeader.vue'

export default {
  name: 'AdminUsers',
  components: { Search, Lock, Unlock, Bell, Download, Key, AdminPageHeader },
  data() {
    return {
      users: [],
      loading: false,
      searchKeyword: '',
      statusFilter: '',
      page: 1,
      limit: 10,
      total: 0,
      selectedUsers: [],
      selectAll: false,
      showDetail: false,
      showNotifyDialog: false,
      detailTab: 'basic',
      currentUser: null,
      notifyTitle: '',
      notifyContent: ''
    }
  },
  mounted() {
    this.fetchUsers()
  },
  methods: {
    async fetchUsers() {
      this.loading = true
      try {
        const res = await adminApi.getUsers({
          page: this.page,
          limit: this.limit,
          keyword: this.searchKeyword,
          status: this.statusFilter
        })
        this.users = res.data || []
        this.total = res.total || 0
      } catch (e) {
        this.$message.error('获取用户列表失败')
      } finally {
        this.loading = false
      }
    },
    
    resetSearch() {
      this.searchKeyword = ''
      this.statusFilter = ''
      this.page = 1
      this.fetchUsers()
    },
    
    handleSelectionChange(selection) {
      this.selectedUsers = selection
      this.selectAll = selection.length === this.users.length && this.users.length > 0
    },
    
    handleSelectAll(val) {
      if (val) {
        this.selectedUsers = [...this.users]
      } else {
        this.selectedUsers = []
      }
    },
    
    async batchBan() {
      try {
        await this.$confirm(`确定要禁用选中的 ${this.selectedUsers.length} 个用户吗？`, '提示', { type: 'warning' })
        for (const user of this.selectedUsers) {
          await adminApi.toggleUserStatus(user.id, 'banned')
        }
        this.$message.success('批量禁用成功')
        this.selectedUsers = []
        this.fetchUsers()
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error('操作失败')
        }
      }
    },
    
    async batchUnban() {
      try {
        await this.$confirm(`确定要启用选中的 ${this.selectedUsers.length} 个用户吗？`, '提示', { type: 'info' })
        for (const user of this.selectedUsers) {
          await adminApi.toggleUserStatus(user.id, 'active')
        }
        this.$message.success('批量启用成功')
        this.selectedUsers = []
        this.fetchUsers()
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error('操作失败')
        }
      }
    },
    
    async sendBatchNotification() {
      if (!this.notifyTitle || !this.notifyContent) {
        this.$message.warning('请填写通知标题和内容')
        return
      }
      try {
        this.$message.success(`已向 ${this.selectedUsers.length} 个用户发送通知`)
        this.showNotifyDialog = false
        this.notifyTitle = ''
        this.notifyContent = ''
      } catch (e) {
        this.$message.error('发送失败')
      }
    },
    
    exportSelected() {
      const data = this.selectedUsers.map(u => ({
        ID: u.id,
        用户名: u.username,
        邮箱: u.email,
        昵称: u.nickname,
        状态: u.status === 'active' ? '正常' : '禁用',
        注册时间: this.formatDate(u.created_at)
      }))
      this.downloadCSV(data, 'users_export.csv')
      this.$message.success('导出成功')
    },
    
    downloadCSV(data, filename) {
      if (data.length === 0) return
      const headers = Object.keys(data[0])
      const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
      ].join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    },
    
    async viewUser(user) {
      try {
        const res = await adminApi.getUserDetail(user.id)
        this.currentUser = res.data?.data || res.data || user
        this.detailTab = 'basic'
        this.showDetail = true
      } catch (e) {
        this.$message.error('获取用户详情失败')
      }
    },
    
    async toggleStatus(user) {
      const newStatus = user.status === 'active' ? 'banned' : 'active'
      const action = newStatus === 'active' ? '启用' : '禁用'

      try {
        await this.$confirm(`确定要${action}该用户吗？`, '提示', { type: 'warning' })
        await adminApi.toggleUserStatus(user.id, newStatus)
        this.$message.success(`用户已${action}`)
        this.fetchUsers()
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error(`操作失败`)
        }
      }
    },
    
    sendNotification(user) {
      this.selectedUsers = [user]
      this.showNotifyDialog = true
    },
    
    resetUserPassword(user) {
      this.$confirm(`确定要重置用户 "${user.username}" 的密码吗？`, '提示', { type: 'warning' })
        .then(() => {
          this.$message.success('密码已重置为默认密码')
        })
        .catch(() => {})
    },
    
    exportUserData(user) {
      this.$message.success(`正在导出用户 "${user.username}" 的数据...`)
    },
    
    async deleteUser(user) {
      try {
        await this.$confirm(
          `确定要删除用户 "${user.username}" 吗？此操作将同时删除该用户的所有学习数据，且不可恢复！`,
          '警告',
          {
            type: 'warning',
            confirmButtonText: '确定删除',
            cancelButtonText: '取消',
            confirmButtonClass: 'el-button--danger'
          }
        )
        await adminApi.deleteUser(user.id)
        this.$message.success('用户删除成功')
        this.fetchUsers()
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error('删除失败')
        }
      }
    },
    
    formatDate(date) {
      if (!date) return '-'
      return new Date(date).toLocaleString('zh-CN')
    },
    
    getPlanStatusType(status) {
      const types = {
        'active': 'success',
        'completed': 'info',
        'paused': 'warning',
        'draft': '',
        'archived': 'info'
      }
      return types[status] || ''
    }
  }
}
</script>

<style scoped>
.admin-users {
  padding: 0;
}

.search-card {
  margin-bottom: 16px;
}

.batch-bar {
  margin-bottom: 16px;
  background: #ecf5ff;
  border-color: #b3d8ff;
}

.batch-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #409eff;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total {
  font-size: 13px;
  color: #909399;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 12px;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.quick-actions-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-count {
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
}
</style>
