<template>
  <div class="admin-settings">
    <AdminPageHeader title="系统配置" />
    <el-row :gutter="16">
      <!-- 左侧配置分组 -->
      <el-col :span="16">
        <!-- 注册限制 -->
        <el-card shadow="never" class="settings-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">🔐 注册限制</span>
            </div>
          </template>
          <el-form label-width="140px">
            <el-form-item label="最大用户数">
              <el-input-number v-model="settings.maxUserCount" :min="10" :max="10000" />
              <span class="hint">当前已注册 {{ currentUsers }} 人</span>
            </el-form-item>
            <el-form-item label="开放注册">
              <el-switch v-model="settings.openRegistration" />
              <span class="hint">关闭后用户无法自行注册</span>
            </el-form-item>
            <el-form-item label="注册审核">
              <el-switch v-model="settings.registrationReview" />
              <span class="hint">开启后新用户需管理员审核</span>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 计划限制 -->
        <el-card shadow="never" class="settings-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">📋 计划限制</span>
            </div>
          </template>
          <el-form label-width="140px">
            <el-form-item label="最大计划数">
              <el-input-number v-model="settings.maxPlans" :min="1" :max="50" />
              <span class="hint">每个用户最多创建的计划数</span>
            </el-form-item>
            <el-form-item label="最大进行中计划">
              <el-input-number v-model="settings.maxActivePlans" :min="1" :max="10" />
              <span class="hint">同时进行的计划数上限</span>
            </el-form-item>
            <el-form-item label="最大每日学习时长">
              <el-input-number v-model="settings.maxDailyMinutes" :min="30" :max="480" />
              <span class="hint">分钟</span>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 提醒设置 -->
        <el-card shadow="never" class="settings-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">🔔 提醒设置</span>
            </div>
          </template>
          <el-form label-width="140px">
            <el-form-item label="任务提醒开关">
              <el-switch v-model="settings.enableReminder" />
            </el-form-item>
            <el-form-item label="任务提醒时间" v-if="settings.enableReminder">
              <el-time-select
                v-model="settings.reminderTime"
                start="06:00"
                step="00:30"
                end="22:00"
                placeholder="选择时间"
              />
            </el-form-item>
            <el-form-item label="考试提醒天数">
              <el-input-number v-model="settings.examReminderDays" :min="1" :max="7" />
              <span class="hint">提前几天提醒</span>
            </el-form-item>
            <el-form-item label="打卡提醒时间">
              <el-time-select
                v-model="settings.checkInReminderTime"
                start="06:00"
                step="00:30"
                end="22:00"
                placeholder="选择时间"
              />
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 风险评估 -->
        <el-card shadow="never" class="settings-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">⚠️ 风险评估</span>
            </div>
          </template>
          <el-form label-width="140px">
            <el-form-item label="AI干预开关">
              <el-switch v-model="settings.enableIntervention" />
            </el-form-item>
            <el-form-item label="完成率权重" v-if="settings.enableIntervention">
              <el-slider v-model="settings.weightCompletion" :min="0" :max="100" :format-tooltip="val => val + '%'" />
            </el-form-item>
            <el-form-item label="连续性权重" v-if="settings.enableIntervention">
              <el-slider v-model="settings.weightConsistency" :min="0" :max="100" :format-tooltip="val => val + '%'" />
            </el-form-item>
            <el-form-item label="时间投入权重" v-if="settings.enableIntervention">
              <el-slider v-model="settings.weightTime" :min="0" :max="100" :format-tooltip="val => val + '%'" />
            </el-form-item>
            <el-form-item label="高风险阈值" v-if="settings.enableIntervention">
              <el-input-number v-model="settings.highRiskThreshold" :min="0" :max="100" />
              <span class="hint">风险分数低于此值为高风险</span>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 系统信息 -->
        <el-card shadow="never" class="settings-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">ℹ️ 系统信息</span>
            </div>
          </template>
          <el-form label-width="140px">
            <el-form-item label="系统名称">
              <el-input v-model="settings.systemName" placeholder="请输入系统名称" />
            </el-form-item>
            <el-form-item label="系统描述">
              <el-input v-model="settings.systemDescription" type="textarea" :rows="2" placeholder="请输入系统描述" />
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧预览和操作 -->
      <el-col :span="8">
        <!-- 保存操作 -->
        <el-card shadow="never" class="save-card">
          <div class="save-content">
            <el-button type="primary" size="large" @click="saveSettings" :loading="saving" style="width: 100%">
              <el-icon><Check /></el-icon>
              保存设置
            </el-button>
            <el-button size="large" @click="resetSettings" style="width: 100%; margin-top: 12px">
              <el-icon><RefreshLeft /></el-icon>
              重置默认
            </el-button>
          </div>
        </el-card>

        <!-- 通知预览 -->
        <el-card shadow="never" class="preview-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">📨 通知预览</span>
            </div>
          </template>
          <div class="preview-content">
            <div class="preview-item">
              <div class="preview-label">任务提醒</div>
              <div class="preview-text">
                【{{ settings.systemName }}】亲爱的用户，您今日有未完成的学习任务，请及时完成哦~
              </div>
            </div>
            <div class="preview-item">
              <div class="preview-label">考试提醒</div>
              <div class="preview-text">
                【{{ settings.systemName }}】您报名的考试将在{{ settings.examReminderDays }}天后开始，请做好准备！
              </div>
            </div>
            <div class="preview-item">
              <div class="preview-label">打卡提醒</div>
              <div class="preview-text">
                【{{ settings.systemName }}】今天还没有打卡哦，坚持就是胜利！
              </div>
            </div>
          </div>
        </el-card>

        <!-- 权重预览 -->
        <el-card shadow="never" class="preview-card" v-if="settings.enableIntervention">
          <template #header>
            <div class="card-header">
              <span class="card-title">📊 权重分布</span>
            </div>
          </template>
          <div class="weight-chart">
            <div class="weight-item">
              <span class="weight-label">完成率</span>
              <el-progress :percentage="settings.weightCompletion" :stroke-width="12" />
            </div>
            <div class="weight-item">
              <span class="weight-label">连续性</span>
              <el-progress :percentage="settings.weightConsistency" :stroke-width="12" color="#E6A23C" />
            </div>
            <div class="weight-item">
              <span class="weight-label">时间投入</span>
              <el-progress :percentage="settings.weightTime" :stroke-width="12" color="#67C23A" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { Check, RefreshLeft } from '@element-plus/icons-vue'
