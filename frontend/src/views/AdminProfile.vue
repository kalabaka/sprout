<template>
  <div class="admin-profile-container">
    <AdminPageHeader title="个人中心" />
    <div class="content-wrapper">
      <el-card class="box-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>👤 基本信息</span>
          </div>
        </template>

        <el-descriptions :column="1" border v-if="adminInfo">
          <el-descriptions-item label="管理员ID">{{ adminInfo.id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ adminInfo.username }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag :type="adminInfo.role === 'super_admin' ? 'danger' : 'info'">
              {{ adminInfo.role === 'super_admin' ? '超级管理员' : '普通管理员' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(adminInfo.created_at) }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card class="box-card" shadow="hover" style="margin-top: 20px;">
        <template #header>
          <div class="card-header">
            <span>🔒 修改密码</span>
          </div>
        </template>

        <el-form
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          label-width="100px"
          style="max-width: 500px;"
        >
          <el-form-item label="原密码" prop="oldPassword">
            <el-input
              v-model="passwordForm.oldPassword"
              type="password"
              show-password
              placeholder="请输入当前密码"
            />
          </el-form-item>

          <el-form-item label="新密码" prop="newPassword">
            <el-input
              v-model="passwordForm.newPassword"
              type="password"
              show-password
              placeholder="请输入新密码（至少6位）"
            />
          </el-form-item>

          <el-form-item label="确认新密码" prop="confirmPassword">
            <el-input
              v-model="passwordForm.confirmPassword"
              type="password"
              show-password
              placeholder="请再次输入新密码"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="submitPassword" :loading="saving">
              保存修改
            </el-button>
            <el-button @click="resetPasswordForm">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script>
import { adminApi } from '../api'
import AdminPageHeader from '../components/AdminPageHeader.vue'

export default {
  name: 'AdminProfile',
  components: { AdminPageHeader },
  data() {
    const validateConfirmPass = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('请再次输入密码'))
      } else if (value !== this.passwordForm.newPassword) {
        callback(new Error('两次输入密码不一致!'))
      } else {
        callback()
      }
    }

    return {
      adminInfo: null,
      saving: false,
      passwordForm: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      passwordRules: {
        oldPassword: [
          { required: true, message: '请输入原密码', trigger: 'blur' }
        ],
        newPassword: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 6, message: '长度至少6个字符', trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, validator: validateConfirmPass, trigger: 'blur' }
        ]
      }
    }
  },
  mounted() {
    this.fetchProfile()
  },
  methods: {
    async fetchProfile() {
      try {
        const res = await adminApi.getProfile()
        this.adminInfo = res.data || null
      } catch (error) {
        this.$message.error('获取信息失败')
      }
    },
    async submitPassword() {
      const formRef = this.$refs.passwordFormRef
      if (!formRef) return

      try {
        await formRef.validate()
        this.saving = true

        const res = await adminApi.changePassword({
          oldPassword: this.passwordForm.oldPassword,
          newPassword: this.passwordForm.newPassword,
          confirmPassword: this.passwordForm.confirmPassword
        })

        this.$message.success(res.message || '密码修改成功')

        this.$confirm('密码已修改，为了安全起见，建议您重新登录。', '提示', {
          confirmButtonText: '立即重新登录',
          cancelButtonText: '稍后手动退出',
          type: 'warning'
        }).then(() => {
          this.handleLogout()
        }).catch(() => {
          this.resetPasswordForm()
        })
      } catch (error) {
        if (error !== false) {
          this.$message.error(error.message || '修改失败')
        }
      } finally {
        this.saving = false
      }
    },
    resetPasswordForm() {
      const formRef = this.$refs.passwordFormRef
      if (formRef) {
        formRef.resetFields()
      }
    },
    handleLogout() {
      localStorage.removeItem('admin_token')
      this.$router.push('/admin-login')
    },
    formatDate(dateStr) {
      if (!dateStr) return '-'
      const date = new Date(dateStr)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
  }
}
</script>

<style scoped>
.admin-profile-container {
  padding: 0;
}

.content-wrapper {
  max-width: 800px;
  margin: 0 auto;
}

.card-header {
  font-weight: bold;
}
</style>
