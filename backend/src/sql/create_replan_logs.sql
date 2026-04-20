CREATE TABLE IF NOT EXISTS plan_replan_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL COMMENT '计划ID',
  trigger_reason VARCHAR(255) COMMENT '触发原因',
  before_tasks INT COMMENT '调整前任务数',
  after_tasks INT COMMENT '调整后任务数',
  before_end_date DATE COMMENT '调整前完成日期',
  after_end_date DATE COMMENT '调整后完成日期',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES learning_plan(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='计划重规划日志表';
