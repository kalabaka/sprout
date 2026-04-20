-- 用户画像表
CREATE TABLE IF NOT EXISTS user_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    
    learning_pace ENUM('slow', 'normal', 'fast') DEFAULT 'normal' COMMENT '学习速度',
    preferred_difficulty TINYINT DEFAULT 2 COMMENT '偏好难度 1-3',
    daily_available_minutes INT DEFAULT 60 COMMENT '每日可用时长',
    available_weekdays JSON COMMENT '可用星期',
    
    overall_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner' COMMENT '整体水平',
    
    prefer_video BOOLEAN DEFAULT TRUE COMMENT '偏好视频',
    prefer_exercise BOOLEAN DEFAULT TRUE COMMENT '偏好练习',
    prefer_reading BOOLEAN DEFAULT FALSE COMMENT '偏好阅读',
    
    avg_daily_minutes INT DEFAULT 0 COMMENT '实际日均学习时长',
    total_learned_hours INT DEFAULT 0 COMMENT '累计学习小时',
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户画像表';

-- 用户已掌握知识点表
CREATE TABLE IF NOT EXISTS user_mastered_topics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    knowledge_point_id INT NOT NULL,
    mastered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confidence_level TINYINT DEFAULT 3 COMMENT '掌握程度 1-5',
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_kp (user_id, knowledge_point_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户已掌握知识点表';
