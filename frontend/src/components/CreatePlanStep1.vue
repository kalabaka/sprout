<template>
  <div class="create-plan-step1">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-position="top"
      class="step-form"
    >
      <el-form-item label="计划名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="如：高等数学期末复习计划"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="计划描述">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="描述你的学习目标和计划内容（可选）"
          maxlength="500"
        />
      </el-form-item>

      <el-form-item label="目标类型" prop="goalType">
        <el-radio-group v-model="formData.goalType" class="goal-type-group">
          <el-radio-button value="exam">
            <el-icon><Document /></el-icon>
            考试
          </el-radio-button>
          <el-radio-button value="skill">
            <el-icon><TrendCharts /></el-icon>
            技能
          </el-radio-button>
          <el-radio-button value="course">
            <el-icon><Reading /></el-icon>
            课程
          </el-radio-button>
          <el-radio-button value="other">
            <el-icon><More /></el-icon>
            其他
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="formData.goalType === 'exam'" label="关联考试" prop="examId">
        <div class="exam-select-wrapper">
          <el-select
            v-model="formData.examId"
            placeholder="选择已有考试"
            clearable
            style="flex: 1"
          >
            <el-option
              v-for="exam in examList"
              :key="exam.id"
              :label="exam.name"
              :value="exam.id"
            />
          </el-select>
          <el-button type="primary" plain @click="showAddExamDialog = true">
            <el-icon><Plus /></el-icon>
            新建考试
          </el-button>
        </div>
      </el-form-item>

      <el-form-item v-if="formData.goalType === 'exam'" label="目标分数">
        <el-input-number
          v-model="formData.targetScore"
          :min="0"
          :max="150"
          :step="5"
          placeholder="输入目标分数"
        />
        <span class="input-hint">分（可选）</span>
      </el-form-item>

      <el-form-item label="关联课程">
        <el-select
          v-model="formData.courseId"
          placeholder="选择关联课程（可选）"
          clearable
          style="width: 100%"
        >
          <el-option
            v-for="course in courseList"
            :key="course.id"
            :label="course.name"
            :value="course.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="预计完成日期" prop="endDate">
        <el-date-picker
          v-model="formData.endDate"
          type="date"
          placeholder="选择预计完成日期"
          :disabled-date="disabledDate"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="每日学习时长">
        <div class="study-time-wrapper">
          <el-slider
            v-model="formData.dailyStudyMinutes"
            :min="30"
            :max="300"
            :step="15"
            :marks="timeMarks"
            show-stops
          />
          <div class="time-display">
            <span class="time-value">{{ formData.dailyStudyMinutes }}</span>
            <span class="time-unit">分钟/天</span>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="优先级">
        <el-radio-group v-model="formData.priority">
          <el-radio-button value="high">
            <el-icon><StarFilled /></el-icon>
            高
          </el-radio-button>
          <el-radio-button value="medium">
            <el-icon><Star /></el-icon>
            中
          </el-radio-button>
          <el-radio-button value="low">
            <el-icon><Remove /></el-icon>
            低
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <AddExamDialog
      v-model="showAddExamDialog"
      @success="handleExamCreated"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { Document, TrendCharts, Reading, More, Plus, StarFilled, Star, Remove } from '@element-plus/icons-vue'
import { courseApi, examApi } from '../api'
import AddExamDialog from './AddExamDialog.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue'])

const formRef = ref(null)
const courseList = ref([])
const examList = ref([])
const showAddExamDialog = ref(false)

const formData = reactive({
  name: '',
  description: '',
  goalType: 'skill',
  courseId: null,
  examId: null,
  targetScore: null,
  endDate: '',
  dailyStudyMinutes: 60,
  priority: 'medium'
})

const rules = {
  name: [
    { required: true, message: '请输入计划名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  goalType: [
    { required: true, message: '请选择目标类型', trigger: 'change' }
  ],
  endDate: [
    { required: true, message: '请选择预计完成日期', trigger: 'change' }
  ]
}

const timeMarks = {
  30: '30分钟',
  60: '1小时',
  120: '2小时',
  180: '3小时',
  240: '4小时',
  300: '5小时'
}

const disabledDate = (date) => {
  return date < new Date(new Date().setHours(0, 0, 0, 0))
}

watch(formData, (val) => {
  emit('update:modelValue', { ...val })
}, { deep: true })

watch(() => props.modelValue, (val) => {
  if (val && Object.keys(val).length > 0) {
    Object.assign(formData, val)
  }
}, { immediate: true })

const fetchCourses = async () => {
  try {
    const res = await courseApi.getAll()
    courseList.value = res.data || []
  } catch (error) {
    console.error('获取课程列表失败:', error)
  }
}

const fetchExams = async () => {
  try {
    const res = await examApi.getAll()
    examList.value = res.data || []
  } catch (error) {
    console.error('获取考试列表失败:', error)
  }
}

const handleExamCreated = (exam) => {
  examList.value.push(exam)
  formData.examId = exam.id
}

const validate = async () => {
  if (!formRef.value) return false
  return await formRef.value.validate().catch(() => false)
}

const getData = () => {
  return { ...formData }
}

onMounted(() => {
  fetchCourses()
  fetchExams()
})

defineExpose({
  validate,
  getData
})
</script>

<style scoped>
.create-plan-step1 {
  padding: 20px 0;
}

.step-form {
  max-width: 600px;
  margin: 0 auto;
}

.goal-type-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.goal-type-group :deep(.el-radio-button__inner) {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
}

.exam-select-wrapper {
  display: flex;
  gap: 12px;
  width: 100%;
}

.input-hint {
  margin-left: 12px;
  color: #909399;
  font-size: 14px;
}

.study-time-wrapper {
  width: 100%;
}

.time-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #E3F2FD, #F3E5F5);
  border-radius: 8px;
}

.time-value {
  font-size: 32px;
  font-weight: 600;
  color: #409EFF;
}

.time-unit {
  margin-left: 8px;
  font-size: 14px;
  color: #606266;
}
</style>
