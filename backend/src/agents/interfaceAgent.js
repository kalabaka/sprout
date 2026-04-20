/**
 * Interface Agent - 接口Agent（门面Agent）
 *
 * 职责：
 * 1. 参数校验
 * 2. 请求分发
 * 3. 统一响应格式
 *
 * 不负责具体业务逻辑，只做"入口"和"出口"
 *
 * 执行流程：
 * ┌─────────────────┐
 * │  用户请求        │
 * └────────┬────────┘
 *          │
 * ┌────────▼────────┐
 * │ InterfaceAgent  │ ← 参数校验 + 请求分发
 * └────────┬────────┘
 *          │
 * ┌────────▼────────┐
 * │   CoreAgent     │ ← 业务处理
 * └─────────────────┘
 */

const coreAgent = require('./coreAgent');
const scheduler = require('./scheduler');
const logger = require('../config/logger');

/**
 * 请求类型定义
 */
const REQUEST_TYPES = {
  GENERATE_PLAN: 'generatePlan',   // 生成学习计划
  EVALUATE: 'evaluate',           // 学习风险评估
  ANALYZE: 'analyze',            // 学习数据分析
  ADVICE: 'advice'               // 学习建议生成
};

class InterfaceAgent {
  /**
   * 统一入口 - 处理所有请求
   *
   * @param {string} type 请求类型
   * @param {Object} params 请求参数
   * @returns {Object} 处理结果
   */
  static async handleRequest(type, params) {
    logger.agent(`InterfaceAgent 收到请求: ${type}`);

    // 1. 参数校验
    const validation = this.validateRequest(type, params);
    if (!validation.valid) {
      return this.buildResponse(false, null, validation.message);
    }

    // 2. 请求分发
    try {
      const result = await this.dispatch(type, params);
      return this.buildResponse(true, result, '处理成功');
    } catch (error) {
      logger.agentError(`InterfaceAgent 处理失败: ${error.message}`);
      return this.buildResponse(false, null, error.message);
    }
  }

  /**
   * 参数校验
   * 校验必填参数和参数格式
   */
  static validateRequest(type, params) {
    const validators = {
      [REQUEST_TYPES.GENERATE_PLAN]: () => {
        if (!params.goal) {
          return { valid: false, message: '缺少参数: goal' };
        }
        return { valid: true };
      },
      [REQUEST_TYPES.EVALUATE]: () => {
        const { timeDeviation, completionRate, score } = params;
        if (timeDeviation === undefined && completionRate === undefined && score === undefined) {
          return { valid: false, message: '至少需要提供一个评估参数' };
        }
        return { valid: true };
      },
      [REQUEST_TYPES.ANALYZE]: () => {
        if (!params.tasks && !params.records) {
          return { valid: false, message: '缺少分析数据: tasks 或 records' };
        }
        return { valid: true };
      },
      [REQUEST_TYPES.ADVICE]: () => {
        if (!params.riskLevel) {
          return { valid: false, message: '缺少参数: riskLevel' };
        }
        return { valid: true };
      }
    };

    const validator = validators[type];
    if (!validator) {
      return { valid: false, message: `不支持的请求类型: ${type}` };
    }

    return validator();
  }

  /**
   * 请求分发
   * 将请求分发给CoreAgent处理
   */
  static async dispatch(type, params) {
    switch (type) {
      case REQUEST_TYPES.GENERATE_PLAN:
        return await this.handleGeneratePlan(params);

      case REQUEST_TYPES.EVALUATE:
        return await this.handleEvaluate(params);

      case REQUEST_TYPES.ANALYZE:
        return await this.handleAnalyze(params);

      case REQUEST_TYPES.ADVICE:
        return await this.handleAdvice(params);

      default:
        throw new Error(`不支持的请求类型: ${type}`);
    }
  }

  /**
   * 处理学习计划生成请求
   */
  static async handleGeneratePlan(params) {
    const { userId, goal, options } = params;

    logger.agent(`分发学习计划生成请求: goal=${goal}`);

    const result = await coreAgent.handleRequest(REQUEST_TYPES.GENERATE_PLAN, {
      userId,
      goal,
      options
    });

    return result;
  }

  /**
   * 处理学习风险评估请求
   */
  static async handleEvaluate(params) {
    const { timeDeviation, completionRate, score } = params;

    logger.agent(`分发学习评估请求`);

    const result = await coreAgent.handleRequest(REQUEST_TYPES.EVALUATE, {
      timeDeviation,
      completionRate,
      score
    });

    return result;
  }

  /**
   * 处理学习数据分析请求
   */
  static async handleAnalyze(params) {
    const { tasks, records } = params;

    logger.agent(`分发学习数据分析请求`);

    const result = await coreAgent.handleRequest(REQUEST_TYPES.ANALYZE, {
      tasks,
      records
    });

    return result;
  }

  /**
   * 处理学习建议请求
   */
  static async handleAdvice(params) {
    const { riskLevel, goal, taskCount } = params;

    logger.agent(`分发学习建议请求: riskLevel=${riskLevel}`);

    const result = await coreAgent.handleRequest(REQUEST_TYPES.ADVICE, {
      riskLevel,
      goal,
      taskCount
    });

    return result;
  }

  /**
   * 构建响应
   */
  static buildResponse(success, data, message) {
    return {
      success,
      code: success ? 200 : 400,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  // ============================================
  // 异步任务接口（使用调度器）
  // ============================================

  /**
   * 异步提交任务
   * 适用于耗时较长的任务
   */
  static submitTask(type, params) {
    const taskId = scheduler.addTask(
      type,
      params,
      async (taskParams) => {
        return await this.dispatch(type, taskParams);
      }
    );

    return {
      success: true,
      message: '任务已提交',
      taskId
    };
  }

  /**
   * 获取任务状态
   */
  static getTaskStatus(taskId) {
    return scheduler.getTaskStatus(taskId);
  }
}

// 导出
module.exports = InterfaceAgent;
module.exports.REQUEST_TYPES = REQUEST_TYPES;
