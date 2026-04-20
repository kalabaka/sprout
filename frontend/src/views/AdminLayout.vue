<template>
  <div class="admin-layout" :class="{ 'dark-mode': isDarkMode }">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <div class="logo" v-if="!isCollapsed">
          <span class="logo-icon">🛡️</span>
          <span class="logo-text">管理员后台</span>
        </div>
        <span v-else class="logo-icon-collapsed">🛡️</span>
      </div>

      <el-scrollbar class="sidebar-scroll">
        <el-menu
          :default-active="activeMenu"
          class="sidebar-menu"
          :collapse="isCollapsed"
          router
        >
          <!-- 数据看板 -->
          <el-sub-menu index="dashboard-group">
            <template #title>
              <el-icon><DataAnalysis /></el-icon>
              <span>📊 数据看板</span>
            </template>
            <el-menu-item index="/admin/dashboard">
              <el-icon><Monitor /></el-icon>
              <template #title>系统概览</template>
            </el-menu-item>
            <el-menu-item index="/admin/statistics">
              <el-icon><TrendCharts /></el-icon>
              <template #title>数据统计</template>
            </el-menu-item>
          </el-sub-menu>

          <!-- 用户管理 -->
          <el-sub-menu index="user-group">
            <template #title>
              <el-icon><User /></el-icon>
              <span>👥 用户管理</span>
            </template>
            <el-menu-item index="/admin/users">
              <el-icon><List /></el-icon>
              <template #title>用户列表</template>
            </el-menu-item>
            <el-menu-item index="/admin/risk-users">
              <el-icon><Warning /></el-icon>
              <template #title>风险用户</template>
            </el-menu-item>
            <el-menu-item index="/admin/feedback">
              <el-icon><ChatDotSquare /></el-icon>
              <template #title>用户反馈</template>
            </el-menu-item>
          </el-sub-menu>

          <!-- 内容管理 -->
          <el-sub-menu index="content-group">
            <template #title>
              <el-icon><Document /></el-icon>
              <span>📚 内容管理</span>
            </template>
            <el-menu-item index="/admin/plans">
              <el-icon><Notebook /></el-icon>
              <template #title>学习计划</template>
            </el-menu-item>
            <el-menu-item index="/admin/knowledge">
              <el-icon><Share /></el-icon>
              <template #title>知识图谱</template>
            </el-menu-item>
            <el-menu-item index="/admin/resources">
              <el-icon><FolderOpened /></el-icon>
              <template #title>资源管理</template>
            </el-menu-item>
          </el-sub-menu>

          <!-- 系统设置 -->
          <el-sub-menu index="settings-group">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>⚙️ 系统设置</span>
            </template>
            <el-menu-item index="/admin/settings">
              <el-icon><Tools /></el-icon>
              <template #title>参数配置</template>
            </el-menu-item>
            <el-menu-item index="/admin/notifications">
              <el-icon><Bell /></el-icon>
              <template #title>通知模板</template>
            </el-menu-item>
            <el-menu-item index="/admin/admins" v-if="adminRole === 'super_admin'">
              <el-icon><UserFilled /></el-icon>
              <template #title>管理员账号</template>
            </el-menu-item>
          </el-sub-menu>

          <!-- 日志审计 -->
          <el-sub-menu index="log-group">
            <template #title>
              <el-icon><Tickets /></el-icon>
              <span>📋 日志审计</span>
            </template>
            <el-menu-item index="/admin/operation-logs">
              <el-icon><DocumentCopy /></el-icon>
              <template #title>操作日志</template>
            </el-menu-item>
            <el-menu-item index="/admin/error-logs">
              <el-icon><CircleClose /></el-icon>
              <template #title>错误日志</template>
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-scrollbar>

      <div class="sidebar-footer">
        <el-button text @click="toggleCollapse" class="collapse-btn">
          <el-icon><DArrowLeft v-if="!isCollapsed" /><DArrowRight v-else /></el-icon>
        </el-button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 顶部栏 -->
      <header class="topbar">
        <div class="topbar-left">
          <h2>{{ pageTitle }}</h2>
        </div>
        <div class="topbar-center">
          <el-input
            v-model="searchKeyword"
            placeholder="🔍 搜索用户/计划..."
            class="global-search"
            @keyup.enter="handleGlobalSearch"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="topbar-right">
          <el-badge :value="pendingCount" :hidden="pendingCount === 0" class="pending-badge">
            <el-button text @click="showPendingDialog = true">
              <el-icon :size="18"><Bell /></el-icon>
            </el-button>
          </el-badge>
          
          <div class="system-time">
            {{ currentTime }}
          </div>

          <el-button text @click="toggleDarkMode" class="theme-btn">
            <el-icon :size="18"><Moon v-if="!isDarkMode" /><Sunny v-else /></el-icon>
          </el-button>

          <el-dropdown trigger="click" @command="handleCommand">
            <div class="admin-info">
              <el-avatar :size="32" class="admin-avatar">
                {{ adminUsername?.charAt(0) || 'A' }}
              </el-avatar>
              <span class="admin-name">{{ adminUsername || '管理员' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  个人中心
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 内容区 -->
      <div class="content-area">
        <router-view />
      </div>
    </div>

    <!-- 待处理事项弹窗 -->
    <el-dialog v-model="showPendingDialog" title="待处理事项" width="500px">
      <div class="pending-list" v-if="pendingItems.length > 0">
        <div class="pending-item" v-for="item in pendingItems" :key="item.id">
          <el-icon :class="item.type"><component :is="getIcon(item.type)" /></el-icon>
          <div class="pending-content" @click="handlePendingItem(item)">
            <div class="pending-title">{{ item.title }}</div>
            <div class="pending-time">{{ formatTime(item.time) }}</div>
          </div>
          <el-tag :type="item.priority" size="small">{{ item.priorityText }}</el-tag>
          <el-button type="primary" size="small" text @click.stop="markItemRead(item)">已处理</el-button>
        </div>
      </div>
      <el-empty v-else description="暂无待处理事项" />
    </el-dialog>

    <!-- 全局搜索结果弹窗 -->
    <el-dialog v-model="showSearchDialog" title="搜索结果" width="600px">
      <el-tabs v-model="searchTab">
        <el-tab-pane label="用户" name="users">
          <div class="search-results" v-if="searchResults.users.length > 0">
            <div class="search-item" v-for="user in searchResults.users" :key="user.id" @click="goToUser(user.id)">
              <el-avatar :size="36">{{ user.username?.charAt(0) }}</el-avatar>
              <div class="search-item-content">
                <div class="search-item-title">{{ user.username }}</div>
                <div class="search-item-desc">{{ user.email }}</div>
              </div>
            </div>
          </div>
          <el-empty v-else description="未找到相关用户" />
        </el-tab-pane>
        <el-tab-pane label="计划" name="plans">
          <div class="search-results" v-if="searchResults.plans.length > 0">
            <div class="search-item" v-for="plan in searchResults.plans" :key="plan.id">
              <el-icon :size="36"><Notebook /></el-icon>
              <div class="search-item-content">
                <div class="search-item-title">{{ plan.title }}</div>
                <div class="search-item-desc">{{ plan.status }}</div>
              </div>
            </div>
          </div>
          <el-empty v-else description="未找到相关计划" />
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script>
import {
  DataAnalysis, User, Document, Setting, ArrowDown, DArrowLeft, DArrowRight,
  SwitchButton, UserFilled, Search, Bell, Moon, Sunny, Monitor, TrendCharts,
  List, Warning, ChatDotSquare, Notebook, Share, FolderOpened, Tools,
  Tickets, DocumentCopy, CircleClose
} from '@element-plus/icons-vue'
import { getAdminToken, removeAdminToken } from '../utils/token'
import { adminApi } from '../api'

export default {
  name: 'AdminLayout',
  components: {
    DataAnalysis, User, Document, Setting, ArrowDown, DArrowLeft, DArrowRight,
    SwitchButton, UserFilled, Search, Bell, Moon, Sunny, Monitor, TrendCharts,
    List, Warning, ChatDotSquare, Notebook, Share, FolderOpened, Tools,
    Tickets, DocumentCopy, CircleClose
  },
  data() {
    return {
      isCollapsed: false,
      isDarkMode: false,
      activeMenu: '/admin/dashboard',
      adminUsername: '',
      adminRole: '',
      searchKeyword: '',
      showSearchDialog: false,
      showPendingDialog: false,
      currentTime: '',
      pendingCount: 0,
      pendingItems: [],
      searchResults: {
        users: [],
        plans: []
      },
      searchTab: 'users',
      pageTitles: {
        '/admin/dashboard': '系统概览',
        '/admin/statistics': '数据统计',
        '/admin/users': '用户列表',
        '/admin/risk-users': '风险用户',
        '/admin/feedback': '用户反馈',
        '/admin/plans': '学习计划',
        '/admin/knowledge': '知识图谱',
        '/admin/resources': '资源管理',
        '/admin/settings': '参数配置',
        '/admin/notifications': '通知模板',
        '/admin/admins': '管理员账号',
        '/admin/operation-logs': '操作日志',
        '/admin/error-logs': '错误日志',
        '/admin/profile': '个人中心'
      },
      timeInterval: null
    }
  },
  computed: {
    pageTitle() {
      return this.pageTitles[this.$route.path] || '管理后台'
    }
  },
  mounted() {
    this.checkAuth()
    this.activeMenu = this.$route.path
    this.updateTime()
    this.timeInterval = setInterval(this.updateTime, 1000)
    this.isDarkMode = localStorage.getItem('admin-dark-mode') === 'true'
    this.applyDarkMode()
    this.fetchPendingItems()
    
    window.addEventListener('keydown', this.handleGlobalKeydown)
  },
  beforeUnmount() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval)
    }
    window.removeEventListener('keydown', this.handleGlobalKeydown)
  },
  methods: {
    updateTime() {
      const now = new Date()
      this.currentTime = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    },

    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed
    },

    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode
      localStorage.setItem('admin-dark-mode', this.isDarkMode)
      this.applyDarkMode()
    },

    applyDarkMode() {
      document.documentElement.classList.toggle('dark', this.isDarkMode)
    },

    handleGlobalKeydown(e) {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        this.$nextTick(() => {
          document.querySelector('.global-search input')?.focus()
        })
      }
      if (e.key === 'Escape') {
        this.showSearchDialog = false
        this.showPendingDialog = false
      }
    },

    async handleGlobalSearch() {
      if (!this.searchKeyword.trim()) return
      
      try {
        const res = await adminApi.getUsers({ keyword: this.searchKeyword, limit: 10 })
        this.searchResults.users = res.data || []
        this.searchResults.plans = []
        this.showSearchDialog = true
      } catch (e) {
        this.$message.error('搜索失败')
      }
    },

    goToUser(userId) {
      this.showSearchDialog = false
      this.$router.push(`/admin/users?id=${userId}`)
    },

    formatTime(time) {
      if (!time) return ''
      const date = new Date(time)
      const now = new Date()
      const diff = now - date

      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)

      if (minutes < 1) return '刚刚'
      if (minutes < 60) return `${minutes}分钟前`
      if (hours < 24) return `${hours}小时前`
      if (days < 7) return `${days}天前`

      return date.toLocaleDateString('zh-CN')
    },

    getIcon(type) {
      const icons = {
        feedback: ChatDotSquare,
        risk: Warning,
        report: Document
      }
      return icons[type] || Document
    },

    async fetchPendingItems() {
      try {
        const res = await adminApi.getPendingItems()
        if (res.success) {
          this.pendingItems = res.data || []
          this.pendingCount = res.total || 0
        }
      } catch (e) {
        console.error('获取待处理事项失败:', e)
      }
    },

    async markItemRead(item) {
      try {
        const res = await adminApi.markPendingItemRead(item.id)
        if (res.success) {
          this.pendingItems = this.pendingItems.filter(i => i.id !== item.id)
          this.pendingCount = Math.max(0, this.pendingCount - 1)
          this.$message.success('已标记为已处理')
        }
      } catch (e) {
        console.error('标记已读失败:', e)
        this.$message.error('操作失败')
      }
    },

    handlePendingItem(item) {
      this.showPendingDialog = false
      if (item.type === 'feedback') {
        this.$router.push('/admin/feedback')
      } else if (item.type === 'risk') {
        this.$router.push('/admin/risk-users')
      }
    },

    handleLogout() {
      removeAdminToken()
      this.$message.warning('登录状态失效，请重新登录')
      this.$router.push('/admin-login')
    },

    async checkAuth() {
      const token = getAdminToken()
      if (!token) {
        this.$router.push('/admin-login')
        return
      }

      try {
        const res = await adminApi.getProfile()
        if (res && res.success) {
          this.adminUsername = res.data?.username || 'admin'
          this.adminRole = res.data?.role || 'admin'
        } else {
          this.handleLogout()
        }
      } catch (error) {
        this.handleLogout()
      }
    },

    handleCommand(command) {
      if (command === 'logout') {
        this.$confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          removeAdminToken()
          this.$router.push('/admin-login')
          this.$message.success('已退出登录')
        }).catch(() => {})
      } else if (command === 'profile') {
        this.$router.push('/admin/profile')
      }
    }
  }
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #f5f7fa;
  transition: background 0.3s;
}

