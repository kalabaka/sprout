/**
 * 通知控制器
 */
const NotificationService = require('../services/NotificationService');
const NotificationSettingModel = require('../models/NotificationSettingModel');
const { success, fail, paginated } = require('../utils/response');
const logger = require('../config/logger');

class NotificationController {
  static async getNotifications(req, res) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 20, unreadOnly = false, type } = req.query;

      const result = await NotificationService.getUserNotifications(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        unreadOnly: unreadOnly === 'true',
        type
      });

      const unreadCount = await NotificationService.getUnreadCount(userId);

      const list = result.items.map(item => ({
        id: item.id,
        type: item.type,
        title: item.title,
        content: item.content,
        link_type: item.link_type,
        link_id: item.link_id,
        is_read: Boolean(item.is_read),
        read_at: item.read_at,
        created_at: item.created_at
      }));

      res.json(success({
        list,
        total: list.length,
        unreadCount,
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: result.pagination.hasMore
      }));
    } catch (error) {
      logger.error('获取通知列表失败:', error.message);
      res.status(500).json(fail(error.message));
    }
  }

  static async getUnreadCount(req, res) {
    try {
      const userId = req.user.userId;
      const count = await NotificationService.getUnreadCount(userId);

      res.json(success({ count }));
    } catch (error) {
      logger.error('获取未读数量失败:', error.message);
      res.status(500).json(fail(error.message));
    }
  }

  static async markAsRead(req, res) {
    try {
      const userId = req.user.userId;
      const notificationId = req.params.id;

      const success_result = await NotificationService.markAsRead(notificationId, userId);

      if (!success_result) {
        return res.status(404).json(fail('通知不存在或无权操作'));
      }

      res.json(success(null, '已标记为已读'));
    } catch (error) {
      logger.error('标记已读失败:', error.message);
      res.status(500).json(fail(error.message));
    }
  }

  static async markAllAsRead(req, res) {
    try {
      const userId = req.user.userId;
      const count = await NotificationService.markAllAsRead(userId);

      res.json(success({ count }, `已将 ${count} 条通知标记为已读`));
    } catch (error) {
      logger.error('全部标记已读失败:', error.message);
      res.status(500).json(fail(error.message));
    }
  }

  static async deleteNotification(req, res) {
    try {
      const userId = req.user.userId;
      const notificationId = req.params.id;

      const success_result = await NotificationService.deleteNotification(notificationId, userId);

      if (!success_result) {
        return res.status(404).json(fail('通知不存在或无权操作'));
      }

      res.json(success(null, '删除成功'));
    } catch (error) {
      logger.error('删除通知失败:', error.message);
      res.status(500).json(fail(error.message));
    }
  }

  static async getSettings(req, res) {
    try {
      const userId = req.user.userId;
      const settings = await NotificationSettingModel.getOrCreate(userId);

      res.json(success(settings));
    } catch (error) {
      logger.error('获取通知设置失败:', error.message);
      res.status(500).json(fail(error.message));
    }
  }

  static async updateSettings(req, res) {
    try {
      const userId = req.user.userId;
      const settings = req.body;

      const success_result = await NotificationSettingModel.update(userId, settings);

      if (!success_result) {
        return res.status(400).json(fail('更新失败'));
      }

      const updatedSettings = await NotificationSettingModel.getByUserId(userId);

      res.json(success(updatedSettings, '设置已更新'));
    } catch (error) {
      logger.error('更新通知设置失败:', error.message);
      res.status(500).json(fail(error.message));
    }
  }
}

module.exports = NotificationController;
