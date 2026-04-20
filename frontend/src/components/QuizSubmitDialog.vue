<template>
  <el-dialog
    v-model="visible"
    :title="task?.name || '完成任务'"
    width="650px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" :size="40"><Loading /></el-icon>
      <p>正在评测...</p>
    </div>

    <div v-else-if="feedbackData" class="result-container">
      <div class="result-header" :class="resultClass">
        <div class="score-circle">
          <span class="score-value">{{ feedbackData.score ?? score }}</span>
          <span class="score-unit">分</span>
        </div>
        <div class="result-status">
          <el-icon v-if="feedbackData.score >= 90" :size="24"><Trophy /></el-icon>
          <el-icon v-else-if="feedbackData.score >= 60" :size="24"><CircleCheck /></el-icon>
          <el-icon v-else :size="24"><CircleClose /></el-icon>
          <span>{{ levelText }}</span>
        </div>
      </div>
      
      <div class="feedback-summary">
        <p>{{ feedbackData.summary }}</p>
        <p class="encouragement">{{ feedbackData.encouragement }}</p>
      </div>

      <div v-if="feedbackData.strengths?.length" class="feedback-section">
        <div class="section-header">
          <el-icon color="#67c23a"><SuccessFilled /></el-icon>
          <span>优点</span>
        </div>
        <ul class="feedback-list strengths">
          <li v-for="(item, i) in feedbackData.strengths" :key="i">{{ item }}</li>
        </ul>
      </div>

      <div v-if="feedbackData.weaknesses?.length" class="feedback-section">
        <div class="section-header">
          <el-icon color="#e6a23c"><WarningFilled /></el-icon>
          <span>待改进</span>
        </div>
        <ul class="feedback-list weaknesses">
          <li v-for="(item, i) in feedbackData.weaknesses" :key="i">{{ item }}</li>
        </ul>
      </div>

      <div v-if="feedbackData.suggestions?.length" class="feedback-section">
        <div class="section-header">
          <el-icon color="#409eff"><InfoFilled /></el-icon>
          <span>改进建议</span>
        </div>
        <ul class="feedback-list suggestions">
          <li v-for="(item, i) in feedbackData.suggestions" :key="i">{{ item }}</li>
        </ul>
      </div>

      <div v-if="feedbackData.recommendedResources?.length" class="feedback-section">
        <div class="section-header">
          <el-icon color="#909399"><Reading /></el-icon>
          <span>推荐资源</span>
        </div>
        <div class="resource-cards">
          <div v-for="(res, i) in feedbackData.recommendedResources" :key="i" class="resource-card">
            <div class="resource-icon">
              <el-icon v-if="res.type === 'video'"><VideoPlay /></el-icon>
              <el-icon v-else-if="res.type === 'practice'"><Edit /></el-icon>
              <el-icon v-else><Document /></el-icon>
            </div>
            <div class="resource-info">
              <span class="resource-title">{{ res.title }}</span>
              <span class="resource-desc">{{ res.description }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="quiz-form">
      <div v-if="taskSubtype === 'single_choice'" class="choice-section">
        <p class="question-title">{{ task?.name }}</p>
        <el-radio-group v-model="userAnswer" class="options-group">
          <el-radio 
            v-for="(option, index) in questionData.options" 
            :key="index"
            :value="getOptionKey(option)"
            class="option-item"
            size="large"
          >
            {{ option }}
          </el-radio>
        </el-radio-group>
      </div>

      <div v-else-if="taskSubtype === 'multiple_choice'" class="choice-section">
        <p class="question-title">{{ task?.name }}</p>
        <el-checkbox-group v-model="userAnswers" class="options-group">
          <el-checkbox 
            v-for="(option, index) in questionData.options" 
            :key="index"
            :value="getOptionKey(option)"
            class="option-item"
            size="large"
          >
            {{ option }}
          </el-checkbox>
        </el-checkbox-group>
      </div>

      <div v-else-if="taskSubtype === 'fill_blank'" class="fill-section">
        <p class="question-title">{{ task?.name }}</p>
        <el-input
          v-model="userAnswer"
          type="textarea"
          :rows="4"
          placeholder="请输入你的答案..."
          class="answer-input"
        />
        <p class="hint">提示：答案中包含关键词即可得分</p>
      </div>

      <div v-else class="subjective-section">
        <p class="question-title">{{ task?.name }}</p>
        <div class="self-score-section">
          <span class="label">自我评分：</span>
          <el-slider
            v-model="selfScore"
            :min="0"
            :max="100"
            :step="5"
            show-input
            class="score-slider"
          />
        </div>
      </div>

      <div class="duration-section">
        <span class="label">学习时长（分钟）：</span>
        <el-input-number v-model="actualDuration" :min="1" :max="480" />
      </div>
    </div>

    <template #footer>
      <div v-if="feedbackData" class="result-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="handleConfirm">确认完成</el-button>
      </div>
      <div v-else class="form-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button 
          type="primary" 
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          提交答案
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import { taskApi } from '../api'
import { 
  Loading, CircleCheck, CircleClose, Trophy,
  SuccessFilled, WarningFilled, InfoFilled,
  Reading, VideoPlay, Edit, Document
} from '@element-plus/icons-vue'

export default {
  name: 'QuizSubmitDialog',
  components: {
    Loading,
    CircleCheck,
    CircleClose,
    Trophy,
    SuccessFilled,
    WarningFilled,
    InfoFilled,
    Reading,
    VideoPlay,
    Edit,
    Document
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    task: {
      type: Object,
      default: null
    }
  },
  emits: ['update:modelValue', 'completed'],
  data() {
    return {
      visible: false,
      loading: false,
      userAnswer: '',
      userAnswers: [],
      selfScore: 70,
      actualDuration: 30,
      score: 0,
      feedbackData: null
    }
  },
  computed: {
    taskSubtype() {
      return this.task?.task_subtype || 'subjective'
    },
    questionData() {
      if (!this.task?.question_data) return {}
      return typeof this.task.question_data === 'string' 
        ? JSON.parse(this.task.question_data) 
        : this.task.question_data
    },
    canSubmit() {
      if (this.taskSubtype === 'single_choice') {
        return !!this.userAnswer
      }
      if (this.taskSubtype === 'multiple_choice') {
        return this.userAnswers.length > 0
      }
      if (this.taskSubtype === 'fill_blank') {
        return !!this.userAnswer.trim()
      }
      return true
    },
    resultClass() {
      if (!this.feedbackData) return ''
      const score = this.feedbackData.score ?? this.score
      if (score >= 90) return 'excellent'
      if (score >= 70) return 'good'
      if (score >= 60) return 'pass'
      return 'need-improve'
    },
    levelText() {
      if (!this.feedbackData) return ''
      const score = this.feedbackData.score ?? this.score
      if (score >= 90) return '优秀'
      if (score >= 70) return '良好'
      if (score >= 60) return '及格'
      return '需努力'
    }
  },
  watch: {
    modelValue(val) {
      this.visible = val
      if (val) {
        this.resetForm()
      }
    },
    visible(val) {
      this.$emit('update:modelValue', val)
    }
  },
  methods: {
    resetForm() {
      this.userAnswer = ''
      this.userAnswers = []
      this.selfScore = 70
      this.actualDuration = this.task?.planned_duration || 30
      this.feedbackData = null
      this.score = 0
      this.loading = false
    },
    getOptionKey(option) {
      const match = option.match(/^([A-Z])\./)
      return match ? match[1] : option.charAt(0)
    },
    async handleSubmit() {
      this.loading = true
      
      try {
        const data = {
          actualDuration: this.actualDuration * 60
        }

        if (this.taskSubtype === 'single_choice') {
          data.answer = this.userAnswer
        } else if (this.taskSubtype === 'multiple_choice') {
          data.answers = this.userAnswers
        } else if (this.taskSubtype === 'fill_blank') {
          data.answer = this.userAnswer
        } else {
          data.selfScore = this.selfScore
        }

        const res = await taskApi.completeQuiz(this.task.id, data)
        
        if (res.code === 200) {
          this.score = res.data.score
          this.feedbackData = res.data.feedback
        }
      } catch (error) {
        this.$message.error('提交失败：' + error.message)
      } finally {
        this.loading = false
      }
    },
    handleConfirm() {
      this.$emit('completed', {
        score: this.score,
        feedback: this.feedbackData
      })
      this.handleClose()
    },
    handleClose() {
      this.visible = false
    }
  }
}
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #409eff;
}

