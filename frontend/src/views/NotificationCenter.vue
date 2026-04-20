<template>
  <div class="notification-center">
    <div class="header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1>📬 消息中心</h1>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="markAllAsRead" :disabled="unreadCount === 0">
          <el-icon><Check /></el-icon>
          全部标记已读
        </el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-radio-group v-model="filterType" @change="handleFilterChange">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="unread">未读</el-radio-button>
        <el-radio-button value="task_reminder">任务</el-radio-button>
        <el-radio-button value="exam_reminder">考试</el-radio-button>
        <el-radio-button value="achievement">成就</el-radio-button>
        <el-radio-button value="system">系统</el-radio-button>
      </el-radio-group>
    </div>

    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ unreadCount }}</span>
        <span class="stat-label">未读</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ pagination.total }}</span>
        <span class="stat-label">总消息</span>
      </div>
    </div>

    <div v-loading="loading" class="notification-list">
      <div v-if="notifications.length === 0 && !loading" class="empty-state">
        <el-icon :size="64"><Bell /></el-icon>
        <p>暂无通知消息</p>
      </div>

      <div
        v-for="item in notifications"
        :key="item.id"
        class="notification-card"
        :class="{ unread: !item.is_read }"
      >
        <div class="notification-icon" :class="item.type">
          <el-icon v-if="item.type === 'task_reminder'"><Clock /></el-icon>
          <el-icon v-else-if="item.type === 'exam_reminder'"><Document /></el-icon>
          <el-icon v-else-if="item.type === 'checkin_reminder'"><Calendar /></el-icon>
          <el-icon v-else-if="item.type === 'plan_warning'"><Warning /></el-icon>
          <el-icon v-else-if="item.type === 'achievement'"><Medal /></el-icon>
          <el-icon v-else><Bell /></el-icon>
        </div>

        <div class="notification-content" @click="handleNotificationClick(item)">
          <div class="notification-header-row">
            <span class="notification-type">{{ getTypeText(item.type) }}</span>
            <span class="notification-time">{{ formatTime(item.created_at) }}</span>
          </div>
          <div class="notification-title">{{ item.title }}</div>
          <div class="notification-text">{{ item.content }}</div>
        </div>

        <div class="notification-actions">
          <el-button
            v-if="item.link_type && item.link_id"
            type="primary"
            size="small"
            text
            @click="navigateToLink(item)"
          >
            {{ getLinkText(item.link_type) }}
            <el-icon><ArrowRight /></el-icon>
          </el-button>
          <el-button
            type="danger"
            size="small"
            text
            @click="handleDelete(item)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="pagination.total > 0" class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :page-sizes="[10, 20, 50]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script>
import { notificationApi } from '../api'
import { Bell, Clock, Document, Calendar, Warning, Medal, ArrowLeft, ArrowRight, Check, Delete } from '@element-plus/icons-vue'

