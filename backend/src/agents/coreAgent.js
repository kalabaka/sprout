/**
 * Core Agent - 核心Agent（统一调度入口）
 *
 * 职责：
 * 1. 统一调度所有子Agent
 * 2. 协调数据库操作
 * 3. 异常处理与降级
 *
 * 执行流程：
 * ┌─────────────────────────────────────────┐
 * │  用户提交目标                             │
 * │  goal: "学习Python数据分析"               │
 * └────────┬────────────────────────────────┘ │
 *          │
 * ┌────────▼────────────────────────────────┐
 * │  CoreAgent.handleGoalSubmission()         │
 * │  1. PlanningAgent → 生成学习路径        │
 * │  2. PlanController → 存入数据库       │
 * │  3. EvaluationAgent → 初始评估      │
 * │  4. MotivationAgent → 低风险建议     │
 * └────────┬────────────────────────────────┘ │
 *          │
 * ┌─────────────────────────────────────────┐
 * │  返回计划 + 初始建议                    │
 * └─────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────┐
 * │  用户完成任务                             │
 * │  taskId + timeDeviation + score         │
 * └────────┬────────────────────────────────┘ │
 *          │
 * ┌────────▼────────────────────────────────┐
 * │  CoreAgent.handleTaskCompletion()      │
 * │  1. TaskController → 更新任务状态    │
 * │  2. EvaluationAgent → 风险评估       │
 * │  3. if 高风险 → MotivationAgent        │
 * │  4. InterventionLogModel → 记录日志 │
 * └────────┬────────────────────────────────┘ │
 *          │
 * ┌─────────────────────────────────────────┐
 * │  返回结果 + 干预建议（如有）              │
 * └─────────────────────────────────────────┘
 */

const PlanningAgent = require('../services/PlanningAgent');
const evaluationAgent = require('./evaluationAgent');
const motivationAgent = require('./motivationAgent');

// 数据模型
const LearningPlanModel = require('../models/LearningPlanModel');
const LearningTaskModel = require('../models/LearningTaskModel');
const InterventionLogModel = require('../models/InterventionLogModel');
const KnowledgeModel = require('../models/KnowledgeModel');

// 服务
const AnalysisService = require('../services/AnalysisService');
const logger = require('../config/logger');

/**
 * 请求类型枚举
 */
const REQUEST_TYPES = {
  GENERATE_PLAN: 'generatePlan',
  EVALUATE: 'evaluate',
  ANALYZE: 'analyze',
  ADVICE: 'advice',
  // 新增：主流程类型
  GOAL_SUBMISSION: 'goalSubmission',
  TASK_COMPLETION: 'taskCompletion'
};

/**
 * 响应状态
 */
const RESPONSE_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  NEED_INTERVENTION: 'needIntervention'
};

class CoreAgent {
  /**
   * 统一入口 - 处理所有请求
   *
   * @param {string} type 请求类型
   * @param {Object} data 请求数据
   * @returns {Object} 处理结果
   */
  static async handleRequest(type, data) {
    console.log('\n========================================');
    console.log(`[Core Agent] 收到请求: type=${type}`);
    console.log('========================================\n');

    try {
      switch (type) {
        case REQUEST_TYPES.GOAL_SUBMISSION:
          return await this.handleGoalSubmission(data);

        case REQUEST_TYPES.TASK_COMPLETION:
          return await this.handleTaskCompletion(data);

        case REQUEST_TYPES.GENERATE_PLAN:
          return await this.handleGeneratePlan(data);

        case REQUEST_TYPES.EVALUATE:
          return await this.handleEvaluate(data);

        case REQUEST_TYPES.ANALYZE:
          return await this.handleAnalyze(data);

        case REQUEST_TYPES.ADVICE:
          return await this.handleAdvice(data);

        default:
          throw new Error(`不支持的请求类型: ${type}`);
      }
    } catch (error) {
      console.error('[Core Agent] 处理失败:', error.message);
      return this.buildResponse(RESPONSE_STATUS.ERROR, null, error.message);
    }
  }

