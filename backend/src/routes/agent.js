/**
 * 智能体API路由
 * 核心Agent统一调度入口
 */
const express = require('express');
const router = express.Router();
const { InterfaceAgent, CoreAgent, REQUEST_TYPES } = require('../agents');
const { success, fail } = require('../utils/response');
const logger = require('../config/logger');
const authMiddleware = require('../middleware/auth');

// ============================================
// 新主流程API
// ============================================

// 用户提交学习目标
router.post('/goal/submit', async (req, res) => {
  try {
    const { userId, goal, options = {} } = req.body;

    if (!userId || !goal) {
      return res.status(400).json(fail('缺少必要参数'));
    }

    logger.info('agent', `目标提交: 用户${userId}, 目标="${goal}"`);

    const result = await CoreAgent.handleRequest(REQUEST_TYPES.GOAL_SUBMISSION, {
      userId,
      goal,
      options
    });

    res.json(result);
  } catch (error) {
    logger.error('目标提交接口失败:', error.message);
    res.status(500).json(fail(error.message));
  }
});

// 用户完成任务
router.post('/task/complete', async (req, res) => {
  try {
    const { userId, taskId, actualTime, plannedTime = 60, selfScore = 80 } = req.body;

    if (!userId || !taskId) {
      return res.status(400).json(fail('缺少必要参数'));
    }

    logger.info('agent', `任务完成: 用户${userId}, 任务${taskId}, 用时${actualTime}分钟, 得分${selfScore}`);

    const result = await CoreAgent.handleRequest(REQUEST_TYPES.TASK_COMPLETION, {
      userId,
      taskId,
      actualTime,
      plannedTime,
      selfScore
    });

    // 高风险时返回特殊状态码
    if (result.status === 'needIntervention') {
      return res.status(200).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('任务完成接口失败:', error.message);
    res.status(500).json(fail(error.message));
  }
});

// 获取干预日志
router.get('/interventions', async (req, res) => {
  try {
    const userId = req.user?.userId || req.query.userId;
    const InterventionLogModel = require('../models/InterventionLogModel');

    if (!userId) {
      return res.status(400).json(fail('缺少用户ID'));
    }

    const logs = await InterventionLogModel.findByUserId(userId, { limit: 20 });
    res.json(success(logs, '获取成功'));
  } catch (error) {
    logger.error('获取干预日志失败:', error.message);
    res.status(500).json(fail(error.message));
  }
});

// 标记干预为已读
router.put('/interventions/:id/read', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const干预Id = parseInt(req.params.id);

    if (!userId || !干预Id) {
      return res.status(400).json(fail('缺少必要参数'));
    }

    const InterventionLogModel = require('../models/InterventionLogModel');
    await InterventionLogModel.markAsRead(干预Id, userId);

    res.json(success(null, '已标记为已读'));
  } catch (error) {
    logger.error('标记已读失败:', error.message);
    res.status(500).json(fail(error.message));
  }
});

// 提交干预反馈
router.post('/interventions/:id/feedback', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const interventionId = parseInt(req.params.id);
    const { feedback } = req.body;

    if (!userId || !interventionId) {
      return res.status(400).json(fail('缺少必要参数'));
    }

    if (!['helpful', 'not_helpful'].includes(feedback)) {
      return res.status(400).json(fail('无效的反馈类型'));
    }

    const InterventionLogModel = require('../models/InterventionLogModel');
    const updated = await InterventionLogModel.recordFeedback(interventionId, userId, feedback);

    if (!updated) {
      return res.status(404).json(fail('记录不存在'));
    }

    logger.info(`干预反馈: 用户${userId}, 记录${interventionId}, 反馈${feedback}`);
    res.json(success(null, '反馈已记录'));
  } catch (error) {
    logger.error('提交反馈失败:', error.message);
    res.status(500).json(fail(error.message));
  }
});

// 获取未读干预数量
router.get('/interventions/unread-count', async (req, res) => {
  try {
    const userId = req.user?.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json(fail('缺少用户ID'));
    }

    const InterventionLogModel = require('../models/InterventionLogModel');
    const count = await InterventionLogModel.getUnreadCount(userId);
    res.json(success({ count }));
  } catch (error) {
    logger.error('获取未读数量失败:', error.message);
    res.status(500).json(fail(error.message));
  }
});

// ============================================
// 辅助API（保留原有）
// ============================================

// 风险评估接口
router.post('/evaluate', async (req, res) => {
  try {
    const { timeDeviation, completionRate, score } = req.body;

    const result = await InterfaceAgent.handleRequest('evaluate', {
      timeDeviation,
      completionRate,
      score
    });

    res.json(result);
  } catch (error) {
    logger.error('评估接口失败:', error.message);
    res.status(500).json(fail(error.message));
  }
});

// 学习建议接口
router.post('/advice', async (req, res) => {
  try {
    const { riskLevel, goal, taskCount } = req.body;

    const result = await InterfaceAgent.handleRequest('advice', {
      riskLevel,
      goal,
      taskCount
    });

    res.json(result);
  } catch (error) {
    logger.error('建议接口失败:', error.message);
    res.status(500).json(fail(error.message));
  }
});

// 学习计划生成接口
router.post('/generate-plan', async (req, res) => {
  try {
    const { userId, goal, options } = req.body;

    const result = await InterfaceAgent.handleRequest('generatePlan', {
      userId,
      goal,
      options
    });

    res.json(result);
  } catch (error) {
    logger.error('计划生成接口失败:', error.message);
    res.status(500).json(fail(error.message));
  }
});

// 数据分析接口
router.post('/analyze', async (req, res) => {
  try {
    const { tasks, records } = req.body;

    const result = await InterfaceAgent.handleRequest('analyze', {
      tasks,
      records
    });

    res.json(result);
  } catch (error) {
    logger.error('分析接口失败:', error.message);
    res.status(500).json(fail(error.message));
  }
});

// 测试接口
router.post('/test', async (req, res) => {
  try {
    const { type, data } = req.body;

    const result = await CoreAgent.handleRequest(type, data || {});

    res.json(result);
  } catch (error) {
    logger.error('测试接口失败:', error.message);
    res.status(500).json(fail(error.message));
  }
});

// ============================================
// 风险评估API
// ============================================
const EvaluationController = require('../controllers/EvaluationController');

// 获取当前用户综合风险
router.get('/evaluation/current', authMiddleware, EvaluationController.getCurrentRisk);

// 获取风险趋势数据
router.get('/evaluation/trend', authMiddleware, EvaluationController.getRiskTrend);

// 获取指定计划的风险状态
router.get('/evaluation/plan/:planId', authMiddleware, EvaluationController.getPlanRisk);

// 获取详细指标数据
router.get('/evaluation/detail', authMiddleware, EvaluationController.getDetailedMetrics);

module.exports = router;