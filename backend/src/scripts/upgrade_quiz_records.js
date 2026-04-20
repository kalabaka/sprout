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

async function upgrade() {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    if (!await columnExists('learning_records', 'knowledge_point_id')) {
      await connection.execute(`
        ALTER TABLE learning_records 
        ADD COLUMN knowledge_point_id INT DEFAULT NULL COMMENT '知识点ID' AFTER task_id
      `);
      logger.info('添加 knowledge_point_id 字段成功');
    } else {
      logger.warn('knowledge_point_id 字段已存在，跳过');
    }
    
    if (!await columnExists('learning_records', 'quiz_passed')) {
      await connection.execute(`
        ALTER TABLE learning_records 
        ADD COLUMN quiz_passed BOOLEAN DEFAULT FALSE COMMENT '自测是否通过' AFTER score
      `);
      logger.info('添加 quiz_passed 字段成功');
    } else {
      logger.warn('quiz_passed 字段已存在，跳过');
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