  // ============================================
  // 主流程1: 用户提交目标
  // ============================================

  /**
   * 处理目标提交（核心主流程）
   *
   * 用户提交学习目标 → PlanningAgent生成学习路径 → 存入DB → 返回计划
   *
   * @param {Object} data 提交数据
   * @param {number} data.userId 用户ID
   * @param {string} data.goal 学习目标
   * @param {Object} data.options 选项
   * @returns {Object} 处理结果
   */
  static async handleGoalSubmission(data) {
    const { userId, goal, options = {} } = data;

    logger.agent('CoreAgent: 处理目标提交');

    try {
      console.log('[CoreAgent] Step 1: 调用 PlanningAgent...');
      
      const planParams = {
        userId: userId,
        target: goal,
        goalType: 'skill',
        subject: this.extractSubjectFromGoal(goal),
        userLevel: options.userLevel || 'beginner',
        masteredTopicIds: [],
        learningPace: options.learningPace || 'normal',
        dailyStudyMinutes: options.dailyStudyMinutes || 60,
        availableWeekdays: options.availableWeekdays || [1, 2, 3, 4, 5, 6, 7]
      };
      
      const planResult = await PlanningAgent.generatePlan(planParams);
      
      const tasks = [];
      if (planResult.plan && planResult.plan.phases) {
        planResult.plan.phases.forEach(phase => {
          phase.tasks.forEach(task => {
            tasks.push({
              name: task.name,
              level: task.difficulty || 1,
              duration: task.estimatedMinutes || 60,
              scheduledDate: task.scheduledDate,
              stage: phase.name,
              knowledgePointId: task.knowledgePointId
            });
          });
        });
      }

      if (!tasks || tasks.length === 0) {
        throw new Error('生成学习路径失败');
      }

      console.log(`[CoreAgent] 生成 ${tasks.length} 个学习任务`);

      let planId = null;
      try {
        console.log('[CoreAgent] Step 2: 存入数据库...');
        planId = await LearningPlanModel.create(userId, {
          name: goal,
          description: planResult.explanation,
          target_date: options.targetDate || null
        });
        console.log(`[CoreAgent] 学习计划已创建, planId=${planId}`);
      } catch (dbError) {
        console.warn('[CoreAgent] 数据库写入失败，使用演示模式:', dbError.message);
        planId = -1;
      }

      const savedTasks = [];
      for (const task of tasks) {
        try {
          if (planId > 0) {
            const taskId = await LearningTaskModel.create(userId, {
              planId,
              name: task.title || task.name,
              description: task.description || '',
              plannedDuration: task.estimatedMinutes || task.duration || 60,
              difficulty: task.difficulty || 2,
              stage: task.stage || '基础阶段',
              knowledgePointId: task.knowledgePointId || null
            });
            savedTasks.push({ ...task, id: taskId });
          } else {
            savedTasks.push({ ...task, id: Math.floor(Math.random() * 10000) });
          }
        } catch (taskError) {
          console.warn('[CoreAgent] 任务存储失败:', taskError.message);
          savedTasks.push({ ...task, id: Math.floor(Math.random() * 10000) });
        }
      }

      // Step 4: 调用 EvaluationAgent 评估初始风险
      console.log('[CoreAgent] Step 3: 初始风险评估...');
      const initialEvaluation = evaluationAgent.evaluateRisk({
        timeDeviation: 0,
        completionRate: 1,
        score: 100
      });

      // Step 5: 根据初始评估调用 MotivationAgent
      console.log('[CoreAgent] Step 4: 生成动机建议...');
      const intervention = motivationAgent.generateMotivation(initialEvaluation.level);

      // 对于初始计划，提取友好建议
      const friendlySuggestions = intervention.suggestions?.slice(0, 3) || [];

      // 汇总结果
      const result = {
        userId,
        goal,
        planId,
        tasks: savedTasks,
        taskCount: savedTasks.length,
        stageSummary: this.getStageSummary(savedTasks),
        initialEvaluation,
        intervention: {
          level: intervention.level,
          message: intervention.quote,
          suggestions: friendlySuggestions,
          needAttention: initialEvaluation.level !== '低风险'
        },
        explanation: planResult.explanation
      };

      console.log(`[CoreAgent] 目标提交处理完成, 风险等级: ${initialEvaluation.level}\n`);

      return this.buildResponse(RESPONSE_STATUS.SUCCESS, result, '学习计划生成成功');
    } catch (error) {
      console.error('[CoreAgent] 目标提交处理失败:', error.message);
      return this.buildResponse(RESPONSE_STATUS.ERROR, null, error.message);
    }
  }

