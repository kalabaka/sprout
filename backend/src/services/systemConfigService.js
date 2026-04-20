const { pool } = require('../config/database');
const logger = require('../config/logger');

class SystemConfigService {
  static async get(key) {
    const sql = 'SELECT config_value FROM system_config WHERE config_key = ?';
    const [rows] = await pool.execute(sql, [key]);
    return rows[0]?.config_value || null;
  }

  static async set(key, value, description = null) {
    const sql = `
      INSERT INTO system_config (config_key, config_value, description)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE config_value = ?, description = COALESCE(?, description)
    `;
    const [result] = await pool.execute(sql, [key, value, description, value, description]);
    return result.affectedRows > 0;
  }

  static async getMaxUserCount() {
    const value = await this.get('max_user_count');
    return parseInt(value) || 100;
  }

  static async checkCanRegister() {
    const sql = 'SELECT COUNT(*) as count FROM user';
    const [rows] = await pool.execute(sql);
    const currentCount = rows[0].count;
    const maxCount = await this.getMaxUserCount();
    
    return {
      canRegister: currentCount < maxCount,
      currentCount,
      maxCount,
      remaining: maxCount - currentCount
    };
  }

  static async getAll() {
    const sql = 'SELECT * FROM system_config ORDER BY id';
    const [rows] = await pool.execute(sql);
    return rows;
  }

  static async delete(key) {
    const sql = 'DELETE FROM system_config WHERE config_key = ?';
    const [result] = await pool.execute(sql, [key]);
    return result.affectedRows > 0;
  }
}

module.exports = SystemConfigService;
