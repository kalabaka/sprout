<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="生成复习计划"
    width="480px"
    :close-on-click-modal="false"
  >
    <div class="dialog-content" v-if="exam">
      <div class="exam-summary">
        <div class="summary-item">
          <span class="label">考试：</span>
          <span class="value">{{ exam.name }}</span>
        </div>
        <div class="summary-item">
          <span class="label">考试日期：</span>
          <span class="value">{{ exam.examDate }}</span>
        </div>
        <div class="summary-item">
          <span class="label">剩余天数：</span>
          <span class="value highlight">{{ exam.daysRemaining }} 天</span>
        </div>
      </div>

      <el-divider />

      <el-form :model="form" label-width="100px" class="config-form">
        <el-form-item label="每日复习时长">
          <el-input-number
            v-model="form.dailyStudyMinutes"
            :min="15"
            :max="240"
            :step="15"
          />
          <span class="unit">分钟</span>
        </el-form-item>

        <el-form-item label="可用复习日">
          <div class="weekday-checkboxes">
            <el-checkbox
              v-for="day in weekdays"
              :key="day.value"
              v-model="form.availableWeekdays"
              :label="day.value"
            >
              {{ day.label }}
            </el-checkbox>
          </div>
        </el-form-item>

        <el-form-item label="学习水平">
          <el-radio-group v-model="form.userLevel">
            <el-radio value="beginner">初级</el-radio>
            <el-radio value="intermediate">中级</el-radio>
            <el-radio value="advanced">高级</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <div class="tip-box">
        <el-icon><InfoFilled /></el-icon>
        <span>系统将根据考试日期和范围自动生成复习任务</span>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('update:modelValue', false)">取消</el-button>
        <el-button type="primary" @click="handleGenerate" :loading="loading">
          生成
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { examApi } from '../api'

const props = defineProps({
  modelValue: Boolean,
  exam: Object
})

const emit = defineEmits(['update:modelValue', 'success'])

const loading = ref(false)

const weekdays = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 }
]

const form = reactive({
  dailyStudyMinutes: 60,
  availableWeekdays: [1, 2, 3, 4, 5, 6, 7],
  userLevel: 'intermediate'
})

watch(() => props.modelValue, (val) => {
  if (val) {
    form.dailyStudyMinutes = 60
    form.availableWeekdays = [1, 2, 3, 4, 5, 6, 7]
    form.userLevel = 'intermediate'
  }
})

const handleGenerate = async () => {
  if (form.availableWeekdays.length === 0) {
    ElMessage.warning('请至少选择一个可用复习日')
    return
  }

  loading.value = true
  try {
    const res = await examApi.generateReviewPlan(props.exam.id, {
      dailyStudyMinutes: form.dailyStudyMinutes,
      availableWeekdays: form.availableWeekdays,
      userLevel: form.userLevel
    })

    if (res.success) {
      ElMessage.success('复习计划创建成功！')
      emit('success', res.data)
      emit('update:modelValue', false)
    } else {
      ElMessage.error(res.message || '生成失败')
    }
  } catch (error) {
    console.error('生成复习计划失败:', error)
    ElMessage.error(error.message || '生成复习计划失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.dialog-content {
  padding: 0 10px;
}

.exam-summary {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
}

.summary-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-item .label {
  color: #909399;
  width: 80px;
}

.summary-item .value {
  color: #303133;
  font-weight: 500;
}

.summary-item .value.highlight {
  color: #409eff;
  font-size: 18px;
}

.config-form {
  margin-top: 16px;
}

.unit {
  margin-left: 8px;
  color: #909399;
}

.weekday-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tip-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #ecf5ff;
  border-radius: 6px;
  color: #409eff;
  font-size: 13px;
  margin-top: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
