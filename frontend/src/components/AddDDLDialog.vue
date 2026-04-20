<template>
  <el-dialog 
    v-model="visible" 
    :title="isEditMode ? '编辑 DDL 任务' : '添加 DDL 任务'" 
    width="500px"
    @close="handleClose"
  >
    <el-form :model="ddlForm" label-width="100px" :rules="rules" ref="formRef" label-position="top">
      <el-form-item label="任务名称" prop="name" required>
        <el-input v-model="ddlForm.name" placeholder="如：高数第三章作业" id="ddl-name" />
      </el-form-item>
      
      <el-form-item label="任务描述">
        <el-input 
          v-model="ddlForm.description" 
          type="textarea" 
          :rows="2" 
          placeholder="任务详细描述（可选）"
          id="ddl-description"
        />
      </el-form-item>
      
      <el-form-item label="关联课程">
        <el-select 
          v-model="ddlForm.course_id" 
          placeholder="选择关联课程（可选）" 
          clearable 
          style="width: 100%"
          id="ddl-course"
        >
          <el-option 
            v-for="course in courseList" 
            :key="course.id" 
            :label="course.name" 
            :value="course.id"
          />
        </el-select>
      </el-form-item>
      
      <el-form-item label="关联计划">
        <el-select 
          v-model="ddlForm.plan_id" 
          placeholder="选择学习计划（可选）" 
          clearable 
          style="width: 100%"
          id="ddl-plan"
        >
          <el-option 
            v-for="plan in planList" 
            :key="plan.id" 
            :label="plan.name" 
            :value="plan.id"
          />
        </el-select>
      </el-form-item>
      
      <el-form-item label="截止日期" prop="deadline" required>
        <el-date-picker 
          v-model="ddlForm.deadline" 
          type="datetime" 
          placeholder="选择截止日期和时间"
          style="width: 100%"
          value-format="YYYY-MM-DD HH:mm"
          format="YYYY-MM-DD HH:mm"
          id="ddl-deadline"
        />
      </el-form-item>
      
      <el-form-item label="预估耗时">
        <el-input-number 
          v-model="ddlForm.estimated_minutes" 
          :min="10" 
          :max="480" 
          :step="10"
          id="ddl-estimated"
        />
        <span class="form-hint">分钟（默认60分钟）</span>
      </el-form-item>
      
      <el-form-item label="优先级">
        <el-rate 
          v-model="ddlForm.priority" 
          :max="10" 
          :allow-half="false"
          show-score
          :colors="['#99A9BF', '#F7BA2A', '#FF9900']"
          id="ddl-priority"
        />
        <span class="form-hint">1-10分，分数越高越紧急</span>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitDDL">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { taskApi, courseApi, planApi } from '../api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  editTask: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const courseList = ref([])
const planList = ref([])
const taskId = ref(null)

const isEditMode = computed(() => !!props.editTask)

const ddlForm = ref({
  name: '',
  description: '',
  course_id: null,
  plan_id: null,
  deadline: '',
  estimated_minutes: 60,
  priority: 5
})

const rules = {
  name: [
    { required: true, message: '请输入任务名称', trigger: 'blur' }
  ],
  deadline: [
    { required: true, message: '请选择截止日期', trigger: 'change' }
  ]
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.editTask) {
    loadTaskData(props.editTask)
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const loadTaskData = (task) => {
  taskId.value = task.id
  ddlForm.value = {
    name: task.name || task.title || '',
    description: task.description || '',
    course_id: task.course_id || task.courseId || null,
    plan_id: task.plan_id || task.planId || null,
    deadline: task.deadline ? formatDeadlineForEdit(task.deadline) : '',
    estimated_minutes: task.estimated_minutes || task.estimatedMinutes || 60,
    priority: task.priority || 5
  }
}

const formatDeadlineForEdit = (deadline) => {
  if (!deadline) return ''
  const date = new Date(deadline)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const fetchCourses = async () => {
  try {
    const res = await courseApi.getAll()
    courseList.value = res.data || []
  } catch (error) {
    console.error('获取课程列表失败:', error)
  }
}

const fetchPlans = async () => {
  try {
    const res = await planApi.getActivePlans()
    planList.value = res.data || []
  } catch (error) {
    console.error('获取计划列表失败:', error)
  }
}

const resetForm = () => {
  taskId.value = null
  ddlForm.value = {
    name: '',
    description: '',
    course_id: null,
    plan_id: null,
    deadline: '',
    estimated_minutes: 60,
    priority: 5
  }
  formRef.value?.resetFields()
}

const handleClose = () => {
  visible.value = false
  resetForm()
}

const submitDDL = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      const data = {
        title: ddlForm.value.name,
        description: ddlForm.value.description,
        courseId: ddlForm.value.course_id,
        planId: ddlForm.value.plan_id,
        deadline: ddlForm.value.deadline,
        estimatedMinutes: ddlForm.value.estimated_minutes
      }
      
      if (isEditMode.value && taskId.value) {
        await taskApi.updateDDL(taskId.value, data)
        ElMessage.success('DDL任务更新成功')
      } else {
        await taskApi.createDDL(data)
        ElMessage.success('DDL任务添加成功')
      }
      
      visible.value = false
      resetForm()
      emit('success')
    } catch (error) {
      ElMessage.error(error.message || (isEditMode.value ? '更新DDL任务失败' : '添加DDL任务失败'))
    } finally {
      submitting.value = false
    }
  })
}

onMounted(() => {
  fetchCourses()
  fetchPlans()
})
</script>

<style scoped>
.form-hint {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}

:deep(.el-rate) {
  height: 32px;
  line-height: 32px;
}

:deep(.el-rate__icon) {
  font-size: 20px;
}
</style>
