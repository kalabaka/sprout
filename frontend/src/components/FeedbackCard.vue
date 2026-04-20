<template>
  <div class="feedback-card" :class="levelClass">
    <div class="card-header">
      <div class="score-badge">
        <span class="score">{{ feedback.score ?? 0 }}</span>
        <span class="unit">分</span>
      </div>
      <div class="level-info">
        <el-icon :size="20">
          <Trophy v-if="level === 'excellent'" />
          <CircleCheck v-else-if="level === 'good'" />
          <Warning v-else-if="level === 'pass'" />
          <CircleClose v-else />
        </el-icon>
        <span>{{ levelText }}</span>
      </div>
    </div>

    <div class="card-body">
      <p class="summary">{{ feedback.summary }}</p>
      
      <div v-if="feedback.strengths?.length" class="feedback-group">
        <div class="group-title">
          <el-icon color="#67c23a"><SuccessFilled /></el-icon>
          <span>优点</span>
        </div>
        <ul class="group-list">
          <li v-for="(item, i) in feedback.strengths" :key="i">{{ item }}</li>
        </ul>
      </div>

      <div v-if="feedback.weaknesses?.length" class="feedback-group">
        <div class="group-title">
          <el-icon color="#e6a23c"><WarningFilled /></el-icon>
          <span>待改进</span>
        </div>
        <ul class="group-list">
          <li v-for="(item, i) in feedback.weaknesses" :key="i">{{ item }}</li>
        </ul>
      </div>

      <div v-if="feedback.suggestions?.length" class="feedback-group">
        <div class="group-title">
          <el-icon color="#409eff"><InfoFilled /></el-icon>
          <span>建议</span>
        </div>
        <ul class="group-list">
          <li v-for="(item, i) in feedback.suggestions" :key="i">{{ item }}</li>
        </ul>
      </div>

      <div v-if="feedback.recommendedResources?.length" class="feedback-group">
        <div class="group-title">
          <el-icon color="#909399"><Reading /></el-icon>
          <span>推荐资源</span>
        </div>
        <div class="resource-list">
          <div v-for="(res, i) in feedback.recommendedResources" :key="i" class="resource-item">
            <el-icon><Link /></el-icon>
            <span>{{ res.title }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showTimestamp && feedback.timestamp" class="card-footer">
      <span>{{ formatTime(feedback.timestamp) }}</span>
    </div>
  </div>
</template>

<script>
import { 
  Trophy, CircleCheck, CircleClose, Warning,
  SuccessFilled, WarningFilled, InfoFilled,
  Reading, Link
} from '@element-plus/icons-vue'

export default {
  name: 'FeedbackCard',
  components: {
    Trophy,
    CircleCheck,
    CircleClose,
    Warning,
    SuccessFilled,
    WarningFilled,
    InfoFilled,
    Reading,
    Link
  },
  props: {
    feedback: {
      type: Object,
      required: true
    },
    showTimestamp: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    level() {
      const score = this.feedback.score ?? 0
      if (score >= 90) return 'excellent'
      if (score >= 70) return 'good'
      if (score >= 60) return 'pass'
      return 'need-improve'
    },
    levelClass() {
      return `level-${this.level}`
    },
    levelText() {
      const texts = {
        excellent: '优秀',
        good: '良好',
        pass: '及格',
        'need-improve': '需努力'
      }
      return texts[this.level] || ''
    }
  },
  methods: {
    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
}
</script>

<style scoped>
.feedback-card {
  border-radius: 12px;
  border: 1px solid #ebeef5;
  overflow: hidden;
  background: #fff;
}

.feedback-card.level-excellent {
  border-color: #67c23a;
}

.feedback-card.level-good {
  border-color: #409eff;
}

.feedback-card.level-pass {
  border-color: #e6a23c;
}

.feedback-card.level-need-improve {
  border-color: #f56c6c;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
}

.level-excellent .card-header {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
}

.level-good .card-header {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
}

.level-pass .card-header {
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
}

.level-need-improve .card-header {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
}

.score-badge {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.score-badge .score {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.score-badge .unit {
  font-size: 14px;
  color: #909399;
}

.level-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.level-excellent .level-info {
  color: #67c23a;
}

.level-good .level-info {
  color: #409eff;
}

.level-pass .level-info {
  color: #e6a23c;
}

.level-need-improve .level-info {
  color: #f56c6c;
}

.card-body {
  padding: 16px 20px;
}

.summary {
  margin: 0 0 16px;
  color: #606266;
  line-height: 1.6;
}

.feedback-group {
  margin-bottom: 12px;
}

.feedback-group:last-child {
  margin-bottom: 0;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-weight: 500;
  color: #303133;
}

.group-list {
  margin: 0;
  padding-left: 22px;
}

.group-list li {
  margin-bottom: 4px;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
}

.resource-item:hover {
  background: #ecf5ff;
  color: #409eff;
}

.card-footer {
  padding: 12px 20px;
  background: #fafafa;
  border-top: 1px solid #ebeef5;
  font-size: 12px;
  color: #909399;
}
</style>