import { adminApi } from '../api'
import AdminPageHeader from '../components/AdminPageHeader.vue'

export default {
  name: 'AdminSettings',
  components: { Check, RefreshLeft, AdminPageHeader },
  data() {
    return {
      loading: false,
      saving: false,
      currentUsers: 0,
      settings: {
        systemName: '新芽学习规划系统',
        systemDescription: '',
        maxUserCount: 100,
        openRegistration: true,
        registrationReview: false,
        maxPlans: 20,
        maxActivePlans: 5,
        maxDailyMinutes: 120,
        enableReminder: true,
        reminderTime: '09:00',
        examReminderDays: 3,
        checkInReminderTime: '20:00',
        enableIntervention: true,
        weightCompletion: 40,
        weightConsistency: 30,
        weightTime: 30,
        highRiskThreshold: 30
      }
    }
  },
  mounted() {
    this.fetchSettings()
  },
  methods: {
    async fetchSettings() {
      this.loading = true
      try {
        const res = await adminApi.getConfig()
        if (res.success && res.data) {
          const configs = Array.isArray(res.data) ? res.data : []
          configs.forEach(item => {
            if (item.config_key === 'system_name') {
              this.settings.systemName = item.config_value
            } else if (item.config_key === 'system_description') {
              this.settings.systemDescription = item.config_value || ''
            } else if (item.config_key === 'max_user_count') {
              this.settings.maxUserCount = parseInt(item.config_value) || 100
            } else if (item.config_key === 'open_registration') {
              this.settings.openRegistration = item.config_value === 'true'
            } else if (item.config_key === 'registration_review') {
              this.settings.registrationReview = item.config_value === 'true'
            } else if (item.config_key === 'max_plans') {
              this.settings.maxPlans = parseInt(item.config_value) || 20
            } else if (item.config_key === 'max_active_plans') {
              this.settings.maxActivePlans = parseInt(item.config_value) || 5
            } else if (item.config_key === 'max_daily_minutes') {
              this.settings.maxDailyMinutes = parseInt(item.config_value) || 120
            } else if (item.config_key === 'enable_reminder') {
              this.settings.enableReminder = item.config_value === 'true'
            } else if (item.config_key === 'reminder_time') {
              this.settings.reminderTime = item.config_value || '09:00'
            } else if (item.config_key === 'exam_reminder_days') {
              this.settings.examReminderDays = parseInt(item.config_value) || 3
            } else if (item.config_key === 'check_in_reminder_time') {
              this.settings.checkInReminderTime = item.config_value || '20:00'
            } else if (item.config_key === 'enable_intervention') {
              this.settings.enableIntervention = item.config_value === 'true'
            } else if (item.config_key === 'weight_completion') {
              this.settings.weightCompletion = parseInt(item.config_value) || 40
            } else if (item.config_key === 'weight_consistency') {
              this.settings.weightConsistency = parseInt(item.config_value) || 30
            } else if (item.config_key === 'weight_time') {
              this.settings.weightTime = parseInt(item.config_value) || 30
            } else if (item.config_key === 'high_risk_threshold') {
              this.settings.highRiskThreshold = parseInt(item.config_value) || 30
            }
          })
        }
        const statsRes = await adminApi.getStats()
        if (statsRes.success && statsRes.data) {
          this.currentUsers = statsRes.data.totalUsers || 0
        }
      } catch (e) {
        console.error('获取设置失败:', e)
      } finally {
        this.loading = false
      }
    },
    
    async saveSettings() {
      this.saving = true
      try {
        const configs = [
          { key: 'system_name', value: this.settings.systemName, description: '系统名称' },
          { key: 'system_description', value: this.settings.systemDescription, description: '系统描述' },
          { key: 'max_user_count', value: String(this.settings.maxUserCount), description: '最大注册用户数' },
          { key: 'open_registration', value: String(this.settings.openRegistration), description: '开放注册' },
          { key: 'registration_review', value: String(this.settings.registrationReview), description: '注册审核' },
          { key: 'max_plans', value: String(this.settings.maxPlans), description: '最大计划数' },
          { key: 'max_active_plans', value: String(this.settings.maxActivePlans), description: '最大进行中计划数' },
          { key: 'max_daily_minutes', value: String(this.settings.maxDailyMinutes), description: '最大每日学习时长(分钟)' },
          { key: 'enable_reminder', value: String(this.settings.enableReminder), description: '任务提醒开关' },
          { key: 'reminder_time', value: this.settings.reminderTime, description: '任务提醒时间' },
          { key: 'exam_reminder_days', value: String(this.settings.examReminderDays), description: '考试提醒天数' },
          { key: 'check_in_reminder_time', value: this.settings.checkInReminderTime, description: '打卡提醒时间' },
          { key: 'enable_intervention', value: String(this.settings.enableIntervention), description: 'AI干预开关' },
          { key: 'weight_completion', value: String(this.settings.weightCompletion), description: '完成率权重' },
          { key: 'weight_consistency', value: String(this.settings.weightConsistency), description: '连续性权重' },
          { key: 'weight_time', value: String(this.settings.weightTime), description: '时间投入权重' },
          { key: 'high_risk_threshold', value: String(this.settings.highRiskThreshold), description: '高风险阈值' }
        ]
        
        for (const config of configs) {
          await adminApi.updateConfig(config)
        }
        
        this.$message.success('设置已保存')
      } catch (e) {
        this.$message.error('保存失败: ' + (e.message || '未知错误'))
      } finally {
        this.saving = false
      }
    },
    
    resetSettings() {
      this.$confirm('确定要重置所有设置为默认值吗？', '提示', { type: 'warning' })
        .then(() => {
          this.settings = {
            systemName: '新芽学习规划系统',
            systemDescription: '',
            maxUserCount: 100,
            openRegistration: true,
            registrationReview: false,
            maxPlans: 20,
            maxActivePlans: 5,
            maxDailyMinutes: 120,
            enableReminder: true,
            reminderTime: '09:00',
            examReminderDays: 3,
            checkInReminderTime: '20:00',
            enableIntervention: true,
            weightCompletion: 40,
            weightConsistency: 30,
            weightTime: 30,
            highRiskThreshold: 30
          }
          this.$message.success('已重置为默认设置')
        })
        .catch(() => {})
    }
  }
}
</script>

<style scoped>
.admin-settings {
  padding: 0;
}

.settings-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-weight: 500;
  font-size: 15px;
}

.hint {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}

.save-card {
  margin-bottom: 16px;
}

.save-content {
  padding: 8px 0;
}

.preview-card {
  margin-bottom: 16px;
}

.preview-content {
  padding: 8px 0;
}

.preview-item {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px dashed #ebeef5;
}

.preview-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.preview-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.preview-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
}

.weight-chart {
  padding: 8px 0;
}

.weight-item {
  margin-bottom: 16px;
}

.weight-item:last-child {
  margin-bottom: 0;
}

.weight-label {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
  display: block;
}
</style>
