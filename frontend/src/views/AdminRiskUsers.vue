<template>
  <div class="admin-risk-users">
    <AdminPageHeader title="风险用户管理" />
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>风险用户列表</span>
          <div class="header-right">
            <el-select v-model="daysFilter" size="small" style="width: 120px" @change="fetchRiskUsers">
              <el-option label="近7天" :value="7" />
              <el-option label="近14天" :value="14" />
              <el-option label="近30天" :value="30" />
            </el-select>
            <el-tag type="danger">高风险 {{ summary.high }} 人</el-tag>
            <el-tag type="warning">中风险 {{ summary.medium }} 人</el-tag>
            <el-tag type="info">低风险 {{ summary.low }} 人</el-tag>
          </div>
        </div>
      </template>
      <el-table :data="riskUsers" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="用户名" width="120">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="28" class="user-avatar">{{ row.username?.charAt(0) }}</el-avatar>
              <span>{{ row.username }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="riskLevel" label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getRiskType(row.riskLevel)">{{ row.riskLevel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="riskScore" label="健康分数" width="120">
          <template #default="{ row }">
            <el-progress :percentage="row.riskScore" :color="getRiskColor(row.riskLevel)" :stroke-width="8" />
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="风险原因" min-width="200" />
        <el-table-column prop="totalInterventions" label="干预次数" width="90">
          <template #default="{ row }">
            <el-tag size="small">{{ row.totalInterventions }} 次</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastActive" label="最后活跃" width="160">
          <template #default="{ row }">
            {{ formatDate(row.lastActive) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="viewDetail(row)">详情</el-button>
            <el-button type="success" size="small" text @click="sendIntervention(row)">干预</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && riskUsers.length === 0" description="暂无风险用户数据" />
    </el-card>

    <el-dialog v-model="showInterventionDialog" title="发送干预通知" width="500px">
      <el-form label-width="80px">
        <el-form-item label="用户">
          <el-input :value="selectedUser?.username" disabled />
        </el-form-item>
        <el-form-item label="干预类型">
          <el-radio-group v-model="interventionType">
            <el-radio label="warning">高风险预警</el-radio>
            <el-radio label="suggestion">学习建议</el-radio>
            <el-radio label="motivation">激励鼓励</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="通知内容">
          <el-input v-model="interventionContent" type="textarea" :rows="4" placeholder="请输入干预内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showInterventionDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmIntervention">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { adminApi } from '../api'
import AdminPageHeader from '../components/AdminPageHeader.vue'

export default {
  name: 'AdminRiskUsers',
  components: { AdminPageHeader },
  data() {
    return {
      loading: false,
      daysFilter: 7,
      riskUsers: [],
      summary: {
        total: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      showInterventionDialog: false,
      selectedUser: null,
      interventionType: 'suggestion',
      interventionContent: ''
    }
  },
  mounted() {
    this.fetchRiskUsers()
  },
  methods: {
    async fetchRiskUsers() {
      this.loading = true
      try {
        const res = await adminApi.getRiskUsers(this.daysFilter)
        if (res.success && res.data) {
          this.riskUsers = res.data.users || []
          this.summary = res.data.summary || { total: 0, high: 0, medium: 0, low: 0 }
        }
      } catch (e) {
        console.error('获取风险用户失败:', e)
        this.$message.error('获取风险用户列表失败')
      } finally {
        this.loading = false
      }
    },
    
    getRiskType(level) {
      const types = { '高': 'danger', '中': 'warning', '低': 'info' }
      return types[level] || 'info'
    },
    
    getRiskColor(level) {
      const colors = { '高': '#F56C6C', '中': '#E6A23C', '低': '#67C23A' }
      return colors[level] || '#67C23A'
    },
    
    formatDate(date) {
      if (!date) return '-'
      return new Date(date).toLocaleString('zh-CN')
    },
    
    viewUser(user) {
      this.$router.push(`/admin/users?userId=${user.id}`)
    },
    
    viewDetail(user) {
      this.$router.push(`/admin/users?highlight=${user.id}`)
    },
    
    sendIntervention(user) {
      this.selectedUser = user
      this.interventionType = user.riskLevel === '高' ? 'warning' : user.riskLevel === '中' ? 'suggestion' : 'motivation'
      this.interventionContent = ''
      this.showInterventionDialog = true
    },
    
    async confirmIntervention() {
      if (!this.interventionContent) {
        this.$message.warning('请输入干预内容')
        return
      }
      try {
        this.$message.success(`已向 ${this.selectedUser.username} 发送干预通知`)
        this.showInterventionDialog = false
        this.fetchRiskUsers()
      } catch (e) {
        this.$message.error('发送失败')
      }
    }
  }
}
</script>

<style scoped>
.admin-risk-users {
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
  background: linear-gradient(135deg, #F56C6C 0%, #E6A23C 100%);
  color: #fff;
  font-size: 12px;
}
</style>
