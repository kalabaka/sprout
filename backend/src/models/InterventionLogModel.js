/**
 * 动机干预日志数据模型
 * 对应表: intervention_logs
 */
const { pool } = require('../config/database');

const COOLDOWN_HOURS = {
  warning: 6,
  suggestion: 24,
  motivation: 12,
  encouragement: 8
};

class InterventionLogModel {
  static async create(userId, { interventionType, title, content, triggerEvent, strategyIndex }) {
    const sql = `
      INSERT INTO intervention_logs (user_id, intervention_type, title, content, trigger_event, strategy_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
      userId,
      interventionType,
      title,
      content,
      triggerEvent || '',
      strategyIndex ?? null
    ]);
    return result.insertId;
  }

  static async findByUserId(userId, options = {}) {
    let sql = 'SELECT * FROM intervention_logs WHERE user_id = ?';
    const params = [userId];

    if (options.unread) {
      sql += ' AND read_at IS NULL';
    }

    sql += ' ORDER BY sent_at DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  static async markAsRead(id, userId) {
    const sql = `
      UPDATE intervention_logs
      SET read_at = NOW()
      WHERE id = ? AND user_id = ? AND read_at IS NULL
    `;
    const [result] = await pool.execute(sql, [id, userId]);
    return result.affectedRows > 0;
  }

  static async markAllAsRead(userId) {
    const sql = `
      UPDATE intervention_logs
      SET read_at = NOW()
      WHERE user_id = ? AND read_at IS NULL
    `;
    const [result] = await pool.execute(sql, [userId]);
    return result.affectedRows;
  }

  static async getUnreadCount(userId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM intervention_logs
      WHERE user_id = ? AND read_at IS NULL
    `;
    const [rows] = await pool.execute(sql, [userId]);
    return rows[0].count;
  }

  static async recordEffectiveness(id, userId, { effectivenessScore, userResponse }) {
    const sql = `
      UPDATE intervention_logs
      SET effectiveness_score = ?, user_response = ?
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await pool.execute(sql, [
      effectivenessScore,
      userResponse,
      id,
      userId
    ]);
    return result.affectedRows > 0;
  }

  static async recordFeedback(id, userId, feedback) {
    const sql = `
      UPDATE intervention_logs
      SET feedback = ?, feedback_at = NOW()
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await pool.execute(sql, [feedback, id, userId]);
    return result.affectedRows > 0;
  }

  static async getLastStrategyIndex(userId, interventionType) {
    const sql = `
      SELECT strategy_index FROM intervention_logs
      WHERE user_id = ? AND intervention_type = ? AND strategy_index IS NOT NULL
      ORDER BY sent_at DESC
      LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [userId, interventionType]);
    return rows.length > 0 ? rows[0].strategy_index : -1;
  }

  static async isInCooldown(userId, interventionType) {
    const cooldownHours = COOLDOWN_HOURS[interventionType] || 12;
    const sql = `
      SELECT sent_at FROM intervention_logs
      WHERE user_id = ? AND intervention_type = ?
      ORDER BY sent_at DESC
      LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [userId, interventionType]);
    
    if (rows.length === 0) return false;
    
    const lastSent = new Date(rows[0].sent_at);
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    return (Date.now() - lastSent.getTime()) < cooldownMs;
  }

  static async getLastSentTime(userId, interventionType) {
    const sql = `
      SELECT sent_at FROM intervention_logs
      WHERE user_id = ? AND intervention_type = ?
      ORDER BY sent_at DESC
      LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [userId, interventionType]);
    return rows.length > 0 ? rows[0].sent_at : null;
  }

  static async delete(id, userId) {
    const sql = 'DELETE FROM intervention_logs WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(sql, [id, userId]);
    return result.affectedRows > 0;
  }

  static async cleanup(days = 30) {
    const sql = `
      DELETE FROM intervention_logs
      WHERE sent_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        AND read_at IS NOT NULL
    `;
    const [result] = await pool.execute(sql, [days]);
    return result.affectedRows;
  }

  static async recordFailure(userId, knowledgePointId, taskId, score) {
    const sql = `
      INSERT INTO knowledge_failures (user_id, knowledge_point_id, task_id, score, failed_at)
      VALUES (?, ?, ?, ?, NOW())
    `;
    const [result] = await pool.execute(sql, [userId, knowledgePointId, taskId, score]);
    return result.insertId;
  }

  static async getConsecutiveFailures(userId, knowledgePointId, limit = 3) {
    const sql = `
      SELECT * FROM knowledge_failures
      WHERE user_id = ? AND knowledge_point_id = ?
      ORDER BY failed_at DESC
      LIMIT ?
    `;
    const [rows] = await pool.execute(sql, [userId, knowledgePointId, limit]);
    return rows;
  }

  static async checkConsecutiveFailures(userId, knowledgePointId, threshold = 3) {
    const failures = await this.getConsecutiveFailures(userId, knowledgePointId, threshold);
    return failures.length >= threshold;
  }

  static async clearFailures(userId, knowledgePointId) {
    const sql = `
      DELETE FROM knowledge_failures
      WHERE user_id = ? AND knowledge_point_id = ?
    `;
    const [result] = await pool.execute(sql, [userId, knowledgePointId]);
    return result.affectedRows;
  }

  static async getTotalFailures(userId, days = 7) {
    const sql = `
      SELECT COUNT(*) as count
      FROM knowledge_failures
      WHERE user_id = ? AND failed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    const [rows] = await pool.execute(sql, [userId, days]);
    return rows[0].count;
  }

  static async getRecentFailures(userId, days = 7, limit = 10) {
    const sql = `
      SELECT kf.*, kp.name as knowledge_point_name
      FROM knowledge_failures kf
      LEFT JOIN knowledge_points kp ON kf.knowledge_point_id = kp.id
      WHERE kf.user_id = ? AND kf.failed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY kf.failed_at DESC
      LIMIT ?
    `;
    const [rows] = await pool.execute(sql, [userId, days, limit]);
    return rows;
  }
}

module.exports = InterventionLogModel;