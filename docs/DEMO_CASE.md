# 新芽学习规划系统 - 答辩演示案例

## 演示流程概览

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  输入学习目标  │ -> │ 生成学习路径  │ -> │  完成学习任务 │ -> │  计算学习风险 │ -> │  给出建议   │
│  Python学习  │    │  8个任务    │    │  完成3个    │    │  风险指数45% │    │  动机干预  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## 步骤1：用户输入学习目标

### 演示数据

```json
{
  "userId": 1,
  "name": "Python数据分析学习计划",
  "goal": "学习Python数据分析，掌握pandas、numpy库，完成数据可视化项目",
  "targetDate": "2024-03-01"
}
```

### API调用

```
POST /api/plan
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Python数据分析学习计划",
  "goal": "学习Python数据分析，掌握pandas、numpy库，完成数据可视化项目",
  "targetDate": "2024-03-01"
}
```

### 预期响应

```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "planId": 1001,
    "taskCount": 8,
    "tasks": [
      {"id": 8001, "name": "Python基础语法", "level": 1, "estimatedTime": 45},
      {"id": 8002, "name": "数据结构与函数", "level": 1, "estimatedTime": 45},
      {"id": 8003, "name": "NumPy数组操作", "level": 2, "estimatedTime": 60},
      {"id": 8004, "name": "Pandas数据读取", "level": 2, "estimatedTime": 60},
      {"id": 8005, "name": "数据清洗与预处理", "level": 2, "estimatedTime": 60},
      {"id": 8006, "name": "Pandas数据分析", "level": 3, "estimatedTime": 90},
      {"id": 8007, "name": "Matplotlib可视化", "level": 3, "estimatedTime": 90},
      {"id": 8008, "name": "数据分析项目实战", "level": 3, "estimatedTime": 90}
    ]
  }
}
```

---

## 步骤2：系统生成学习路径（智能体协作）

### PlanningAgent 执行过程

```
┌─────────────────────────────────────────────────────────────┐
│  PlanningAgent: 学习路径生成                                 │
├─────────────────────────────────────────────────────────────┤
│  输入: "学习Python数据分析，掌握pandas、numpy库"            │
│                                                             │
│  Step 1: 知识依赖分解                                       │
│  ├── Python基础 -> 数据结构 -> 函数编程                      │
│  ├── NumPy基础 -> NumPy进阶                                 │
│  ├── Pandas基础 -> 数据清洗 -> 数据分析                      │
│  └── 数据可视化 -> 项目实战                                  │
│                                                             │
│  Step 2: 任务分层                                           │
│  ├── 基础阶段(1-2): Python基础语法、数据结构与函数           │
│  ├── 进阶阶段(3-5): NumPy/Pandas核心操作                   │
│  └── 应用阶段(6-8): 数据分析、可视化、项目实战              │
│                                                             │
│  输出: 8个学习任务，分3个阶段                                │
└─────────────────────────────────────────────────────────────┘
```

### 返回结果（含可解释性）

```json
{
  "status": "success",
  "message": "学习计划生成成功",
  "data": {
    "goal": "学习Python数据分析，掌握pandas、numpy库",
    "tasks": [
      {"order": 1, "name": "Python基础语法", "level": 1, "stage": "基础阶段", "estimatedTime": 45},
      {"order": 2, "name": "数据结构与函数", "level": 1, "stage": "基础阶段", "estimatedTime": 45},
      {"order": 3, "name": "NumPy数组操作", "level": 2, "stage": "进阶阶段", "estimatedTime": 60},
      {"order": 4, "name": "Pandas数据读取", "level": 2, "stage": "进阶阶段", "estimatedTime": 60},
      {"order": 5, "name": "数据清洗与预处理", "level": 2, "stage": "进阶阶段", "estimatedTime": 60},
      {"order": 6, "name": "Pandas数据分析", "level": 3, "stage": "应用阶段", "estimatedTime": 90},
      {"order": 7, "name": "Matplotlib可视化", "level": 3, "stage": "应用阶段", "estimatedTime": 90},
      {"order": 8, "name": "数据分析项目实战", "level": 3, "stage": "应用阶段", "estimatedTime": 90}
    ],
    "explanation": {
      "reason": "根据学习目标自动分解知识依赖关系",
      "design": "采用循序渐进的学习路径，基础->进阶->应用",
      "summary": "共8个任务，预计学习时间9小时",
      "suggestions": ["建议每天学习1-2个任务", "完成基础阶段后再进入进阶阶段"]
    },
    "stageSummary": {
      "基础阶段": 2,
      "进阶阶段": 3,
      "应用阶段": 3
    }
  }
}
```

