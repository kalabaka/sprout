-- ============================================================
-- 新芽学习规划智能体系统 - 完整数据库
-- 数据库名: sproutdatabase
-- ============================================================

-- 创建数据库
DROP DATABASE IF EXISTS sproutdatabase;
CREATE DATABASE sproutdatabase
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE sproutdatabase;

-- ============================================================
-- 已有数据库升级脚本（可选）
-- ============================================================
-- ALTER TABLE user ADD COLUMN phone VARCHAR(20) DEFAULT NULL UNIQUE;
-- ALTER TABLE user ADD COLUMN is_phone_verified BOOLEAN DEFAULT FALSE;
-- ============================================================

-- ============================================================
-- 1. 用户表
-- ============================================================
DROP TABLE IF EXISTS user;
CREATE TABLE user (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码(bcrypt加密)',
  email VARCHAR(100) COMMENT '邮箱',
  phone VARCHAR(20) DEFAULT NULL UNIQUE COMMENT '手机号',
  is_phone_verified BOOLEAN DEFAULT FALSE COMMENT '是否已验证手机号',
  nickname VARCHAR(50) COMMENT '昵称',
  avatar VARCHAR(255) COMMENT '头像URL',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ============================================================
-- 2. 学习目标表
-- ============================================================
DROP TABLE IF EXISTS goal;
CREATE TABLE goal (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(100) NOT NULL COMMENT '目标标题',
  description TEXT COMMENT '目标描述',
  target_date DATE COMMENT '目标完成日期',
  status TINYINT DEFAULT 1 COMMENT '状态: 0-暂停, 1-进行中, 2-完成',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习目标表';

-- ============================================================
-- 3. 学习计划表
-- ============================================================
DROP TABLE IF EXISTS learning_plan;
CREATE TABLE learning_plan (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL COMMENT '计划名称',
  description TEXT COMMENT '计划描述',
  goal TEXT COMMENT '学习目标',
  target_date DATE COMMENT '目标完成日期',
  status ENUM('draft', 'active', 'paused', 'completed', 'archived') DEFAULT 'draft' COMMENT '状态',
  progress FLOAT DEFAULT 0 COMMENT '进度百分比',
  goal_type ENUM('exam', 'skill', 'course', 'other') DEFAULT 'skill' COMMENT '目标类型',
  target_score INT DEFAULT NULL COMMENT '目标分数',
  start_date DATE COMMENT '计划开始日期',
  end_date DATE COMMENT '预计完成日期',
  daily_study_minutes INT DEFAULT 60 COMMENT '每日计划学习时长',
  course_id INT DEFAULT NULL COMMENT '关联主课程',
  exam_id INT DEFAULT NULL COMMENT '关联考试',
  total_tasks INT DEFAULT 0 COMMENT '总任务数',
  completed_tasks INT DEFAULT 0 COMMENT '已完成任务数',
  total_minutes INT DEFAULT 0 COMMENT '累计学习时长',
  priority ENUM('high', 'medium', 'low') DEFAULT 'medium' COMMENT '优先级',
  auto_generated BOOLEAN DEFAULT FALSE COMMENT '是否由智能体生成',
  review_notes TEXT COMMENT '复盘笔记',
  completed_at DATETIME COMMENT '完成时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习计划表';

-- ============================================================
-- 3.1 计划阶段表
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_phases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    name VARCHAR(50) NOT NULL COMMENT '阶段名称：基础/进阶/实战',
    description VARCHAR(200) COMMENT '阶段描述',
    phase_order INT DEFAULT 1 COMMENT '阶段顺序',
    total_tasks INT DEFAULT 0 COMMENT '阶段任务总数',
    completed_tasks INT DEFAULT 0 COMMENT '阶段完成任务数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES learning_plan(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='计划阶段表';

-- ============================================================
-- 4. 知识图谱表
-- ============================================================
DROP TABLE IF EXISTS knowledge_points;
CREATE TABLE knowledge_points (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '知识点名称',
  subject VARCHAR(50) NOT NULL DEFAULT 'other' COMMENT '所属学科：Java/Python/高数等',
  description TEXT COMMENT '知识点描述',
  difficulty TINYINT DEFAULT 1 COMMENT '难度 1-3',
  estimated_minutes INT DEFAULT 30 COMMENT '标准学习时长（分钟）',
  prerequisite_ids JSON DEFAULT NULL COMMENT '前置知识点ID列表',
  phase ENUM('foundation', 'advanced', 'application') DEFAULT 'foundation' COMMENT '所属阶段',
  tags JSON DEFAULT NULL COMMENT '标签：["基础语法", "核心概念"]',
  resource_url VARCHAR(500) COMMENT '推荐学习资源链接',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_subject (subject),
  INDEX idx_difficulty (difficulty),
  INDEX idx_phase (phase)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识图谱表';

-- ============================================================
-- 5. 学习任务表
-- ============================================================
DROP TABLE IF EXISTS learning_tasks;
CREATE TABLE learning_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  plan_id INT DEFAULT NULL,
  phase_id INT DEFAULT NULL COMMENT '关联阶段',
  knowledge_point_id INT COMMENT '知识点ID',
  name VARCHAR(100) NOT NULL COMMENT '任务名称',
  description TEXT COMMENT '任务描述',
  planned_duration INT DEFAULT 60 COMMENT '计划时长(分钟)',
  actual_duration INT DEFAULT 0 COMMENT '实际时长',
  difficulty TINYINT DEFAULT 2 COMMENT '难度: 1-简单, 2-中等, 3-困难',
  stage VARCHAR(50) COMMENT '阶段: 基础/进阶/应用',
  status TINYINT DEFAULT 0 COMMENT '状态: 0-待开始, 1-进行中, 2-已完成',
  deadline DATE COMMENT '截止日期',
  planned_date DATE COMMENT '计划执行日期',
  started_at DATETIME COMMENT '开始时间',
  completed_at DATETIME COMMENT '完成时间',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_plan_id (plan_id),
  INDEX idx_phase_id (phase_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  FOREIGN KEY (plan_id) REFERENCES learning_plan(id) ON DELETE SET NULL,
  FOREIGN KEY (phase_id) REFERENCES plan_phases(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习任务表';

-- ============================================================
-- 6. 学习记录表
-- ============================================================
DROP TABLE IF EXISTS learning_records;
CREATE TABLE learning_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  task_id INT COMMENT '任务ID',
  record_type VARCHAR(50) COMMENT '记录类型: start/complete/skip/practice/review',
  duration INT DEFAULT 0 COMMENT '学习时长(分钟)',
  score TINYINT COMMENT '得分',
  notes TEXT COMMENT '学习笔记',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_action (record_type),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES learning_tasks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习记录表';

-- ============================================================
-- 7. 干预日志表
-- ============================================================
DROP TABLE IF EXISTS intervention_logs;
CREATE TABLE intervention_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  intervention_type VARCHAR(50) COMMENT '干预类型',
  title VARCHAR(100) NOT NULL COMMENT '标题',
  content TEXT COMMENT '干预内容',
  trigger_event VARCHAR(100) COMMENT '触发事件',
  effectiveness_score TINYINT COMMENT '效果评分',
  user_response VARCHAR(50) COMMENT '用户响应: adopted/ignored',
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME COMMENT '已读时间',
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='干预日志表';

-- ============================================================
-- 8. 绩效记录表
-- ============================================================
DROP TABLE IF EXISTS performance;
CREATE TABLE performance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  task_id INT COMMENT '任务ID',
  time_deviation FLOAT DEFAULT 0 COMMENT '时间偏差',
  completion_rate FLOAT DEFAULT 0 COMMENT '完成率',
  quality_score FLOAT DEFAULT 0 COMMENT '质量评分',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='绩效记录表';

-- ============================================================
-- 演示数据
-- ============================================================

-- 8.1 插入测试用户 (密码: demo123)
INSERT INTO user (id, username, password, email, nickname) VALUES
(1, 'demo', '$2a$10$KUu2G14euIal69KBzFGCXOc09.grTLiO6M1ifT094kQSVmQehmLSS', 'demo@example.com', '演示用户')
ON DUPLICATE KEY UPDATE username='demo';

-- 8.2 插入知识图谱数据
INSERT INTO knowledge_points (name, subject, description, difficulty, estimated_minutes, prerequisite_ids, phase, tags, resource_url) VALUES
-- Java 基础阶段
('环境搭建与HelloWorld', 'Java', '安装JDK配置开发环境，编写第一个程序', 1, 45, NULL, 'foundation', '["环境配置"]', ''),
('变量与数据类型', 'Java', '掌握变量声明和基本数据类型', 1, 60, '[1]', 'foundation', '["基础语法"]', ''),
('运算符与表达式', 'Java', '算术、关系、逻辑运算符', 1, 45, '[2]', 'foundation', '["基础语法"]', ''),
('条件判断语句', 'Java', 'if-else和switch语句', 1, 60, '[2]', 'foundation', '["控制流程"]', ''),
('循环语句', 'Java', 'for、while、do-while循环', 2, 90, '[4]', 'foundation', '["控制流程"]', ''),
('数组基础', 'Java', '一维数组和多维数组', 2, 60, '[2]', 'foundation', '["数据结构"]', ''),
-- Java 进阶阶段
('类与对象', 'Java', '面向对象编程基础', 2, 90, '[1,2,3,4,5]', 'advanced', '["面向对象"]', ''),
('封装与访问控制', 'Java', '访问修饰符和封装原则', 2, 60, '[7]', 'advanced', '["面向对象"]', ''),
('继承与多态', 'Java', '继承机制和多态特性', 3, 120, '[7,8]', 'advanced', '["面向对象"]', ''),
('抽象类与接口', 'Java', '抽象类和接口的使用', 3, 90, '[9]', 'advanced', '["面向对象"]', ''),
('异常处理', 'Java', 'Exception处理机制', 2, 60, '[7]', 'advanced', '["异常处理"]', ''),
('集合框架基础', 'Java', 'List、Set、Map的使用', 2, 120, '[7,6]', 'advanced', '["集合"]', ''),
-- Java 实战阶段
('IO流基础', 'Java', '文件读写和流操作', 3, 90, '[7,11]', 'application', '["IO操作"]', ''),
('多线程基础', 'Java', '线程创建和同步', 3, 120, '[7,11]', 'application', '["并发编程"]', ''),
('JDBC数据库操作', 'Java', '数据库连接和CRUD操作', 3, 120, '[7]', 'application', '["数据库"]', ''),
('综合项目实战', 'Java', '综合应用所学知识完成项目', 3, 240, '[7,8,9,10,11,12]', 'application', '["项目实战"]', ''),
-- Python 基础阶段
('Python环境配置', 'Python', '安装Python和pip包管理器', 1, 30, NULL, 'foundation', '["环境配置"]', 'https://python.org'),
('Python基础语法', 'Python', '变量、数据类型、运算符', 1, 60, '[17]', 'foundation', '["基础语法"]', ''),
('数据结构', 'Python', 'list/dict/set/tuple', 2, 60, '[18]', 'foundation', '["数据结构"]', ''),
('函数与模块', 'Python', '自定义函数和模块导入', 2, 90, '[19]', 'foundation', '["函数"]', ''),
-- Python 进阶阶段
('NumPy入门', 'Python', '数值计算基础', 2, 60, '[20]', 'advanced', '["数据分析"]', ''),
('Pandas数据处理', 'Python', '数据处理和分析', 3, 90, '[21]', 'advanced', '["数据分析"]', ''),
('Matplotlib可视化', 'Python', '数据可视化', 3, 90, '[22]', 'advanced', '["数据可视化"]', ''),
-- 英语语法 基础阶段
('名词与冠词', '英语', '掌握名词单复数、冠词a/an/the的用法', 1, 45, NULL, 'foundation', '["基础语法"]', ''),
('代词与限定词', '英语', '人称代词、物主代词、指示代词等', 1, 45, '[24]', 'foundation', '["基础语法"]', ''),
('动词与时态基础', '英语', '一般现在时、一般过去时、一般将来时', 1, 60, '[24]', 'foundation', '["时态"]', ''),
('形容词与副词', '英语', '形容词比较级和最高级、副词用法', 1, 45, '[24]', 'foundation', '["基础语法"]', ''),
('介词与连词', '英语', '常用介词搭配、连词连接句子', 1, 30, '[24]', 'foundation', '["基础语法"]', ''),
-- 英语语法 进阶阶段
('进行时态', '英语', '现在进行时、过去进行时', 2, 60, '[26]', 'advanced', '["时态"]', ''),
('完成时态', '英语', '现在完成时、过去完成时', 2, 90, '[29]', 'advanced', '["时态"]', ''),
('被动语态', '英语', '被动语态的构成和使用场景', 2, 60, '[26,29]', 'advanced', '["语态"]', ''),
('情态动词', '英语', 'can/may/must/should等情态动词', 2, 45, '[26]', 'advanced', '["动词"]', ''),
('非谓语动词', '英语', '不定式、动名词、分词的用法', 3, 90, '[26,29,30]', 'advanced', '["动词"]', ''),
-- 英语语法 实战阶段
('定语从句', '英语', '关系代词、关系副词引导的定语从句', 3, 90, '[31]', 'application', '["从句"]', ''),
('名词性从句', '英语', '主语从句、宾语从句、表语从句', 3, 90, '[31]', 'application', '["从句"]', ''),
('状语从句', '英语', '时间、地点、原因、条件状语从句', 3, 90, '[31]', 'application', '["从句"]', ''),
('虚拟语气', '英语', '虚拟条件句、虚拟语气用法', 3, 60, '[32,33,34]', 'application', '["语气"]', ''),
('语法综合应用', '英语', '长难句分析、语法综合练习', 3, 120, '[31,32,33,34,35]', 'application', '["综合"]', '')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 8.3 插入学习计划
INSERT INTO learning_plan (id, user_id, name, description, target_date, status) VALUES
(1, 1, 'Java基础学习路径', '系统学习Java编程基础知识', '2026-05-15', 1),
(2, 1, 'Python数据分析', '学习Python数据分析技能', '2026-06-01', 1)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 8.4 插入学习任务
INSERT INTO learning_tasks (id, user_id, plan_id, knowledge_point_id, name, description, planned_duration, actual_duration, difficulty, stage, status, started_at, completed_at) VALUES
-- Java计划的任务
(1, 1, 1, 101, 'Java环境搭建', '安装JDK配置环境', 30, 25, 1, '基础阶段', 2, '2026-04-08 09:00:00', '2026-04-08 10:00:00'),
(2, 1, 1, 102, 'Java语法基础', '学习基本语法', 60, 55, 1, '基础阶段', 2, '2026-04-08 14:00:00', '2026-04-08 15:30:00'),
(3, 1, 1, 103, '数据类型与变量', '掌握数据类型', 45, 50, 1, '基础阶段', 2, '2026-04-09 09:00:00', '2026-04-09 10:00:00'),
(4, 1, 1, 104, '运算符', '学习运算符', 45, 60, 2, '基础阶段', 2, '2026-04-09 15:00:00', '2026-04-09 16:00:00'),
(5, 1, 1, 105, '流程控制', 'if和循环', 60, 45, 2, '进阶阶段', 2, '2026-04-10 10:00:00', '2026-04-10 11:00:00'),
(6, 1, 1, 106, '数组', '数组操作', 60, 70, 2, '进阶阶段', 1, '2026-04-12 09:00:00', NULL),
(7, 1, 1, 107, '面向对象基础', '类和对象', 90, 0, 3, '应用阶段', 0, NULL, NULL),
(8, 1, 1, 108, '继承与多态', 'OOP特性', 90, 0, 3, '应用阶段', 0, NULL, NULL),
(9, 1, 1, 109, '异常处理', 'Exception处理', 60, 0, 3, '应用阶段', 0, NULL, NULL),
-- Python计划的任务
(10, 1, 2, 201, 'Python环境配置', '安装Python', 30, 20, 1, '基础阶段', 2, '2026-04-10 16:00:00', '2026-04-10 16:30:00'),
(11, 1, 2, 202, 'Python基础语法', '基础语法', 60, 45, 1, '基础阶段', 2, '2026-04-11 09:00:00', '2026-04-11 10:00:00'),
(12, 1, 2, 203, '数据结构', 'list/dict/set', 60, 55, 2, '基础阶段', 2, '2026-04-11 14:00:00', '2026-04-11 15:00:00'),
(13, 1, 2, 204, '函数与模块', '自定义函数', 90, 80, 2, '进阶阶段', 2, '2026-04-12 10:00:00', '2026-04-12 11:30:00'),
(14, 1, 2, 205, 'NumPy入门', '数值计算', 60, 0, 2, '进阶阶段', 0, NULL, NULL)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 8.5 插入学习记录（趋势图表数据 - 近7天）
INSERT INTO learning_records (user_id, task_id, record_type, duration, score, created_at) VALUES
(1, 1, 'complete', 25, 90, '2026-04-08 10:30:00'),
(1, 2, 'complete', 55, 85, '2026-04-08 15:30:00'),
(1, 3, 'complete', 50, 88, '2026-04-09 09:50:00'),
(1, 4, 'complete', 60, 82, '2026-04-09 16:00:00'),
(1, 5, 'complete', 45, 90, '2026-04-10 10:50:00'),
(1, 10, 'complete', 20, 95, '2026-04-10 16:30:00'),
(1, 11, 'complete', 45, 88, '2026-04-11 10:00:00'),
(1, 12, 'complete', 55, 85, '2026-04-11 15:00:00'),
(1, 13, 'complete', 80, 80, '2026-04-12 11:30:00'),
(1, 6, 'start', 0, NULL, '2026-04-12 09:00:00'),
(1, 6, 'practice', 30, 75, '2026-04-14 09:30:00'),
(1, 6, 'practice', 25, 78, '2026-04-14 14:00:00');

-- 8.6 插入干预日志
INSERT INTO intervention_logs (user_id, intervention_type, title, content, trigger_event, sent_at, read_at) VALUES
(1, 'medium_completion', '完成率提醒', '你的学习进度不错！想想完成这些任务后，离你的目标就近了一大步！', 'task_complete_5', '2026-04-10 11:00:00', NULL),
(1, 'high_time_deviation', '学习耗时提醒', '检测到近期学习耗时较长，建议将大任务拆分成多个15分钟的小块，逐步完成建立信心。', 'task_complete_6', '2026-04-12 12:00:00', '2026-04-12 12:05:00');

-- ============================================================
-- 9. 智能问答聊天记录表
-- ============================================================
DROP TABLE IF EXISTS chat_history;
CREATE TABLE chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_id INT DEFAULT NULL COMMENT '关联当前正在学习的任务ID',
    role ENUM('user', 'assistant') NOT NULL COMMENT '角色：用户或助手',
    content TEXT NOT NULL COMMENT '消息内容',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_task (user_id, task_id),
    INDEX idx_created (created_at),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='智能问答聊天记录表';

-- ============================================================
-- 10. 用户配置表
-- ============================================================
DROP TABLE IF EXISTS user_profiles;
CREATE TABLE user_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE COMMENT '用户ID',
  avatar_url VARCHAR(255) COMMENT '头像URL',
  bio VARCHAR(500) COMMENT '个人简介',
  preferred_study_times JSON COMMENT '偏好的学习时间段',
  focus_duration INT DEFAULT 25 COMMENT '专注时长(分钟)',
  resource_weights JSON COMMENT '资源权重偏好',
  difficulty_preference ENUM('简单', '中等', '困难', '自适应') DEFAULT '中等' COMMENT '难度偏好',
  notification_threshold ENUM('low', 'medium', 'high') DEFAULT 'medium' COMMENT '通知阈值',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户配置表';

-- 完成

-- ============================================================
-- 11. 管理员表
-- ============================================================
DROP TABLE IF EXISTS admins;
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '管理员用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码(bcrypt加密)',
  role ENUM('super_admin', 'admin') DEFAULT 'admin' COMMENT '角色',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- 插入默认超级管理员 (密码: admin123, bcrypt加密)
INSERT INTO admins (username, password, role) VALUES
('admin', '$2a$10$KUu2G14euIal69KBzFGCXOc09.grTLiO6M1ifT094kQSVmQehmLSS', 'super_admin')
ON DUPLICATE KEY UPDATE username='admin';

-- ============================================================
-- 12. 学习资源表 (用于推荐引擎)
-- ============================================================
DROP TABLE IF EXISTS learning_resources;
CREATE TABLE learning_resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL COMMENT '资源标题',
  type ENUM('video', 'document', 'exercise') NOT NULL COMMENT '资源类型',
  url VARCHAR(500) NOT NULL COMMENT '资源URL',
  tags JSON COMMENT '标签数组，如: ["Java", "OOP"]',
  difficulty_level INT DEFAULT 1 COMMENT '难度等级: 1-3',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  created_by INT COMMENT '创建者admin id',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_difficulty (difficulty_level),
  INDEX idx_status (status),
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习资源表';

-- 插入示例学习资源
INSERT INTO learning_resources (title, type, url, tags, difficulty_level, status, created_by) VALUES
('Java基础教程视频', 'video', 'https://example.com/java-basic.mp4', '["Java", "入门"]', 1, 'active', 1),
('Python数据分析视频', 'video', 'https://example.com/python-data.mp4', '["Python", "数据分析"]', 2, 'active', 1),
('JavaScript练习题', 'exercise', 'https://example.com/js-exercise.json', '["JavaScript", "练习"]', 2, 'active', 1),
('算法入门文档', 'document', 'https://example.com/algorithm.pdf', '["算法", "数据结构"]', 2, 'active', 1),
('React实战教程', 'video', 'https://example.com/react-demo.mp4', '["React", "前端"]', 3, 'active', 1)
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- ============================================================
-- 13. 为user表添加状态字段
-- ============================================================
-- ALTER TABLE user ADD COLUMN status ENUM('active', 'banned') DEFAULT 'active';

-- ============================================================
-- 14. 学期信息表
-- ============================================================
DROP TABLE IF EXISTS semesters;
CREATE TABLE semesters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '所属用户',
  name VARCHAR(100) NOT NULL COMMENT '学期名称，如 2025-2026第二学期',
  start_date DATE NOT NULL COMMENT '开学日期',
  end_date DATE NOT NULL COMMENT '结束日期',
  total_weeks INT NOT NULL COMMENT '总周数',
  is_current BOOLEAN DEFAULT FALSE COMMENT '是否为当前学期',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  INDEX idx_user_current (user_id, is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学期信息表';

-- ============================================================
-- 15. 课程表
-- ============================================================
DROP TABLE IF EXISTS courses;
CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '所属用户',
  semester_id INT NOT NULL COMMENT '所属学期',
  name VARCHAR(100) NOT NULL COMMENT '课程名称',
  teacher VARCHAR(50) COMMENT '授课教师',
  classroom VARCHAR(50) COMMENT '上课地点',
  color VARCHAR(20) DEFAULT '#409EFF' COMMENT '课程卡片颜色',
  credits DECIMAL(3,1) DEFAULT 0.0 COMMENT '学分',
  start_week INT DEFAULT 1 COMMENT '起始周',
  end_week INT DEFAULT 20 COMMENT '结束周',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  INDEX idx_user_semester (user_id, semester_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='课程表';

-- ============================================================
-- 16. 课表时间表
-- ============================================================
DROP TABLE IF EXISTS course_schedules;
CREATE TABLE course_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL COMMENT '关联课程',
  day_of_week TINYINT NOT NULL COMMENT '星期几 1-7 (1=周一, 7=周日)',
  start_time VARCHAR(20) NOT NULL COMMENT '开始时间/节次',
  end_time VARCHAR(20) NOT NULL COMMENT '结束时间/节次',
  week_type ENUM('every', 'odd', 'even') DEFAULT 'every' COMMENT '单双周类型',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  INDEX idx_course_day (course_id, day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='课表时间表';

-- ============================================================
-- 17. 为learning_tasks表添加课程关联字段
-- ============================================================
-- ALTER TABLE learning_tasks ADD COLUMN course_id INT DEFAULT NULL COMMENT '关联课程';
-- ALTER TABLE learning_tasks ADD FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;

-- ============================================================
-- 18. 考试信息表
-- ============================================================
DROP TABLE IF EXISTS exams;
CREATE TABLE exams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '所属用户',
    course_id INT DEFAULT NULL COMMENT '关联课程（可选）',
    name VARCHAR(100) NOT NULL COMMENT '考试名称',
    exam_date DATE NOT NULL COMMENT '考试日期',
    exam_time TIME DEFAULT '09:00' COMMENT '考试时间',
    location VARCHAR(100) COMMENT '考试地点',
    priority ENUM('high', 'medium', 'low') DEFAULT 'medium' COMMENT '优先级',
    notes TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    INDEX idx_user_exam_date (user_id, exam_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试信息表';

-- ============================================================
-- 19. 复习计划表
-- ============================================================
DROP TABLE IF EXISTS review_plans;
CREATE TABLE review_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    exam_id INT NOT NULL,
    plan_date DATE NOT NULL COMMENT '计划复习日期',
    suggested_content VARCHAR(255) COMMENT '建议复习内容',
    estimated_minutes INT DEFAULT 60 COMMENT '建议学习时长',
    status ENUM('pending', 'completed', 'skipped') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    UNIQUE KEY unique_daily_plan (user_id, exam_id, plan_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='复习计划表';

-- ============================================================
-- 20. learning_tasks 表扩展字段
-- ============================================================
-- ALTER TABLE learning_tasks ADD COLUMN task_type ENUM('normal', 'ddl', 'exam_review') DEFAULT 'normal' COMMENT '任务类型';
-- ALTER TABLE learning_tasks ADD COLUMN estimated_minutes INT DEFAULT 60 COMMENT '预估耗时（分钟）';
-- ALTER TABLE learning_tasks ADD COLUMN priority INT DEFAULT 5 COMMENT '优先级分数（1-10）';
-- ALTER TABLE learning_tasks ADD COLUMN is_reminded BOOLEAN DEFAULT FALSE COMMENT '是否已提醒';

-- ============================================================
-- 21. 学习会话表 study_sessions
-- ============================================================
DROP TABLE IF EXISTS study_sessions;
CREATE TABLE study_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '所属用户',
    task_id INT DEFAULT NULL COMMENT '关联任务（可选）',
    course_id INT DEFAULT NULL COMMENT '关联课程（可选）',
    start_time DATETIME NOT NULL COMMENT '开始时间',
    end_time DATETIME DEFAULT NULL COMMENT '结束时间',
    duration_minutes INT DEFAULT 0 COMMENT '实际学习时长（分钟）',
    planned_minutes INT DEFAULT 60 COMMENT '计划学习时长（分钟）',
    mode ENUM('countup', 'countdown') DEFAULT 'countup' COMMENT '计时模式：正计时/倒计时',
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active' COMMENT '会话状态',
    notes TEXT COMMENT '学习备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES learning_tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    INDEX idx_user_start (user_id, start_time),
    INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习会话记录表';

-- ============================================================
-- 22. 用户学习统计缓存表 user_study_stats
-- ============================================================
DROP TABLE IF EXISTS user_study_stats;
CREATE TABLE user_study_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '所属用户',
    stat_date DATE NOT NULL COMMENT '统计日期',
    total_minutes INT DEFAULT 0 COMMENT '当日总学习时长（分钟）',
    session_count INT DEFAULT 0 COMMENT '当日学习会话数',
    task_completed INT DEFAULT 0 COMMENT '当日完成任务数',
    focus_score DECIMAL(3,2) DEFAULT 0.00 COMMENT '专注度评分（0-1）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, stat_date),
    INDEX idx_user_date (user_id, stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户学习统计缓存表';

-- ============================================================
-- 23. 通知表
-- ============================================================
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
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

-- ============================================================
-- 24. 用户通知设置表
-- ============================================================
DROP TABLE IF EXISTS notification_settings;
CREATE TABLE notification_settings (
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