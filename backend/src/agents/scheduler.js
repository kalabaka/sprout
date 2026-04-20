/**
 * Scheduler - 任务调度器
 *
 * 负责管理和执行智能体任务
 *
 * 功能：
 * 1. 任务队列管理
 * 2. 任务执行调度
 * 3. 执行结果回调
 *
 * 执行流程：
 * ┌─────────────┐
 * │  Scheduler  │ ← 任务调度中心
 * └──────┬──────┘
 *        │
 *   ┌───┴───┐
 *   │ 队列1 │ 队列2 │ 队列3
 *   └───┬───┘
 *        │
 *   ┌───▼────────────────┐
 *   │  执行结果回调       │
 *   └────────────────────┘
 */

const logger = require('../config/logger');

/**
 * 任务状态
 */
const TASK_STATUS = {
  PENDING: 'pending',     // 待执行
  RUNNING: 'running',   // 执行中
  SUCCESS: 'success',   // 执行成功
  FAILED: 'failed'      // 执行失败
};

/**
 * 任务类型
 */
const TASK_TYPES = {
  GENERATE_PLAN: 'generatePlan',   // 生成学习计划
  EVALUATE_RISK: 'evaluateRisk', // 评估学习风险
  ANALYZE_DATA: 'analyzeData',     // 分析学习数据
  GENERATE_ADVICE: 'generateAdvice' // 生成学习建议
};

class Scheduler {
  constructor() {
    this.tasks = new Map();  // 任务存储
    this.taskQueue = [];     // 任务队列
    this.executing = false;  // 是否正在执行
  }

  /**
   * 添加任务到队列
   *
   * @param {string} type 任务类型
   * @param {Object} params 任务参数
   * @param {Function} handler 任务处理函数
   * @returns {string} 任务ID
   */
  addTask(type, params, handler) {
    const taskId = this.generateTaskId();

    const task = {
      id: taskId,
      type,
      params,
      handler,
      status: TASK_STATUS.PENDING,
      result: null,
      error: null,
      startTime: null,
      endTime: null
    };

    this.tasks.set(taskId, task);
    this.taskQueue.push(task);

    logger.agent(`任务加入队列: ${taskId}, 类型: ${type}`);

    // 自动执行任务
    this.executeNext();

    return taskId;
  }

  /**
   * 执行下一个任务
   */
  async executeNext() {
    if (this.executing || this.taskQueue.length === 0) {
      return;
    }

    this.executing = true;
    const task = this.taskQueue.shift();

    task.status = TASK_STATUS.RUNNING;
    task.startTime = new Date();

    logger.agent(`开始执行任务: ${task.id}, 类型: ${task.type}`);

    try {
      // 执行任务处理函数
      const result = await task.handler(task.params);

      task.status = TASK_STATUS.SUCCESS;
      task.result = result;
      task.endTime = new Date();

      const duration = task.endTime - task.startTime;
      logger.agent(`任务执行成功: ${task.id}, 耗时: ${duration}ms`);

    } catch (error) {
      task.status = TASK_STATUS.FAILED;
      task.error = error.message;
      task.endTime = new Date();

      logger.agentError(`任务执行失败: ${task.id}, 错误: ${error.message}`);
    }

    this.executing = false;

    // 继续执行下一个任务
    this.executeNext();
  }

  /**
   * 获取任务状态
   *
   * @param {string} taskId 任务ID
   * @returns {Object} 任务状态
   */
  getTaskStatus(taskId) {
    const task = this.tasks.get(taskId);

    if (!task) {
      return { status: 'not_found' };
    }

    return {
      id: task.id,
      type: task.type,
      status: task.status,
      result: task.result,
      error: task.error,
      startTime: task.startTime,
      endTime: task.endTime,
      duration: task.endTime ? task.endTime - task.startTime : null
    };
  }

  /**
   * 获取所有任务
   *
   * @returns {Array} 任务列表
   */
  getAllTasks() {
    return Array.from(this.tasks.values()).map(task => ({
      id: task.id,
      type: task.type,
      status: task.status,
      startTime: task.startTime,
      endTime: task.endTime
    }));
  }

  /**
   * 生成任务ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清空已完成的任务
   */
  clearCompleted() {
    for (const [id, task] of this.tasks) {
      if (task.status === TASK_STATUS.SUCCESS || task.status === TASK_STATUS.FAILED) {
        this.tasks.delete(id);
      }
    }
  }
}

// 导出单例
module.exports = new Scheduler();
module.exports.Scheduler = Scheduler;
module.exports.TASK_STATUS = TASK_STATUS;
module.exports.TASK_TYPES = TASK_TYPES;
