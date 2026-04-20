const { pool } = require('../config/database');

class PlanPhaseModel {
  static async create(planId, { name, description, phaseOrder }) {
    const sql = `
      INSERT INTO plan_phases (plan_id, name, description, phase_order)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
      planId, 
      name ?? null, 
      description ?? null, 
      phaseOrder ?? 1
    ]);
    return result.insertId;
  }

  static async findByPlanId(planId) {
    const sql = `
      SELECT * FROM plan_phases
      WHERE plan_id = ?
      ORDER BY phase_order ASC
    `;
    const [rows] = await pool.execute(sql, [planId]);
    return rows;
  }

  static async findById(id) {
    const sql = 'SELECT * FROM plan_phases WHERE id = ?';
    const [rows] = await pool.execute(sql, [id]);
    return rows[0];
  }

  static async update(id, { name, description, phaseOrder }) {
    const sql = `
      UPDATE plan_phases
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          phase_order = COALESCE(?, phase_order)
      WHERE id = ?
    `;
    await pool.execute(sql, [name, description, phaseOrder, id]);
  }

  static async delete(id) {
    const sql = 'DELETE FROM plan_phases WHERE id = ?';
    const [result] = await pool.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  static async deleteByPlanId(planId) {
    const sql = 'DELETE FROM plan_phases WHERE plan_id = ?';
    const [result] = await pool.execute(sql, [planId]);
    return result.affectedRows;
  }

  static async updateTaskCount(phaseId) {
    const sql = `
      UPDATE plan_phases p
      SET 
        total_tasks = (SELECT COUNT(*) FROM learning_tasks WHERE phase_id = p.id),
        completed_tasks = (SELECT COUNT(*) FROM learning_tasks WHERE phase_id = p.id AND status = 2)
      WHERE p.id = ?
    `;
    await pool.execute(sql, [phaseId]);
  }
}

module.exports = PlanPhaseModel;