---

## 步骤3：用户完成部分任务

### 任务状态数据

| 任务ID | 任务名称 | 状态 | 预估时间 | 实际时间 | 时间偏差 | 质量评分 |
|--------|---------|------|----------|----------|----------|----------|
| 8001 | Python基础语法 | 已完成 | 45分钟 | 40分钟 | -11% | 85分 |
| 8002 | 数据结构与函数 | 已完成 | 45分钟 | 50分钟 | +11% | 80分 |
| 8003 | NumPy数组操作 | 已完成 | 60分钟 | 65分钟 | +8% | 78分 |
| 8004 | Pandas数据读取 | 进行中 | 60分钟 | - | - | - |
| 8005-8008 | 剩余任务 | 待开始 | - | - | - | - |

### API调用 - 完成任务

```
POST /api/task/8001/complete
Content-Type: application/json
Authorization: Bearer <token>

{
  "actualTime": 40,
  "qualityScore": 85,
  "planId": 1001
}
```

### 响应

```json
{
  "code": 200,
  "message": "任务已完成",
  "data": null
}
```

---

## 步骤4：系统计算学习风险

### EvaluationAgent 执行过程

```
┌─────────────────────────────────────────────────────────────┐
│  EvaluationAgent: 学习风险评估                              │
├─────────────────────────────────────────────────────────────┤
│  输入指标:                                                  │
│  ├── 时间偏差: 2.7% (平均)                                  │
│  ├── 完成率: 37.5% (3/8)                                    │
│  └── 质量评分: 81分 (平均)                                  │
│                                                             │
│  维度分析:                                                  │
│  ├── 时间维度得分: 95分 (基本准时完成)                       │
│  ├── 进度维度得分: 50分 (进度偏慢)                          │
│  └── 质量维度得分: 81分 (质量良好)                          │
│                                                             │
│  风险评估结果:                                              │
│  └── 风险指数: 45% (中风险)                                 │
└─────────────────────────────────────────────────────────────┘
```

### API调用

```
POST /api/agent/evaluate
Content-Type: application/json

{
  "timeDeviation": 2.7,
  "completionRate": 0.375,
  "score": 81
}
```

### 返回结果（含可解释性）

```json
{
  "status": "success",
  "message": "风险评估完成",
  "data": {
    "metrics": {
      "timeDeviation": 2.7,
      "completionRate": 0.375,
      "score": 81
    },
    "evaluation": {
      "level": "中风险",
      "score": 45,
      "dimensions": {
        "time": {"score": 95, "status": "优秀", "detail": "基本能按时完成任务"},
        "progress": {"score": 50, "status": "一般", "detail": "进度偏慢，需加快学习节奏"},
        "quality": {"score": 81, "status": "良好", "detail": "任务完成质量良好"}
      }
    },
    "explanation": {
      "title": "学习进度需关注",
      "analysis": "当前完成率37.5%，低于预期进度50%。时间管理良好，但学习进度需要加快。",
      "mainFactors": ["完成率偏低", "距离目标日期还有20天"],
      "suggestions": [
        "建议每天增加1小时学习时间",
        "优先完成进阶阶段任务"
      ]
    }
  }
}
```

---

## 步骤5：系统给出动机干预建议

### MotivationAgent 执行过程

