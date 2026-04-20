<template>
  <el-dialog
    v-model="visible"
    :title="isEditMode ? '编辑任务' : '添加任务'"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="80px"
    >
      <el-form-item label="任务名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="输入任务名称"
          maxlength="100"
        />
      </el-form-item>

      <el-form-item label="所属阶段" prop="phaseId">
        <el-select
          v-model="formData.phaseId"
          placeholder="选择阶段"
          style="width: 100%"
        >
          <el-option
            v-for="phase in phases"
            :key="phase.id"
            :label="phase.name"
            :value="phase.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="任务描述">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="任务详细描述（可选）"
        />
      </el-form-item>

      <el-form-item label="预估时长">
        <el-input-number
          v-model="formData.estimatedMinutes"
          :min="10"
          :max="480"
          :step="10"
        />
        <span class="unit">分钟</span>
      </el-form-item>

      <el-form-item label="计划日期">
        <el-date-picker
          v-model="formData.plannedDate"
          type="date"
          placeholder="选择计划日期"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ isEditMode ? '保存' : '添加' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { planApi, taskApi } from '../api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  planId: {
    type: [Number, String],
    required: true
  },
  phases: {
    type: Array,
    default: () => []
  },
  editTask: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isEditMode = computed(() => !!props.editTask)

const formRef = ref(null)
const submitting = ref(false)
const taskId = ref(null)

const parseLocalDate = (dateStr) => {
  if (!dateStr) return ''
  if (dateStr.includes('T')) {
    const d = new Date(dateStr)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return dateStr
}

const formData = ref({
  name: '',
  phaseId: null,
  description: '',
  estimatedMinutes: 60,
  plannedDate: ''
})

const rules = {
  name: [
    { required: true, message: '请输入任务名称', trigger: 'blur' }
  ],
  phaseId: [
    { required: true, message: '请选择阶段', trigger: 'change' }
  ]
}

watch(visible, (val) => {
  if (val) {
    if (props.editTask) {
      taskId.value = props.editTask.id
      formData.value = {
        name: props.editTask.name || '',
        phaseId: props.editTask.phase_id || props.editTask.phaseId || null,
        description: props.editTask.description || '',
        estimatedMinutes: props.editTask.planned_duration || props.editTask.estimatedMinutes || 60,
        plannedDate: parseLocalDate(props.editTask.planned_date || props.editTask.plannedDate)
      }
    } else {
      taskId.value = null
      formData.value = {
        name: '',
        phaseId: props.phases[0]?.id || null,
        description: '',
        estimatedMinutes: 60,
        plannedDate: ''
      }
    }
  }
})

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isEditMode.value) {
      await taskApi.updateTask(taskId.value, {
        name: formData.value.name,
        phase_id: formData.value.phaseId,
        description: formData.value.description,
        planned_duration: formData.value.estimatedMinutes,
        planned_date: formData.value.plannedDate || null
      })
      ElMessage.success('任务更新成功')
    } else {
      await planApi.addTask(props.planId, formData.value)
      ElMessage.success('任务添加成功')
    }
    visible.value = false
    emit('success')
  } catch (error) {
    ElMessage.error(error.message || (isEditMode.value ? '更新失败' : '添加失败'))
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.unit {
  margin-left: 8px;
  color: #909399;
}
</style>
