const { pool } = require('../config/database');

function formatLocalDate(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

class StudySessionModel {
  static async create(data) {
    const sql = `
      INSERT INTO study_sessions 
      (user_id, task_id, course_id, start_time, status, planned_minutes, mode, task_name, course_name, plan_id)
      VALUES (?, ?, ?, NOW(), 'active', ?, 'countup', ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
      data.userId,
      data.taskId || null,
      data.courseId || null,
      data.plannedMinutes || 60,
      data.taskName || null,
      data.courseName || null,
      data.planId || null
    ]);
    return result.insertId;
  }

  static async findActiveByUser(userId) {
    const sql = `
      SELECT s.*, t.name as task_name, t.plan_id, c.name as course_name
      FROM study_sessions s
      LEFT JOIN learning_tasks t ON s.task_id = t.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.user_id = ? AND s.status IN ('active', 'paused')
      ORDER BY s.start_time DESC
      LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [userId]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async stop(sessionId, userId, actualMinutes) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [sessionRows] = await connection.execute(
        'SELECT * FROM study_sessions WHERE id = ? AND user_id = ?',
        [sessionId, userId]
      );
      const session = sessionRows[0];
      
      if (!session) {
        await connection.rollback();
        return false;
      }

      await connection.execute(
        `UPDATE study_sessions 
         SET end_time = NOW(), duration_minutes = ?, status = 'completed'
         WHERE id = ? AND user_id = ?`,
        [actualMinutes, sessionId, userId]
      );

      const today = formatLocalDate();
      
      const [statsRows] = await connection.execute(
        'SELECT * FROM user_study_stats WHERE user_id = ? AND stat_date = ?',
        [userId, today]
      );

      if (statsRows.length > 0) {
        await connection.execute(
          `UPDATE user_study_stats 
           SET total_minutes = total_minutes + ?, 
               session_count = session_count + 1,
               updated_at = NOW()
           WHERE user_id = ? AND stat_date = ?`,
          [actualMinutes, userId, today]
        );
      } else {
        await connection.execute(
          `INSERT INTO user_study_stats (user_id, stat_date, total_minutes, session_count, created_at, updated_at)
           VALUES (?, ?, ?, 1, NOW(), NOW())`,
          [userId, today, actualMinutes]
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async pause(sessionId, userId) {
    const sql = `
      UPDATE study_sessions 
      SET paused_at = NOW(), status = 'paused'
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await pool.execute(sql, [sessionId, userId]);
    return result.affectedRows > 0;
  }

  static async resume(sessionId, userId) {
    const sql = `
      UPDATE study_sessions 
      SET paused_at = NULL, status = 'active'
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await pool.execute(sql, [sessionId, userId]);
    return result.affectedRows > 0;
  }

  static async findById(sessionId, userId) {
    const sql = 'SELECT * FROM study_sessions WHERE id = ? AND user_id = ?';
    const [rows] = await pool.execute(sql, [sessionId, userId]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async getByUser(userId, options = {}) {
    let sql = `
      SELECT s.*, t.name as task_name, c.name as course_name
      FROM study_sessions s
      LEFT JOIN learning_tasks t ON s.task_id = t.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.user_id = ?
    `;
    const params = [userId];

    if (options.status) {
      sql += ' AND s.status = ?';
      params.push(options.status);
    }

    sql += ' ORDER BY s.start_time DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  static async getTodayStats(userId) {
    const sql = `
      SELECT 
        COUNT(*) as session_count,
        COALESCE(SUM(duration_minutes), 0) as total_minutes
      FROM study_sessions 
      WHERE user_id = ? AND DATE(start_time) = CURDATE() AND status = 'completed'
    `;
    const [rows] = await pool.execute(sql, [userId]);
    return rows[0];
  }
}

module.exports = StudySessionModel;
