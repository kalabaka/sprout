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
      ALTER TABLE learning_tasks 
      ADD COLUMN self_score INT DEFAULT NULL COMMENT '自评得分(0-100)' AFTER actual_duration
    `);
    console.log('Added self_score column');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Column self_score already exists');
    } else {
      console.log('Error adding column:', e.message);
    }
  }

  try {
    await conn.query(`CREATE INDEX idx_self_score ON learning_tasks(self_score)`);
    console.log('Added index on self_score');
  } catch (e) {
    if (e.code === 'ER_DUP_KEYNAME') {
      console.log('Index already exists');
    } else {
      console.log('Error adding index:', e.message);
    }
  }

  await conn.end();
  console.log('Migration completed!');
}

migrate().catch(console.error);
