<template>
  <el-dialog
    v-model="visible"
    title="创建客观题任务"
    width="650px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
      <el-form-item label="任务标题" prop="title">
        <el-input v-model="form.title" placeholder="请输入任务标题" />
      </el-form-item>

      <el-form-item label="题目类型" prop="taskSubtype">
        <el-radio-group v-model="form.taskSubtype" @change="handleTypeChange">
          <el-radio value="single_choice">单选题</el-radio>
          <el-radio value="multiple_choice">多选题</el-radio>
          <el-radio value="fill_blank">填空题</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="题目描述">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="2"
          placeholder="请输入题目描述（可选）"
        />
      </el-form-item>

      <template v-if="form.taskSubtype === 'single_choice' || form.taskSubtype === 'multiple_choice'">
        <el-form-item label="选项设置" prop="options">
          <div class="options-editor">
            <div
              v-for="(option, index) in form.questionData.options"
              :key="index"
              class="option-row"
            >
              <span class="option-label">{{ String.fromCharCode(65 + index) }}.</span>
              <el-input v-model="form.questionData.options[index]" placeholder="请输入选项内容" />
              <el-button
                v-if="form.questionData.options.length > 2"
                type="danger"
                text
                @click="removeOption(index)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button
              v-if="form.questionData.options.length < 6"
              type="primary"
              text
              @click="addOption"
            >
              <el-icon><Plus /></el-icon>
              添加选项
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="正确答案" prop="correctAnswer">
          <template v-if="form.taskSubtype === 'single_choice'">
            <el-radio-group v-model="form.questionData.correct">
              <el-radio
                v-for="(_, index) in form.questionData.options"
                :key="index"
                :value="String.fromCharCode(65 + index)"
              >
                {{ String.fromCharCode(65 + index) }}
              </el-radio>
            </el-radio-group>
          </template>
          <template v-else>
            <el-checkbox-group v-model="form.questionData.correct">
              <el-checkbox
                v-for="(_, index) in form.questionData.options"
                :key="index"
                :value="String.fromCharCode(65 + index)"
              >
                {{ String.fromCharCode(65 + index) }}
              </el-checkbox>
            </el-checkbox-group>
          </template>
        </el-form-item>
      </template>

      <template v-else-if="form.taskSubtype === 'fill_blank'">
        <el-form-item label="关键词" prop="keywords">
          <el-select
            v-model="form.questionData.keywords"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入关键词后按回车添加"
            class="keywords-select"
          />
        </el-form-item>

        <el-form-item label="匹配模式">
          <el-radio-group v-model="form.questionData.match_mode">
            <el-radio value="any">任一关键词</el-radio>
            <el-radio value="all">全部关键词</el-radio>
          </el-radio-group>
          <div class="match-mode-hint">
            任一关键词：答案包含任意一个关键词即得分<br />
            全部关键词：答案必须包含所有关键词才得满分
          </div>
        </el-form-item>
      </template>

      <el-form-item label="关联计划">
        <el-select v-model="form.planId" placeholder="选择关联计划（可选）" clearable>
          <el-option
            v-for="plan in plans"
            :key="plan.id"
            :label="plan.name"
            :value="plan.id"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        创建任务
      </el-button>
    </template>
  </el-dialog>
</template>

<script>
import { taskApi, planApi } from '../api'
import { Delete, Plus } from '@element-plus/icons-vue'

export default {
  name: 'CreateQuizDialog',
  components: {
    Delete,
    Plus
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'created'],
  data() {
    return {
      visible: false,
      submitting: false,
      plans: [],
      form: {
        title: '',
        description: '',
        taskSubtype: 'single_choice',
        questionData: {
          options: ['', '', '', ''],
          correct: '',
          keywords: [],
          match_mode: 'any'
        },
        planId: null
      },
      rules: {
        title: [
          { required: true, message: '请输入任务标题', trigger: 'blur' }
        ],
        taskSubtype: [
          { required: true, message: '请选择题目类型', trigger: 'change' }
        ]
      }
    }
  },
  watch: {
    modelValue(val) {
      this.visible = val
      if (val) {
        this.fetchPlans()
      }
    },
    visible(val) {
      this.$emit('update:modelValue', val)
    }
  },
  methods: {
    async fetchPlans() {
      try {
        const res = await planApi.getAll()
        if (res.code === 200) {
          this.plans = res.data || []
        }
      } catch (error) {
        console.error('获取计划列表失败:', error)
      }
    },
    handleTypeChange() {
      if (this.form.taskSubtype === 'single_choice') {
        this.form.questionData.correct = ''
      } else if (this.form.taskSubtype === 'multiple_choice') {
        this.form.questionData.correct = []
      } else {
        this.form.questionData.keywords = []
      }
    },
    addOption() {
      if (this.form.questionData.options.length < 6) {
        this.form.questionData.options.push('')
      }
    },
    removeOption(index) {
      this.form.questionData.options.splice(index, 1)
    },
    async handleSubmit() {
      try {
        await this.$refs.formRef.validate()
      } catch {
        return
      }

      const questionData = this.buildQuestionData()
      if (!questionData) return

      this.submitting = true
      try {
        const res = await taskApi.createQuiz({
          title: this.form.title,
          description: this.form.description,
          taskSubtype: this.form.taskSubtype,
          questionData,
          planId: this.form.planId
        })

        if (res.code === 200 || res.code === 201) {
          this.$message.success('客观题任务创建成功')
          this.$emit('created', res.data)
          this.handleClose()
        }
      } catch (error) {
        this.$message.error('创建失败：' + error.message)
      } finally {
        this.submitting = false
      }
    },
    buildQuestionData() {
      const { taskSubtype, questionData } = this.form

      if (taskSubtype === 'single_choice' || taskSubtype === 'multiple_choice') {
        const validOptions = questionData.options.filter(o => o.trim())
        if (validOptions.length < 2) {
          this.$message.warning('请至少填写2个选项')
          return null
        }

        const correct = questionData.correct
        if (!correct || (Array.isArray(correct) && correct.length === 0)) {
          this.$message.warning('请设置正确答案')
          return null
        }

        return {
          options: questionData.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`),
          correct: Array.isArray(correct) ? correct : [correct]
        }
      } else if (taskSubtype === 'fill_blank') {
        if (questionData.keywords.length === 0) {
          this.$message.warning('请至少添加一个关键词')
          return null
        }

        return {
          keywords: questionData.keywords,
          match_mode: questionData.match_mode
        }
      }

      return {}
    },
    handleClose() {
      this.visible = false
      this.resetForm()
    },
    resetForm() {
      this.form = {
        title: '',
        description: '',
        taskSubtype: 'single_choice',
        questionData: {
          options: ['', '', '', ''],
          correct: '',
          keywords: [],
          match_mode: 'any'
        },
        planId: null
      }
    }
  }
}
</script>

<style scoped>
.options-editor {
  width: 100%;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.option-label {
  width: 24px;
  font-weight: 500;
  color: #409eff;
}

.option-row .el-input {
  flex: 1;
}

.keywords-select {
  width: 100%;
}

.match-mode-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
</style>
