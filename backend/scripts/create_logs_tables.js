const mysql = require('mysql2/promise');

async function createTables() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'sproutdatabase',
    multipleStatements: true
  });

  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS operation_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        operator_id INT COMMENT '操作人ID',
        operator_name VARCHAR(100) COMMENT '操作人名称',
        operator_type ENUM('admin', 'user') DEFAULT 'admin' COMMENT '操作人类型',
        action VARCHAR(50) NOT NULL COMMENT '操作类型: 登录/新增/修改/删除/导出等',
        target_type VARCHAR(50) COMMENT '操作对象类型: 用户/计划/任务/知识点等',
        target_id INT COMMENT '操作对象ID',
        target_name VARCHAR(200) COMMENT '操作对象名称',
        detail TEXT COMMENT '操作详情',
        ip_address VARCHAR(50) COMMENT 'IP地址',
        user_agent VARCHAR(500) COMMENT '浏览器信息',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_operator (operator_id),
        INDEX idx_action (action),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表'
    `);
    console.log('operation_logs 表创建成功');

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        level ENUM('ERROR', 'WARN', 'INFO') DEFAULT 'ERROR' COMMENT '错误级别',
        message TEXT NOT NULL COMMENT '错误信息',
        source VARCHAR(100) COMMENT '错误来源',
        stack_trace TEXT COMMENT '堆栈信息',
        request_url VARCHAR(500) COMMENT '请求URL',
        request_method VARCHAR(10) COMMENT '请求方法',
        user_id INT COMMENT '用户ID',
        ip_address VARCHAR(50) COMMENT 'IP地址',
        resolved BOOLEAN DEFAULT FALSE COMMENT '是否已解决',
        resolved_at DATETIME COMMENT '解决时间',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_level (level),
        INDEX idx_resolved (resolved),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='错误日志表'
    `);
    console.log('error_logs 表创建成功');

    console.log('所有日志表创建完成！');
  } catch (error) {
    console.error('创建表失败:', error.message);
  } finally {
    await conn.end();
  }
}

createTables();