.admin-layout.dark-mode {
  background: #1a1a2e;
}

/* 侧边栏 */
.sidebar {
  width: 240px;
  background: #fff;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
}

.dark-mode .sidebar {
  background: #16213e;
}

.sidebar.collapsed {
  width: 64px;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.dark-mode .sidebar-header {
  border-bottom-color: #2a2a4a;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 24px;
}

.logo-icon-collapsed {
  font-size: 24px;
  display: flex;
  justify-content: center;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.dark-mode .logo-text {
  color: #e0e0e0;
}

.sidebar-scroll {
  flex: 1;
}

.sidebar-menu {
  border-right: none;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 240px;
}

.dark-mode .sidebar-menu {
  background: transparent;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid #f0f0f0;
}

.dark-mode .sidebar-footer {
  border-top-color: #2a2a4a;
}

.collapse-btn {
  width: 100%;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 顶部栏 */
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 60px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  gap: 20px;
}

.dark-mode .topbar {
  background: #16213e;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.topbar-left h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
  white-space: nowrap;
}

.dark-mode .topbar-left h2 {
  color: #e0e0e0;
}

.topbar-center {
  flex: 1;
  max-width: 400px;
}

.global-search {
  width: 100%;
}

.dark-mode .global-search :deep(.el-input__wrapper) {
  background: #1a1a2e;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pending-badge {
  margin-right: 8px;
}

.system-time {
  font-size: 14px;
  color: #606266;
  font-family: monospace;
}

.dark-mode .system-time {
  color: #a0a0a0;
}

.theme-btn {
  padding: 8px;
}

.admin-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 20px;
  transition: background 0.2s;
}

.admin-info:hover {
  background: #f5f7fa;
}

.dark-mode .admin-info:hover {
  background: #2a2a4a;
}

.admin-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 14px;
}

.admin-name {
  font-size: 14px;
  color: #303133;
}

.dark-mode .admin-name {
  color: #e0e0e0;
}

/* 内容区 */
.content-area {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

/* 待处理事项 */
.pending-list {
  max-height: 400px;
  overflow-y: auto;
}

.pending-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.pending-item:hover {
  background: #f5f7fa;
}

.pending-content {
  flex: 1;
}

.pending-title {
  font-size: 14px;
  color: #303133;
}

.pending-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 搜索结果 */
.search-results {
  max-height: 400px;
  overflow-y: auto;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-item:hover {
  background: #f5f7fa;
}

.search-item-content {
  flex: 1;
}

.search-item-title {
  font-size: 14px;
  color: #303133;
}

.search-item-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    z-index: 100;
    height: 100vh;
  }

  .sidebar.collapsed {
    transform: translateX(-100%);
  }

  .topbar-center {
    display: none;
  }
}
</style>