```
┌─────────────────────────────────────────────────────────────┐
│  MotivationAgent: 动机干预生成                               │
├─────────────────────────────────────────────────────────────┤
│  输入风险等级: 中风险                                        │
│                                                             │
│  ARCS模型分析:                                              │
│  ├── A(注意): 需要激发学习兴趣                               │
│  ├── R(相关性): 与职业发展相关                               │
│  ├── C(信心): 需要建立学习信心                               │
│  └── S(满足): 肯定已有进步                                   │
│                                                             │
│  干预策略:                                                   │
│  └── 目标调整 + 进度激励 + 积极反馈                          │
└─────────────────────────────────────────────────────────────┘
```

### API调用

```
POST /api/agent/advice
Content-Type: application/json

{
  "riskLevel": "中风险",
  "goal": "Python数据分析学习计划",
  "taskCount": 8
}
```

### 返回结果（含可解释性）

```json
{
  "status": "success",
  "message": "建议生成完成",
  "data": {
    "riskLevel": "中风险",
    "intervention": {
      "type": "进度激励型",
      "title": "保持节奏，稳步前进",
      "content": "您已完成3个基础任务，学习状态良好！还剩5个任务，建议适当加快学习节奏。"
    },
    "explanation": {
      "title": "保持节奏，稳步前进",
      "basis": "基于ARCS动机模型，您目前处于'信心建立'阶段",
      "strategy": "采用积极反馈 + 目标分解策略",
      "expectedEffect": "帮助用户建立学习信心，提高完成意愿",
      "details": [
        "肯定已有进步（完成37.5%）",
        "分解剩余目标（5个任务）",
        "提供具体行动建议"
      ]
    },
    "topicSuggestions": [
      "NumPy高级数组操作技巧",
      "Pandas数据清洗实战案例",
      "数据可视化最佳实践"
    ],
    "generalAdvice": {
      "riskLevel": "中风险",
      "taskCount": 8,
      "tips": [
        "适当增加学习时间",
        "关注薄弱环节",
        "寻求帮助"
      ]
    }
  }
}
```

---

## 完整数据流示例

### 用户仪表盘展示数据

```json
{
  "metrics": {
    "completionRate": 37.5,
    "totalTime": "195分钟",
    "efficiency": 81,
    "riskLevel": "中风险",
    "riskScore": "45%"
  },
  "taskStats": {
    "total": 8,
    "completed": 3,
    "inProgress": 1,
    "pending": 4
  },
  "trend": {
    "labels": ["01-15", "01-16", "01-17", "01-18", "01-19", "01-20", "01-21"],
    "data": [45, 50, 65, 0, 35, 0, 0]
  },
  "riskTrend": {
    "labels": ["01-15", "01-16", "01-17", "01-18", "01-19", "01-20", "01-21"],
    "data": [20, 25, 30, 35, 40, 45, 45]
  },
  "efficiencyMetrics": {
    "overall": 0.68,
    "overallText": "68%",
    "onTimeRate": 0.67,
    "qualityScore": 0.81,
    "rating": "良好"
  }
}
```

---

## 答辩演讲要点

### 1. 系统演示要点

| 环节 | 讲解重点 | 时长 |
|------|---------|------|
| 输入目标 | 展示自然语言输入，系统理解学习需求 | 30秒 |
| 生成路径 | 展示智能体协作，知识分解过程 | 1分钟 |
| 完成任务 | 展示任务管理，状态流转 | 30秒 |
| 风险评估 | 展示多维度评估，结果可视化 | 1分钟 |
| 动机干预 | 展示ARCS模型，个性化建议 | 30秒 |

### 2. 技术亮点

- **双Agent协作架构**：InterfaceAgent + CoreAgent
- **可解释AI**：每个结果附带解释字段
- **ARCS动机模型**：科学的学习干预策略
- **实时风险监控**：多维度绩效评估
- **ECharts可视化**：直观的数据展示

### 3. 演示注意事项

1. 提前准备测试数据，确保API响应正常
2. 演示过程中注意展示"可解释性"字段
3. 强调系统的智能化程度和用户体验
4. 准备好应对评委提问的技术细节
