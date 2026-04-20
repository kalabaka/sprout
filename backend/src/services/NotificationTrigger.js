/**
 * 通知触发器
 * 在各个业务场景中触发通知
 */
const NotificationService = require('../services/NotificationService');
const NotificationSettingModel = require('../models/NotificationSettingModel');
const LearningTaskModel = require('../models/LearningTaskModel');
const logger = require('../config/logger');

class NotificationTrigger {
  static async triggerTaskReminder(userId, taskId, taskName, scheduledDate) {
    try {
      const reminderHours = await NotificationSettingModel.getTaskReminderHours(userId);
      const scheduled = new Date(scheduledDate);
      const reminderTime = new Date(scheduled.getTime() - reminderHours * 60 * 60 * 1000);
      const now = new Date();

      if (reminderTime <= now) {
        await NotificationService.createTaskReminder(userId, taskId, taskName, scheduledDate);
        logger.info(`任务提醒已发送: taskId=${taskId}, userId=${userId}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`任务提醒发送失败: ${error.message}`);
      return false;
    }
  }

  static async triggerExamReminder(userId, examId, examName, examDate) {
    try {
      const reminderDays = await NotificationSettingModel.getExamReminderDays(userId);
      const exam = new Date(examDate);
      const reminderDate = new Date(exam);
      reminderDate.setDate(reminderDate.getDate() - reminderDays);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (reminderDate <= now) {
        await NotificationService.createExamReminder(userId, examId, examName, examDate);
        logger.info(`考试提醒已发送: examId=${examId}, userId=${userId}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`考试提醒发送失败: ${error.message}`);
      return false;
    }
  }

  static async triggerCheckinReminder(userId) {
    try {
      const reminderTime = await NotificationSettingModel.getCheckinReminderTime(userId);
      const now = new Date();
      const [hours, minutes] = reminderTime.split(':').map(Number);
      const reminderDate = new Date(now);
      reminderDate.setHours(hours, minutes, 0, 0);

      const diffMinutes = Math.abs(now - reminderDate) / (1000 * 60);

      if (diffMinutes <= 5) {
        await NotificationService.createCheckinReminder(userId);
        logger.info(`打卡提醒已发送: userId=${userId}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`打卡提醒发送失败: ${error.message}`);
      return false;
    }
  }

  static async triggerPlanWarning(userId, planId, planName, riskLevel, reason) {
    try {
      if (riskLevel.includes('高') || riskLevel.includes('中')) {
        await NotificationService.createPlanWarning(userId, planId, planName, reason);
        logger.info(`计划预警已发送: planId=${planId}, userId=${userId}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`计划预警发送失败: ${error.message}`);
      return false;
    }
  }

  static async triggerAchievement(userId, achievementName, achievementDesc) {
    try {
      await NotificationService.createAchievementNotification(userId, achievementName, achievementDesc);
      logger.info(`成就通知已发送: userId=${userId}, achievement=${achievementName}`);
      return true;
    } catch (error) {
      logger.error(`成就通知发送失败: ${error.message}`);
      return false;
    }
  }

  static async triggerSystemNotification(userId, title, content) {
    try {
      await NotificationService.createSystemNotification(userId, title, content);
      logger.info(`系统通知已发送: userId=${userId}`);
      return true;
    } catch (error) {
      logger.error(`系统通知发送失败: ${error.message}`);
      return false;
    }
  }
}

module.exports = NotificationTrigger;
