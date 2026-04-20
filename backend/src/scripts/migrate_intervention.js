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
      ALTER TABLE intervention_logs 
      ADD COLUMN feedback VARCHAR(20) DEFAULT NULL COMMENT '用户反馈',
      ADD COLUMN feedback_at DATETIME DEFAULT NULL,
      ADD COLUMN strategy_index INT DEFAULT NULL
    `);
    console.log('Added feedback columns');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist');
    } else {
      console.log('Error adding columns:', e.message);
    }
  }

  try {
    await conn.query(`
      ALTER TABLE intervention_logs 
      ADD INDEX idx_type_sent (user_id, intervention_type, sent_at)
    `);
    console.log('Added index');
  } catch (e) {
    if (e.code === 'ER_DUP_KEYNAME') {
      console.log('Index already exists');
    } else {
      console.log('Error adding index:', e.message);
    }
  }

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS knowledge_failures (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        knowledge_point_id INT,
        task_id INT,
        score INT DEFAULT 0,
        failed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_knowledge (user_id, knowledge_point_id),
        INDEX idx_failed_at (failed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识点失败记录表'
    `);
    console.log('Created knowledge_failures table');
  } catch (e) {
    console.log('Error creating table:', e.message);
  }

  await conn.end();
  console.log('Migration completed!');
}

migrate().catch(console.error);
