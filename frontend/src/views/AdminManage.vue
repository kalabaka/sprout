<template>
  <div class="admin-manage">
    <AdminPageHeader title="管理员账号管理" />
    <el-card shadow="never" class="search-card">
      <el-form :inline="true">
        <el-form-item label="搜索">
          <el-input v-model="searchKeyword" placeholder="管理员用户名" clearable @keyup.enter="fetchAdmins" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchAdmins">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">重置</el-button>
          <el-button type="success" @click="openAddDialog">
            <el-icon><Plus /></el-icon>
            添加管理员
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>管理员列表</span>
          <div class="header-info">
            <el-tag type="danger" size="small">超级管理员: {{ superAdminCount }}/3</el-tag>
            <el-tag type="info" size="small" style="margin-left: 8px;">管理员: {{ adminCount }}/9</el-tag>
            <span class="total" style="margin-left: 8px;">共 {{ total }} 人</span>
          </div>
        </div>
      </template>

      <el-table :data="admins" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="role" label="角色" width="150">
          <template #default="{ row }">
            <el-tag :type="row.role === 'super_admin' ? 'danger' : 'info'" size="small">
              {{ row.role === 'super_admin' ? '超级管理员' : '管理员' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="editAdmin(row)">编辑</el-button>
            <el-button type="warning" size="small" text @click="resetPassword(row)">重置密码</el-button>
            <el-button type="danger" size="small" text @click="deleteAdmin(row)" :disabled="row.id === currentAdminId">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="limit"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchAdmins"
          @current-change="fetchAdmins"
        />
      </div>
    </el-card>

    <el-dialog v-model="showAddDialog" :title="isEdit ? '编辑管理员' : '添加管理员'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" autocomplete="off">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" autocomplete="off" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="选择角色">
            <el-option label="超级管理员" value="super_admin" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码（至少6位）" autocomplete="new-password" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showResetDialog" title="重置密码" width="400px">
      <el-form ref="resetFormRef" :model="resetForm" :rules="resetRules" label-width="80px" autocomplete="off">
        <el-form-item label="管理员">
          <el-input :value="resetForm.username" disabled />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="resetForm.newPassword" type="password" show-password placeholder="请输入新密码（至少6位）" autocomplete="new-password" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showResetDialog = false">取消</el-button>
        <el-button type="primary" @click="submitResetPassword">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Search, Plus } from '@element-plus/icons-vue'
import { adminApi } from '../api'
import { getAdminToken } from '../utils/token'
import AdminPageHeader from '../components/AdminPageHeader.vue'

export default {
  name: 'AdminManage',
  components: { Search, Plus, AdminPageHeader },
  data() {
    return {
      admins: [],
      loading: false,
      searchKeyword: '',
      page: 1,
      limit: 10,
      total: 0,
      showAddDialog: false,
      showResetDialog: false,
      isEdit: false,
      currentAdminId: null,
      form: {
        id: null,
        username: '',
        role: '',
        password: ''
      },
      rules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        role: [{ required: true, message: '请选择角色', trigger: 'change' }],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码长度至少6位', trigger: 'blur' }
        ]
      },
      resetForm: {
        id: null,
        username: '',
        newPassword: ''
      },
      resetRules: {
        newPassword: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 6, message: '密码长度至少6位', trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    superAdminCount() {
      return this.admins.filter(admin => admin.role === 'super_admin').length
    },
    adminCount() {
      return this.admins.filter(admin => admin.role === 'admin').length
    }
  },
  mounted() {
    this.getCurrentAdminId()
    this.fetchAdmins()
  },
  methods: {
    getCurrentAdminId() {
      const token = getAdminToken()
      if (!token) {
        return
      }
      
      try {
        const parts = token.split('.')
        if (parts.length !== 3) {
          console.error('Token格式不正确')
          return
        }
        
        let payload = parts[1]
        payload = payload.replace(/-/g, '+').replace(/_/g, '/')
        const pad = payload.length % 4
        if (pad) {
          payload += '='.repeat(4 - pad)
        }
        
        const decoded = atob(payload)
        const payloadObj = JSON.parse(decoded)
        this.currentAdminId = payloadObj.adminId || payloadObj.id
      } catch (e) {
        console.error('解析token失败', e)
      }
    },
    async fetchAdmins() {
      this.loading = true
      try {
        const res = await adminApi.getAdmins({
          page: this.page,
          limit: this.limit,
          keyword: this.searchKeyword
        })
        this.admins = res.data || []
        this.total = res.total || 0
      } catch (e) {
        this.$message.error('获取管理员列表失败')
      } finally {
        this.loading = false
      }
    },
    resetSearch() {
      this.searchKeyword = ''
      this.page = 1
      this.fetchAdmins()
    },
    openAddDialog() {
      this.isEdit = false
      this.form = {
        id: null,
        username: '',
        role: '',
        password: ''
      }
      this.showAddDialog = true
    },
    editAdmin(admin) {
      this.isEdit = true
      this.form = {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        password: ''
      }
      this.showAddDialog = true
    },
    async deleteAdmin(admin) {
      try {
        await this.$confirm(
          `确定要删除管理员 "${admin.username}" 吗？此操作不可恢复！`,
          '警告',
          {
            type: 'warning',
            confirmButtonText: '确定删除',
            cancelButtonText: '取消',
            confirmButtonClass: 'el-button--danger'
          }
        )
        await adminApi.deleteAdmin(admin.id)
        this.$message.success('管理员删除成功')
        this.fetchAdmins()
      } catch (e) {
        if (e !== 'cancel') {
          const errorMsg = e.response?.data?.message || e.message || '删除失败'
          this.$message.error(errorMsg)
        }
      }
    },
    resetPassword(admin) {
      this.resetForm = {
        id: admin.id,
        username: admin.username,
        newPassword: ''
      }
      this.showResetDialog = true
    },
    async submitForm() {
      const formRef = this.$refs.formRef
      if (!formRef) return

      try {
        await formRef.validate()
        const data = { ...this.form }

        if (this.isEdit) {
          await adminApi.updateAdmin(this.form.id, {
            username: data.username,
            role: data.role
          })
          this.$message.success('管理员信息更新成功')
        } else {
          await adminApi.addAdmin({
            username: data.username,
            password: data.password,
            role: data.role
          })
          this.$message.success('管理员添加成功')
        }
        this.showAddDialog = false
        this.fetchAdmins()
      } catch (e) {
        if (e !== false) {
          const errorMsg = e.response?.data?.message || e.message || '操作失败'
          this.$message.error(errorMsg)
        }
      }
    },
    async submitResetPassword() {
      const formRef = this.$refs.resetFormRef
      if (!formRef) return

      try {
        await formRef.validate()
        await adminApi.resetAdminPassword(this.resetForm.id, {
          newPassword: this.resetForm.newPassword
        })
        this.$message.success('密码重置成功')
        this.showResetDialog = false
      } catch (e) {
        if (e !== false) {
          const errorMsg = e.response?.data?.message || e.message || '重置失败'
          this.$message.error(errorMsg)
        }
      }
    },
    formatDate(date) {
      if (!date) return '-'
      return new Date(date).toLocaleString('zh-CN')
    }
  }
}
</script>

<style scoped>
.admin-manage {
  padding: 0;
}

.search-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info {
  display: flex;
  align-items: center;
}

.total {
  font-size: 13px;
  color: #909399;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
