/**
 * 重规划日志数据模型
 * 对应表: plan_replan_logs
 */
const { pool } = require('../config/database');

class ReplanLogModel {
  static async create(data) {
    const sql = `
      INSERT INTO plan_replan_logs 
      (plan_id, trigger_reason, before_total_tasks, after_total_tasks, adjusted_dates)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
      data.planId,
      data.triggerReason,
      data.beforeTasks,
      data.afterTasks,
      JSON.stringify(data.adjustedDates || {})
    ]);
    return result.insertId;
  }

  static async findByPlanId(planId, options = {}) {
    let sql = 'SELECT * FROM plan_replan_logs WHERE plan_id = ? ORDER BY created_at DESC';
    const params = [planId];

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  static async getLatest(planId) {
    const sql = `
      SELECT * FROM plan_replan_logs 
      WHERE plan_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [planId]);
    return rows.length > 0 ? rows[0] : null;
  }
}

module.exports = ReplanLogModel;
