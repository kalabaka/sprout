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
    
    if (!await columnExists('learning_tasks', 'task_subtype')) {
      await connection.execute(`
        ALTER TABLE learning_tasks 
        ADD COLUMN task_subtype ENUM('subjective', 'single_choice', 'multiple_choice', 'fill_blank') 
          DEFAULT 'subjective' COMMENT '任务子类型'
      `);
      logger.info('添加 task_subtype 字段成功');
    } else {
      logger.warn('task_subtype 字段已存在，跳过');
    }
    
    if (!await columnExists('learning_tasks', 'question_data')) {
      await connection.execute(`
        ALTER TABLE learning_tasks 
        ADD COLUMN question_data JSON DEFAULT NULL COMMENT '题目数据（选项、答案等）'
      `);
      logger.info('添加 question_data 字段成功');
    } else {
      logger.warn('question_data 字段已存在，跳过');
    }
    
    if (!await columnExists('learning_tasks', 'auto_score')) {
      await connection.execute(`
        ALTER TABLE learning_tasks 
        ADD COLUMN auto_score INT DEFAULT NULL COMMENT '自动评测得分（0-100）'
      `);
      logger.info('添加 auto_score 字段成功');
    } else {
      logger.warn('auto_score 字段已存在，跳过');
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
    
    if (await columnExists('learning_tasks', 'task_subtype')) {
      await connection.execute('ALTER TABLE learning_tasks DROP COLUMN task_subtype');
    }
    if (await columnExists('learning_tasks', 'question_data')) {
      await connection.execute('ALTER TABLE learning_tasks DROP COLUMN question_data');
    }
    if (await columnExists('learning_tasks', 'auto_score')) {
      await connection.execute('ALTER TABLE learning_tasks DROP COLUMN auto_score');
    }
    
    await connection.commit();
    logger.info('数据库回滚完成');
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error('数据库回滚失败:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  upgrade()
    .then(() => {
      console.log('升级成功');
      process.exit(0);
    })
    .catch(err => {
      console.error('升级失败:', err.message);
      process.exit(1);
    });
}

module.exports = { upgrade, downgrade };
