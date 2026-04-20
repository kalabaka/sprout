/**
 * 用户通知设置数据模型
 * 对应表: notification_settings
 */
const { pool } = require('../config/database');

const DEFAULT_SETTINGS = {
  task_reminder_enabled: true,
  exam_reminder_enabled: true,
  checkin_reminder_enabled: true,
  plan_warning_enabled: true,
  achievement_enabled: true,
  system_enabled: true,
  task_reminder_hours: 2,
  exam_reminder_days: 3,
  checkin_reminder_time: '20:00:00'
};

class NotificationSettingModel {
  static async getOrCreate(userId) {
    let settings = await this.getByUserId(userId);
    if (!settings) {
      await this.createDefault(userId);
      settings = await this.getByUserId(userId);
    }
    return settings;
  }

  static async getByUserId(userId) {
    const sql = 'SELECT * FROM notification_settings WHERE user_id = ?';
    const [rows] = await pool.execute(sql, [userId]);
    if (rows[0]) {
      return this.formatSettings(rows[0]);
    }
    return null;
  }

  static async createDefault(userId) {
    const sql = `
      INSERT INTO notification_settings (user_id)
      VALUES (?)
    `;
    const [result] = await pool.execute(sql, [userId]);
    return result.insertId;
  }

  static async update(userId, settings) {
    const fields = [];
    const values = [];

    const fieldMap = {
      taskReminderEnabled: 'task_reminder_enabled',
      examReminderEnabled: 'exam_reminder_enabled',
      checkinReminderEnabled: 'checkin_reminder_enabled',
      planWarningEnabled: 'plan_warning_enabled',
      achievementEnabled: 'achievement_enabled',
      systemEnabled: 'system_enabled',
      taskReminderHours: 'task_reminder_hours',
      examReminderDays: 'exam_reminder_days',
      checkinReminderTime: 'checkin_reminder_time'
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (settings[key] !== undefined) {
        fields.push(`${column} = ?`);
        values.push(settings[key]);
      }
    }

    if (fields.length === 0) return false;

    values.push(userId);
    const sql = `UPDATE notification_settings SET ${fields.join(', ')} WHERE user_id = ?`;
    const [result] = await pool.execute(sql, values);
    return result.affectedRows > 0;
  }

  static async isEnabled(userId, notificationType) {
    const settings = await this.getOrCreate(userId);
    if (!settings) return true;

    const typeToField = {
      task_reminder: 'taskReminderEnabled',
      exam_reminder: 'examReminderEnabled',
      checkin_reminder: 'checkinReminderEnabled',
      plan_warning: 'planWarningEnabled',
      achievement: 'achievementEnabled',
      system: 'systemEnabled'
    };

    const field = typeToField[notificationType];
    return field ? settings[field] : true;
  }

  static async getTaskReminderHours(userId) {
    const settings = await this.getOrCreate(userId);
    return settings?.taskReminderHours || DEFAULT_SETTINGS.task_reminder_hours;
  }

  static async getExamReminderDays(userId) {
    const settings = await this.getOrCreate(userId);
    return settings?.examReminderDays || DEFAULT_SETTINGS.exam_reminder_days;
  }

  static async getCheckinReminderTime(userId) {
    const settings = await this.getOrCreate(userId);
    return settings?.checkinReminderTime || DEFAULT_SETTINGS.checkin_reminder_time;
  }

  static formatSettings(row) {
    return {
      id: row.id,
      userId: row.user_id,
      taskReminderEnabled: Boolean(row.task_reminder_enabled),
      examReminderEnabled: Boolean(row.exam_reminder_enabled),
      checkinReminderEnabled: Boolean(row.checkin_reminder_enabled),
      planWarningEnabled: Boolean(row.plan_warning_enabled),
      achievementEnabled: Boolean(row.achievement_enabled),
      systemEnabled: Boolean(row.system_enabled),
      taskReminderHours: row.task_reminder_hours,
      examReminderDays: row.exam_reminder_days,
      checkinReminderTime: row.checkin_reminder_time,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = NotificationSettingModel;
module.exports.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