  // ============================================
  // 主流程2: 用户完成任务
  // ============================================

  /**
   * 处理任务完成（核心主流程）
   *
   * 用户完成任务 → EvaluationAgent评估 → 高风险则生成干预 → 存入日志 → 返回
   *
   * @param {Object} data 任务数据
   * @param {number} data.userId 用户ID
   * @param {number} data.taskId 任务ID
   * @param {number} data.actualTime 实际用时(分钟)
   * @param {number} data.plannedTime 计划用时(分钟)
   * @param {number} data.selfScore 自评得分(0-100)
   * @returns {Object} 处理结果
   */
  static async handleTaskCompletion(data) {
    const { userId, taskId, actualTime, plannedTime, selfScore = 80 } = data;

    logger.agent('CoreAgent: 处理任务完成');

    try {
      // Step 1: 计算时间偏差
      const timeDeviation = plannedTime
        ? (actualTime - plannedTime) / plannedTime
        : (actualTime - 60) / 60;  // 默认60分钟为基准

      console.log(`[CoreAgent] 时间偏差: ${(timeDeviation * 100).toFixed(1)}%`);
      console.log(`[CoreAgent] 自评得分: ${selfScore}`);

      // Step 2: 调用 EvaluationAgent 评估风险
      console.log('[CoreAgent] Step 1: 风险评估...');
      const evaluation = evaluationAgent.evaluateRisk({
        timeDeviation,
        completionRate: 1,  // 当前任务完成
        score: selfScore
      });

      console.log(`[CoreAgent] 风险得分: ${evaluation.score}, 等级: ${evaluation.level}`);

      // Step 3: 如果高风险，生成干预建议
      let interventionLog = null;
      let interventionData = null;

      if (evaluation.level.includes('高') || evaluation.level.includes('中')) {
        console.log(`[CoreAgent] Step 2: 需要干预, 等级=${evaluation.level}`);

        const interventionType = evaluation.strategyKey || (evaluation.level.includes('高') ? 'warning' : 'suggestion');
        
        const inCooldown = await InterventionLogModel.isInCooldown(userId, interventionType);
        
        if (inCooldown) {
          const lastSent = await InterventionLogModel.getLastSentTime(userId, interventionType);
          console.log(`[CoreAgent] 干预冷却中，跳过推送。上次推送: ${lastSent}`);
        } else {
          interventionData = motivationAgent.generateMotivation({
            level: evaluation.level,
            strategyKey: evaluation.strategyKey
          });

          if (evaluation.level.includes('高')) {
            try {
              console.log('[CoreAgent] Step 3: 记录干预日志...');
              const logId = await InterventionLogModel.create(userId, {
                interventionType: interventionType,
                title: `${evaluation.level} - 学习干预建议`,
                content: interventionData.arcsMotivation?.message || interventionData.suggestions?.[0] || '建议调整学习计划',
                triggerEvent: `task_complete_${taskId}`,
                strategyIndex: interventionData.arcsMotivation?.strategyIndex
              });
              console.log(`[CoreAgent] 干预日志已记录, logId=${logId}`);
              interventionLog = { id: logId, saved: true };
            } catch (logError) {
              console.warn('[CoreAgent] 干预日志记录失败:', logError.message);
              interventionLog = { id: null, saved: false };
            }
          }
        }
      } else {
        console.log('[CoreAgent] 风险等级低，无需干预');
      }

      // Step 4: 更新任务状态（如果taskId有效）
      if (taskId && taskId > 0) {
        try {
          console.log('[CoreAgent] Step 4: 更新任务状态...');
          await LearningTaskModel.updateStatus(taskId, userId, 2, {
            actualTime,
            completedAt: new Date()
          });
          console.log('[CoreAgent] 任务状态已更新');
        } catch (updateError) {
          console.warn('[CoreAgent] 任务状态更新失败:', updateError.message);
        }
      }

      // 汇总结果
      const result = {
        taskId,
        evaluation: {
          score: evaluation.score,
          level: evaluation.level,
          reason: evaluation.reason
        },
        intervention: interventionData ? {
          level: evaluation.level,
          message: interventionData.arcsMotivation?.message || interventionData.suggestions?.[0] || '继续保持！',
          suggestions: interventionData.suggestions?.slice(0, 3) || [],
          strategyKey: evaluation.strategyKey
        } : null,
        needsAttention: evaluation.level.includes('高') || evaluation.level.includes('中')
      };

      // 根据风险级别返回不同状态码
      const status = evaluation.level.includes('高')
        ? RESPONSE_STATUS.NEED_INTERVENTION
        : RESPONSE_STATUS.SUCCESS;

      console.log(`[CoreAgent] ���务完成处理完成, 需要关注: ${result.needsAttention}\n`);

      return this.buildResponse(status, result, '任务完成');
    } catch (error) {
      console.error('[CoreAgent] 任务完成处理失败:', error.message);
      return this.buildResponse(RESPONSE_STATUS.ERROR, null, error.message);
    }
  }

