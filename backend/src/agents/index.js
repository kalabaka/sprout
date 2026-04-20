/**
 * 智能体系统统一入口
 *
 * 模块说明：
 * - InterfaceAgent: 接口Agent（负责参数校验、请求分发）
 * - CoreAgent: 核心Agent（负责协调子Agent、汇总结果）
 * - PlanningAgent: 规划Agent（生成学习路径）
 * - EvaluationAgent: 评估Agent（评估学习风险）
 * - MotivationAgent: 动机Agent（生成干预建议）
 * - Scheduler: 任务调度器（管理异步任务）
 *
 * 架构流程：
 * ┌──────────────┐
 * │   Client     │
 * └──────┬───────┘
 *        │
 * ┌──────▼───────┐
 * │InterfaceAgent │ ← 参数校验、请求分发
 * └──────┬───────┘
 *        │
 * ┌──────▼───────┐
 * │  CoreAgent   │ ← 协调中心、结果汇总
 * └──────┬───────┘
 *        │
 *  ┌─────┼─────┐
 *  │     │     │
 * ┌▼─┐ ┌▼─┐ ┌▼─┐
 * │P │ │E │ │M │ ← 专业Agent
 * │l │ │v │ │o │
 * │a │ │a │ │t │
 * │n │ │l │ │i │
 * └─┘ └─┘ └─┘
 */

const InterfaceAgent = require('./interfaceAgent');
const CoreAgent = require('./coreAgent');
const PlanningAgent = require('../services/PlanningAgent');
const EvaluationAgent = require('./evaluationAgent');
const MotivationAgent = require('./motivationAgent');
const Scheduler = require('./scheduler');

module.exports = {
  // 主Agent
  InterfaceAgent,
  CoreAgent,

  // 专业Agent
  PlanningAgent,
  EvaluationAgent,
  MotivationAgent,

  // 调度器
  Scheduler,

  // 兼容旧写法
  interfaceAgent: InterfaceAgent,
  coreAgent: CoreAgent,
  planningAgent: PlanningAgent,
  evaluationAgent: EvaluationAgent,
  motivationAgent: MotivationAgent,

  // 导出常量
  REQUEST_TYPES: require('./coreAgent').REQUEST_TYPES,
  RESPONSE_STATUS: require('./coreAgent').RESPONSE_STATUS,
  TASK_TYPES: Scheduler.TASK_TYPES,
  TASK_STATUS: Scheduler.TASK_STATUS
};
