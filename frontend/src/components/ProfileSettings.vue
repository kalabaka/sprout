<template>
  <div class="profile-settings">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <span class="header-title">基本信息</span>
        </div>
      </template>

      <el-form :model="form" label-width="100px" class="settings-form">
        <!-- 头像上传 -->
        <el-form-item label="头像">
          <div class="avatar-section">
            <el-avatar :size="80" :src="avatarUrl" class="avatar-preview">
              {{ username?.charAt(0) || 'U' }}
            </el-avatar>
            <div class="avatar-actions">
              <el-upload
                ref="uploadRef"
                :auto-upload="false"
                :show-file-list="false"
                :on-change="handleFileChange"
                :before-upload="beforeUpload"
                accept="image/*"
              >
                <el-button size="small" :loading="uploading">更换头像</el-button>
              </el-upload>
              <span class="avatar-tip">支持 jpg/png/gif，最大2MB</span>
            </div>
          </div>
        </el-form-item>

        <!-- 用户ID -->
        <el-form-item label="用户ID">
          <div class="info-item">
            <span class="user-id">{{ userId }}</span>
          </div>
        </el-form-item>

        <!-- 用户名 -->
        <el-form-item label="用户名">
          <div class="username-field">
            <el-input
              v-model="form.username"
              :placeholder="username"
              maxlength="20"
            >
              <template #append>
                <span class="hint">(当前用户名)</span>
              </template>
            </el-input>
            <div class="username-actions">
              <el-button
                size="small"
                :loading="savingUsername"
                @click="handleSaveUsername"
              >
                保存用户名
              </el-button>
              <span class="hint-text">修改后需要使用新用户名登录</span>
            </div>
          </div>
        </el-form-item>

        <!-- 个人简介 -->
        <el-form-item label="个人简介">
          <el-input
            v-model="form.bio"
            type="textarea"
            :rows="3"
            placeholder="介绍一下自己..."
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <span class="header-title">账号安全</span>
        </div>
      </template>

      <el-form :model="passwordForm" label-width="100px" class="settings-form">
        <!-- 修改密码 -->
        <el-form-item label="原密码">
          <el-input
            v-model="passwordForm.oldPassword"
            type="password"
            placeholder="请输入原密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="新密码">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认密码">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="changingPassword"
            @click="handleChangePassword"
            :disabled="!canChangePassword"
          >
            修改密码
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <span class="header-title danger-header">学习偏好设置</span>
        </div>
      </template>

      <el-form :model="form" label-width="120px" class="settings-form">
        <!-- 专注时长 -->
        <el-form-item label="专注时长">
          <div class="slider-section">
            <el-slider
              v-model="form.focus_duration"
              :min="5"
              :max="60"
              :step="5"
              :show-tooltip="true"
              :format-tooltip="formatDuration"
            />
            <span class="slider-value">{{ form.focus_duration }} 分钟/次</span>
          </div>
        </el-form-item>

        <!-- 资源类型偏好 -->
        <el-form-item label="资源类型">
          <div class="checkbox-section">
            <el-checkbox-group v-model="form.resource_weights">
              <el-checkbox value="video">
                <span class="resource-icon">📹</span> 视频
              </el-checkbox>
              <el-checkbox value="article">
                <span class="resource-icon">📖</span> 文章
              </el-checkbox>
              <el-checkbox value="practice">
                <span class="resource-icon">💻</span> 练习
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </el-form-item>

        <!-- 难度偏好 -->
        <el-form-item label="难度偏好">
          <el-radio-group v-model="form.difficulty_preference">
            <el-radio-button value="简单">简单</el-radio-button>
            <el-radio-button value="中等">中等</el-radio-button>
            <el-radio-button value="困难">困难</el-radio-button>
            <el-radio-button value="自适应">自适应</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- 通知阈值 -->
        <el-form-item label="通知阈值">
          <el-select v-model="form.notification_threshold" placeholder="选择通知级别">
            <el-option label="低 - 较少通知" value="low" />
            <el-option label="中 - 正常通知" value="medium" />
            <el-option label="高 - 及时提醒" value="high" />
          </el-select>
        </el-form-item>

        <!-- 提交按钮 -->
        <el-form-item>
          <el-button
            type="primary"
            :loading="submitting"
            @click="handleSubmit"
            class="submit-btn"
          >
            保存设置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <span class="header-title">通知设置</span>
        </div>
      </template>

      <el-form :model="notificationSettings" label-width="120px" class="settings-form">
        <el-form-item label="任务提醒">
          <div class="notification-setting-row">
            <el-switch v-model="notificationSettings.taskReminderEnabled" />
            <span class="setting-desc">任务截止前</span>
            <el-input-number
              v-model="notificationSettings.taskReminderHours"
              :min="1"
              :max="72"
              :disabled="!notificationSettings.taskReminderEnabled"
              size="small"
              class="time-input"
            />
            <span class="setting-desc">小时提醒</span>
          </div>
        </el-form-item>

        <el-form-item label="考试提醒">
          <div class="notification-setting-row">
            <el-switch v-model="notificationSettings.examReminderEnabled" />
            <span class="setting-desc">考试前</span>
            <el-input-number
              v-model="notificationSettings.examReminderDays"
              :min="1"
              :max="30"
              :disabled="!notificationSettings.examReminderEnabled"
              size="small"
              class="time-input"
            />
            <span class="setting-desc">天提醒</span>
          </div>
        </el-form-item>

        <el-form-item label="打卡提醒">
          <div class="notification-setting-row">
            <el-switch v-model="notificationSettings.checkinReminderEnabled" />
            <span class="setting-desc">每日</span>
            <el-time-select
              v-model="notificationSettings.checkinReminderTime"
              start="06:00"
              step="00:30"
              end="23:00"
              :disabled="!notificationSettings.checkinReminderEnabled"
              size="small"
              class="time-input"
              placeholder="选择时间"
            />
            <span class="setting-desc">提醒打卡</span>
          </div>
        </el-form-item>

        <el-form-item label="计划预警">
          <div class="notification-setting-row">
            <el-switch v-model="notificationSettings.planWarningEnabled" />
            <span class="setting-desc">学习计划进度滞后时提醒</span>
          </div>
        </el-form-item>

        <el-form-item label="成就通知">
          <div class="notification-setting-row">
            <el-switch v-model="notificationSettings.achievementEnabled" />
            <span class="setting-desc">获得新勋章时提醒</span>
          </div>
        </el-form-item>

        <el-form-item label="系统通知">
          <div class="notification-setting-row">
            <el-switch v-model="notificationSettings.systemEnabled" />
            <span class="setting-desc">系统维护和功能更新通知</span>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="savingNotificationSettings"
            @click="handleSaveNotificationSettings"
            class="submit-btn"
          >
            保存设置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 危险区域 -->
    <el-card class="settings-card danger-card">
      <template #header>
        <div class="card-header">
          <span class="header-title danger-header">危险区域</span>
        </div>
      </template>

      <div class="danger-section">
        <p class="danger-tip">注销账号将永久删除您的所有学习数据，此操作不可恢复！</p>
        <el-button
          type="danger"
          @click="handleDeleteAccount"
        >
          注销账号
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { profileApi, userApi, notificationApi } from '../api'
import { getToken, removeToken } from '../utils/token'

