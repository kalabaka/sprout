/**
 * 学期信息数据模型
 * 表结构: semesters(id, user_id, name, start_date, end_date, total_weeks, is_current, created_at)
 */
const { pool } = require('../config/database');

class SemesterModel {
  /**
   * 创建学期
   * @param {object} semesterData 学期数据 {user_id, name, start_date, end_date, total_weeks, is_current}
   */
  static async create(semesterData) {
    const sql = `
      INSERT INTO semesters (user_id, name, start_date, end_date, total_weeks, is_current, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    const [result] = await pool.execute(sql, [
      semesterData.user_id,
      semesterData.name,
      semesterData.start_date,
      semesterData.end_date,
      semesterData.total_weeks,
      semesterData.is_current || false
    ]);
    return result.insertId;
  }

  /**
   * 根据ID查找学期
   */
  static async findById(id) {
    const sql = 'SELECT * FROM semesters WHERE id = ?';
    const [rows] = await pool.execute(sql, [id]);
    return rows[0];
  }

  /**
   * 查找用户的所有学期
   */
  static async findByUserId(userId) {
    const sql = 'SELECT * FROM semesters WHERE user_id = ? ORDER BY created_at DESC';
    const [rows] = await pool.execute(sql, [userId]);
    return rows;
  }

  /**
   * 查找用户的当前学期
   */
  static async findCurrentByUserId(userId) {
    const sql = 'SELECT * FROM semesters WHERE user_id = ? AND is_current = TRUE LIMIT 1';
    const [rows] = await pool.execute(sql, [userId]);
    return rows[0];
  }

  /**
   * 更新学期
   */
  static async update(id, semesterData) {
    const fields = [];
    const values = [];

    if (semesterData.name !== undefined) {
      fields.push('name = ?');
      values.push(semesterData.name);
    }
    if (semesterData.start_date !== undefined) {
      fields.push('start_date = ?');
      values.push(semesterData.start_date);
    }
    if (semesterData.end_date !== undefined) {
      fields.push('end_date = ?');
      values.push(semesterData.end_date);
    }
    if (semesterData.total_weeks !== undefined) {
      fields.push('total_weeks = ?');
      values.push(semesterData.total_weeks);
    }
    if (semesterData.is_current !== undefined) {
      fields.push('is_current = ?');
      values.push(semesterData.is_current);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const sql = `UPDATE semesters SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.execute(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * 设置当前学期（将其他学期设为非当前）
   */
  static async setCurrent(userId, semesterId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        'UPDATE semesters SET is_current = FALSE WHERE user_id = ?',
        [userId]
      );

      await connection.execute(
        'UPDATE semesters SET is_current = TRUE WHERE id = ? AND user_id = ?',
        [semesterId, userId]
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 删除学期
   */
  static async delete(id) {
    const sql = 'DELETE FROM semesters WHERE id = ?';
    const [result] = await pool.execute(sql, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = SemesterModel;
