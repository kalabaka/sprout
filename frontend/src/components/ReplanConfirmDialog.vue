<template>
  <el-dialog
    v-model="visible"
    :title="planning ? '正在重新规划' : '确认重新规划'"
    width="600px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="!planning"
    @close="handleClose"
  >
    <div v-if="planning" class="planning-container">
      <div class="planning-animation">
        <div class="spinner"></div>
      </div>
      <div class="planning-text">
        <h3>正在为您智能规划中...</h3>
        <p class="planning-tip">AI 正在分析您的学习情况，请稍候</p>
      </div>
      <div class="planning-timer">
        <el-icon class="timer-icon"><Timer /></el-icon>
        <span class="timer-label">已等待</span>
        <span class="timer-value">{{ formattedElapsedTime }}</span>
      </div>
      <div class="planning-steps">
        <div class="step" :class="{ active: currentStep >= 1, done: currentStep > 1 }">
          <span class="step-icon">{{ currentStep > 1 ? '✓' : '1' }}</span>
          <span class="step-text">分析学习进度</span>
        </div>
        <div class="step" :class="{ active: currentStep >= 2, done: currentStep > 2 }">
          <span class="step-icon">{{ currentStep > 2 ? '✓' : '2' }}</span>
          <span class="step-text">生成学习路径</span>
        </div>
        <div class="step" :class="{ active: currentStep >= 3 }">
          <span class="step-icon">3</span>
          <span class="step-text">优化任务安排</span>
        </div>
      </div>
    </div>
    <div v-else-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
    </div>
    <div v-else class="replan-content">
      <div class="reason-section">
        <el-alert
          :title="reasonTitle"
          type="warning"
          :closable="false"
          show-icon
        >
          <template #default>
            <div class="reason-detail">
              <p v-for="(reason, index) in reasons" :key="index">
                • {{ reason }}
              </p>
            </div>
          </template>
        </el-alert>
      </div>

      <div class="comparison-section">
        <h4>调整前后对比</h4>
        <el-table :data="comparisonData" border style="width: 100%">
          <el-table-column prop="metric" label="指标" width="150" />
          <el-table-column prop="before" label="调整前" width="120">
            <template #default="{ row }">
              <span :class="{ 'text-danger': row.isWorse }">
                {{ row.before }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="after" label="调整后" width="120">
            <template #default="{ row }">
              <span :class="{ 'text-success': row.isBetter }">
                {{ row.after }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="change" label="变化">
            <template #default="{ row }">
              <el-tag 
                v-if="row.change" 
                :type="row.changeType" 
                size="small"
              >
                {{ row.change }}
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="explanation-section">
        <h4>调整说明</h4>
        <ul class="explanation-list">
          <li>已完成任务将保留，不会被调整</li>
          <li>未完成任务将根据当前进度重新分配</li>
          <li>每日任务量将根据剩余时间和目标重新计算</li>
          <li v-if="newEndDate">预计完成日期将调整为 {{ newEndDate }}</li>
        </ul>
      </div>

      <div class="warning-section" v-if="hasWarning">
        <el-alert
          type="info"
          :closable="false"
        >
          <template #title>
            <el-icon><InfoFilled /></el-icon>
            <span>温馨提示</span>
          </template>
          {{ warningMessage }}
        </el-alert>
      </div>
    </div>

    <template #footer v-if="!planning">
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button 
          type="primary" 
          :loading="submitting"
          @click="handleConfirm"
        >
          确认重新规划
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { InfoFilled, Timer } from '@element-plus/icons-vue';
import api from '../api';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  planId: {
    type: [Number, String],
    required: true
  },
  triggerReason: {
    type: String,
    default: '用户手动触发'
  }
});