const router = useRouter()

// 上传相关
const uploadRef = ref(null)
const uploading = ref(false)

// 用户信息
const userId = ref('')
const username = ref('')
const submitting = ref(false)
const savingUsername = ref(false)
const changingPassword = ref(false)

// 表单数据
const form = reactive({
  username: '',
  bio: '',
  focus_duration: 25,
  resource_weights: [],
  difficulty_preference: '中等',
  notification_threshold: 'medium'
})

// 密码表单
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 通知设置
const notificationSettings = reactive({
  taskReminderEnabled: true,
  taskReminderHours: 2,
  examReminderEnabled: true,
  examReminderDays: 3,
  checkinReminderEnabled: true,
  checkinReminderTime: '20:00',
  planWarningEnabled: true,
  achievementEnabled: true,
  systemEnabled: true
})
const savingNotificationSettings = ref(false)

// 用户名显示（来自用户信息）
const displayUsername = computed(() => {
  return form.username || username.value || 'User'
})

// 头像URL
const avatarUrl = computed(() => {
  const url = form.avatar_url
  if (!url) return ''
  return url.startsWith('http') ? url : `http://localhost:3000${url}`
})

// 是否可以修改密码
const canChangePassword = computed(() => {
  return passwordForm.oldPassword &&
    passwordForm.newPassword &&
    passwordForm.newPassword.length >= 6 &&
    passwordForm.newPassword === passwordForm.confirmPassword
})

