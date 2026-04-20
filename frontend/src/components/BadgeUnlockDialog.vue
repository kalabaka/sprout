<template>
  <el-dialog
    v-model="visible"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    width="400px"
    class="badge-unlock-dialog"
    @close="handleClose"
  >
    <div class="unlock-content">
      <div class="celebration">
        <div class="confetti">
          <span v-for="i in 20" :key="i" class="confetti-piece" :style="getConfettiStyle(i)"></span>
        </div>
      </div>
      
      <div class="badge-display">
        <div class="badge-glow" :class="currentBadge?.rarity"></div>
        <span class="badge-icon">{{ currentBadge?.icon }}</span>
      </div>
      
      <div class="badge-info">
        <div class="unlock-title">🎉 恭喜获得勋章！</div>
        <div class="badge-name">{{ currentBadge?.name }}</div>
        <div class="badge-desc">{{ currentBadge?.description }}</div>
        <el-tag 
          :type="getRarityType(currentBadge?.rarity)" 
          size="small" 
          effect="dark"
          class="rarity-tag"
        >
          {{ getRarityText(currentBadge?.rarity) }}
        </el-tag>
      </div>

      <div v-if="badges.length > 1" class="badge-progress">
        <span>{{ currentIndex + 1 }} / {{ badges.length }}</span>
      </div>

      <div class="actions">
        <el-button v-if="badges.length > 1 && currentIndex < badges.length - 1" type="primary" @click="nextBadge">
          下一个 ({{ badges.length - currentIndex - 1 }})
        </el-button>
        <template v-else>
          <el-button @click="handleClose">继续学习</el-button>
          <el-button type="primary" @click="shareBadge">
            炫耀一下
          </el-button>
        </template>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  badges: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const currentIndex = ref(0)

const currentBadge = computed(() => {
  return props.badges[currentIndex.value] || null
})

watch(() => props.modelValue, (val) => {
  if (val) {
    currentIndex.value = 0
  }
})

const getRarityType = (rarity) => {
  const map = {
    common: 'info',
    rare: 'primary',
    epic: 'warning',
    legendary: 'danger'
  }
  return map[rarity] || 'info'
}

const getRarityText = (rarity) => {
  const map = {
    common: '普通',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说'
  }
  return map[rarity] || '普通'
}

const getConfettiStyle = (index) => {
  const colors = ['#f56c6c', '#e6a23c', '#67c23a', '#409eff', '#a855f7', '#ec4899']
  const left = Math.random() * 100
  const delay = Math.random() * 0.5
  const duration = 1 + Math.random() * 0.5
  
  return {
    left: `${left}%`,
    backgroundColor: colors[index % colors.length],
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`
  }
}

const nextBadge = () => {
  if (currentIndex.value < props.badges.length - 1) {
    currentIndex.value++
  }
}

const shareBadge = () => {
  if (currentBadge.value) {
    ElMessage.success('已复制勋章信息到剪贴板！')
  }
  handleClose()
}

const handleClose = () => {
  visible.value = false
  emit('close')
}
</script>

<style scoped>
.badge-unlock-dialog :deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

.badge-unlock-dialog :deep(.el-dialog__header) {
  display: none;
}

.badge-unlock-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.unlock-content {
  position: relative;
  padding: 40px 30px 30px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 400px;
}

.celebration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 150px;
  overflow: hidden;
  pointer-events: none;
}

.confetti {
  position: relative;
  width: 100%;
  height: 100%;
}

.confetti-piece {
  position: absolute;
  width: 10px;
  height: 10px;
  top: -10px;
  border-radius: 2px;
  animation: confetti-fall 1.5s ease-out forwards;
}

@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(160px) rotate(720deg);
    opacity: 0;
  }
}

.badge-display {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-glow {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

.badge-glow.common {
  background: radial-gradient(circle, rgba(144, 147, 153, 0.4) 0%, transparent 70%);
}

.badge-glow.rare {
  background: radial-gradient(circle, rgba(64, 158, 255, 0.4) 0%, transparent 70%);
}

.badge-glow.epic {
  background: radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 70%);
}

.badge-glow.legendary {
  background: radial-gradient(circle, rgba(230, 162, 60, 0.5) 0%, transparent 70%);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

.badge-icon {
  font-size: 72px;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
  animation: bounce-in 0.6s ease-out;
}

@keyframes bounce-in {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.badge-info {
  color: #fff;
  margin-bottom: 24px;
}

.unlock-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.badge-name {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.badge-desc {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 12px;
}

.rarity-tag {
  margin-top: 8px;
}

.badge-progress {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin-bottom: 20px;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.actions .el-button {
  min-width: 100px;
}
</style>