export default {
  name: 'NotificationCenter',
  components: {
    Bell,
    Clock,
    Document,
    Calendar,
    Warning,
    Medal,
    ArrowLeft,
    ArrowRight,
    Check,
    Delete
  },
  data() {
    return {
      loading: false,
      notifications: [],
      unreadCount: 0,
      filterType: 'all',
      pagination: {
        page: 1,
        limit: 20,
        total: 0
      }
    }
  },
  mounted() {
    this.fetchNotifications()
    this.fetchUnreadCount()
  },
  methods: {
    async fetchNotifications() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit
        }

        if (this.filterType === 'unread') {
          params.unreadOnly = true
        } else if (this.filterType !== 'all') {
          params.type = this.filterType
        }

        const res = await notificationApi.getNotifications(params)
        if (res.code === 200) {
          this.notifications = res.data.list || []
          this.pagination.total = res.data.total || 0
        }
      } catch (error) {
        console.error('获取通知列表失败:', error)
        this.$message.error('获取通知列表失败')
      } finally {
        this.loading = false
      }
    },

    async fetchUnreadCount() {
      try {
        const res = await notificationApi.getUnreadCount()
        if (res.code === 200) {
          this.unreadCount = res.data.count
        }
      } catch (error) {
        console.error('获取未读数量失败:', error)
      }
    },

    handleFilterChange() {
      this.pagination.page = 1
      this.fetchNotifications()
    },

    handlePageChange(page) {
      this.pagination.page = page
      this.fetchNotifications()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },

    handleSizeChange(size) {
      this.pagination.limit = size
      this.pagination.page = 1
      this.fetchNotifications()
    },

    async handleNotificationClick(item) {
      if (!item.is_read) {
        try {
          const res = await notificationApi.markAsRead(item.id)
          if (res.code === 200) {
            item.is_read = true
            await this.fetchUnreadCount()
          }
        } catch (error) {
          console.error('标记已读失败:', error)
        }
      }
    },

    async markAllAsRead() {
      try {
        const res = await notificationApi.markAllAsRead()
        if (res.code === 200) {
          this.notifications.forEach(item => {
            item.is_read = true
          })
          await this.fetchUnreadCount()
          this.$message.success('已全部标记为已读')
        }
      } catch (error) {
        console.error('全部标记已读失败:', error)
        this.$message.error('操作失败')
      }
    },

    async handleDelete(item) {
      try {
        await this.$confirm('确定要删除这条通知吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        const res = await notificationApi.deleteNotification(item.id)
        if (res.code === 200) {
          this.notifications = this.notifications.filter(n => n.id !== item.id)
          this.pagination.total--
          await this.fetchUnreadCount()
          this.$message.success('删除成功')

          if (this.notifications.length === 0 && this.pagination.page > 1) {
            this.pagination.page--
            this.fetchNotifications()
          }
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除通知失败:', error)
          this.$message.error('删除失败')
        }
      }
    },

    navigateToLink(item) {
      if (!item.is_read) {
        this.handleNotificationClick(item)
      }
      this.navigateToLink(item.link_type, item.link_id)
    },

    navigateToLink(linkType, linkId) {
      const routes = {
        task: `/tasks/ddl`,
        exam: `/tasks/exams`,
        plan: `/plan/${linkId}`,
        achievement: '/badge-wall',
        dashboard: '/dashboard'
      }

      const route = routes[linkType]
      if (route) {
        this.$router.push(route)
      }
    },

    goBack() {
      this.$router.back()
    },

    getTypeText(type) {
      const typeMap = {
        task_reminder: '任务提醒',
        exam_reminder: '考试提醒',
        checkin_reminder: '打卡提醒',
        plan_warning: '计划预警',
        achievement: '成就通知',
        system: '系统通知'
      }
      return typeMap[type] || '通知'
    },

    getLinkText(linkType) {
      const linkMap = {
        task: '查看任务',
        exam: '查看考试',
        plan: '查看计划',
        achievement: '查看勋章',
        dashboard: '查看详情'
      }
      return linkMap[linkType] || '查看详情'
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
      if (minutes < 60) return `${minutes} 分钟前`
      if (hours < 24) return `${hours} 小时前`
      if (days === 1) return '昨天'
      if (days < 7) return `${days} 天前`

      return date.toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric'
      })
    }
  }
}
</script>

<style scoped>
.notification-center {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h1 {
  color: #fff;
  font-size: 24px;
  margin: 0;
}

.header-left .el-button {
  color: #fff;
}

.filter-bar {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.stats-bar {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.stat-item {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #fff;
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.notification-list {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  min-height: 400px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #909399;
}

.empty-state p {
  margin-top: 16px;
  font-size: 16px;
}

.notification-card {
  display: flex;
  align-items: flex-start;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.notification-card:last-child {
  border-bottom: none;
}

.notification-card:hover {
  background-color: #fafafa;
}

.notification-card.unread {
  background-color: #ecf5ff;
}

.notification-card.unread:hover {
  background-color: #d9ecff;
}

.notification-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  flex-shrink: 0;
  font-size: 20px;
}

.notification-icon.task_reminder {
  background-color: #e6f7ff;
  color: #1890ff;
}

.notification-icon.exam_reminder {
  background-color: #fff7e6;
  color: #fa8c16;
}

.notification-icon.checkin_reminder {
  background-color: #f6ffed;
  color: #52c41a;
}

.notification-icon.plan_warning {
  background-color: #fff1f0;
  color: #f5222d;
}

.notification-icon.achievement {
  background-color: #fffbe6;
  color: #faad14;
}

.notification-icon.system {
  background-color: #f0f0f0;
  color: #8c8c8c;
}

.notification-content {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.notification-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.notification-type {
  font-size: 12px;
  color: #909399;
}

.notification-time {
  font-size: 12px;
  color: #c0c4cc;
}

.notification-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.notification-text {
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}

.notification-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  margin-left: 16px;
}

.pagination-wrapper {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