// 格式化专注时长
function formatDuration(val) {
  return `${val}分钟`
}

// 格式化资源权重
function parseResourceWeights(weights) {
  if (!weights) return ['video', 'article', 'practice']
  if (typeof weights === 'string') {
    try {
      const obj = JSON.parse(weights)
      return Object.keys(obj).filter(k => obj[k] > 0)
    } catch {
      return ['video', 'article', 'practice']
    }
  }
  return Object.keys(weights).filter(k => weights[k] > 0)
}

// 加载数据
async function fetchProfile() {
  try {
    // 获取用户信息
    const userRes = await userApi.getInfo()
    const userData = userRes.data || {}
    userId.value = userData.id || ''
    username.value = userData.username || 'User'
    form.username = userData.username || ''

    // 获取用户配置
    const res = await profileApi.getProfile()
    const data = res.data || {}

    form.bio = data.bio || ''
    form.focus_duration = data.focus_duration || 25
    form.difficulty_preference = data.difficulty_preference || '中等'
    form.notification_threshold = data.notification_threshold || 'medium'
    form.avatar_url = data.avatar_url ? `http://localhost:3000${data.avatar_url}` : null

    // 更新本地存储的头像（从profile获取）
    const oldUser = JSON.parse(localStorage.getItem('user') || '{}')
    localStorage.setItem('user', JSON.stringify({
      ...oldUser,
      username: userData.username,
      avatar_url: form.avatar_url
    }))

    // 加载通知设置
    await fetchNotificationSettings()
  } catch (error) {
    console.error('加载配置失败:', error)
    // 如果是401错误，说明未登录或Token过期
    if (error.message?.includes('401') || error.message?.includes('未授权')) {
      ElMessage.error('请先登录')
      // 延迟跳转登录页
      setTimeout(() => {
        window.location.href = '/login'
      }, 1000)
    } else {
      ElMessage.error('加载配置失败: ' + (error.message || '未知错误'))
    }
  }
}

// 加载通知设置
async function fetchNotificationSettings() {
  try {
    const res = await notificationApi.getSettings()
    if (res.code === 200 && res.data) {
      const data = res.data
      notificationSettings.taskReminderEnabled = data.task_reminder_enabled ?? true
      notificationSettings.taskReminderHours = data.task_reminder_hours ?? 2
      notificationSettings.examReminderEnabled = data.exam_reminder_enabled ?? true
      notificationSettings.examReminderDays = data.exam_reminder_days ?? 3
      notificationSettings.checkinReminderEnabled = data.checkin_reminder_enabled ?? true
      notificationSettings.checkinReminderTime = data.checkin_reminder_time ?? '20:00'
      notificationSettings.planWarningEnabled = data.plan_warning_enabled ?? true
      notificationSettings.achievementEnabled = data.achievement_enabled ?? true
      notificationSettings.systemEnabled = data.system_enabled ?? true
    }
  } catch (error) {
    console.error('加载通知设置失败:', error)
  }
}

// 上传前校验
function beforeUpload(file) {
  const isImage = file.type?.startsWith('image/') || file.raw?.type?.startsWith('image/')
  const isLt2M = (file.size || file.raw?.size || 0) / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过2MB')
    return false
  }
  return true
}

