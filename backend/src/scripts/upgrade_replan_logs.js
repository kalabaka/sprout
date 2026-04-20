require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/database');
const logger = require('../config/logger');

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
    
    if (!await tableExists('plan_replan_logs')) {
      await connection.execute(`
        CREATE TABLE plan_replan_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          plan_id INT NOT NULL,
          trigger_reason VARCHAR(255) COMMENT '触发原因',
          before_total_tasks INT COMMENT '重规划前任务数',
          after_total_tasks INT COMMENT '重规划后任务数',
          adjusted_dates JSON COMMENT '调整的日期范围',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (plan_id) REFERENCES learning_plan(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      logger.info('创建 plan_replan_logs 表成功');
    } else {
      logger.warn('plan_replan_logs 表已存在，跳过');
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
    
    if (await tableExists('plan_replan_logs')) {
      await connection.execute('DROP TABLE plan_replan_logs');
      logger.info('删除 plan_replan_logs 表成功');
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
