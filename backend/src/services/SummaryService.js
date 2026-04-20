/**
 * 汇总统计服务 - 数据库性能优化
 *
 * 功能：
 * 1. 更新计划任务汇总数据
 * 2. 批量更新所有计划的汇总
 * 3. 提供快速查询接口
 */

const { pool } = require('../config/database');

class SummaryService {
  /**
   * 更新单个计划的汇总数据
   * @param {number} planId 计划ID
   */
  static async updatePlanSummary(planId) {
    const sql = `
      INSERT INTO plan_summary (
        plan_id,
        total_tasks,
        completed_tasks,
        in_progress_tasks,
        pending_tasks,
        total_estimated_time,
        total_actual_time,
        completion_rate
      )
      SELECT
        ? as plan_id,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as pending_tasks,
        COALESCE(SUM(estimated_time), 0) as total_estimated_time,
        COALESCE(SUM(actual_time), 0) as total_actual_time,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)
          ELSE 0
        END as completion_rate
      FROM learning_tasks
      WHERE plan_id = ?
      ON DUPLICATE KEY UPDATE
        total_tasks = VALUES(total_tasks),
        completed_tasks = VALUES(completed_tasks),
        in_progress_tasks = VALUES(in_progress_tasks),
        pending_tasks = VALUES(pending_tasks),
        total_estimated_time = VALUES(total_estimated_time),
        total_actual_time = VALUES(total_actual_time),
        completion_rate = VALUES(completion_rate)
    `;

    await pool.execute(sql, [planId, planId]);
  }

  /**
   * 批量更新多个计划的汇总数据
   * @param {number[]} planIds 计划ID数组
   */
  static async batchUpdatePlanSummary(planIds) {
    if (!planIds || planIds.length === 0) return;

    for (const planId of planIds) {
      await this.updatePlanSummary(planId);
    }
  }

  /**
   * 更新所有计划的汇总数据
   */
  static async updateAllPlanSummary() {
    const [plans] = await pool.execute('SELECT id FROM learning_plan');
    const planIds = plans.map(p => p.id);
    await this.batchUpdatePlanSummary(planIds);
  }

  /**
   * 获取计划汇总数据
   * @param {number} planId 计划ID
   */
  static async getPlanSummary(planId) {
    const [rows] = await pool.execute(
      'SELECT * FROM plan_summary WHERE plan_id = ?',
      [planId]
    );
    return rows[0] || null;
  }

  /**
   * 获取多个计划的汇总数据
   * @param {number[]} planIds 计划ID数组
   */
  static async getPlanSummaries(planIds) {
    if (!planIds || planIds.length === 0) return [];

    const placeholders = planIds.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT * FROM plan_summary WHERE plan_id IN (${placeholders})`,
      planIds
    );
    return rows;
  }

  /**
   * 任务状态变更时自动更新汇总
   * @param {number} planId 计划ID
   */
  static async onTaskStatusChange(planId) {
    // 异步更新，不阻塞主流程
    setImmediate(() => {
      this.updatePlanSummary(planId).catch(err => {
        console.error('更新计划汇总失败:', err.message);
      });
    });
  }
}

module.exports = SummaryService;