const emit = defineEmits(['update:modelValue', 'confirmed']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const loading = ref(false);
const submitting = ref(false);
const checkData = ref(null);
const newEndDate = ref(null);
const planning = ref(false);
const elapsedTime = ref(0);
const currentStep = ref(1);
let timer = null;
let stepTimer = null;

const formattedElapsedTime = computed(() => {
  const minutes = Math.floor(elapsedTime.value / 60);
  const seconds = elapsedTime.value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

function startTimer() {
  elapsedTime.value = 0;
  currentStep.value = 1;
  timer = setInterval(() => {
    elapsedTime.value++;
  }, 1000);
  stepTimer = setInterval(() => {
    if (currentStep.value < 3) {
      currentStep.value++;
    }
  }, 5000);
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (stepTimer) {
    clearInterval(stepTimer);
    stepTimer = null;
  }
}

const reasons = computed(() => {
  return checkData.value?.reasons || ['用户主动触发重新规划'];
});

const reasonTitle = computed(() => {
  return checkData.value?.needReplan 
    ? '检测到以下问题，建议重新规划' 
    : '您正在重新规划学习计划';
});

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

const comparisonData = computed(() => {
  if (!checkData.value) return [];
  
  const stats = checkData.value.stats;
  const dates = checkData.value.dates;
  
  return [
    {
      metric: '总任务数',
      before: stats.totalTasks,
      after: '-',
      change: '待计算',
      changeType: 'info'
    },
    {
      metric: '已完成任务',
      before: stats.completedTasks,
      after: stats.completedTasks,
      change: '保持不变',
      changeType: 'success'
    },
    {
      metric: '待处理任务',
      before: stats.pendingTasks + stats.inProgressTasks,
      after: '-',
      change: '待计算',
      changeType: 'info'
    },
    {
      metric: '完成率',
      before: `${stats.completionRate}%`,
      after: '-',
      change: '待计算',
      changeType: 'info'
    },
    {
      metric: '预计完成日期',
      before: formatDate(dates.maxPlannedDate),
      after: formatDate(newEndDate.value),
      change: dates.isOverdue ? '已超期' : '正常',
      changeType: dates.isOverdue ? 'danger' : 'success'
    }
  ];
});

const hasWarning = computed(() => {
  return checkData.value?.stats?.lowScoreTasks >= 3;
});

const warningMessage = computed(() => {
  if (hasWarning.value) {
    return '检测到您近期学习效果不佳，重新规划后建议适当放慢学习节奏，确保知识掌握。';
  }
  return '';
});

watch(visible, async (val) => {
  if (val && props.planId) {
    await fetchCheckData();
  }
});

async function fetchCheckData() {
  loading.value = true;
  try {
    const response = await api.get(`/plan/${props.planId}/replan/check`);
    if (response.data.success) {
      checkData.value = response.data.data;
    }
  } catch (error) {
    console.error('获取重规划检查数据失败:', error);
    ElMessage.error('获取数据失败');
  } finally {
    loading.value = false;
  }
}

async function handleConfirm() {
  submitting.value = true;
  planning.value = true;
  startTimer();
  
  try {
    const response = await api.post(`/plan/${props.planId}/replan`, {
      keepCompleted: true,
      triggerReason: props.triggerReason
    });
    
    if (response.data.success) {
      ElMessage.success('重新规划成功');
      emit('confirmed', response.data.data);
      handleClose();
    } else {
      ElMessage.error(response.data.message || '重新规划失败');
    }
  } catch (error) {
    console.error('重新规划失败:', error);
    ElMessage.error('重新规划失败');
  } finally {
    stopTimer();
    submitting.value = false;
    planning.value = false;
  }
}

function handleClose() {
  stopTimer();
  visible.value = false;
  checkData.value = null;
  newEndDate.value = null;
  planning.value = false;
  elapsedTime.value = 0;
  currentStep.value = 1;
}

onUnmounted(() => {
  stopTimer();
});
</script>

<style scoped>
.replan-content {
  padding: 10px 0;
}

.loading-container {
  padding: 20px;
}

.planning-container {
  padding: 30px 20px;
  text-align: center;
}

.planning-animation {
  margin-bottom: 24px;
}

.spinner {
  width: 60px;
  height: 60px;
  margin: 0 auto;
  border: 3px solid #e4e7ed;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.planning-text h3 {
  font-size: 18px;
  color: #303133;
  margin: 0 0 8px;
}

.planning-tip {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.planning-timer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 24px 0;
  padding: 12px 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.timer-icon {
  font-size: 18px;
  color: #409eff;
}

.timer-label {
  font-size: 14px;
  color: #909399;
}

.timer-value {
  font-size: 20px;
  font-weight: 600;
  color: #409eff;
  font-family: 'Monaco', 'Menlo', monospace;
}

.planning-steps {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 24px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.4;
  transition: all 0.3s;
}

.step.active {
  opacity: 1;
}

.step.done {
  opacity: 0.7;
}

.step-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #e4e7ed;
  color: #909399;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.step.active .step-icon {
  background: #409eff;
  color: #fff;
}

.step.done .step-icon {
  background: #67c23a;
  color: #fff;
}

.step-text {
  font-size: 12px;
  color: #909399;
}

.step.active .step-text {
  color: #409eff;
  font-weight: 500;
}

.reason-section {
  margin-bottom: 20px;
}

.reason-detail {
  margin-top: 8px;
}

.reason-detail p {
  margin: 4px 0;
  font-size: 14px;
}

.comparison-section {
  margin-bottom: 20px;
}

.comparison-section h4 {
  margin-bottom: 12px;
  font-size: 14px;
  color: #606266;
}

.explanation-section {
  margin-bottom: 20px;
}

.explanation-section h4 {
  margin-bottom: 12px;
  font-size: 14px;
  color: #606266;
}

.explanation-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #909399;
  line-height: 1.8;
}

.warning-section {
  margin-bottom: 10px;
}

.text-danger {
  color: #f56c6c;
}

.text-success {
  color: #67c23a;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
