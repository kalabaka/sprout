const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
  static async create(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const sql = `
      INSERT INTO user (username, password, nickname, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    const [result] = await pool.execute(sql, [
      userData.username,
      hashedPassword,
      userData.nickname || userData.username
    ]);
    return result.insertId;
  }

  static async findByUsername(username) {
    const sql = 'SELECT * FROM user WHERE username = ?';
    const [rows] = await pool.execute(sql, [username]);
    return rows[0];
  }

  static async findById(id) {
    const sql = 'SELECT id, username, nickname, role, created_at FROM user WHERE id = ?';
    const [rows] = await pool.execute(sql, [id]);
    return rows[0];
  }

  static async findByIdWithPassword(id) {
    const sql = 'SELECT * FROM user WHERE id = ?';
    const [rows] = await pool.execute(sql, [id]);
    return rows[0];
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const sql = 'UPDATE user SET password = ? WHERE id = ?';
    const [result] = await pool.execute(sql, [hashedPassword, id]);
    return result.affectedRows > 0;
  }

  static async getTotalCount() {
    const sql = 'SELECT COUNT(*) as count FROM user';
    const [rows] = await pool.execute(sql);
    return rows[0].count;
  }

  static async updateProfile(id, data) {
    const fields = [];
    const values = [];
    
    if (data.nickname !== undefined) {
      fields.push('nickname = ?');
      values.push(data.nickname);
    }
    
    if (fields.length === 0) {
      return false;
    }
    
    values.push(id);
    const sql = `UPDATE user SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.execute(sql, values);
    return result.affectedRows > 0;
  }
}

module.exports = UserModel;
