<template>
  <el-dialog
    v-model="visible"
    title="知识点自测"
    width="550px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" :size="40"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="submitting" class="loading-container">
      <el-icon class="is-loading" :size="40"><Loading /></el-icon>
      <p>正在评测...</p>
    </div>

    <div v-else-if="result" class="result-container">
      <div class="result-header" :class="result.isPassed ? 'passed' : 'failed'">
        <el-icon v-if="result.isPassed" :size="48" color="#67c23a"><CircleCheckFilled /></el-icon>
        <el-icon v-else :size="48" color="#f56c6c"><CircleCloseFilled /></el-icon>
        <h2>{{ result.isPassed ? '恭喜通过！' : '未通过' }}</h2>
        <p class="score-text">得分：{{ result.score }}分</p>
      </div>

      <div class="result-body">
        <div class="result-item">
          <span class="label">正确答案：</span>
          <span class="value">{{ result.correctAnswer }}</span>
        </div>
        <div class="result-item explanation">
          <span class="label">答案解析：</span>
          <p>{{ result.explanation }}</p>
        </div>
      </div>
    </div>

    <div v-else-if="quiz" class="quiz-container">
      <div class="quiz-header">
        <el-tag type="info">{{ quizTypeText }}</el-tag>
        <span class="kp-name">{{ quiz.knowledgePointName }}</span>
      </div>

      <div class="question-section">
        <p class="question-text">{{ quiz.question }}</p>
      </div>

      <div v-if="quiz.type === 'single_choice'" class="options-section">
        <el-radio-group v-model="userAnswer" class="options-group">
          <el-radio
            v-for="(option, index) in quiz.options"
            :key="index"
            :value="getOptionKey(option)"
            class="option-item"
            size="large"
          >
            {{ option }}
          </el-radio>
        </el-radio-group>
      </div>

      <div v-else-if="quiz.type === 'true_false'" class="options-section">
        <el-radio-group v-model="userAnswer" class="options-group">
          <el-radio :value="true" class="option-item" size="large">
            <el-icon color="#67c23a"><CircleCheck /></el-icon>
            正确
          </el-radio>
          <el-radio :value="false" class="option-item" size="large">
            <el-icon color="#f56c6c"><CircleClose /></el-icon>
            错误
          </el-radio>
        </el-radio-group>
      </div>

      <div v-else-if="quiz.type === 'fill_blank'" class="fill-section">
        <el-input
          v-model="userAnswer"
          type="textarea"
          :rows="3"
          placeholder="请输入你的答案..."
          class="answer-input"
        />
        <p class="hint">提示：答案中包含关键词即可得分</p>
      </div>
    </div>

    <div v-else class="error-container">
      <el-empty description="暂无自测题" />
    </div>

    <template #footer>
      <div v-if="result" class="result-footer">
        <el-button v-if="!result.isPassed" @click="handleRetry">
          再测一次
        </el-button>
        <el-button v-if="!result.isPassed" type="warning" @click="handleReview">
          重新学习
        </el-button>
        <el-button type="primary" @click="handleConfirm">
          {{ result.isPassed ? '完成' : '关闭' }}
        </el-button>
      </div>
      <div v-else-if="quiz" class="quiz-footer">
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
import { 
  Loading, CircleCheck, CircleClose, 
  CircleCheckFilled, CircleCloseFilled 
} from '@element-plus/icons-vue'
import { quizApi } from '../api'

export default {
  name: 'KnowledgeQuizDialog',
  components: {
    Loading,
    CircleCheck,
    CircleClose,
    CircleCheckFilled,
    CircleCloseFilled
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    knowledgePointId: {
      type: Number,
      default: null
    },
    taskId: {
      type: Number,
      default: null
    }
  },
  emits: ['update:modelValue', 'passed', 'failed', 'review'],
  data() {
    return {
      visible: false,
      loading: false,
      submitting: false,
      quiz: null,
      userAnswer: '',
      result: null
    }
  },
  computed: {
    quizTypeText() {
      const types = {
        'single_choice': '单选题',
        'true_false': '判断题',
        'fill_blank': '填空题'
      }
      return types[this.quiz?.type] || '未知类型'
    },
    canSubmit() {
      if (!this.quiz) return false
      if (this.quiz.type === 'fill_blank') {
        return !!this.userAnswer.trim()
      }
      return this.userAnswer !== '' && this.userAnswer !== null
    }
  },
  watch: {
    modelValue(val) {
      this.visible = val
      if (val) {
        this.fetchQuiz()
      }
    },
    visible(val) {
      this.$emit('update:modelValue', val)
    }
  },
  methods: {
    async fetchQuiz() {
      this.loading = true
      this.quiz = null
      this.result = null
      this.userAnswer = ''
      
      try {
        let res
        if (this.taskId) {
          res = await quizApi.getQuizForTask(this.taskId)
        } else if (this.knowledgePointId) {
          res = await quizApi.getQuiz(this.knowledgePointId)
        }
        
        if (res && res.code === 200 && res.data) {
          this.quiz = res.data
        }
      } catch (error) {
        console.error('获取自测题失败:', error)
      } finally {
        this.loading = false
      }
    },
    getOptionKey(option) {
      const match = option.match(/^([A-Z])\./)
      return match ? match[1] : option.charAt(0)
    },
    async handleSubmit() {
      if (!this.quiz) return
      
      this.submitting = true
      
      try {
        const kpId = this.quiz.knowledgePointId
        const res = await quizApi.submitAnswer(kpId, this.userAnswer)
        
        if (res && res.code === 200) {
          this.result = res.data
        }
      } catch (error) {
        this.$message.error('提交失败：' + error.message)
      } finally {
        this.submitting = false
      }
    },
    handleRetry() {
      this.result = null
      this.userAnswer = ''
    },
    handleReview() {
      this.$emit('review')
      this.handleClose()
    },
    handleConfirm() {
      if (this.result?.isPassed) {
        this.$emit('passed', this.result)
      } else {
        this.$emit('failed', this.result)
      }
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
  text-align: center;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.result-header.passed {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
}

.result-header.failed {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
}

.result-header h2 {
  margin: 16px 0 8px;
  font-size: 24px;
}

.result-header.passed h2 {
  color: #67c23a;
}

.result-header.failed h2 {
  color: #f56c6c;
}

.score-text {
  font-size: 18px;
  color: #606266;
}

.result-body {
  padding: 0 10px;
}

.result-item {
  margin-bottom: 16px;
}

.result-item .label {
  font-weight: 500;
  color: #303133;
  margin-right: 8px;
}

.result-item .value {
  color: #409eff;
  font-weight: 500;
}

.result-item.explanation .label {
  display: block;
  margin-bottom: 8px;
}

.result-item.explanation p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 8px;
}

.quiz-container {
  padding: 10px 0;
}

.quiz-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.kp-name {
  font-size: 14px;
  color: #606266;
}

.question-section {
  margin-bottom: 24px;
}

.question-text {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  line-height: 1.6;
}

.options-section {
  margin-bottom: 16px;
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

.fill-section {
  margin-bottom: 16px;
}

.answer-input {
  width: 100%;
}

.hint {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.quiz-footer,
.result-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
