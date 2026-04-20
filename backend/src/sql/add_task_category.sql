ALTER TABLE learning_tasks 
ADD COLUMN category VARCHAR(20) DEFAULT 'cognitive' COMMENT '任务类别: operational-操作性, cognitive-认知性' AFTER difficulty,
ADD COLUMN needs_review TINYINT(1) DEFAULT 1 COMMENT '是否需要复习: 0-否, 1-是' AFTER category;
