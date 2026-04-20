/**
 * 智能问答控制器
 */
const QAService = require('../services/QAService');
const { success, fail } = require('../utils/response');
const logger = require('../config/logger');

class QAController {
  /**
   * POST /api/qa/ask
   * 发送问题
   */
  static async ask(req, res) {
    try {
      const userId = req.user.userId;
      const { taskId, question } = req.body;

      if (!question) {
        return res.status(400).json(fail('问题不能为空'));
      }

      logger.info('QA', `用户${userId}提问: ${question}`);

      const result = await QAService.ask(userId, { taskId, question });

      res.json(success(result, '获取回答成功'));
    } catch (error) {
      logger.error('问答失败:', error.message);
      res.status(500).json(fail('问答失败'));
    }
  }

  /**
   * GET /api/qa/history/:taskId
   * 获取历史记录
   */
  static async getHistory(req, res) {
    try {
      const userId = req.user.userId;
      const taskId = parseInt(req.params.taskId);

      if (!taskId) {
        return res.status(400).json(fail('无效的任务ID'));
      }

      const history = await QAService.getHistory(userId, taskId);

      res.json(success(history, '获取成功'));
    } catch (error) {
      logger.error('获取历史失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  /**
   * DELETE /api/qa/history/:taskId
   * 清除历史记录
   */
  static async clearHistory(req, res) {
    try {
      const userId = req.user.userId;
      const taskId = parseInt(req.params.taskId);

      if (!taskId) {
        return res.status(400).json(fail('无效的任务ID'));
      }

      await QAService.clearHistory(userId, taskId);

      res.json(success(null, '历史已清除'));
    } catch (error) {
      logger.error('清除历史失败:', error.message);
      res.status(500).json(fail('清除失败'));
    }
  }
}

module.exports = QAController;
