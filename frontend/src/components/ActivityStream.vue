<template>
  <div class="activity-stream">
    <div class="stream-header">
      <span class="stream-title">📡 实时动态</span>
      <el-button text size="small" @click="refreshActivities" :loading="loading">
        <el-icon><Refresh /></el-icon>
      </el-button>
    </div>
    <div class="stream-content" ref="streamRef" v-loading="loading">
      <transition-group name="activity" tag="div">
        <div 
          class="activity-item" 
          v-for="activity in activities" 
          :key="activity.id"
        >
          <div class="activity-icon" :class="activity.type">
            {{ getActivityIcon(activity.type) }}
          </div>
          <div class="activity-content">
            <div class="activity-text">
              <span class="activity-user">{{ activity.username }}</span>
              {{ activity.action }}
            </div>
            <div class="activity-target" v-if="activity.target">
              「{{ activity.target }}」
            </div>
          </div>
          <div class="activity-time">{{ formatTime(activity.time) }}</div>
        </div>
      </transition-group>
      <el-empty v-if="!loading && activities.length === 0" description="暂无动态" :image-size="60" />
    </div>
  </div>
</template>

<script>
import { Refresh } from '@element-plus/icons-vue'
import { adminApi } from '../api'

export default {
  name: 'ActivityStream',
  components: { Refresh },
  data() {
    return {
      loading: false,
      activities: []
    }
  },
  mounted() {
    this.fetchActivities()
  },
  methods: {
    async fetchActivities() {
      this.loading = true
      try {
        const res = await adminApi.getActivities(20)
        if (res.success) {
          this.activities = res.data || []
        }
      } catch (e) {
        console.error('获取实时动态失败:', e)
      } finally {
        this.loading = false
      }
    },
    getActivityIcon(type) {
      const icons = {
        register: '🆕',
        plan: '📝',
        task: '✅',
        risk: '⚠️',
        badge: '🏆',
        study: '📚'
      }
      return icons[type] || '📌'
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
    refreshActivities() {
      this.fetchActivities()
      this.$message.success('动态已刷新')
    }
  }
}
</script>

<style scoped>
.activity-stream {
  background: #fff;
  border-radius: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.stream-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.stream-title {
  font-weight: 500;
  font-size: 15px;
}

.stream-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  transition: background 0.2s;
}

.activity-item:hover {
  background: #f9fafc;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.activity-icon.register {
  background: #e8f5e9;
}

.activity-icon.plan {
  background: #e3f2fd;
}

.activity-icon.task {
  background: #f3e5f5;
}

.activity-icon.risk {
  background: #fff3e0;
}

.activity-icon.badge {
  background: #fce4ec;
}

.activity-icon.study {
  background: #e0f7fa;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: 13px;
  color: #303133;
  line-height: 1.5;
}

.activity-user {
  font-weight: 500;
  color: #409eff;
}

.activity-target {
  font-size: 12px;
  color: #606266;
  margin-top: 2px;
}

.activity-time {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

.activity-enter-active,
.activity-leave-active {
  transition: all 0.3s ease;
}

.activity-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.activity-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
