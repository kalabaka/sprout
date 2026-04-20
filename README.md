# 新芽学习 - 面向大学生的个人学习规划智能体系统

基于 Vue3 + Node.js/Express + MySQL 的智能学习规划系统，采用双智能体协作架构，为大学生提供个性化的学习规划与管理服务。

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (Vue3)                              │
│  首页 | 学习计划 | 任务管理 | 数据中心 | DDL管理 | 成就墙 | AI助手  │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP API
┌─────────────────────────────▼───────────────────────────────────┐
│                        后端 (Express)                           │
│  CoreAgent ← 统一调度入口                                       │
│    ├── PlanningAgent    生成学习路径                            │
│    ├── EvaluationAgent  评估学习风险                            │
│    ├── MotivationAgent  生成动机干预                            │
│    └── ReviewPlanAgent  复习计划生成                            │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                        数据库 (MySQL)                           │
│  用户 | 计划 | 任务 | 课程 | 学期 | 成就 | 通知 | 学习记录        │
└─────────────────────────────────────────────────────────────────┘
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue3 + Element Plus + ECharts + Pinia |
| 后端 | Node.js + Express |
| 数据库 | MySQL |
| 认证 | JWT |
| AI集成 | 通义千问 (Qwen) |

## 功能模块

### 用户端功能

| 模块 | 功能描述 |
|------|----------|
| 首页 | 今日任务概览、学习日历、AI学习助手对话 |
| 学习计划 | 创建/编辑/暂停/完成学习计划、进度追踪 |
| 任务管理 | 开始/暂停/完成任务、计时器、任务编辑 |
| DDL管理 | 课程DDL任务管理、逾期提醒 |
| 数据中心 | 学习时长趋势、能力雷达图、学习统计 |
| 成就墙 | 学习成就展示、里程碑记录 |
| 个人中心 | 个人信息管理、学习偏好设置 |

### 管理端功能

| 模块 | 功能描述 |
|------|----------|
| 用户管理 | 用户列表、状态管理 |
| 资源管理 | 学习资源上传与管理 |
| 系统设置 | 系统配置、参数调整 |

### 智能体功能

| 智能体 | 功能描述 |
|--------|----------|
| PlanningAgent | 根据学习目标生成个性化学习路径 |
| EvaluationAgent | 评估学习风险，识别潜在问题 |
| MotivationAgent | 基于ARCS模型生成动机干预建议 |
| ReviewPlanAgent | 生成复习计划，巩固学习效果 |

## 快速启动

### 环境要求

- Node.js >= 16.x
- MySQL >= 5.7
- npm >= 8.x

### 1. 数据库配置

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS sproutdatabase CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

# 导入数据库结构
mysql -u root -p sproutdatabase < backend/src/sql/sproutdatabase.sql
```

### 2. 后端启动

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量 (.env)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=sproutdatabase

JWT_SECRET=your_jwt_secret
LLM_API_KEY=your_qwen_api_key
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-plus

# 启动开发服务器
npm run dev
```

后端运行在 http://localhost:3000

### 3. 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端运行在 http://localhost:5173

## 演示账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 普通用户 | demo | demo123 |
| 管理员 | admin | admin123 |

## 核心API

### 认证相关

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/auth/login | POST | 用户登录 |
| /api/auth/register | POST | 用户注册 |
| /api/auth/logout | POST | 用户登出 |

### 计划相关

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/plan | GET | 获取计划列表 |
| /api/plan/:id | GET | 获取计划详情 |
| /api/plan | POST | 创建学习计划 |
| /api/plan/:id | PUT | 更新计划 |
| /api/plan/:id/status | PUT | 更新计划状态 |

### 任务相关

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/task/:id/start | POST | 开始任务 |
| /api/task/:id/pause | POST | 暂停任务 |
| /api/task/:id/complete | POST | 完成任务 |
| /api/task/:id | PUT | 更新任务 |

### 智能体相关

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/agent/goal/submit | POST | 提交学习目标，生成计划 |
| /api/agent/evaluation/plan/:id | GET | 获取计划风险评估 |
| /api/agent/qa | POST | AI问答 |

## 项目结构

```
e:\code\sprout\
├── backend/                    # 后端
│   ├── src/
│   │   ├── agents/           # 智能体
│   │   │   ├── coreAgent.js
│   │   │   ├── evaluationAgent.js
│   │   │   ├── motivationAgent.js
│   │   │   └── reviewPlanAgent.js
│   │   ├── controllers/      # 控制器
│   │   ├── models/           # 数据模型
│   │   ├── routes/           # 路由
│   │   ├── services/         # 业务服务
│   │   ├── middleware/       # 中间件
│   │   ├── utils/            # 工具函数
│   │   └── sql/              # 数据库脚本
│   └── package.json
├── frontend/                  # 前端
│   ├── src/
│   │   ├── api/             # API接口
│   │   ├── components/      # 组件
│   │   ├── router/          # 路由
│   │   ├── stores/          # Pinia状态管理
│   │   ├── views/           # 页面
│   │   └── utils/           # 工具函数
│   └── package.json
└── README.md
```

## 智能体说明

### CoreAgent
统一调度入口，协调各智能体工作流程：

1. **目标提交流程**: PlanningAgent → 生成学习路径 → 存入数据库
2. **任务完成流程**: EvaluationAgent评估 → 高风险触发MotivationAgent → 记录干预日志
3. **复习计划流程**: ReviewPlanAgent → 生成复习任务 → 更新计划

### ARCS动机模型

系统基于ARCS模型设计动机干预策略：

- **Attention（注意）**: 吸引学习者注意力
- **Relevance（相关）: 内容与目标关联
- **Confidence（信心）**: 建立学习自信
- **Satisfaction（满足）**: 获得成就感

## 主要特性

- **智能规划**: 基于LLM的个性化学习路径生成
- **风险管理**: 实时评估学习风险，提前预警
- **动机干预**: 针对性干预建议，保持学习动力
- **进度追踪**: 可视化学习进度与统计数据
- **DDL管理**: 课程截止日期管理，逾期提醒
- **成就系统**: 游戏化学习激励

## 开发说明

### 数据库迁移

```bash
# 运行迁移脚本
cd backend
node src/scripts/upgrade_notifications.js
node src/scripts/upgrade_quiz_records.js
```

### 日志查看

系统日志位于后端控制台输出，包含：
- API请求日志
- 智能体决策日志
- 错误日志

## 许可证

MIT License