.loading-container p {
  margin-top: 16px;
  font-size: 16px;
}

.result-container {
  padding: 10px 0;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.result-header.excellent {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
}

.result-header.good {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
}

.result-header.pass {
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
}

.result-header.need-improve {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.score-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}

.score-unit {
  font-size: 14px;
  color: #909399;
}

.result-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 500;
}

.result-header.excellent .result-status {
  color: #67c23a;
}

.result-header.good .result-status {
  color: #409eff;
}

.result-header.pass .result-status {
  color: #e6a23c;
}

.result-header.need-improve .result-status {
  color: #f56c6c;
}

.feedback-summary {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.feedback-summary p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.feedback-summary .encouragement {
  margin-top: 8px;
  color: #909399;
  font-size: 14px;
}

.feedback-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: #303133;
}

.feedback-list {
  margin: 0;
  padding-left: 24px;
}

.feedback-list li {
  margin-bottom: 6px;
  color: #606266;
  line-height: 1.5;
}

.feedback-list.strengths li {
  color: #67c23a;
}

.feedback-list.weaknesses li {
  color: #e6a23c;
}

.feedback-list.suggestions li {
  color: #409eff;
}

.resource-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resource-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.resource-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #ecf5ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
}

.resource-info {
  display: flex;
  flex-direction: column;
}

.resource-title {
  font-weight: 500;
  color: #303133;
}

.resource-desc {
  font-size: 12px;
  color: #909399;
}

.quiz-form {
  padding: 10px 0;
}

.question-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 20px;
  line-height: 1.6;
}

.options-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-item {
  padding: 12px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  transition: all 0.2s;
}

.option-item:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.answer-input {
  width: 100%;
}

.hint {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.self-score-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.self-score-section .label {
  font-weight: 500;
  white-space: nowrap;
}

.score-slider {
  flex: 1;
}

.duration-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.duration-section .label {
  font-weight: 500;
  white-space: nowrap;
}

.form-footer,
.result-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
