<template>
  <div class="admin-login-page">
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-icon">⚙️</div>
          <h1>管理员登录</h1>
          <p>新芽学习规划系统 - 管理后台</p>
        </div>

        <!-- 阻止浏览器自动填充 -->
        <el-form :model="form" autocomplete="off" @submit.prevent="handleLogin">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="管理员用户名"
              size="large"
              autocomplete="off"
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              size="large"
              show-password
              autocomplete="new-password"
              @keyup.enter="handleLogin"
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              class="login-btn"
              :loading="loading"
              @click="handleLogin"
            >
              {{ loading ? '登录中...' : '登录' }}
            </el-button>
          </el-form-item>
        </el-form>

        <div class="login-footer">
          <el-link type="primary" @click="$router.push('/login')">
            返回用户登录
          </el-link>
        </div>

        <div v-if="error" class="error-message">
          <el-icon><WarningFilled /></el-icon>
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { User, Lock, WarningFilled } from '@element-plus/icons-vue'
import { setAdminToken } from '../utils/token'
import axios from 'axios'

export default {
  name: 'AdminLogin',
  components: { User, Lock, WarningFilled },
  data() {
    return {
      form: {
        username: '',
        password: ''
      },
      loading: false,
      error: ''
    }
  },
  async mounted() {
    // 清除可能存在的旧凭证
    if (window.PasswordCredential) {
      await navigator.credentials.preventSilentAccess()
    }

    // 强制清空，防止缓存
    this.form.username = ''
    this.form.password = ''
  },
  methods: {
    async handleLogin() {
      if (!this.form.username || !this.form.password) {
        this.error = '请输入用户名和密码'
        return
      }

      this.loading = true
      this.error = ''

      try {
        const res = await axios.post('/api/admin-auth/login', {
          username: this.form.username,
          password: this.form.password
        })

        if (res.data && res.data.success) {
          setAdminToken(res.data.data.token)
          this.$message.success('登录成功')
          this.$router.push('/admin/dashboard')
        } else {
          this.error = res.data?.message || '登录失败'
        }
      } catch (e) {
        const message = e.response?.data?.message || e.message || '登录失败'
        this.error = message
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.admin-login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-container {
  width: 100%;
  max-width: 400px;
  padding: 20px;
}

.login-card {
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.login-header h1 {
  font-size: 24px;
  color: #303133;
  margin: 0 0 8px;
}

.login-header p {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.login-btn {
  width: 100%;
  font-size: 16px;
}

.login-footer {
  text-align: center;
  margin-top: 16px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  background: #fef0f0;
  border-radius: 8px;
  color: #f56c6c;
  font-size: 14px;
}
</style>