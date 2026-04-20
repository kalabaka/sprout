/**
 * 干预控制器
 */
const InterventionLogModel = require('../models/InterventionLogModel');
const { success, fail } = require('../utils/response');
const logger = require('../config/logger');

class InterventionController {
  static async getLogs(req, res) {
    try {
      const userId = req.user.userId;
      const { unread, limit = 20 } = req.query;

      const logs = await InterventionLogModel.findByUserId(userId, {
        unread: unread === 'true',
        limit: parseInt(limit)
      });

      res.json(success(logs));
    } catch (error) {
      logger.error('获取干预日志失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  static async getUnreadCount(req, res) {
    try {
      const userId = req.user.userId;
      const count = await InterventionLogModel.getUnreadCount(userId);
      res.json(success({ count }));
    } catch (error) {
      logger.error('获取未读数量失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  static async markAsRead(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      const updated = await InterventionLogModel.markAsRead(parseInt(id), userId);
      if (!updated) {
        return res.status(404).json(fail('记录不存在或已读'));
      }

      res.json(success(null, '已标记为已读'));
    } catch (error) {
      logger.error('标记已读失败:', error.message);
      res.status(500).json(fail('操作失败'));
    }
  }

  static async markAllAsRead(req, res) {
    try {
      const userId = req.user.userId;
      const count = await InterventionLogModel.markAllAsRead(userId);
      res.json(success({ count }, '全部标记为已读'));
    } catch (error) {
      logger.error('标记全部已读失败:', error.message);
      res.status(500).json(fail('操作失败'));
    }
  }

  static async submitFeedback(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { feedback } = req.body;

      if (!['helpful', 'not_helpful'].includes(feedback)) {
        return res.status(400).json(fail('无效的反馈类型'));
      }

      const updated = await InterventionLogModel.recordFeedback(parseInt(id), userId, feedback);
      if (!updated) {
        return res.status(404).json(fail('记录不存在'));
      }

      logger.info(`干预反馈: 用户${userId}, 记录${id}, 反馈${feedback}`);
      res.json(success(null, '反馈已记录'));
    } catch (error) {
      logger.error('提交反馈失败:', error.message);
      res.status(500).json(fail('提交失败'));
    }
  }

  static async deleteLog(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      const deleted = await InterventionLogModel.delete(parseInt(id), userId);
      if (!deleted) {
        return res.status(404).json(fail('记录不存在'));
      }

      res.json(success(null, '删除成功'));
    } catch (error) {
      logger.error('删除干预日志失败:', error.message);
      res.status(500).json(fail('删除失败'));
    }
  }
}

module.exports = InterventionController;
