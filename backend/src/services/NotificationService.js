/**
 * 通知服务层
 * 负责通知的创建、查询、状态管理
 */
const NotificationModel = require('../models/NotificationModel');
const NotificationSettingModel = require('../models/NotificationSettingModel');
const logger = require('../config/logger');

class NotificationService {
  static CACHE_KEYS = {
    UNREAD_COUNT: 'notification_unread:',
    USER_NOTIFICATIONS: 'notification_list:'
  };

  static CACHE_TTL = {
    UNREAD_COUNT: 60000,
    USER_NOTIFICATIONS: 30000
  };

  static async createNotification(userId, { type, title, content, linkType, linkId }) {
    const isEnabled = await NotificationSettingModel.isEnabled(userId, type);
    if (!isEnabled) {
      logger.info(`通知类型 ${type} 已被用户 ${userId} 禁用，跳过创建`);
      return null;
    }

    const notificationId = await NotificationModel.create(userId, {
      type,
      title,
      content,
      linkType,
      linkId
    });

    this.invalidateCache(userId);

    logger.info(`创建通知: userId=${userId}, type=${type}, id=${notificationId}`);

    return notificationId;
  }

  static async createBatchNotifications(userIds, { type, title, content, linkType, linkId }) {
    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        const id = await this.createNotification(userId, {
          type,
          title,
          content,
          linkType,
          linkId
        });
        if (id) {
          results.push({ userId, notificationId: id });
        }
      } catch (error) {
        errors.push({ userId, error: error.message });
        logger.error(`批量创建通知失败: userId=${userId}, error=${error.message}`);
      }
    }

    logger.info(`批量创建通知完成: 成功=${results.length}, 失败=${errors.length}`);

    return { results, errors };
  }

  static async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const offset = (page - 1) * limit;

    const notifications = await NotificationModel.findByUserId(userId, {
      unreadOnly,
      limit: limit + 1,
      type: options.type
    });

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, limit) : notifications;

    return {
      items,
      pagination: {
        page,
        limit,
        hasMore
      }
    };
  }

  static async markAsRead(notificationId, userId) {
    const success = await NotificationModel.markAsRead(notificationId, userId);

    if (success) {
      this.invalidateCache(userId);
      logger.info(`通知已标记已读: id=${notificationId}, userId=${userId}`);
    }

    return success;
  }

  static async markAllAsRead(userId) {
    const count = await NotificationModel.markAllAsRead(userId);

    if (count > 0) {
      this.invalidateCache(userId);
      logger.info(`全部通知已标记已读: userId=${userId}, count=${count}`);
    }

    return count;
  }

  static async getUnreadCount(userId) {
    return NotificationModel.getUnreadCount(userId);
  }

  static async deleteNotification(notificationId, userId) {
    const success = await NotificationModel.delete(notificationId, userId);

    if (success) {
      this.invalidateCache(userId);
      logger.info(`通知已删除: id=${notificationId}, userId=${userId}`);
    }

    return success;
  }

  static async deleteOldNotifications(userId, daysOld = 30) {
    const count = await NotificationModel.deleteOldNotifications(userId, daysOld);

    if (count > 0) {
      logger.info(`清理旧通知: userId=${userId}, count=${count}`);
    }

    return count;
  }

  static invalidateCache(userId) {
    const { cache } = require('./CacheService');
    cache.delete(this.CACHE_KEYS.UNREAD_COUNT + userId);
    cache.delete(this.CACHE_KEYS.USER_NOTIFICATIONS + userId);
  }

  static async createTaskReminder(userId, taskId, taskName, scheduledDate) {
    return this.createNotification(userId, {
      type: NotificationModel.NOTIFICATION_TYPES.TASK_REMINDER,
      title: '任务提醒',
      content: `您有一个任务「${taskName}」即将到期，请及时完成。`,
      linkType: NotificationModel.LINK_TYPES.TASK,
      linkId: taskId
    });
  }

  static async createExamReminder(userId, examId, examName, examDate) {
    return this.createNotification(userId, {
      type: NotificationModel.NOTIFICATION_TYPES.EXAM_REMINDER,
      title: '考试提醒',
      content: `考试「${examName}」将于 ${examDate} 举行，请做好准备。`,
      linkType: NotificationModel.LINK_TYPES.EXAM,
      linkId: examId
    });
  }

  static async createCheckinReminder(userId) {
    return this.createNotification(userId, {
      type: NotificationModel.NOTIFICATION_TYPES.CHECKIN_REMINDER,
      title: '打卡提醒',
      content: '今日学习打卡时间到了，快来记录你的学习进度吧！',
      linkType: NotificationModel.LINK_TYPES.DASHBOARD
    });
  }

  static async createPlanWarning(userId, planId, planName, reason) {
    return this.createNotification(userId, {
      type: NotificationModel.NOTIFICATION_TYPES.PLAN_WARNING,
      title: '计划预警',
      content: `学习计划「${planName}」存在风险：${reason}`,
      linkType: NotificationModel.LINK_TYPES.PLAN,
      linkId: planId
    });
  }

  static async createAchievementNotification(userId, achievementName, achievementDesc) {
    return this.createNotification(userId, {
      type: NotificationModel.NOTIFICATION_TYPES.ACHIEVEMENT,
      title: '成就解锁',
      content: `恭喜您解锁成就「${achievementName}」！${achievementDesc}`,
      linkType: NotificationModel.LINK_TYPES.ACHIEVEMENT
    });
  }

  static async createSystemNotification(userId, title, content) {
    return this.createNotification(userId, {
      type: NotificationModel.NOTIFICATION_TYPES.SYSTEM,
      title,
      content,
      linkType: NotificationModel.LINK_TYPES.DASHBOARD
    });
  }

  static async broadcastSystemNotification(userIds, title, content) {
    return this.createBatchNotifications(userIds, {
      type: NotificationModel.NOTIFICATION_TYPES.SYSTEM,
      title,
      content,
      linkType: NotificationModel.LINK_TYPES.DASHBOARD
    });
  }
}

module.exports = NotificationService;
