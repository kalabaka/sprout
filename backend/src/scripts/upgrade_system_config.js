require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/database');
const logger = require('../config/logger');

async function columnExists(tableName, columnName) {
  const [rows] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function tableExists(tableName) {
  const [rows] = await pool.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  return rows.length > 0;
}

async function upgrade() {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    if (await columnExists('user', 'phone')) {
      await connection.execute('ALTER TABLE user DROP COLUMN phone');
      logger.info('删除 user.phone 字段成功');
    } else {
      logger.warn('user.phone 字段不存在，跳过');
    }
    
    if (await columnExists('user', 'is_phone_verified')) {
      await connection.execute('ALTER TABLE user DROP COLUMN is_phone_verified');
      logger.info('删除 user.is_phone_verified 字段成功');
    } else {
      logger.warn('user.is_phone_verified 字段不存在，跳过');
    }
    
    if (!await tableExists('system_config')) {
      await connection.execute(`
        CREATE TABLE system_config (
          id INT AUTO_INCREMENT PRIMARY KEY,
          config_key VARCHAR(50) NOT NULL UNIQUE COMMENT '配置键',
          config_value VARCHAR(255) NOT NULL COMMENT '配置值',
          description VARCHAR(200) COMMENT '配置说明',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      logger.info('创建 system_config 表成功');
      
      await connection.execute(`
        INSERT INTO system_config (config_key, config_value, description)
        VALUES ('max_user_count', '100', '系统最大注册用户数')
      `);
      logger.info('插入默认配置成功');
    } else {
      logger.warn('system_config 表已存在，跳过');
    }
    
    await connection.commit();
    logger.info('数据库升级完成');
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error('数据库升级失败:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  upgrade()
    .then(() => {
      logger.info('升级脚本执行完成');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('升级脚本执行失败:', err);
      process.exit(1);
    });
}

module.exports = { upgrade };
