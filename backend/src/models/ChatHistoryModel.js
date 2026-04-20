/**
 * 智能问答聊天记录模型
 */
const { pool } = require('../config/database');

class ChatHistoryModel {
  /**
   * 保存聊天记录
   */
  static async create(userId, { taskId, role, content }) {
    const sql = `
      INSERT INTO chat_history (user_id, task_id, role, content)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [userId, taskId || null, role, content]);
    return result.insertId;
  }

  /**
   * 获取用户的聊天历史
   */
  static async findByUserId(userId, { taskId, limit = 10 }) {
    let sql = 'SELECT * FROM chat_history WHERE user_id = ?';
    const params = [userId];

    if (taskId) {
      sql += ' AND task_id = ?';
      params.push(taskId);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.execute(sql, params);
    return rows.reverse(); // 返回正序
  }

  /**
   * 获取特定任务下的历史记录
   */
  static async findByTaskId(userId, taskId) {
    const sql = `
      SELECT * FROM chat_history
      WHERE user_id = ? AND task_id = ?
      ORDER BY created_at ASC
    `;
    const [rows] = await pool.execute(sql, [userId, taskId]);
    return rows;
  }

  /**
   * 获取最近N条对话上下文
   */
  static async getContext(userId, taskId, limit = 5) {
    let sql = `
      SELECT * FROM chat_history
      WHERE user_id = ?
    `;
    const params = [userId];

    if (taskId) {
      sql += ' AND task_id = ?';
      params.push(taskId);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.execute(sql, params);
    return rows.reverse(); // 返回正序
  }

  /**
   * 清除历史记录
   */
  static async clear(userId, taskId) {
    let sql = 'DELETE FROM chat_history WHERE user_id = ?';
    const params = [userId];

    if (taskId) {
      sql += ' AND task_id = ?';
      params.push(taskId);
    }

    const [result] = await pool.execute(sql, params);
    return result.affectedRows;
  }
}

module.exports = ChatHistoryModel;
