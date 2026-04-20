# 面向大学生的个人学习规划智能体系统 - 后端

基于 Node.js + Express 的后端服务，实现MVC架构。

## 项目结构

```
learning-planning-agent/
├── .env                     # 环境配置
├── package.json             # 项目配置
├── src/
│   ├── app.js            # 入口文件
│   ├── config/
│   │   └── database.js  # 数据库连接
│   ├── controllers/      # 控制器层
│   │   ├── UserController.js
│   │   ├── PlanController.js
│   │   └── TaskController.js
│   ├── models/         # 数据模型层
│   │   ├── UserModel.js
│   │   ├── LearningPlanModel.js
│   │   └── TaskModel.js
│   ├── services/       # 业务逻辑层
│   │   ├── AuthService.js
│   │   └── LearningPlanService.js
│   ├── routes/        # 路由层
│   │   ├── user.js
│   │   ├── plan.js
│   │   └── task.js
│   ├── middleware/    # 中间件
│   │   └── auth.js    # JWT认证中间件
│   └── sql/
│       └── init.sql  # 数据库初始化脚本
```

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥14.x | 运行环境 |
| Express | ^4.18.2 | Web框架 |
| MySQL2 | ^3.6.5 | 数据库驱动 |
| JWT | ^9.0.2 | 身份认证 |
| bcrypt | ^5.1.1 | 密码加密 |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置数据库

1. 创建MySQL数据库:
```bash
mysql -u root -p < src/sql/init.sql
```

2. 修改 `.env` 配置:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=learning_planning
JWT_SECRET=your_jwt_secret_key
```

### 3. 填充演示数据（可选）

```bash
node seed.js
```

填充内容:
- 知识图谱数据（Java基础、Python数据分析路径）
- 测试用户: demo / demo123
- 学习计划和任务
- 学习记录（趋势图表数据）
- 干预日志

### 4. 启动服务

```bash
npm start
```

服务启动后访问: http://localhost:3000/api/test

## API接口列表

### 测试接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/test | GET | 测试接口 |
| /api/health | GET | 健康检查 |

### 用户管理

| 接口 | 方法 | 说明 | 认证 |
|------|------|------|------|
| /api/user/register | POST | 注册 | 否 |
| /api/user/login | POST | 登录 | 否 |
| /api/user/info | GET | 获取用户信息 | 是 |
| /api/user/info | PUT | 更新用户信息 | 是 |

### 学习计划

| 接口 | 方法 | 说明 | 认证 |
|------|------|------|------|
| /api/plan | GET | 获取计划列表 | 是 |
| /api/plan | POST | 创建学习计划 | 是 |
| /api/plan/:id | GET | 获取计划详情 | 是 |
| /api/plan/:id | PUT | 更新学习计划 | 是 |
| /api/plan/:id | DELETE | 删除学习计划 | 是 |

### 任务管理

| 接口 | 方法 | 说明 | 认证 |
|------|------|------|------|
| /api/task/:planId | GET | 获取任务列表 | 是 |
| /api/task/:id/start | POST | 开始任务 | 是 |
| /api/task/:id/complete | POST | 完成任务 | 是 |
| /api/task/:planId/stats | GET | 获取任务统计 | 是 |

### 智能体API

| 接口 | 方法 | 说明 | 认证 |
|------|------|------|------|
| /api/agent/goal/submit | POST | 提交学习目标 | 是 |
| /api/agent/task/complete | POST | 完成任务+评估 | 是 |
| /api/agent/interventions | GET | 获取干预日志 | 是 |
| /api/agent/evaluate | POST | 风险评估 | 是 |
| /api/agent/generate-plan | POST | 生成学习计划 | 是 |

### 数据分析API

| 接口 | 方法 | 说明 | 认证 |
|------|------|------|------|
| /api/analysis/trend | GET | 学习趋势数据 | 是 |
| /api/analysis/summary | GET | 统计摘要 | 是 |
| /api/analysis/radar | GET | 能力雷达 | 是 |

## 使用示例

### 1. 注册用户

```bash
curl -X POST http://localhost:3000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456","email":"test@example.com"}'
```

### 2. 登录

```bash
curl -X POST http://localhost:3000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'
```

### 3. 创建学习计划

```bash
curl -X POST http://localhost:3000/api/plan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Python学习计��",
    "goal": "掌握Python基础",
    "targetDate": "2024-12-31",
    "knowledgePoints": [
      {"name": "Python基础语法", "estimatedTime": 120, "difficulty": 2},
      {"name": "数据结构", "estimatedTime": 180, "difficulty": 3},
      {"name": "函数编程", "estimatedTime": 150, "difficulty": 3}
    ]
  }'
```

## 认证说明

除 `/api/test` 和 `/api/health` 外，所有接口都需要JWT认证。

请求头格式:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 目录结构说明

```
src/
├── config/          # 配置
│   └── database.js # 数据库连接配置
├── controllers/   # 控制器 - 处理请求响应
│   ├── UserController.js
│   ├── PlanController.js
│   └── TaskController.js
├── models/        # 模型 - 数据操作
│   ├── UserModel.js
│   ├── LearningPlanModel.js
│   └── TaskModel.js
├── services/      # 服务 - 业务逻辑
│   ├── AuthService.js
│   └── LearningPlanService.js
├── routes/       # 路由 - 路由定义
│   ├── user.js
│   ├── plan.js
│   └── task.js
├── middleware/   # 中间件
│   └── auth.js  # JWT认证
└── sql/         # SQL脚本
    └── init.sql # 初始化脚本
```