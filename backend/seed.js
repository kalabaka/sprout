/**
 * 数据验证脚本 - seed.js
 *
 * 注意：演示数据已包含在 sproutdatabase.sql 中
 * 如需重新初始化数据，请重新运行 SQL 文件
 *
 * 执行方式: node seed.js
 */

const { pool } = require('./src/config/database');

async function check() {
  console.log('======================================');
  console.log('   新芽学习系统 - 数据验证');
  console.log('======================================\n');

  let conn;
  try {
    conn = await pool.getConnection();
    console.log('✓ 数据库连接成功\n');

    // 检查数据
    const tables = ['user', 'knowledge_points', 'learning_plan', 'learning_tasks', 'learning_records', 'intervention_logs'];

    for (const table of tables) {
      try {
        const [rows] = await conn.execute(`SELECT COUNT(*) as cnt FROM ${table}`);
        console.log(`  ${table}: ${rows[0].cnt} 条记录`);
      } catch (e) {
        console.log(`  ${table}: ⚠ 表不存在`);
      }
    }

    console.log('\n======================================');
    console.log('   数据验证完成！');
    console.log('======================================');
    console.log('\n演示账号:');
    console.log('  用户名: demo');
    console.log('  密码: demo123 (需手动设置bcrypt hash)');
    console.log('\n如需重新初始化数据，请运行:');
    console.log('  mysql -u root -p sproutdatabase < src/sql/sproutdatabase.sql');

  } catch (error) {
    console.error('验证失败:', error.message);
    console.log('\n请确保已初始化数据库:');
    console.log('  mysql -u root -p < src/sql/sproutdatabase.sql');
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

try {
  check();
} catch (e) {
  console.error('错误:', e.message);
  process.exit(1);
}