// 文件选择后上传
async function handleFileChange(uploadFile) {
  const file = uploadFile.raw
  if (!file) return

  if (!beforeUpload(file)) return

  uploading.value = true
  uploading.value = false
  uploading.value = true

  const formData = new FormData()
  formData.append('avatar', file)

  try {
    const token = localStorage.getItem('learning_token')
    const res = await axios.post('http://localhost:3000/api/profile/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    })

    if (res.data.code === 200) {
      // 强制刷新头像
      const avatarUrl = res.data.data.avatar_url
      form.avatar_url = avatarUrl + '?t=' + Date.now()
      // 强制更新DOM
      nextTick(() => {
        const avatarEl = document.querySelector('.avatar-preview')
        if (avatarEl) {
          avatarEl.src = `http://localhost:3000${form.avatar_url}`
        }
      })
      // 更新本地存储的头像（保存完整路径，不带时间戳）
      const oldUser = JSON.parse(localStorage.getItem('user') || '{}')
      const fullAvatarUrl = avatarUrl.startsWith('http') ? avatarUrl : `http://localhost:3000${avatarUrl}`
      localStorage.setItem('user', JSON.stringify({
        ...oldUser,
        avatar_url: fullAvatarUrl
      }))
      ElMessage.success('头像上传成功')
    } else {
      ElMessage.error(res.data.message || '上传失败')
    }
  } catch (err) {
    console.error('上传失败:', err)
    ElMessage.error('头像上传失败: ' + (err.response?.data?.message || err.message))
  } finally {
    uploading.value = false
  }
}

// 上传成功（保留备用）
function handleUploadSuccess(res) {
  if (res.code === 200) {
    form.avatar_url = res.data.avatar_url
    ElMessage.success('头像上传成功')
  } else {
    ElMessage.error(res.message || '上传失败')
  }
}

// 上传失败
function handleUploadError(err) {
  console.error('上传失败:', err)
  ElMessage.error('头像上传失败，请重试')
}

// 修改密码
async function handleChangePassword() {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.error('两次输入的密码不一致')
    return
  }
  if (passwordForm.newPassword.length < 6) {
    ElMessage.error('新密码长度不能少于6位')
    return
  }

  changingPassword.value = true
  try {
    await userApi.updatePassword(passwordForm.oldPassword, passwordForm.newPassword)
    ElMessage.success('密码修改成功，请重新登录')

    // 1. 清除本地存储的 Token
    localStorage.removeItem('learning_token')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userInfo')
    sessionStorage.clear()

    // 2. 通知浏览器清除保存的密码
    if (window.PasswordCredential) {
      navigator.credentials.preventSilentAccess()
    }

    // 3. 延迟跳转，确保清理完成
    setTimeout(() => {
      router.push('/login')
    }, 500)
  } catch (error) {
    console.error('修改密码失败:', error)
    ElMessage.error('修改失败: ' + (error.message || '原密码错误'))
  } finally {
    changingPassword.value = false
    // 清空密码表单
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  }
}

// 保存用户名（需要验证当前密码）
async function handleSaveUsername() {
  if (!form.username || form.username.trim() === '') {
    ElMessage.warning('请输入用户名')
    return
  }
  if (form.username === username.value) {
    ElMessage.info('用户名未改变')
    return
  }

  // 弹出密码输入框让用户确认
  try {
    const { value } = await ElMessageBox.prompt('请输入当前密码以确认修改用户名', '验证密码', {
      inputType: 'password',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })

    if (!value) {
      ElMessage.warning('请输入密码')
      return
    }

    savingUsername.value = true
    await userApi.updateUsername(form.username, value)
    ElMessage.success('用户名修改成功，请使用新用户名登录')

    // 更新本地状态
    username.value = form.username
  } catch (error) {
    if (error !== 'cancel') {
      console.error('修改用户名失败:', error)
      ElMessage.error('修改失败: ' + (error.message || '密码错误'))
    }
  } finally {
    savingUsername.value = false
  }
}

