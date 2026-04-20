/**
 * 通知定时任务调度器
 * 负责定时扫描并发送各类提醒通知
 */
const cron = require('node-cron');
const { pool } = require('../config/database');
const NotificationService = require('./NotificationService');
const NotificationSettingModel = require('../models/NotificationSettingModel');
const logger = require('../config/logger');

class NotificationScheduler {
  static tasks = {};

  static start() {
    logger.info('通知调度器启动');
    this.startTaskReminderJob();
    this.startExamReminderJob();
    this.startCheckinReminderJob();
    this.startCleanupJob();
  }

  static stop() {
    Object.values(this.tasks).forEach(task => {
      if (task) task.stop();
    });
    this.tasks = {};
    logger.info('通知调度器停止');
  }

  static startTaskReminderJob() {
    this.tasks.taskReminder = cron.schedule('0 * * * *', async () => {
      logger.info('执行任务提醒扫描...');
      try {
        const sql = `
          SELECT t.id, t.user_id, t.name, t.planned_date, t.plan_id
          FROM learning_tasks t
          JOIN notification_settings ns ON t.user_id = ns.user_id
          WHERE t.status = 0
            AND t.planned_date IS NOT NULL
            AND ns.task_reminder_enabled = TRUE
            AND t.planned_date BETWEEN NOW() 
              AND DATE_ADD(NOW(), INTERVAL ns.task_reminder_hours HOUR)
        `;
        const [tasks] = await pool.execute(sql);

        for (const task of tasks) {
          await NotificationService.createTaskReminder(
            task.user_id,
            task.id,
            task.name,
            task.planned_date
          );
        }

        logger.info(`任务提醒扫描完成: ${tasks.length} 条`);
      } catch (error) {
        logger.error(`任务提醒扫描失败: ${error.message}`);
      }
    });
  }

  static startExamReminderJob() {
    this.tasks.examReminder = cron.schedule('0 8 * * *', async () => {
      logger.info('执行考试提醒扫描...');
      try {
        const reminderDays = [1, 3, 7];

        for (const days of reminderDays) {
          const sql = `
            SELECT e.id, e.user_id, e.name, e.exam_date, e.course_id,
                   ns.exam_reminder_days as user_setting_days
            FROM exams e
            JOIN notification_settings ns ON e.user_id = ns.user_id
            WHERE ns.exam_reminder_enabled = TRUE
              AND e.exam_date = DATE(DATE_ADD(CURDATE(), INTERVAL ? DAY))
              AND ? <= ns.exam_reminder_days
          `;
          const [exams] = await pool.execute(sql, [days, days]);

          for (const exam of exams) {
            await NotificationService.createExamReminder(
              exam.user_id,
              exam.id,
              exam.name,
              exam.exam_date
            );
          }

          logger.info(`考试提醒扫描(${days}天前): ${exams.length} 条`);
        }
      } catch (error) {
        logger.error(`考试提醒扫描失败: ${error.message}`);
      }
    });
  }

  static startCheckinReminderJob() {
    this.tasks.checkinReminder = cron.schedule('0,30 * * * *', async () => {
      logger.info('执行打卡提醒扫描...');
      try {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const sql = `
          SELECT user_id
          FROM notification_settings
          WHERE checkin_reminder_enabled = TRUE
            AND TIME(checkin_reminder_time) = TIME(?)
        `;
        const [users] = await pool.execute(sql, [currentTime]);

        for (const user of users) {
          const checkinSql = `
            SELECT id FROM study_sessions 
            WHERE user_id = ? AND DATE(start_time) = CURDATE()
          `;
          const [sessions] = await pool.execute(checkinSql, [user.user_id]);

          if (sessions.length === 0) {
            await NotificationService.createCheckinReminder(user.user_id);
          }
        }

        logger.info(`打卡提醒扫描完成: ${users.length} 条`);
      } catch (error) {
        logger.error(`打卡提醒扫描失败: ${error.message}`);
      }
    });
  }

  static startCleanupJob() {
    this.tasks.cleanup = cron.schedule('0 3 * * *', async () => {
      logger.info('执行通知清理...');
      try {
        const sql = `
          SELECT DISTINCT user_id FROM notifications
          WHERE is_read = TRUE 
            AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        `;
        const [users] = await pool.execute(sql);

        for (const user of users) {
          await NotificationService.deleteOldNotifications(user.user_id, 30);
        }

        logger.info(`通知清理完成: ${users.length} 个用户`);
      } catch (error) {
        logger.error(`通知清理失败: ${error.message}`);
      }
    });
  }
}

module.exports = NotificationScheduler;
