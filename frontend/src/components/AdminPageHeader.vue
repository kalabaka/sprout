<template>
  <div class="page-header">
    <el-button text @click="goBack" class="back-btn">
      <el-icon><ArrowLeft /></el-icon>
      返回
    </el-button>
    <h2 class="page-title">{{ title }}</h2>
    <div class="header-extra">
      <slot></slot>
    </div>
  </div>
</template>

<script>
import { ArrowLeft } from '@element-plus/icons-vue'

export default {
  name: 'AdminPageHeader',
  components: { ArrowLeft },
  props: {
    title: {
      type: String,
      default: ''
    }
  },
  methods: {
    goBack() {
      this.$router.back()
    }
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.back-btn {
  color: #606266;
  padding: 0;
  margin-right: 16px;
}

.back-btn:hover {
  color: #409eff;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  flex: 1;
}

.header-extra {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