  // ============================================
  // 辅助流程（保留原有）
  // ============================================

  /**
   * 处理学习计划生成（辅助流程）
   */
  static async handleGeneratePlan(data) {
    const { userId, goal, options = {} } = data;

    logger.agent('CoreAgent: 开始生成学习计划');

    // 调用主流程
    return await this.handleGoalSubmission({ userId, goal, options });
  }

  /**
   * 处理学习风险评估（辅助流程）
   */
  static async handleEvaluate(data) {
    const { timeDeviation, completionRate, score, strategyKey } = data;

    logger.agent('CoreAgent: 开始评估学习风险');

    // Step 1: 调用 EvaluationAgent 计算风险
    const evaluation = evaluationAgent.evaluateRisk({
      timeDeviation,
      completionRate,
      score
    });

    // Step 2: 调用 MotivationAgent 生成干预建议
    const intervention = motivationAgent.generateMotivation({
      level: evaluation.level,
      strategyKey: strategyKey || evaluation.strategyKey
    });

    // Step 3: 获取改进建议
    const suggestions = evaluationAgent.getSuggestions(evaluation.level);

    const result = {
      metrics: { timeDeviation, completionRate, score },
      evaluation,
      intervention: {
        level: intervention.level,
        message: intervention.arcsMotivation?.message || intervention.quote,
        suggestions: intervention.suggestions?.slice(0, 3) || []
      },
      suggestions
    };

    return this.buildResponse(RESPONSE_STATUS.SUCCESS, result, '风险评估完成');
  }

