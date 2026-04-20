import { createRouter, createWebHistory } from 'vue-router'
import { getToken, getAdminToken } from '../utils/token'
import Login from '../views/Login.vue'
import Home from '../views/Home.vue'
import PlanList from '../views/PlanList.vue'
import DataAnalysis from '../views/DataAnalysis.vue'
import DataCenter from '../views/DataCenter.vue'
import Dashboard from '../views/Dashboard.vue'
import CourseEditor from '../views/CourseEditor.vue'
import ProfileSettings from '../components/ProfileSettings.vue'
import AdminLayout from '../views/AdminLayout.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import AdminLogin from '../views/AdminLogin.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/admin-login',
    name: 'AdminLogin',
    component: AdminLogin
  },
  {
    path: '/home',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true }
  },
  {
    path: '/plans',
    name: 'PlanList',
    component: PlanList,
    meta: { requiresAuth: true }
  },
  {
    path: '/plan/:id',
    name: 'PlanDetail',
    component: () => import('../views/PlanDetail.vue'),
    meta: { requiresAuth: true, title: '计划详情' }
  },
  {
    path: '/analysis',
    name: 'DataAnalysis',
    component: DataAnalysis,
    meta: { requiresAuth: true }
  },
  {
    path: '/data-center',
    name: 'DataCenter',
    component: DataCenter,
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true, title: '学习仪表盘', icon: 'DataAnalysis' }
  },
  {
    path: '/course-editor',
    name: 'CourseEditor',
    component: CourseEditor,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'ProfileSettings',
    component: ProfileSettings,
    meta: { requiresAuth: true }
  },
  {
    path: '/tasks/ddl',
    name: 'DDLTasks',
    component: () => import('../views/DDLTasks.vue'),
    meta: { requiresAuth: true, title: 'DDL 任务' }
  },
  {
    path: '/tasks/exams',
    name: 'ExamManage',
    component: () => import('../views/ExamManage.vue'),
    meta: { requiresAuth: true, title: '考试管理' }
  },
  {
    path: '/study-stats',
    name: 'StudyStats',
    component: () => import('../views/StudyStats.vue'),
    meta: { requiresAuth: true, title: '学习统计' }
  },
  {
    path: '/badge-wall',
    name: 'AchievementWall',
    component: () => import('../views/AchievementWall.vue'),
    meta: { requiresAuth: true, title: '勋章墙' }
  },
  {
    path: '/learning-analysis',
    name: 'LearningAnalysis',
    component: () => import('../views/LearningAnalysis.vue'),
    meta: { requiresAuth: true, title: '学习分析' }
  },
  {
    path: '/notifications',
    name: 'NotificationCenter',
    component: () => import('../views/NotificationCenter.vue'),
    meta: { requiresAuth: true, title: '消息中心' }
  },
  // 管理员路由
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAdminAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: AdminDashboard
      },
      {
        path: 'statistics',
        name: 'AdminStatistics',
        component: () => import('../views/AdminStatistics.vue')
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/AdminUsers.vue')
      },
      {
        path: 'risk-users',
        name: 'AdminRiskUsers',
        component: () => import('../views/AdminRiskUsers.vue')
      },
      {
        path: 'feedback',
        name: 'AdminFeedback',
        component: () => import('../views/AdminFeedback.vue')
      },
      {
        path: 'plans',
        name: 'AdminPlans',
        component: () => import('../views/AdminPlans.vue')
      },
      {
        path: 'knowledge',
        name: 'AdminKnowledge',
        component: () => import('../views/AdminKnowledge.vue')
      },
      {
        path: 'resources',
        name: 'AdminResources',
        component: () => import('../views/AdminResources.vue')
      },
      {
        path: 'settings',
        name: 'AdminSettings',
        component: () => import('../views/AdminSettings.vue')
      },
      {
        path: 'notifications',
        name: 'AdminNotifications',
        component: () => import('../views/AdminNotifications.vue')
      },
      {
        path: 'operation-logs',
        name: 'AdminOperationLogs',
        component: () => import('../views/AdminOperationLogs.vue')
      },
      {
        path: 'error-logs',
        name: 'AdminErrorLogs',
        component: () => import('../views/AdminErrorLogs.vue')
      },
      {
        path: 'profile',
        name: 'AdminProfile',
        component: () => import('../views/AdminProfile.vue')
      },
      {
        path: 'admins',
        name: 'AdminManage',
        component: () => import('../views/AdminManage.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = getToken()
  const adminToken = getAdminToken()

  // 管理员路由需要特殊验证
  if (to.path.startsWith('/admin') && to.path !== '/admin-login') {
    if (!adminToken) {
      next('/admin-login')
      return
    }
    
    // 管理员管理页面只允许超级管理员访问
    if (to.path === '/admin/admins') {
      try {
        const parts = adminToken.split('.')
        if (parts.length === 3) {
          let payload = parts[1]
          payload = payload.replace(/-/g, '+').replace(/_/g, '/')
          const pad = payload.length % 4
          if (pad) {
            payload += '='.repeat(4 - pad)
          }
          const decoded = atob(payload)
          const payloadObj = JSON.parse(decoded)
          
          if (payloadObj.role !== 'super_admin') {
            next('/admin/dashboard')
            return
          }
        }
      } catch (e) {
        console.error('Token解析失败', e)
      }
    }
  }

  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
