<template>
  <el-popover
    placement="bottom-end"
    :width="360"
    trigger="click"
    v-model:visible="showPanel"
    @show="handlePanelShow"
  >
    <template #reference>
      <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99" class="notification-badge">
        <el-button circle class="icon-btn" @click.stop>
          <el-icon><Bell /></el-icon>
        </el-button>
      </el-badge>
    </template>

    <div class="notification-panel">
      <div class="notification-header">
        <span class="header-title">通知中心</span>
        <el-button link type="primary" size="small" @click="markAllAsRead" :disabled="unreadCount === 0">
          全部已读
        </el-button>
      </div>

      <div class="notification-list" v-loading="loading">
        <div v-if="notifications.length === 0 && !loading" class="notification-empty">
          <el-icon :size="48"><Bell /></el-icon>
          <p>暂无通知</p>
        </div>

        <div
          v-for="item in notifications"
          :key="item.id"
          class="notification-item"
          :class="{ unread: !item.is_read }"
          @click="handleNotificationClick(item)"
        >
          <div class="notification-icon" :class="item.type">
            <el-icon v-if="item.type === 'task_reminder'"><Clock /></el-icon>
            <el-icon v-else-if="item.type === 'exam_reminder'"><Document /></el-icon>
            <el-icon v-else-if="item.type === 'checkin_reminder'"><Calendar /></el-icon>
            <el-icon v-else-if="item.type === 'plan_warning'"><Warning /></el-icon>
            <el-icon v-else-if="item.type === 'achievement'"><Medal /></el-icon>
            <el-icon v-else><Bell /></el-icon>
          </div>
          <div class="notification-content">
            <div class="notification-title">{{ item.title }}</div>
            <div class="notification-text">{{ item.content }}</div>
            <div class="notification-time">{{ formatTime(item.created_at) }}</div>
          </div>
          <div v-if="!item.is_read" class="unread-dot"></div>
        </div>
      </div>

      <div class="notification-footer">
        <el-button size="small" @click="markAllAsRead" :disabled="unreadCount === 0">
          全部已读
        </el-button>
        <el-button type="primary" size="small" @click="goToNotificationList">
          查看更多
        </el-button>
      </div>
    </div>
  </el-popover>
</template>

<script>
import { notificationApi } from '../api'
import { Bell, Clock, Document, Calendar, Warning, Medal } from '@element-plus/icons-vue'

export default {
  name: 'NotificationBell',
  components: {
    Bell,
    Clock,
    Document,
    Calendar,
    Warning,
    Medal
  },
  data() {
    return {
      showPanel: false,
      loading: false,
      unreadCount: 0,
      notifications: [],
      pollingTimer: null
    }
  },
  mounted() {
    this.fetchUnreadCount()
    this.startPolling()
  },
  beforeUnmount() {
    this.stopPolling()
  },
  methods: {
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

    async fetchNotifications() {
      this.loading = true
      try {
        const res = await notificationApi.getNotifications({ page: 1, limit: 5 })
        if (res.code === 200) {
          this.notifications = res.data.list || []
          this.unreadCount = res.data.unreadCount || 0
        }
      } catch (error) {
        console.error('获取通知列表失败:', error)
      } finally {
        this.loading = false
      }
    },

    handlePanelShow() {
      this.fetchNotifications()
    },

    async handleNotificationClick(item) {
      if (!item.is_read) {
        try {
          const res = await notificationApi.markAsRead(item.id)
          if (res.code === 200) {
            item.is_read = true
            await this.fetchUnreadCount()
            this.$emit('unread-count-change', this.unreadCount)
          }
        } catch (error) {
          console.error('标记已读失败:', error)
        }
      }

      this.showPanel = false

      if (item.link_type && item.link_id) {
        this.navigateToLink(item.link_type, item.link_id)
      }
    },

    navigateToLink(linkType, linkId) {
      const routes = {
        task: `/task/${linkId}`,
        exam: `/exams`,
        plan: `/plan/${linkId}`,
        achievement: '/achievements',
        dashboard: '/dashboard'
      }

      const route = routes[linkType]
      if (route) {
        this.$router.push(route)
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
          this.$emit('unread-count-change', this.unreadCount)
          this.$message.success('已全部标记为已读')
        }
      } catch (error) {
        console.error('全部标记已读失败:', error)
        this.$message.error('操作失败')
      }
    },

    goToNotificationList() {
      this.showPanel = false
      this.$router.push('/notifications')
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
      if (days < 7) return `${days} 天前`

      return date.toLocaleDateString('zh-CN')
    },

    startPolling() {
      this.pollingTimer = setInterval(() => {
        this.fetchUnreadCount()
      }, 30000)
    },

    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer)
        this.pollingTimer = null
      }
    }
  }
}
</script>

<style scoped>
.notification-badge {
  margin-right: 12px;
}

.icon-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.notification-panel {
  max-height: 480px;
  display: flex;
  flex-direction: column;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.notification-list {
  flex: 1;
  overflow-y: auto;
  max-height: 360px;
}

.notification-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #909399;
}

.notification-empty p {
  margin-top: 12px;
  font-size: 14px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.notification-item:hover {
  background-color: #f5f7fa;
}

.notification-item.unread {
  background-color: #ecf5ff;
}

.notification-item.unread:hover {
  background-color: #d9ecff;
}

.notification-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
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
}

.notification-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.notification-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.notification-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #f56c6c;
  position: absolute;
  right: 16px;
  top: 16px;
}

.notification-footer {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid #ebeef5;
}
</style>
