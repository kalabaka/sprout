/**
 * 重规划控制器
 * 处理动态调整学习任务的相关请求
 */
const ReplanningService = require('../services/ReplanningService');
const RegenerateService = require('../services/RegenerateService');
const LearningTaskModel = require('../models/LearningTaskModel');
const { success, fail } = require('../utils/response');
const logger = require('../config/logger');

class ReplanController {
  static async checkReplan(req, res) {
    try {
      const userId = req.user.userId;
      const planId = parseInt(req.params.id);

      if (!planId) {
        return res.status(400).json(fail('无效的计划ID'));
      }

      const result = await RegenerateService.checkReplanNeeded(planId, userId);

      res.json(success(result, result.needReplan ? '建议重新规划' : '学习进度正常'));
    } catch (error) {
      logger.error('检查重规划失败:', error.message);
      res.status(500).json(fail('检查失败'));
    }
  }

  static async executeReplan(req, res) {
    try {
      const userId = req.user.userId;
      const planId = parseInt(req.params.id);
      const { triggerReason } = req.body;

      if (!planId) {
        return res.status(400).json(fail('无效的计划ID'));
      }

      const reason = triggerReason || '用户主动触发';

      const result = await RegenerateService.regeneratePlan(planId, userId, reason);

      if (result.success) {
        logger.info('replan', `重规划成功: 用户${userId}, 计划${planId}`);
        res.json(success(result, '学习计划已重新调整'));
      } else {
        res.status(400).json(fail(result.error || '重规划失败'));
      }
    } catch (error) {
      logger.error('执行重规划失败:', error.message);
      res.status(500).json(fail('重规划失败'));
    }
  }

  static async getReplanHistory(req, res) {
    try {
      const userId = req.user.userId;
      const planId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit) || 10;

      if (!planId) {
        return res.status(400).json(fail('无效的计划ID'));
      }

      const history = await RegenerateService.getReplanHistory(planId, limit);
      const stats = await RegenerateService.getReplanStats(planId);

      res.json(success({
        history,
        stats
      }, '获取成功'));
    } catch (error) {
      logger.error('获取重规划历史失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  static async replan(req, res) {
    try {
      const userId = req.user.userId;
      const { goalId, completedTaskIds } = req.body;

      if (!goalId) {
        return res.status(400).json(fail('缺少goalId参数'));
      }

      logger.info('replan', `收到重规划请求: 用户${userId}, 目标${goalId}`);

      const result = await ReplanningService.replan(userId, goalId, completedTaskIds || []);

      if (result.success) {
        res.json(success(result, result.message));
      } else {
        res.status(500).json(fail(result.error || '重规划失败'));
      }
    } catch (error) {
      logger.error('重规划API失败:', error.message);
      res.status(500).json(fail('服务错误'));
    }
  }

  static async quickReplan(req, res) {
    try {
      const userId = req.user.userId;
      const { completedTaskIds } = req.body;

      if (!completedTaskIds || !Array.isArray(completedTaskIds)) {
        return res.status(400).json(fail('需要completedTaskIds数组'));
      }

      logger.info('replan', `快速重规划: 用户${userId}, 完成${completedTaskIds.length}个任务`);

      const result = await ReplanningService.quickReplan(userId, completedTaskIds);

      if (result.success) {
        res.json(success(result, `已重新排序${result.tasks.length}个任务`));
      } else {
        res.status(500).json(fail('重规划失败'));
      }
    } catch (error) {
      logger.error('快速重规划失败:', error.message);
      res.status(500).json(fail('服务错误'));
    }
  }

  static async getPriority(req, res) {
    try {
      const userId = req.user.userId;
      const goalId = parseInt(req.params.goalId);

      if (!goalId) {
        return res.status(400).json(fail('无效的目标ID'));
      }

      const tasks = await LearningTaskModel.findByUserId(userId, { goalId });
      const pendingTasks = tasks.filter(t => t.status === 0 || t.status === 1);

      const KnowledgeModel = require('../models/KnowledgeModel');
      const knowledgePoints = await KnowledgeModel.findAll();
      const kpMap = new Map(knowledgePoints.map(kp => [kp.id, kp]));

      const completedTaskIds = tasks.filter(t => t.status === 2).map(t => t.id);
      const completedIdsSet = new Set(completedTaskIds);

      const prioritized = await ReplanningService.prioritizeTasks(pendingTasks, kpMap, completedIdsSet);

      res.json(success({
        totalTasks: tasks.length,
        pendingTasks: prioritized.length,
        priorityList: prioritized.map((t, i) => ({
          id: t.id,
          title: t.title,
          recommendedOrder: i + 1,
          priorityScore: t.priorityScore,
          knowledgePoint: t.knowledge_point_id ? kpMap.get(t.knowledge_point_id)?.name : null,
          estimatedMinutes: t.planned_duration
        }))
      }, '获取成功'));
    } catch (error) {
      logger.error('获取优先级失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  static async updateOrder(req, res) {
    try {
      const userId = req.user.userId;
      const { taskOrders } = req.body;

      if (!taskOrders || !Array.isArray(taskOrders)) {
        return res.status(400).json(fail('需要taskOrders数组'));
      }

      for (const { taskId } of taskOrders) {
        const task = await LearningTaskModel.findById(taskId, userId);
        if (!task) {
          return res.status(404).json(fail(`任务${taskId}不存在`));
        }
      }

      logger.info('replan', `更新任务顺序: 用户${userId}, ${taskOrders.length}个任务`);

      res.json(success({ updated: taskOrders.length }, '顺序已更新'));
    } catch (error) {
      logger.error('更新顺序失败:', error.message);
      res.status(500).json(fail('更新失败'));
    }
  }
}

module.exports = ReplanController;