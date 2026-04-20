-- 英语语法知识点数据
-- 执行方式: mysql -u root -p sproutdatabase < add_english_knowledge.sql

INSERT INTO knowledge_points (name, subject, description, difficulty, estimated_minutes, prerequisite_ids, phase, tags, resource_url) VALUES
-- 英语语法 基础阶段
('名词与冠词', '英语', '掌握名词单复数、冠词a/an/the的用法', 1, 45, NULL, 'foundation', '["基础语法"]', ''),
('代词与限定词', '英语', '人称代词、物主代词、指示代词等', 1, 45, NULL, 'foundation', '["基础语法"]', ''),
('动词与时态基础', '英语', '一般现在时、一般过去时、一般将来时', 1, 60, NULL, 'foundation', '["时态"]', ''),
('形容词与副词', '英语', '形容词比较级和最高级、副词用法', 1, 45, NULL, 'foundation', '["基础语法"]', ''),
('介词与连词', '英语', '常用介词搭配、连词连接句子', 1, 30, NULL, 'foundation', '["基础语法"]', ''),
-- 英语语法 进阶阶段
('进行时态', '英语', '现在进行时、过去进行时', 2, 60, NULL, 'advanced', '["时态"]', ''),
('完成时态', '英语', '现在完成时、过去完成时', 2, 90, NULL, 'advanced', '["时态"]', ''),
('被动语态', '英语', '被动语态的构成和使用场景', 2, 60, NULL, 'advanced', '["语态"]', ''),
('情态动词', '英语', 'can/may/must/should等情态动词', 2, 45, NULL, 'advanced', '["动词"]', ''),
('非谓语动词', '英语', '不定式、动名词、分词的用法', 3, 90, NULL, 'advanced', '["动词"]', ''),
-- 英语语法 实战阶段
('定语从句', '英语', '关系代词、关系副词引导的定语从句', 3, 90, NULL, 'application', '["从句"]', ''),
('名词性从句', '英语', '主语从句、宾语从句、表语从句', 3, 90, NULL, 'application', '["从句"]', ''),
('状语从句', '英语', '时间、地点、原因、条件状语从句', 3, 90, NULL, 'application', '["从句"]', ''),
('虚拟语气', '英语', '虚拟条件句、虚拟语气用法', 3, 60, NULL, 'application', '["语气"]', ''),
('语法综合应用', '英语', '长难句分析、语法综合练习', 3, 120, NULL, 'application', '["综合"]', '')
ON DUPLICATE KEY UPDATE name=VALUES(name);

SELECT '英语语法知识点已添加成功！' as message;
SELECT COUNT(*) as total_english_points FROM knowledge_points WHERE subject = '英语';
