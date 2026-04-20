<template>
  <div class="login-page">
    <div class="brand-section">
      <div class="brand-content">
        <div class="brand-header">
          <span class="brand-icon">🌱</span>
          <h1 class="brand-title">智能学习规划助手</h1>
        </div>

        <div class="brand-illustration">
          <div class="illustration-cards">
            <div class="card card-1">
              <span class="card-icon">📚</span>
              <span>知识体系</span>
            </div>
            <div class="card card-2">
              <span class="card-icon">🤖</span>
              <span>AI智能</span>
            </div>
            <div class="card card-3">
              <span class="card-icon">📈</span>
              <span>高效成长</span>
            </div>
          </div>
          <div class="illustration-line"></div>
        </div>

        <p class="brand-slogan">开启你的高效学习之旅</p>

        <div class="brand-features">
          <div class="feature">
            <span class="feature-icon">✓</span>
            <span>智能学习路径规划</span>
          </div>
          <div class="feature">
            <span class="feature-icon">✓</span>
            <span>实时进度追踪分析</span>
          </div>
          <div class="feature">
            <span class="feature-icon">✓</span>
            <span>个性化动机干预</span>
          </div>
        </div>
      </div>
    </div>

    <div class="login-section">
      <div class="login-card">
        <div class="login-header">
          <h2>{{ showRegister ? '创建账号' : '欢迎回来' }}</h2>
          <p>{{ showRegister ? '注册你的学习账号' : '登录你的学习账号' }}</p>
        </div>

        <el-form 
          ref="formRef" 
          :model="form" 
          :rules="rules" 
          class="login-form"
          autocomplete="off"
          @submit.prevent
        >
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="用户名"
              size="large"
              :prefix-icon="icons.User"
              :autocomplete="rememberMe ? 'username' : 'off'"
              name="username"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              size="large"
              :prefix-icon="icons.Lock"
              show-password
              :autocomplete="rememberMe ? 'current-password' : 'new-password'"
              name="password"
              @keyup.enter="handleSubmit"
            />
          </el-form-item>

          <el-form-item v-if="showRegister" prop="nickname">
            <el-input
              v-model="form.nickname"
              placeholder="昵称（可选）"
              size="large"
              :prefix-icon="icons.UserFilled"
              autocomplete="off"
              name="nickname"
            />
          </el-form-item>

          <div v-if="!showRegister" class="login-options">
            <el-checkbox v-model="rememberMe">记住我</el-checkbox>
          </div>

          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            @click="handleSubmit"
          >
            {{ loading ? (showRegister ? '注册中...' : '登录中...') : (showRegister ? '注 册' : '登 录') }}
          </el-button>

          <div class="register-tip">
            {{ showRegister ? '已有账号？' : '还没有账号？' }}
            <span class="register-link" @click="toggleMode">
              {{ showRegister ? '立即登录' : '立即注册' }}
            </span>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script>
import { User, Lock, UserFilled } from '@element-plus/icons-vue'
import { markRaw } from 'vue'
import { userApi } from '../api'
import { setToken } from '../utils/token'

export default {
  name: 'Login',
  async mounted() {
    // 清除可能存在的旧凭证
    if (window.PasswordCredential) {
      await navigator.credentials.preventSilentAccess()
    }

    this.$nextTick(() => {
      this.form.username = ''
      this.form.password = ''
      this.form.nickname = ''

      setTimeout(() => {
        this.form.username = ''
        this.form.password = ''
        this.form.nickname = ''
      }, 100)
    })
  },
  data() {
    return {
      icons: markRaw({ User, Lock, UserFilled }),
      loading: false,
      showRegister: false,
      rememberMe: false,
      form: {
        username: '',
        password: '',
        nickname: ''
      },
      rules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' },
          { min: 2, max: 10, message: '用户名长度为2-10个字符', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
        ]
      }
    }
  },
  methods: {
    toggleMode() {
      this.showRegister = !this.showRegister
    },
    async handleSubmit() {
      const valid = await this.$refs.formRef.validate().catch(() => false)
      if (!valid) return

      this.loading = true
      try {
        if (this.showRegister) {
          const res = await userApi.register(
            this.form.username, 
            this.form.password, 
            this.form.nickname
          )
          
          if (res.code === 200) {
            this.$message.success('注册成功！')
            // 注册成功后存储 Token 到 sessionStorage（新用户默认不记住）
            sessionStorage.setItem('learning_token', res.data.token)
            this.$router.push('/home')
          }
        } else {
          const res = await userApi.login(this.form.username, this.form.password, this.rememberMe)
          const { token, userId, user } = res.data

          // 根据记住我选择存储位置
          if (this.rememberMe) {
            localStorage.setItem('learning_token', token)
            localStorage.setItem('user', JSON.stringify({ 
              userId, 
              username: this.form.username,
              ...user 
            }))
          } else {
            sessionStorage.setItem('learning_token', token)
            sessionStorage.setItem('user', JSON.stringify({ 
              userId, 
              username: this.form.username,
              ...user 
            }))
          }

          this.$message.success('登录成功！')
          this.$router.push('/home')
        }
      } catch (error) {
        this.$message.error(error.message || (this.showRegister ? '注册失败' : '登录失败'))
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  background: linear-gradient(135deg, #F8FAFC 0%, #EEF2F6 100%);
}

.brand-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.brand-section::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
}

.brand-content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: #fff;
  max-width: 400px;
}

.brand-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 40px;
}

.brand-icon {
  font-size: 48px;
}

.brand-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0;
}

.brand-illustration {
  margin-bottom: 40px;
}

.illustration-cards {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
}

.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: 13px;
  transition: transform 0.3s;
}

.card:hover {
  transform: translateY(-8px);
}

.card-icon {
  font-size: 28px;
}

.card-1 { animation: float 3s ease-in-out infinite; }
.card-2 { animation: float 3s ease-in-out infinite 0.5s; }
.card-3 { animation: float 3s ease-in-out infinite 1s; }

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.illustration-line {
  width: 200px;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
  margin: 0 auto;
  border-radius: 2px;
}

.brand-slogan {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 40px;
}

.brand-features {
  text-align: left;
}

.feature {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 15px;
  opacity: 0.9;
}

.feature-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  font-size: 12px;
}

.login-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h2 {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 8px;
}

.login-header p {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.login-form {
  margin-top: 24px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  padding: 4px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.25);
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.login-btn {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.login-btn:active {
  transform: translateY(0);
}

.register-tip {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: #909399;
}

.register-link {
  color: #409EFF;
  cursor: pointer;
  font-weight: 500;
}

.register-link:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .brand-section {
    display: none;
  }

  .login-section {
    flex: none;
    width: 100%;
  }
}
</style>
