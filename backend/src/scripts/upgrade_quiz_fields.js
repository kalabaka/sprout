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
    
    if (!await columnExists('knowledge_points', 'has_quiz')) {
      await connection.execute(`
        ALTER TABLE knowledge_points 
        ADD COLUMN has_quiz BOOLEAN DEFAULT FALSE COMMENT '是否有自测题'
      `);
      logger.info('添加 has_quiz 字段成功');
    } else {
      logger.warn('has_quiz 字段已存在，跳过');
    }
    
    if (!await columnExists('knowledge_points', 'quiz_data')) {
      await connection.execute(`
        ALTER TABLE knowledge_points 
        ADD COLUMN quiz_data JSON DEFAULT NULL COMMENT '自测题数据'
      `);
      logger.info('添加 quiz_data 字段成功');
    } else {
      logger.warn('quiz_data 字段已存在，跳过');
    }
    
    if (!await columnExists('knowledge_points', 'quiz_pass_score')) {
      await connection.execute(`
        ALTER TABLE knowledge_points 
        ADD COLUMN quiz_pass_score INT DEFAULT 60 COMMENT '通过分数'
      `);
      logger.info('添加 quiz_pass_score 字段成功');
    } else {
      logger.warn('quiz_pass_score 字段已存在，跳过');
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

async function downgrade() {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    if (await columnExists('knowledge_points', 'has_quiz')) {
      await connection.execute('ALTER TABLE knowledge_points DROP COLUMN has_quiz');
      logger.info('删除 has_quiz 字段成功');
    }
    
    if (await columnExists('knowledge_points', 'quiz_data')) {
      await connection.execute('ALTER TABLE knowledge_points DROP COLUMN quiz_data');
      logger.info('删除 quiz_data 字段成功');
    }
    
    if (await columnExists('knowledge_points', 'quiz_pass_score')) {
      await connection.execute('ALTER TABLE knowledge_points DROP COLUMN quiz_pass_score');
      logger.info('删除 quiz_pass_score 字段成功');
    }
    
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error('降级失败:', error.message);
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

module.exports = { upgrade, downgrade };
