/**
 * 学习记录数据模型
 * 对应表: learning_records
 */
const { pool } = require('../config/database');

class LearningRecordModel {
  // 创建学习记录
  static async create(userId, { taskId, recordType, duration, score, notes }) {
    const sql = `
      INSERT INTO learning_records (user_id, task_id, record_type, duration, score, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
      userId,
      taskId || null,
      recordType,
      duration || 0,
      score || null,
      notes || ''
    ]);
    return result.insertId;
  }

  // 获取用户的学习记录
  static async findByUserId(userId, options = {}) {
    let sql = 'SELECT * FROM learning_records WHERE user_id = ?';
    const params = [userId];

    if (options.taskId) {
      sql += ' AND task_id = ?';
      params.push(options.taskId);
    }

    if (options.recordType) {
      sql += ' AND record_type = ?';
      params.push(options.recordType);
    }

    sql += ' ORDER BY created_at DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  // 获取近期的学习记录（用于进度分析）
  static async findRecent(userId, days = 7) {
    const sql = `
      SELECT * FROM learning_records
      WHERE user_id = ?
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(sql, [userId, days]);
    return rows;
  }

  // 按日期统计数据
  static async getDailyStats(userId, days = 7) {
    const sql = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as taskCount,
        SUM(duration) as totalDuration,
        AVG(score) as avgScore
      FROM learning_records
      WHERE user_id = ?
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `;
    const [rows] = await pool.execute(sql, [userId, days]);
    return rows;
  }

  // 获取任务的学习记录
  static async findByTaskId(taskId, userId) {
    const sql = `
      SELECT * FROM learning_records
      WHERE task_id = ? AND user_id = ?
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(sql, [taskId, userId]);
    return rows;
  }

  // 删除记录
  static async delete(id, userId) {
    const sql = 'DELETE FROM learning_records WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(sql, [id, userId]);
    return result.affectedRows > 0;
  }

  // 清理旧记录（保留90天）
  static async cleanup(days = 90) {
    const sql = `
      DELETE FROM learning_records
      WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    const [result] = await pool.execute(sql, [days]);
    return result.affectedRows;
  }

  static async createQuizRecord(userId, { taskId, knowledgePointId, score, isPassed }) {
    const sql = `
      INSERT INTO learning_records (user_id, task_id, knowledge_point_id, record_type, score, quiz_passed)
      VALUES (?, ?, ?, 'quiz', ?, ?)
    `;
    const [result] = await pool.execute(sql, [
      userId,
      taskId || null,
      knowledgePointId || null,
      score,
      isPassed ? 1 : 0
    ]);
    return result.insertId;
  }

  static async findByUserAndKnowledgePoint(userId, knowledgePointId) {
    const sql = `
      SELECT * FROM learning_records
      WHERE user_id = ? AND knowledge_point_id = ? AND record_type = 'quiz'
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(sql, [userId, knowledgePointId]);
    return rows;
  }

  static async getLatestQuizRecord(userId, knowledgePointId) {
    const sql = `
      SELECT * FROM learning_records
      WHERE user_id = ? AND knowledge_point_id = ? AND record_type = 'quiz'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [userId, knowledgePointId]);
    return rows.length > 0 ? rows[0] : null;
  }
}

module.exports = LearningRecordModel;