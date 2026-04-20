-- 添加 self_score 字段到 learning_tasks 表
ALTER TABLE learning_tasks 
ADD COLUMN self_score INT DEFAULT NULL COMMENT '自评得分(0-100)' AFTER actual_duration;

-- 添加索引优化查询
CREATE INDEX idx_self_score ON learning_tasks(self_score);
