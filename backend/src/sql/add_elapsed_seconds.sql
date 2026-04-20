-- 添加已用时间字段
ALTER TABLE learning_tasks ADD COLUMN elapsed_seconds INT DEFAULT 0 COMMENT '已用时间（秒）';