  /**
   * 处理学习数据分析（辅助流程）
   */
  static async handleAnalyze(data) {
    const { tasks = [], records = [] } = data;

    logger.agent('CoreAgent: 开始分析学习数据');

    const report = AnalysisService.generateReport({ tasks, records });
    const chartConfig = AnalysisService.getChartConfig(report);
    const evaluation = evaluationAgent.evaluateRisk({
      timeDeviation: null,
      completionRate: report.completionRate,
      score: report.efficiency
    });

    const result = {
      statistics: {
        completionRate: report.completionRate,
        completionRateText: report.completionRateText,
        totalTime: report.totalTime,
        totalTimeText: report.totalTimeText,
        efficiency: report.efficiency
      },
      trend: report.trend,
      taskStats: report.taskStats,
      difficultyDistribution: report.difficultyDistribution,
      chartConfig,
      riskEvaluation: evaluation
    };

    return this.buildResponse(RESPONSE_STATUS.SUCCESS, result, '数据分析完成');
  }

  /**
   * 处理学习建议生成（辅助流程）
   */
  static async handleAdvice(data) {
    const { riskLevel, goal, taskCount } = data;

    logger.agent('CoreAgent: 开始生成学习建议');

    const intervention = motivationAgent.generateMotivation(riskLevel || '低风险');

    const result = {
      riskLevel: riskLevel || '低风险',
      intervention: {
        level: intervention.level,
        message: intervention.quote,
        suggestions: intervention.suggestions?.slice(0, 3) || []
      },
      topicSuggestions: [],
      generalAdvice: this.getGeneralAdvice(riskLevel, taskCount)
    };

    return this.buildResponse(RESPONSE_STATUS.SUCCESS, result, '建议��成��成');
  }

  // ============================================
  // 辅助函数
  // ============================================

  /**
   * 构建统一响应格式
   */
  static buildResponse(status, data, message) {
    return {
      status,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取阶段统计
   */
  static getStageSummary(tasks) {
    const summary = {
      '基础阶段': 0,
      '进阶阶段': 0,
      '应用阶段': 0
    };

    tasks.forEach(task => {
      if (task.stage && summary.hasOwnProperty(task.stage)) {
        summary[task.stage]++;
      }
    });

    return summary;
  }

  /**
   * 获取一般性建议
   */
  static getGeneralAdvice(riskLevel, taskCount) {
    const adviceMap = {
      '低风险': ['继续保持良好的学习节奏', '可以尝试挑战更高难度', '定期复盘巩固'],
      '中风险': ['适当增加学习时间', '关注薄弱环节', '寻求帮助'],
      '高风险': ['立即调整学习计划', '降低目标难度', '寻求专业指导']
    };

    const levelKey = riskLevel?.includes('高') ? '高风险' :
                     riskLevel?.includes('低') ? '低风险' : '中风险';

    return {
      riskLevel: levelKey,
      taskCount,
      tips: adviceMap[levelKey] || adviceMap['中风险']
    };
  }

  static extractSubjectFromGoal(goal) {
    const SUBJECT_KEYWORDS = {
      python: 'python', java: 'java', javascript: 'javascript', js: 'javascript',
      c: 'c', cpp: 'cpp', 'c++': 'cpp', html: 'html', css: 'css',
      vue: 'vue', react: 'react', nodejs: 'nodejs', 'node.js': 'nodejs',
      spring: 'spring', django: 'django', mysql: 'mysql', mongodb: 'mongodb',
      linux: 'linux', git: 'git', docker: 'docker',
      'machine learning': 'machine_learning', 'deep learning': 'deep_learning',
      ai: 'machine_learning', ml: 'machine_learning', dl: 'deep_learning'
    };
    const goalLower = goal.toLowerCase();
    const keywords = Object.keys(SUBJECT_KEYWORDS).sort((a, b) => b.length - a.length);
    for (const keyword of keywords) {
      if (goalLower.includes(keyword)) {
        return SUBJECT_KEYWORDS[keyword];
      }
    }
    return 'default';
  }
}

// 导出
module.exports = CoreAgent;
module.exports.REQUEST_TYPES = REQUEST_TYPES;
module.exports.RESPONSE_STATUS = RESPONSE_STATUS;