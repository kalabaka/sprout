-- ============================================================
-- 通知系统升级脚本
-- 在现有数据库上添加通知相关表
-- ============================================================

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '接收用户ID',
    
    type ENUM('task_reminder', 'exam_reminder', 'checkin_reminder', 
              'plan_warning', 'achievement', 'system') NOT NULL COMMENT '通知类型',
    
    title VARCHAR(100) NOT NULL COMMENT '通知标题',
    content TEXT NOT NULL COMMENT '通知内容',
    
    link_type VARCHAR(50) COMMENT '跳转类型：task/exam/plan/achievement/dashboard',
    link_id INT COMMENT '跳转目标ID',
    
    is_read BOOLEAN DEFAULT FALSE COMMENT '是否已读',
    read_at DATETIME COMMENT '阅读时间',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知表';

-- 用户通知设置表
CREATE TABLE IF NOT EXISTS notification_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    
    task_reminder_enabled BOOLEAN DEFAULT TRUE COMMENT '任务提醒',
    exam_reminder_enabled BOOLEAN DEFAULT TRUE COMMENT '考试提醒',
    checkin_reminder_enabled BOOLEAN DEFAULT TRUE COMMENT '打卡提醒',
    plan_warning_enabled BOOLEAN DEFAULT TRUE COMMENT '计划预警',
    achievement_enabled BOOLEAN DEFAULT TRUE COMMENT '成就通知',
    system_enabled BOOLEAN DEFAULT TRUE COMMENT '系统通知',
    
    task_reminder_hours INT DEFAULT 2 COMMENT '任务提前几小时提醒',
    exam_reminder_days INT DEFAULT 3 COMMENT '考试提前几天提醒',
    checkin_reminder_time TIME DEFAULT '20:00' COMMENT '每日打卡提醒时间',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户通知设置表';
