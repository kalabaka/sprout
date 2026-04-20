/**
 * 通知数据模型
 * 对应表: notifications
 */
const { pool } = require('../config/database');

const NOTIFICATION_TYPES = {
  TASK_REMINDER: 'task_reminder',
  EXAM_REMINDER: 'exam_reminder',
  CHECKIN_REMINDER: 'checkin_reminder',
  PLAN_WARNING: 'plan_warning',
  ACHIEVEMENT: 'achievement',
  SYSTEM: 'system'
};

const LINK_TYPES = {
  TASK: 'task',
  EXAM: 'exam',
  PLAN: 'plan',
  ACHIEVEMENT: 'achievement',
  DASHBOARD: 'dashboard'
};

class NotificationModel {
  static async create(userId, { type, title, content, linkType, linkId }) {
    const sql = `
      INSERT INTO notifications (user_id, type, title, content, link_type, link_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
      userId,
      type,
      title,
      content,
      linkType || null,
      linkId || null
    ]);
    return result.insertId;
  }

  static async findByUserId(userId, options = {}) {
    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];

    if (options.unreadOnly) {
      sql += ' AND is_read = FALSE';
    }

    if (options.type) {
      sql += ' AND type = ?';
      params.push(options.type);
    }

    sql += ' ORDER BY created_at DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  static async findById(notificationId, userId) {
    const sql = 'SELECT * FROM notifications WHERE id = ? AND user_id = ?';
    const [rows] = await pool.execute(sql, [notificationId, userId]);
    return rows[0] || null;
  }

  static async markAsRead(notificationId, userId) {
    const sql = `
      UPDATE notifications 
      SET is_read = TRUE, read_at = NOW() 
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await pool.execute(sql, [notificationId, userId]);
    return result.affectedRows > 0;
  }

  static async markAllAsRead(userId) {
    const sql = `
      UPDATE notifications 
      SET is_read = TRUE, read_at = NOW() 
      WHERE user_id = ? AND is_read = FALSE
    `;
    const [result] = await pool.execute(sql, [userId]);
    return result.affectedRows;
  }

  static async getUnreadCount(userId) {
    const sql = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE';
    const [rows] = await pool.execute(sql, [userId]);
    return rows[0].count;
  }

  static async delete(notificationId, userId) {
    const sql = 'DELETE FROM notifications WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(sql, [notificationId, userId]);
    return result.affectedRows > 0;
  }

  static async deleteOldNotifications(userId, daysOld = 30) {
    const sql = `
      DELETE FROM notifications 
      WHERE user_id = ? AND is_read = TRUE AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    const [result] = await pool.execute(sql, [userId, daysOld]);
    return result.affectedRows;
  }

  static async createTaskReminder(userId, taskId, taskName, scheduledDate) {
    return this.create(userId, {
      type: NOTIFICATION_TYPES.TASK_REMINDER,
      title: '任务提醒',
      content: `您有一个任务「${taskName}」即将到期，请及时完成。`,
      linkType: LINK_TYPES.TASK,
      linkId: taskId
    });
  }

  static async createExamReminder(userId, examId, examName, examDate) {
    return this.create(userId, {
      type: NOTIFICATION_TYPES.EXAM_REMINDER,
      title: '考试提醒',
      content: `考试「${examName}」将于 ${examDate} 举行，请做好准备。`,
      linkType: LINK_TYPES.EXAM,
      linkId: examId
    });
  }

  static async createCheckinReminder(userId) {
    return this.create(userId, {
      type: NOTIFICATION_TYPES.CHECKIN_REMINDER,
      title: '打卡提醒',
      content: '今日学习打卡时间到了，快来记录你的学习进度吧！',
      linkType: LINK_TYPES.DASHBOARD
    });
  }

  static async createPlanWarning(userId, planId, planName, reason) {
    return this.create(userId, {
      type: NOTIFICATION_TYPES.PLAN_WARNING,
      title: '计划预警',
      content: `学习计划「${planName}」存在风险：${reason}`,
      linkType: LINK_TYPES.PLAN,
      linkId: planId
    });
  }

  static async createAchievementNotification(userId, achievementName, achievementDesc) {
    return this.create(userId, {
      type: NOTIFICATION_TYPES.ACHIEVEMENT,
      title: '成就解锁',
      content: `恭喜您解锁成就「${achievementName}」！${achievementDesc}`,
      linkType: LINK_TYPES.ACHIEVEMENT
    });
  }

  static async createSystemNotification(userId, title, content) {
    return this.create(userId, {
      type: NOTIFICATION_TYPES.SYSTEM,
      title,
      content,
      linkType: LINK_TYPES.DASHBOARD
    });
  }
}

module.exports = NotificationModel;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
module.exports.LINK_TYPES = LINK_TYPES;
