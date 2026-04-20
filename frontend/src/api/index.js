import axios from 'axios'
import { getToken, getAdminToken, removeToken } from '../utils/token'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000
})

// 请求拦截器 - 同时支持普通用户和管理员Token
api.interceptors.request.use(
  config => {
    if (config.url?.startsWith('/admin')) {
      const token = getAdminToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } else {
      const token = getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    const res = response.data
    // 后端返回格式: { code: number, message: string, data: any }
    // code >= 400 表示失败
    if (res.code && res.code >= 400) {
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res
  },
  error => {
    const resData = error.response?.data
    const message = resData?.message || error.message || '请求失败'
    
    if (error.response?.status === 401) {
      if (message.includes('未授权') || message.includes('token') || message.includes('Token')) {
        removeToken()
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/admin-login')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(new Error(message))
  }
)

// 用户相关API
export const userApi = {
  login(username, password, rememberMe = false) {
    return api.post('/auth/login', { username, password, rememberMe })
  },
  register(username, password, nickname) {
    return api.post('/auth/register', { username, password, nickname })
  },
  checkAvailability() {
    return api.get('/auth/check-availability')
  },
  getInfo() {
    return api.get('/user/me')
  },
  updateInfo(data) {
    return api.put('/user/me', data)
  },
  updateUsername(newUsername, password) {
    return api.put('/user/username', { newUsername, password })
  },
  updatePassword(oldPassword, newPassword) {
    return api.put('/user/password', { oldPassword, newPassword })
  },
  deleteAccount(confirmText) {
    return api.delete('/user/account', { data: { confirmText } })
  }
}

// 认证相关API（手机号注册/登录）
export const authApi = {
  sendCode(phone) {
    return api.post('/auth/send-code', { phone })
  },
  registerByPhone(data) {
    return api.post('/auth/register-by-phone', data)
  },
  loginByPhone(phone, code) {
    return api.post('/auth/login-by-phone', { phone, code })
  }
}

// 学习目标相关API
export const goalApi = {
  getGoals() {
    return api.get('/goal')
  },
  getGoalDetail(id) {
    return api.get(`/goal/${id}`)
  },
  createGoal(data) {
    return api.post('/goal', data)
  },
  updateGoal(id, data) {
    return api.put(`/goal/${id}`, data)
  },
  deleteGoal(id) {
    return api.delete(`/goal/${id}`)
  }
}

// 学习计划相关API
export const planApi = {
  checkCreateLimit() {
    return api.get('/plan/create/check')
  },
  getPlans() {
    return api.get('/plan')
  },
  getActivePlans() {
    return api.get('/plans/active')
  },
  getPlanDetail(id) {
    return api.get(`/plan/${id}`)
  },
  getFullDetail(id) {
    return api.get(`/plan/${id}/detail`)
  },
  getProgressTrend(id) {
    return api.get(`/plan/${id}/progress`)
  },
  createPlan(data) {
    return api.post('/plan', data)
  },
  createDraft(data) {
    return api.post('/plans/draft', data)
  },
  generate(id) {
    return api.post(`/plans/${id}/generate`)
  },
  confirm(id, data) {
    return api.post(`/plans/${id}/confirm`, data)
  },
  updatePlan(id, data) {
    return api.put(`/plan/${id}`, data)
  },
  deletePlan(id) {
    return api.delete(`/plan/${id}`)
  },
  reorderTasks(id, data) {
    return api.put(`/plan/${id}/tasks/reorder`, data)
  },
  addTask(id, data) {
    return api.post(`/plan/${id}/tasks`, data)
  },
  replan(id, data) {
    return api.post(`/plan/${id}/replan`, data)
  },
  updateStatus(id, data) {
    return api.put(`/plan/${id}/status`, data)
  },
  getMotivation(id) {
    return api.get(`/plan/${id}/motivation`)
  },
  checkReplan(id) {
    return api.get(`/plan/${id}/replan/check`)
  },
  executeReplan(id, data) {
    return api.post(`/plan/${id}/replan`, data)
  },
  getReplanHistory(id, limit = 10) {
    return api.get(`/plan/${id}/replan/history?limit=${limit}`)
  }
}

// 任务相关API
export const taskApi = {
  getAll() {
    return api.get('/task')
  },
  getTasks(planId) {
    return api.get(`/task/${planId}`)
  },
  startTask(id) {
    return api.post(`/task/${id}/start`)
  },
  pauseTask(id, elapsedSeconds = 0) {
    return api.post(`/task/${id}/pause`, { elapsedSeconds })
  },
  resumeTask(id) {
    return api.post(`/task/${id}/resume`)
  },
  completeTask(id, data) {
    return api.post(`/task/${id}/complete`, data)
  },
  getStats(planId) {
    return api.get(`/task/${planId}/stats`)
  },
  createDDL(data) {
    return api.post('/task/ddl', data)
  },
  getUpcomingDDL(limit = 5) {
    return api.get(`/task/ddl/upcoming?limit=${limit}`)
  },
  getOverdueDDL() {
    return api.get('/task/ddl/overdue')
  },
  getPlanDDL(planId) {
    return api.get(`/task/ddl/plan/${planId}`)
  },
  updateProgress(id, progress) {
    return api.put(`/task/${id}/progress`, { progress })
  },
  updateTask(id, data) {
    return api.put(`/task/${id}`, data)
  },
  deleteTask(id) {
    return api.delete(`/task/${id}`)
  },
  updateDDL(id, data) {
    return api.put(`/task/ddl/${id}`, data)
  },
  createQuiz(data) {
    return api.post('/task/quiz', data)
  },
  completeQuiz(id, data) {
    return api.post(`/task/detail/${id}/complete`, data)
  }
}

export const quizApi = {
  getQuiz(kpId) {
    return api.get(`/quiz/knowledge-point/${kpId}`)
  },
  getQuizForTask(taskId) {
    return api.get(`/quiz/task/${taskId}`)
  },
  submitAnswer(kpId, answer) {
    return api.post(`/quiz/knowledge-point/${kpId}/submit`, { answer })
  },
  checkUnlocked(kpId) {
    return api.get(`/quiz/knowledge-point/${kpId}/unlocked`)
  }
}

export const analysisApi = {
  getTrend(days = 7) {
    return api.get(`/analysis/trend?days=${days}`)
  },
  getSummary() {
    return api.get('/analysis/summary')
  },
  getRadar() {
    return api.get('/analysis/radar')
  }
}

// 智能问答API
export const qaApi = {
  ask(taskId, question) {
    return api.post('/qa/ask', { taskId, question })
  },
  getHistory(taskId) {
    return api.get(`/qa/history/${taskId}`)
  }
}

// 仪表盘API
export const dashboardApi = {
  getTodayOverview() {
    return api.get('/dashboard/today')
  },
  getLearningProgress() {
    return api.get('/dashboard/progress')
  },
  getUpcomingCourses(days = 7) {
    return api.get(`/dashboard/upcoming-courses?days=${days}`)
  },
  getLearningTrend(days = 7) {
    return api.get(`/dashboard/trend?days=${days}`)
  },
  getFullDashboard() {
    return api.get('/dashboard/full')
  }
}

// 学期管理API
export const semesterApi = {
  create(data) {
    return api.post('/semester', data)
  },
  getCurrent() {
    return api.get('/semester/current')
  },
  getAll() {
    return api.get('/semester')
  },
  update(id, data) {
    return api.put(`/semester/${id}`, data)
  },
  setCurrent(id) {
    return api.post(`/semester/${id}/set-current`)
  },
  delete(id) {
    return api.delete(`/semester/${id}`)
  }
}

// 课程管理API
export const courseApi = {
  create(data) {
    return api.post('/courses', data)
  },
  getAll(semesterId) {
    return semesterId ? api.get(`/courses?semester_id=${semesterId}`) : api.get('/courses')
  },
  update(id, data) {
    return api.put(`/courses/${id}`, data)
  },
  delete(id) {
    return api.delete(`/courses/${id}`)
  },
  batchDelete(ids) {
    return api.delete('/courses/batch', { data: { ids } })
  },
  clearCourses(semesterId) {
    return api.delete('/courses/clear', { data: { semesterId } })
  },
  addSchedule(courseId, data) {
    return api.post(`/courses/${courseId}/schedules`, data)
  },
  getWeekSchedule() {
    return api.get('/courses/schedules/week')
  },
  getDaySchedule(dayOfWeek) {
    return api.get(`/courses/schedules/day?day_of_week=${dayOfWeek}`)
  },
  getFullSchedule() {
    return api.get('/courses/schedules/full')
  },
  updateSchedule(scheduleId, data) {
    return api.put(`/courses/schedules/${scheduleId}`, data)
  },
  deleteSchedule(scheduleId) {
    return api.delete(`/courses/schedules/${scheduleId}`)
  },
  uploadExcel(formData) {
    const token = getToken()
    return axios.post('/api/courses/upload-excel', formData, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then(res => res.data)
  },
  previewExcel(formData) {
    const token = getToken()
    return axios.post('/api/courses/preview-excel', formData, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then(res => res.data)
  },
  exportExcel(semesterId, format = 'standard') {
    const token = getToken()
    return axios.get('/api/courses/export', {
      params: { semester_id: semesterId, format },
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then(res => res.data)
  }
}

// 用户配置API
export const profileApi = {
  getProfile() {
    return api.get('/profile/me')
  },
  updateProfile(data) {
    return api.put('/profile/me', data)
  },
  uploadAvatar(formData) {
    const token = getToken()
    return axios.post('/api/profile/upload-avatar', formData, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then(res => res.data)
  },
  getLearningPrefs() {
    return api.get('/profile/learning-prefs')
  },
  updateLearningPrefs(data) {
    return api.put('/profile/learning-prefs', data)
  },
  getSubjectKnowledge(subject) {
    return api.get(`/profile/knowledge/subjects/${subject}`)
  },
  saveMasteredTopics(data) {
    return api.post('/profile/mastered-topics', data)
  },
  getRecommendedPath(subject) {
    return api.get(`/profile/recommended-path/${subject}`)
  }
}

// 考试API
export const examApi = {
  getAll() {
    return api.get('/exams')
  },
  getUpcoming(limit = 3) {
    return api.get(`/exams/upcoming?limit=${limit}`)
  },
  getById(id) {
    return api.get(`/exams/${id}`)
  },
  getCountdown(id) {
    return api.get(`/exams/${id}/countdown`)
  },
  getRelatedPlan(id) {
    return api.get(`/exams/${id}/plan`)
  },
  generateReviewPlan(id, data) {
    return api.post(`/exams/${id}/generate-review-plan`, data)
  },
  create(data) {
    return api.post('/exams', data)
  },
  update(id, data) {
    return api.put(`/exams/${id}`, data)
  },
  delete(id) {
    return api.delete(`/exams/${id}`)
  },
  getReviewSuggestion() {
    return api.get('/dashboard/today').then(res => {
      if (res.success && res.data) {
        return { success: true, data: res.data.reviewSuggestion }
      }
      return { success: false, data: null }
    })
  }
}

// 学习会话API
export const studySessionApi = {
  start(data) {
    return api.post('/study-session/start', data)
  },
  stop(data) {
    return api.post('/study-session/stop', data)
  },
  getActive() {
    return api.get('/study-session/active')
  },
  getHistory(params) {
    return api.get('/study-session/history', { params })
  },
  getTodayStats() {
    return api.get('/study-session/today-stats')
  }
}

// 学习统计API
export const statsApi = {
  getOverview() {
    return api.get('/stats/overview')
  },
  getDistribution(days = 30) {
    return api.get(`/stats/distribution?days=${days}`)
  },
  getTrend(days = 7) {
    return api.get(`/stats/trend?days=${days}`)
  }
}

// 成就API
export const achievementApi = {
  getStreak() {
    return api.get('/achievements/streak')
  },
  getUserBadges() {
    return api.get('/achievements/badges')
  },
  getAllBadges() {
    return api.get('/achievements/badges/all')
  },
  getRecentBadges() {
    return api.get('/achievements/recent')
  }
}

export const notificationApi = {
  getNotifications(params) {
    return api.get('/notifications', { params })
  },
  getUnreadCount() {
    return api.get('/notifications/unread/count')
  },
  markAsRead(id) {
    return api.put(`/notifications/${id}/read`)
  },
  markAllAsRead() {
    return api.put('/notifications/read/all')
  },
  deleteNotification(id) {
    return api.delete(`/notifications/${id}`)
  },
  getSettings() {
    return api.get('/notifications/settings')
  },
  updateSettings(data) {
    return api.put('/notifications/settings', data)
  }
}

// 管理员API
export const adminApi = {
  // 仪表盘
  getStats() {
    return api.get('/admin/dashboard/stats')
  },
  getInterventions(days = 7) {
    return api.get(`/admin/interventions?days=${days}`)
  },
  getStatistics(params) {
    return api.get('/admin/statistics', { params })
  },
  // 用户管理
  getUsers(params) {
    return api.get('/admin/users', { params })
  },
  getUserDetail(userId) {
    return api.get(`/admin/users/${userId}`)
  },
  toggleUserStatus(userId, status) {
    return api.put('/admin/users/status', { userId, status })
  },
  deleteUser(userId) {
    return api.delete(`/admin/users/${userId}`)
  },
  getRiskUsers(days = 7) {
    return api.get(`/admin/risk-users?days=${days}`)
  },
  // 用户反馈
  getFeedback(params) {
    return api.get('/admin/feedback', { params })
  },
  handleFeedback(feedbackId, reply) {
    return api.put(`/admin/feedback/${feedbackId}`, { reply })
  },
  // 资源管理
  getResources(params) {
    return api.get('/admin/resources', { params })
  },
  addResource(data) {
    return api.post('/admin/resources', data)
  },
  updateResource(resourceId, data) {
    return api.put(`/admin/resources/${resourceId}`, data)
  },
  deleteResource(resourceId) {
    return api.delete(`/admin/resources/${resourceId}`)
  },
  // 管理员信息
  getProfile() {
    return api.get('/admin/profile')
  },
  changePassword(data) {
    return api.put('/admin/profile/password', data)
  },
  // 管理员账号管理（仅超级管理员）
  getAdmins(params) {
    return api.get('/admin/admins', { params })
  },
  addAdmin(data) {
    return api.post('/admin/admins', data)
  },
  updateAdmin(adminId, data) {
    return api.put(`/admin/admins/${adminId}`, data)
  },
  deleteAdmin(adminId) {
    return api.delete(`/admin/admins/${adminId}`)
  },
  resetAdminPassword(adminId, data) {
    return api.put(`/admin/admins/${adminId}/password`, data)
  },
  // 系统配置
  getConfig() {
    return api.get('/admin/config')
  },
  updateConfig(data) {
    return api.put('/admin/config', data)
  },
  // 日志审计
  getOperationLogs(params) {
    return api.get('/admin/logs/operation', { params })
  },
  getErrorLogs(params) {
    return api.get('/admin/logs/error', { params })
  },
  // 通知模板
  getNotificationTemplates() {
    return api.get('/admin/notification-templates')
  },
  getNotificationTemplate(id) {
    return api.get(`/admin/notification-templates/${id}`)
  },
  createNotificationTemplate(data) {
    return api.post('/admin/notification-templates', data)
  },
  updateNotificationTemplate(id, data) {
    return api.put(`/admin/notification-templates/${id}`, data)
  },
  deleteNotificationTemplate(id) {
    return api.delete(`/admin/notification-templates/${id}`)
  },
  toggleNotificationTemplate(id, enabled) {
    return api.put(`/admin/notification-templates/${id}/toggle`, { enabled })
  },
  // 待处理事项
  getPendingItems() {
    return api.get('/admin/pending-items')
  },
  markPendingItemRead(id) {
    return api.put(`/admin/pending-items/${id}/read`)
  },
  // 实时动态
  getActivities(limit = 20) {
    return api.get(`/admin/activities?limit=${limit}`)
  },
  // 学习计划管理
  getPlans(params = {}) {
    const query = new URLSearchParams()
    if (params.keyword) query.append('keyword', params.keyword)
    if (params.status) query.append('status', params.status)
    if (params.page) query.append('page', params.page)
    if (params.limit) query.append('limit', params.limit)
    return api.get(`/admin/plans?${query.toString()}`)
  },
  getPlanDetail(id) {
    return api.get(`/admin/plans/${id}`)
  },
  deletePlan(id) {
    return api.delete(`/admin/plans/${id}`)
  }
}

export const timeSlotApi = {
  getSlots() {
    return api.get('/time-slots')
  },
  saveSlots(slots) {
    return api.post('/time-slots', { slots })
  },
  resetSlots() {
    return api.post('/time-slots/reset')
  }
}

export const interventionApi = {
  getLogs(options = {}) {
    const params = new URLSearchParams()
    if (options.unread) params.append('unread', 'true')
    if (options.limit) params.append('limit', options.limit)
    return api.get(`/agent/interventions?${params.toString()}`)
  },
  getUnreadCount() {
    return api.get('/agent/interventions/unread-count')
  },
  markAsRead(id) {
    return api.put(`/agent/interventions/${id}/read`)
  },
  submitFeedback(id, feedback) {
    return api.post(`/agent/interventions/${id}/feedback`, { feedback })
  }
}

export const evaluationApi = {
  getCurrentRisk() {
    return api.get('/agent/evaluation/current')
  },
  getRiskTrend(period = 'week') {
    return api.get(`/agent/evaluation/trend?period=${period}`)
  },
  getPlanRisk(planId) {
    return api.get(`/agent/evaluation/plan/${planId}`)
  },
  getDetailedMetrics() {
    return api.get('/agent/evaluation/detail')
  }
}

export default api
