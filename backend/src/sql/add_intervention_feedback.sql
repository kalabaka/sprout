-- 添加反馈相关字段到 intervention_logs 表
ALTER TABLE intervention_logs 
ADD COLUMN feedback VARCHAR(20) DEFAULT NULL COMMENT '用户反馈: helpful/not_helpful' AFTER user_response,
ADD COLUMN feedback_at DATETIME DEFAULT NULL COMMENT '反馈时间' AFTER feedback,
ADD COLUMN strategy_index INT DEFAULT NULL COMMENT '策略索引，用于轮换' AFTER feedback_at;

-- 添加索引优化查询
ALTER TABLE intervention_logs 
ADD INDEX idx_type_sent (user_id, intervention_type, sent_at);

-- 创建知识点失败记录表
CREATE TABLE IF NOT EXISTS knowledge_failures (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  knowledge_point_id INT,
  task_id INT,
  score INT DEFAULT 0,
  failed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_knowledge (user_id, knowledge_point_id),
  INDEX idx_failed_at (failed_at),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识点失败记录表';