// 注销账号
async function handleDeleteAccount() {
  try {
    // 第一次确认
    await ElMessageBox.confirm(
      '此操作将永久删除您的账号及所有学习数据，无法恢复！',
      '警告',
      { confirmButtonText: '继续', cancelButtonText: '取消', type: 'warning' }
    )

    // 第二次确认，要求输入 DELETE
    const { value } = await ElMessageBox.prompt('请输入 "DELETE" 以确认注销', '最终确认', {
      inputPattern: /^DELETE$/,
      inputErrorMessage: '输入不正确，请输入 DELETE'
    })

    if (value === 'DELETE') {
      await userApi.deleteAccount('DELETE')
      ElMessage.success('账号已注销')
      localStorage.clear()
      router.push('/login')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('注销账号失败:', error)
      ElMessage.error('注销失败: ' + (error.message || '未知错误'))
    }
  }
}

// 提交更新
async function handleSubmit() {
  submitting.value = true

  try {
    const weights = {}
    form.resource_weights.forEach(key => {
      weights[key] = 0.4
    })

    const data = {
      bio: form.bio,
      focus_duration: form.focus_duration,
      difficulty_preference: form.difficulty_preference,
      notification_threshold: form.notification_threshold,
      resource_weights: JSON.stringify(weights)
    }

    await profileApi.updateProfile(data)
    ElMessage.success('设置保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

// 保存通知设置
async function handleSaveNotificationSettings() {
  savingNotificationSettings.value = true

  try {
    const data = {
      taskReminderEnabled: notificationSettings.taskReminderEnabled,
      taskReminderHours: notificationSettings.taskReminderHours,
      examReminderEnabled: notificationSettings.examReminderEnabled,
      examReminderDays: notificationSettings.examReminderDays,
      checkinReminderEnabled: notificationSettings.checkinReminderEnabled,
      checkinReminderTime: notificationSettings.checkinReminderTime,
      planWarningEnabled: notificationSettings.planWarningEnabled,
      achievementEnabled: notificationSettings.achievementEnabled,
      systemEnabled: notificationSettings.systemEnabled
    }

    await notificationApi.updateSettings(data)
    ElMessage.success('通知设置保存成功')
  } catch (error) {
    console.error('保存通知设置失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    savingNotificationSettings.value = false
  }
}

// 组件挂载
onMounted(() => {
  fetchProfile()
})
</script>

<style scoped>
.profile-settings {
  padding: 20px;
  max-width: 700px;
  margin: 0 auto;
}

.settings-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.settings-form {
  padding: 10px 0;
}

.username-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.username-field .hint {
  color: #909399;
  font-size: 12px;
}

.username-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hint-text {
  font-size: 12px;
  color: #909399;
}

/* 信息项 */
.info-item {
  display: flex;
  align-items: center;
}

/* 头像区域 */
.avatar-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-preview {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 28px;
}

.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.avatar-tip {
  font-size: 12px;
  color: #909399;
}

/* 专注时长滑块 */
.slider-section {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.slider-section .el-slider {
  flex: 1;
}

.slider-value {
  min-width: 80px;
  font-size: 14px;
  color: #409EFF;
  font-weight: 500;
}

/* 资源类型复选框 */
.checkbox-section .el-checkbox-group {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.resource-icon {
  margin-right: 4px;
}

/* 提交按钮 */
.submit-btn {
  width: 120px;
  margin-top: 20px;
}

/* 用户ID */
.user-id {
  color: #909399;
  font-size: 14px;
}

/* 危险区域 */
.danger-card {
  border: 1px solid #f56c6c;
}

.danger-header {
  color: #f56c6c;
}

.danger-section {
  padding: 10px 0;
}

.danger-tip {
  color: #f56c6c;
  font-size: 14px;
  margin-bottom: 15px;
}

.notification-setting-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.notification-setting-row .setting-desc {
  color: #606266;
  font-size: 14px;
}

.notification-setting-row .time-input {
  width: 120px;
}

/* 响应式 */
@media (max-width: 600px) {
  .profile-settings {
    padding: 12px;
  max-width: 100%;
  }

  .avatar-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .slider-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .slider-value {
    align-self: center;
  }
}
</style>