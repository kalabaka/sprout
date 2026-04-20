const StudySessionModel = require('../models/StudySessionModel');
const LearningTaskModel = require('../models/LearningTaskModel');
const LearningPlanModel = require('../models/LearningPlanModel');
const { success, fail } = require('../utils/response');
const logger = require('../config/logger');

class StudySessionController {
  static async start(req, res) {
    try {
      const userId = req.user.userId;
      const { taskId, taskName, courseName, planId, plannedMinutes } = req.body;

      logger.info(`开始学习会话请求: userId=${userId}, taskId=${taskId}, taskName=${taskName}, planId=${planId}`);

      if (!taskId) {
        logger.warn(`任务ID为空: userId=${userId}, body=${JSON.stringify(req.body)}`);
        return res.status(400).json(fail('任务ID不能为空'));
      }

      const task = await LearningTaskModel.findById(taskId, userId);
      if (!task) {
        return res.status(404).json(fail('任务不存在'));
      }

      const plan = await LearningPlanModel.findById(task.plan_id, userId);
      if (plan && plan.status === 'paused') {
        return res.status(400).json(fail('计划已暂停，请先恢复计划后再开始任务'));
      }

      const activeSession = await StudySessionModel.findActiveByUser(userId);
      if (activeSession) {
        logger.warn(`用户已有进行中的任务: userId=${userId}, activeSessionId=${activeSession.id}`);
        return res.status(400).json(fail('已有进行中的学习任务，请先结束当前任务'));
      }

      const sessionId = await StudySessionModel.create({
        userId,
        taskId,
        taskName,
        courseName,
        planId: planId || task.plan_id,
        plannedMinutes: plannedMinutes || 60
      });

      logger.info(`开始学习会话成功: 用户${userId}, 任务${taskId}, 会话${sessionId}`);

      res.json(success({ sessionId }, '开始计时'));
    } catch (error) {
      logger.error('开始学习会话失败:', error.message);
      res.status(500).json(fail('开始计时失败'));
    }
  }

  static async stop(req, res) {
    try {
      const userId = req.user.userId;
      const { sessionId, actualMinutes } = req.body;

      if (!sessionId) {
        return res.status(400).json(fail('会话ID不能为空'));
      }

      const session = await StudySessionModel.findById(sessionId, userId);
      if (!session) {
        return res.status(404).json(fail('会话不存在'));
      }

      if (session.status !== 'active') {
        return res.status(400).json(fail('该会话已结束'));
      }

      const stopped = await StudySessionModel.stop(sessionId, userId, actualMinutes || 0);

      if (stopped) {
        logger.info(`结束学习会话: 用户${userId}, 会话${sessionId}, 时长${actualMinutes}分钟`);
        res.json(success({ actualMinutes }, '学习记录已保存'));
      } else {
        res.status(500).json(fail('保存失败'));
      }
    } catch (error) {
      logger.error('结束学习会话失败:', error.message);
      res.status(500).json(fail('保存学习记录失败'));
    }
  }

  static async getActive(req, res) {
    try {
      const userId = req.user.userId;

      const session = await StudySessionModel.findActiveByUser(userId);

      if (session) {
        const now = new Date();
        const startTime = new Date(session.start_time);
        const elapsedSeconds = Math.floor((now - startTime) / 1000);

        res.json(success({
          ...session,
          taskId: session.task_id,
          taskName: session.task_name || '',
          courseName: session.course_name || '',
          planId: session.plan_id,
          startTime: session.start_time,
          elapsedSeconds
        }));
      } else {
        res.json(success(null));
      }
    } catch (error) {
      logger.error('获取活跃会话失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  static async getHistory(req, res) {
    try {
      const userId = req.user.userId;
      const limit = parseInt(req.query.limit) || 20;

      const sessions = await StudySessionModel.getByUser(userId, { limit });

      res.json(success(sessions));
    } catch (error) {
      logger.error('获取学习记录失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  static async getTodayStats(req, res) {
    try {
      const userId = req.user.userId;

      const stats = await StudySessionModel.getTodayStats(userId);

      res.json(success(stats));
    } catch (error) {
      logger.error('获取今日统计失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }
}

module.exports = StudySessionController;
