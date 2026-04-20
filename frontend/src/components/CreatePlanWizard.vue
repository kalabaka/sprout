<template>
  <el-dialog
    v-model="visible"
    title="创建学习计划"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="wizard-container">
      <el-steps :active="currentStep" align-center class="wizard-steps">
        <el-step title="目标设定" description="设定学习目标" />
        <el-step title="生成任务" description="智能生成学习路径" />
        <el-step title="确认创建" description="确认并创建计划" />
      </el-steps>

      <div class="wizard-content">
        <CreatePlanStep1
          v-show="currentStep === 0"
          ref="step1Ref"
          v-model="step1Data"
        />

        <CreatePlanStep2
          v-show="currentStep === 1"
          ref="step2Ref"
          :plan-id="planId"
          :step1-data="step1Data"
          @update:phases="handlePhasesUpdate"
        />

        <CreatePlanStep3
          v-show="currentStep === 2"
          :step1-data="step1Data"
          :phases="phases"
          :course-list="courseList"
          :exam-list="examList"
        />
      </div>
    </div>

    <template #footer>
      <div class="wizard-footer">
        <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
        <el-button v-if="currentStep < 2" type="primary" @click="nextStep">
          下一步
        </el-button>
        <el-button
          v-if="currentStep === 2"
          type="primary"
          :loading="submitting"
          @click="confirmCreate"
        >
          创建计划
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import CreatePlanStep1 from './CreatePlanStep1.vue'
import CreatePlanStep2 from './CreatePlanStep2.vue'
import CreatePlanStep3 from './CreatePlanStep3.vue'
import { planApi, courseApi, examApi } from '../api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const router = useRouter()
const visible = ref(false)
const currentStep = ref(0)
const step1Ref = ref(null)
const step2Ref = ref(null)
const planId = ref(null)
const submitting = ref(false)
const courseList = ref([])
const examList = ref([])

const step1Data = ref({
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

const phases = ref([])

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    currentStep.value = 0
    planId.value = null
    step1Data.value = {
      name: '',
      description: '',
      goalType: 'skill',
      courseId: null,
      examId: null,
      targetScore: null,
      endDate: '',
      dailyStudyMinutes: 60,
      priority: 'medium'
    }
    phases.value = []
    fetchCourses()
    fetchExams()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

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

const handlePhasesUpdate = (newPhases) => {
  phases.value = newPhases
}

const nextStep = async () => {
  if (currentStep.value === 0) {
    const valid = await step1Ref.value?.validate()
    if (!valid) return

    try {
      const res = await planApi.createDraft(step1Data.value)
      planId.value = res.data.id
      currentStep.value = 1
    } catch (error) {
      ElMessage.error(error.message || '创建草稿失败')
    }
  } else if (currentStep.value === 1) {
    if (phases.value.length === 0) {
      ElMessage.warning('请先生成学习路径')
      return
    }
    currentStep.value = 2
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const confirmCreate = async () => {
  submitting.value = true
  try {
    const res = await planApi.confirm(planId.value, {
      phases: phases.value
    })
    
    ElMessage.success('计划创建成功！')
    visible.value = false
    emit('success', res.data)
    router.push(`/plan/${res.data.id}`)
  } catch (error) {
    ElMessage.error(error.message || '创建计划失败')
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  visible.value = false
}
</script>

<style scoped>
.wizard-container {
  padding: 0 20px;
}

.wizard-steps {
  margin-bottom: 32px;
}

.wizard-content {
  min-height: 400px;
}

.wizard-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
