<template>
  <div class="admin-notifications">
    <AdminPageHeader title="通知模板管理" />
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>通知模板管理</span>
          <el-button type="primary" size="small" @click="openAddDialog">
            <el-icon><Plus /></el-icon>
            新增模板
          </el-button>
        </div>
      </template>
      <el-table :data="templates" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="模板名称" width="150" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)" size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="模板内容" min-width="300" show-overflow-tooltip />
        <el-table-column prop="enabled" label="状态" width="80">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" @change="toggleEnabled(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="openEditDialog(row)">编辑</el-button>
            <el-button type="warning" size="small" text @click="testTemplate(row)">测试</el-button>
            <el-button type="danger" size="small" text @click="deleteTemplate(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && templates.length === 0" description="暂无通知模板" />
    </el-card>

    <el-dialog v-model="showDialog" :title="isEdit ? '编辑通知模板' : '新增通知模板'" width="550px" @closed="resetForm">
      <el-form :model="formData" label-width="80px" :rules="rules" ref="formRef">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="formData.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="任务提醒" value="任务提醒" />
            <el-option label="考试提醒" value="考试提醒" />
            <el-option label="系统通知" value="系统通知" />
            <el-option label="风险预警" value="风险预警" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板内容" prop="content">
          <el-input v-model="formData.content" type="textarea" :rows="4" placeholder="支持变量: {username}, {taskName}, {days}等" />
        </el-form-item>
        <el-form-item label="可用变量">
          <div class="variables-hint">
            <el-tag v-for="v in availableVariables" :key="v" size="small" class="var-tag" @click="insertVariable(v)">
              {{ v }}
            </el-tag>
          </div>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="formData.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showTestDialog" title="测试模板" width="500px">
      <el-form label-width="80px">
        <el-form-item label="模板内容">
          <div class="test-content">{{ testContent }}</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTestDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Plus } from '@element-plus/icons-vue'
import { adminApi } from '../api'
import AdminPageHeader from '../components/AdminPageHeader.vue'

export default {
  name: 'AdminNotifications',
  components: { Plus, AdminPageHeader },
  data() {
    return {
      loading: false,
      saving: false,
      templates: [],
      showDialog: false,
      showTestDialog: false,
      isEdit: false,
      testContent: '',
      formData: {
        id: null,
        name: '',
        type: '',
        content: '',
        enabled: true
      },
      rules: {
        name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
        type: [{ required: true, message: '请选择类型', trigger: 'change' }],
        content: [{ required: true, message: '请输入模板内容', trigger: 'blur' }]
      }
    }
  },
  computed: {
    availableVariables() {
      return ['{username}', '{taskName}', '{examName}', '{days}', '{planName}']
    }
  },
  mounted() {
    this.fetchTemplates()
  },
  methods: {
    async fetchTemplates() {
      this.loading = true
      try {
        const res = await adminApi.getNotificationTemplates()
        if (res.success) {
          this.templates = (res.data || []).map(t => ({
            ...t,
            enabled: !!t.enabled
          }))
        }
      } catch (e) {
        console.error('获取通知模板失败:', e)
        this.$message.error('获取通知模板失败')
      } finally {
        this.loading = false
      }
    },

    openAddDialog() {
      this.isEdit = false
      this.formData = { id: null, name: '', type: '', content: '', enabled: true }
      this.showDialog = true
    },

    openEditDialog(template) {
      this.isEdit = true
      this.formData = { ...template }
      this.showDialog = true
    },

    resetForm() {
      if (this.$refs.formRef) {
        this.$refs.formRef.resetFields()
      }
    },

    async saveTemplate() {
      try {
        await this.$refs.formRef.validate()
      } catch {
        return
      }

      this.saving = true
      try {
        if (this.isEdit) {
          await adminApi.updateNotificationTemplate(this.formData.id, this.formData)
          this.$message.success('更新成功')
        } else {
          await adminApi.createNotificationTemplate(this.formData)
          this.$message.success('创建成功')
        }
        this.showDialog = false
        this.fetchTemplates()
      } catch (e) {
        console.error('保存模板失败:', e)
        this.$message.error('保存失败')
      } finally {
        this.saving = false
      }
    },

    async toggleEnabled(template) {
      try {
        await adminApi.toggleNotificationTemplate(template.id, template.enabled)
        this.$message.success(template.enabled ? '已启用' : '已禁用')
      } catch (e) {
        console.error('切换状态失败:', e)
        template.enabled = !template.enabled
        this.$message.error('操作失败')
      }
    },

    async deleteTemplate(template) {
      try {
        await this.$confirm('确定要删除该模板吗？', '提示', { type: 'warning' })
        await adminApi.deleteNotificationTemplate(template.id)
        this.$message.success('删除成功')
        this.fetchTemplates()
      } catch (e) {
        if (e !== 'cancel') {
          console.error('删除模板失败:', e)
          this.$message.error('删除失败')
        }
      }
    },

    testTemplate(template) {
      let content = template.content
      content = content.replace('{username}', '测试用户')
      content = content.replace('{taskName}', '测试任务')
      content = content.replace('{examName}', '测试考试')
      content = content.replace('{days}', '3')
      content = content.replace('{planName}', '测试计划')
      this.testContent = content
      this.showTestDialog = true
    },

    insertVariable(v) {
      this.formData.content += v
    },

    getTypeTag(type) {
      const types = {
        '任务提醒': 'primary',
        '考试提醒': 'warning',
        '系统通知': 'info',
        '风险预警': 'danger'
      }
      return types[type] || ''
    }
  }
}
</script>

<style scoped>
.admin-notifications {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.variables-hint {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.var-tag {
  cursor: pointer;
}

.var-tag:hover {
  opacity: 0.8;
}

.test-content {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  line-height: 1.6;
}
</style>
