/**
 * 任务控制器
 */
const LearningTaskModel = require('../models/LearningTaskModel');
const LearningPlanModel = require('../models/LearningPlanModel');
const SummaryService = require('../services/SummaryService');
const { success, fail } = require('../utils/response');
const logger = require('../config/logger');

function formatLocalDate(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const d = new Date(dateStr);
    return formatLocalDate(d);
  }
  if (dateStr instanceof Date) {
    return formatLocalDate(dateStr);
  }
  return dateStr;
}

class TaskController {
  /**
   * 获取任务列表
   * GET /api/task/:planId
   */
  static async getTasks(req, res) {
    try {
      const userId = req.user.userId;
      const { planId } = req.params;

      const tasks = await LearningTaskModel.findByPlanId(planId, userId);

      res.json(success(tasks));
    } catch (error) {
      logger.error('获取任务列表失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  /**
   * 开始任务
   * POST /api/task/:id/start
   */
  static async startTask(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      const task = await LearningTaskModel.findById(id, userId);
      if (!task) {
        return res.status(404).json(fail('任务不存在'));
      }

      const plan = await LearningPlanModel.findById(task.plan_id, userId);
      if (plan && plan.status === 'paused') {
        return res.status(400).json(fail('计划已暂停，请先恢复计划后再开始任务'));
      }

      if (task.planned_date) {
        const today = formatLocalDate();
        const taskDate = parseLocalDate(task.planned_date);
        if (taskDate > today) {
          return res.status(400).json(fail('不能开始未来的任务'));
        }
      }

      await LearningTaskModel.start(id, userId);
      logger.info(`开始任务: ${id}`);

      res.json(success(null, '任务已开始'));
    } catch (error) {
      logger.error('开始任务失败:', error.message);
      res.status(500).json(fail(error.message));
    }
  }

  /**
   * 暂停任务
   * POST /api/task/:id/pause
   */
  static async pauseTask(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { elapsedSeconds } = req.body;

      const result = await LearningTaskModel.pause(id, userId, elapsedSeconds);
      if (!result) {
        return res.status(400).json(fail('无法暂停任务，任务可能不在进行中'));
      }
      logger.info(`暂停任务: ${id}, 已用时: ${elapsedSeconds}秒`);

      res.json(success(null, '任务已暂停'));
    } catch (error) {
      logger.error('暂停任务失败:', error.message);
      res.status(500).json(fail(error.message));
    }
  }

  /**
   * 恢复任务
   * POST /api/task/:id/resume
   */
  static async resumeTask(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      const task = await LearningTaskModel.findById(id, userId);
      if (!task) {
        return res.status(404).json(fail('任务不存在'));
      }

      const plan = await LearningPlanModel.findById(task.plan_id, userId);
      if (plan && plan.status === 'paused') {
        return res.status(400).json(fail('计划已暂停，请先恢复计划后再继续任务'));
      }

      const result = await LearningTaskModel.resume(id, userId);
      if (!result) {
        return res.status(400).json(fail('无法恢复任务，任务可能不在暂停状态'));
      }
      logger.info(`恢复任务: ${id}`);

      res.json(success(null, '任务已恢复'));
    } catch (error) {
      logger.error('恢复任务失败:', error.message);
      res.status(500).json(fail(error.message));
    }
  }

  /**
   * 完成任务
   * POST /api/task/:id/complete
   */
  static async completeTask(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { actualDuration, actualTime, qualityScore, planId } = req.body;

      await LearningTaskModel.complete(id, userId, {
        actualDuration: actualDuration || actualTime || 0,
        selfScore: qualityScore || 0
      });

      if (planId) {
        SummaryService.onTaskStatusChange(planId);
      }

      logger.info(`完成任务: ${id}`);

      res.json(success(null, '任务已完成'));
    } catch (error) {
      logger.error('完成任务失败:', error.message);
      res.status(500).json(fail(error.message));
    }
  }

  /**
   * 获取任务统计
   * GET /api/task/:planId/stats
   */
  static async getTaskStats(req, res) {
    try {
      const userId = req.user.userId;
      const { planId } = req.params;

      const stats = await LearningTaskModel.getCompletionStats(planId, userId);

      res.json(success(stats));
    } catch (error) {
      logger.error('获取任务统计失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }
}

module.exports = TaskController;