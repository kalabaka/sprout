<template>
  <div class="admin-resources">
    <AdminPageHeader title="资源管理" />
    <!-- 搜索栏 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true">
        <el-form-item label="类型">
          <el-select v-model="typeFilter" placeholder="全部" clearable>
            <el-option label="视频" value="video" />
            <el-option label="文档" value="document" />
            <el-option label="练习" value="exercise" />
          </el-select>
        </el-form-item>
        <el-form-item label="搜索">
          <el-input v-model="searchKeyword" placeholder="标题/标签" clearable @keyup.enter="fetchResources" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchResources">搜索</el-button>
          <el-button type="success" @click="showAddDialog = true">
            <el-icon><Plus /></el-icon>
            添加资源
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 资源列表 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>学习资源</span>
          <span class="total">共 {{ total }} 个</span>
        </div>
      </template>

      <el-table :data="resources" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)" size="small">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="difficulty_level" label="难度" width="80">
          <template #default="{ row }">
            {{ getDifficultyText(row.difficulty_level) }}
          </template>
        </el-table-column>
        <el-table-column prop="tags" label="标签" width="150">
          <template #default="{ row }">
            <el-tag v-for="tag in parseTags(row.tags)" :key="tag" size="small" class="tag-item">
              {{ tag }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="editResource(row)">编辑</el-button>
            <el-button type="danger" size="small" text @click="deleteResource(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          :current-page="page"
          :page-size="limit"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchResources"
          @current-change="fetchResources"
          @update:current-page="page = $event"
          @update:page-size="limit = $event"
        />
      </div>
    </el-card>

    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="showAddDialog" :title="isEdit ? '编辑资源' : '添加资源'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="资源标题" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" placeholder="选择类型">
            <el-option label="视频" value="video" />
            <el-option label="文档" value="document" />
            <el-option label="练习" value="exercise" />
          </el-select>
        </el-form-item>
        <el-form-item label="URL" prop="url">
          <el-input v-model="form.url" placeholder="资源链接" />
        </el-form-item>
        <el-form-item label="难度">
          <el-rate v-model="form.difficulty_level" :max="3" />
        </el-form-item>
        <el-form-item label="标签">
          <el-select v-model="form.tags" multiple placeholder="选择标签" allow-create filterable>
            <el-option label="Java" value="Java" />
            <el-option label="Python" value="Python" />
            <el-option label="前端" value="前端" />
            <el-option label="后端" value="后端" />
            <el-option label="算法" value="算法" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" active-value="active" inactive-value="inactive" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Plus } from '@element-plus/icons-vue'
import { adminApi } from '../api'
import AdminPageHeader from '../components/AdminPageHeader.vue'

export default {
  name: 'AdminResources',
  components: { Plus, AdminPageHeader },
  data() {
    return {
      resources: [],
      loading: false,
      searchKeyword: '',
      typeFilter: '',
      page: 1,
      limit: 10,
      total: 0,
      showAddDialog: false,
      isEdit: false,
      form: {
        id: null,
        title: '',
        type: '',
        url: '',
        difficulty_level: 1,
        tags: [],
        status: 'active'
      },
      rules: {
        title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
        type: [{ required: true, message: '请选择类型', trigger: 'change' }],
        url: [{ required: true, message: '请输入URL', trigger: 'blur' }]
      }
    }
  },
  mounted() {
    this.fetchResources()
  },
  methods: {
    async fetchResources() {
      this.loading = true
      try {
        const res = await adminApi.getResources({
          page: this.page,
          limit: this.limit,
          keyword: this.searchKeyword,
          type: this.typeFilter
        })
        this.resources = res.data || []
        this.total = res.total || 0
      } catch (e) {
        this.$message.error('获取资源列表失败')
      } finally {
        this.loading = false
      }
    },
    editResource(resource) {
      this.isEdit = true
      this.form = {
        id: resource.id,
        title: resource.title,
        type: resource.type,
        url: resource.url,
        difficulty_level: resource.difficulty_level,
        tags: this.parseTags(resource.tags),
        status: resource.status
      }
      this.showAddDialog = true
    },
    async deleteResource(resource) {
      try {
        await this.$confirm('确定要删除该资源吗？', '提示', { type: 'warning' })
        await adminApi.deleteResource(resource.id)
        this.$message.success('删除成功')
        this.fetchResources()
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error('删除失败')
        }
      }
    },
    async submitForm() {
      const formRef = this.$refs.formRef
      if (!formRef) return

      try {
        await formRef.validate()
        const data = { ...this.form }

        if (this.isEdit) {
          await adminApi.updateResource(this.form.id, data)
          this.$message.success('更新成功')
        } else {
          await adminApi.addResource(data)
          this.$message.success('添加成功')
        }
        this.showAddDialog = false
        this.fetchResources()
      } catch (e) {
        if (e !== false) {
          this.$message.error('操作失败')
        }
      }
    },
    getTypeText(type) {
      const map = { video: '视频', document: '文档', exercise: '练习' }
      return map[type] || type
    },
    getTypeTag(type) {
      const map = { video: 'danger', document: 'warning', exercise: 'success' }
      return map[type] || ''
    },
    getDifficultyText(level) {
      const map = { 1: '简单', 2: '中等', 3: '困难' }
      return map[level] || '简单'
    },
    parseTags(tags) {
      if (!tags) return []
      if (Array.isArray(tags)) return tags
      if (typeof tags === 'string') {
        try {
          const parsed = JSON.parse(tags)
          return Array.isArray(parsed) ? parsed : [parsed]
        } catch (e) {
          return tags.split(',').map(t => t.trim()).filter(t => t)
        }
      }
      return []
    }
  }
}
</script>

<style scoped>
.admin-resources {
  padding: 0;
}

.search-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total {
  font-size: 13px;
  color: #909399;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.tag-item {
  margin-right: 4px;
}
</style>