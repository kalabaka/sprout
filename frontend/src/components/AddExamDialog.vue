<template>
  <el-dialog 
    v-model="visible" 
    :title="isEdit ? '编辑考试' : '添加考试'" 
    width="500px"
    @close="handleClose"
  >
    <el-form :model="examForm" label-width="100px" :rules="rules" ref="formRef" label-position="top">
      <el-form-item label="考试名称" prop="name" required>
        <el-input v-model="examForm.name" placeholder="如：高等数学期中考试" id="exam-name" />
      </el-form-item>
      
      <el-form-item label="关联课程">
        <el-select 
          v-model="examForm.course_id" 
          placeholder="选择关联课程（可选）" 
          clearable 
          style="width: 100%"
          id="exam-course"
        >
          <el-option 
            v-for="course in courseList" 
            :key="course.id" 
            :label="course.name" 
            :value="course.id"
          />
        </el-select>
      </el-form-item>
      
      <el-form-item label="考试日期" prop="exam_date" required>
        <el-date-picker 
          v-model="examForm.exam_date" 
          type="date" 
          placeholder="选择考试日期"
          style="width: 100%"
          value-format="YYYY-MM-DD"
          id="exam-date"
        />
      </el-form-item>
      
      <el-form-item label="考试时间">
        <el-time-select 
          v-model="examForm.exam_time" 
          placeholder="选择考试时间"
          start="08:00"
          step="00:30"
          end="22:00"
          style="width: 100%"
          id="exam-time"
        />
      </el-form-item>
      
      <el-form-item label="考试地点">
        <el-input v-model="examForm.location" placeholder="如：A101教室" id="exam-location" />
      </el-form-item>
      
      <el-form-item label="优先级">
        <el-radio-group v-model="examForm.priority" id="exam-priority">
          <el-radio value="high">高</el-radio>
          <el-radio value="medium">中</el-radio>
          <el-radio value="low">低</el-radio>
        </el-radio-group>
      </el-form-item>
      
      <el-form-item label="备注">
        <el-input v-model="examForm.notes" type="textarea" :rows="2" placeholder="备注信息" id="exam-notes" />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitExam">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { examApi, courseApi } from '../api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  editData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const courseList = ref([])

const isEdit = computed(() => !!props.editData)

const examForm = ref({
  name: '',
  course_id: null,
  exam_date: '',
  exam_time: '09:00',
  location: '',
  priority: 'medium',
  notes: ''
})

const rules = {
  name: [
    { required: true, message: '请输入考试名称', trigger: 'blur' }
  ],
  exam_date: [
    { required: true, message: '请选择考试日期', trigger: 'change' }
  ]
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.editData) {
    fillForm(props.editData)
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const fillForm = (data) => {
  let examDate = data.examDate || data.exam_date || ''
  if (examDate && examDate.includes('T')) {
    examDate = examDate.split('T')[0]
  }
  examForm.value = {
    name: data.name || '',
    course_id: data.courseId || data.course_id || null,
    exam_date: examDate,
    exam_time: data.examTime || data.exam_time || '09:00',
    location: data.location || '',
    priority: data.priority || 'medium',
    notes: data.notes || ''
  }
}

const fetchCourses = async () => {
  try {
    const res = await courseApi.getAll()
    if (res.success) {
      courseList.value = res.data || []
    }
  } catch (error) {
    console.error('获取课程列表失败:', error)
  }
}

const resetForm = () => {
  examForm.value = {
    name: '',
    course_id: null,
    exam_date: '',
    exam_time: '09:00',
    location: '',
    priority: 'medium',
    notes: ''
  }
  formRef.value?.resetFields()
}

const handleClose = () => {
  visible.value = false
  resetForm()
}

const submitExam = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  
  submitting.value = true
  try {
    if (isEdit.value) {
      await examApi.update(props.editData.id, examForm.value)
      ElMessage.success('考试更新成功')
    } else {
      await examApi.create(examForm.value)
      ElMessage.success('考试添加成功')
    }
    visible.value = false
    resetForm()
    emit('success')
  } catch (error) {
    ElMessage.error(error.message || (isEdit.value ? '更新考试失败' : '添加考试失败'))
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchCourses()
})
</script>

<style scoped>
.form-hint {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}
</style>
