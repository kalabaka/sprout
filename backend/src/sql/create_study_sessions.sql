CREATE TABLE IF NOT EXISTS study_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  task_id INT COMMENT '任务ID',
  task_name VARCHAR(255) COMMENT '任务名称',
  course_name VARCHAR(255) COMMENT '课程名称',
  plan_id INT COMMENT '计划ID',
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
  end_time TIMESTAMP NULL COMMENT '结束时间',
  actual_minutes INT DEFAULT 0 COMMENT '实际学习分钟数',
  status ENUM('active', 'paused', 'completed', 'cancelled') DEFAULT 'active' COMMENT '会话状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status),
  INDEX idx_start_time (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习会话表';
