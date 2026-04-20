const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'sproutdatabase',
    multipleStatements: true
  });

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS plan_replan_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_id INT NOT NULL,
        trigger_reason VARCHAR(255) COMMENT '触发原因',
        before_tasks INT COMMENT '调整前任务数',
        after_tasks INT COMMENT '调整后任务数',
        before_end_date DATE COMMENT '调整前完成日期',
        after_end_date DATE COMMENT '调整后完成日期',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES learning_plan(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='重规划日志表'
    `);
    console.log('Created plan_replan_logs table');
  } catch (e) {
    console.log('Error creating table:', e.message);
  }

  try {
    await conn.query(`
      ALTER TABLE learning_tasks 
      ADD COLUMN is_overdue TINYINT DEFAULT 0 COMMENT '是否超时' AFTER self_score
    `);
    console.log('Added is_overdue column');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Column is_overdue already exists');
    } else {
      console.log('Error adding is_overdue:', e.message);
    }
  }

  await conn.end();
  console.log('Migration completed!');
}

migrate().catch(console.error);
