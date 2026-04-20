<template>
  <div class="admin-knowledge">
    <AdminPageHeader title="知识图谱管理" />
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>知识图谱管理</span>
          <div class="header-actions">
            <el-button type="primary" size="small">
              <el-icon><Plus /></el-icon>
              新增节点
            </el-button>
            <el-button size="small">
              <el-icon><Upload /></el-icon>
              导入
            </el-button>
            <el-button size="small">
              <el-icon><Download /></el-icon>
              导出
            </el-button>
          </div>
        </div>
      </template>
      <div class="knowledge-content">
        <el-row :gutter="16">
          <el-col :span="8">
            <div class="node-list">
              <el-input v-model="searchKeyword" placeholder="搜索知识点..." clearable style="margin-bottom: 16px" />
              <el-tree
                :data="knowledgeTree"
                :props="{ label: 'name', children: 'children' }"
                default-expand-all
                @node-click="handleNodeClick"
              />
            </div>
          </el-col>
          <el-col :span="16">
            <div class="node-detail" v-if="selectedNode">
              <h3>{{ selectedNode.name }}</h3>
              <el-descriptions :column="1" border>
                <el-descriptions-item label="学科">{{ selectedNode.subject }}</el-descriptions-item>
                <el-descriptions-item label="难度">{{ selectedNode.difficulty }}</el-descriptions-item>
                <el-descriptions-item label="前置知识">{{ selectedNode.prerequisites?.join('、') || '无' }}</el-descriptions-item>
                <el-descriptions-item label="描述">{{ selectedNode.description }}</el-descriptions-item>
              </el-descriptions>
            </div>
            <el-empty v-else description="请选择知识点查看详情" />
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script>
import { Plus, Upload, Download } from '@element-plus/icons-vue'
import AdminPageHeader from '../components/AdminPageHeader.vue'

export default {
  name: 'AdminKnowledge',
  components: { Plus, Upload, Download, AdminPageHeader },
  data() {
    return {
      searchKeyword: '',
      selectedNode: null,
      knowledgeTree: [
        {
          name: '编程语言',
          children: [
            { name: 'Java', subject: '计算机', difficulty: '中等', prerequisites: ['计算机基础'], description: '面向对象编程语言' },
            { name: 'Python', subject: '计算机', difficulty: '简单', prerequisites: [], description: '简洁易学的编程语言' },
            { name: 'JavaScript', subject: '计算机', difficulty: '中等', prerequisites: ['HTML', 'CSS'], description: 'Web前端脚本语言' }
          ]
        },
        {
          name: '英语学习',
          children: [
            { name: '语法基础', subject: '英语', difficulty: '简单', prerequisites: [], description: '英语语法基础知识' },
            { name: '阅读理解', subject: '英语', difficulty: '中等', prerequisites: ['词汇', '语法基础'], description: '英语阅读能力训练' }
          ]
        }
      ]
    }
  },
  methods: {
    handleNodeClick(data) {
      if (!data.children) {
        this.selectedNode = data
      }
    }
  }
}
</script>

<style scoped>
.admin-knowledge {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.knowledge-content {
  min-height: 400px;
}

.node-list {
  padding: 16px;
  background: #f9fafc;
  border-radius: 8px;
}

.node-detail {
  padding: 16px;
}

.node-detail h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #303133;
}
</style>
