const mysql = require('mysql2/promise');

async function createTable() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'sproutdatabase',
    multipleStatements: true
  });

  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL COMMENT '模板名称',
        type VARCHAR(50) NOT NULL COMMENT '类型: 任务提醒/考试提醒/系统通知/风险预警',
        content TEXT NOT NULL COMMENT '模板内容',
        variables VARCHAR(500) COMMENT '支持的变量，JSON数组格式',
        enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_type (type),
        INDEX idx_enabled (enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知模板表'
    `);
    console.log('notification_templates 表创建成功');

    await conn.execute(`
      INSERT INTO notification_templates (name, type, content, variables) VALUES
      ('任务提醒模板', '任务提醒', '【系统】亲爱的{username}，您有任务"{taskName}"待完成，请及时处理。', '["username", "taskName"]'),
      ('考试提醒模板', '考试提醒', '【系统】{username}，您的考试"{examName}"将在{days}天后开始，请做好准备。', '["username", "examName", "days"]'),
      ('打卡提醒模板', '系统通知', '【系统】{username}，今天还没有打卡哦，坚持就是胜利！', '["username"]'),
      ('风险预警模板', '风险预警', '【风险预警】用户{username}已连续{days}天未学习，请及时关注。', '["username", "days"]')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
    console.log('初始模板数据插入成功');

    console.log('通知模板表创建完成！');
  } catch (error) {
    console.error('创建表失败:', error.message);
  } finally {
    await conn.end();
  }
}

createTable();
