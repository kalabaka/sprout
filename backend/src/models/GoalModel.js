/**
 * 学习目标数据模型
 */
const { pool } = require('../config/database');

class GoalModel {
  /**
   * 创建学习目标
   */
  static async create(userId, { title, description }) {
    const sql = `
      INSERT INTO goal (user_id, title, description, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    const [result] = await pool.execute(sql, [userId, title, description]);
    return result.insertId;
  }

  /**
   * 获取用户的所有学习目标
   */
  static async findByUserId(userId) {
    const sql = `
      SELECT id, title, description, created_at
      FROM goal
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(sql, [userId]);
    return rows;
  }

  /**
   * 根据ID查找学习目标
   */
  static async findById(id, userId) {
    const sql = 'SELECT * FROM goal WHERE id = ? AND user_id = ?';
    const [rows] = await pool.execute(sql, [id, userId]);
    return rows[0];
  }

  /**
   * 删除学习目标
   */
  static async delete(id, userId) {
    const sql = 'DELETE FROM goal WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(sql, [id, userId]);
    return result.affectedRows > 0;
  }

  /**
   * 更新学习目标
   */
  static async update(id, userId, { title, description }) {
    const sql = 'UPDATE goal SET title = ?, description = ? WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(sql, [title, description, id, userId]);
    return result.affectedRows > 0;
  }
}

module.exports = GoalModel;