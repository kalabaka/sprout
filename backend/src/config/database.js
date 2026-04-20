/**
 * 数据库连接配置
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'learning_planning',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

const logger = require('./logger');

/**
 * 测试数据库连接
 */
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    logger.db('数据库连接成功');
    return true;
  } catch (error) {
    logger.dbError(`数据库连接失败: ${error.message}`);
    return false;
  }
};

module.exports = { pool, testConnection };