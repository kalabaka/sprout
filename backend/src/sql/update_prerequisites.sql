UPDATE knowledge_points SET prerequisite_ids = '[]', phase = 'foundation' WHERE name LIKE '%环境%' OR name LIKE '%安装%' OR name LIKE '%搭建%' OR name LIKE '%配置%';

UPDATE knowledge_points SET prerequisite_ids = '[416]' WHERE name = '变量与数据类型' AND subject = 'Java';
UPDATE knowledge_points SET prerequisite_ids = '[417]' WHERE name = '运算符与表达式' AND subject = 'Java';
UPDATE knowledge_points SET prerequisite_ids = '[417]' WHERE name = '条件判断语句' AND subject = 'Java';
UPDATE knowledge_points SET prerequisite_ids = '[419]' WHERE name = '循环语句' AND subject = 'Java';
UPDATE knowledge_points SET prerequisite_ids = '[417]' WHERE name = '数组基础' AND subject = 'Java';
UPDATE knowledge_points SET prerequisite_ids = '[417,418,419,420,421]' WHERE name = '类与对象' AND subject = 'Java';
UPDATE knowledge_points SET prerequisite_ids = '[422]' WHERE name = '封装与访问控制' AND subject = 'Java';
UPDATE knowledge_points SET prerequisite_ids = '[422]' WHERE name = '继承与多态' AND subject = 'Java';
UPDATE knowledge_points SET prerequisite_ids = '[422,423]' WHERE name = '抽象类与接口' AND subject = 'Java';
UPDATE knowledge_points SET prerequisite_ids = '[422]' WHERE name = '异常处理' AND subject = 'Java';
UPDATE knowledge_points SET prerequisite_ids = '[422]' WHERE name = '集合框架基础' AND subject = 'Java';
UPDATE knowledge_points SET prerequisite_ids = '[422,423,424,425,426]' WHERE name = 'IO流基础' AND subject = 'Java';
UPDATE knowledge_points SET prerequisite_ids = '[422]' WHERE name = '多线程基础' AND subject = 'Java';
UPDATE knowledge_points SET prerequisite_ids = '[422,427]' WHERE name = 'JDBC数据库操作' AND subject = 'Java';
UPDATE knowledge_points SET prerequisite_ids = '[422,423,424,425,426,427,428,429,430]' WHERE name = '综合项目实战' AND subject = 'Java';

UPDATE knowledge_points SET prerequisite_ids = '[]', phase = 'foundation' WHERE name = 'Python环境配置' AND subject = 'Python';
UPDATE knowledge_points SET prerequisite_ids = '[432]' WHERE name = '变量与数据类型' AND subject = 'Python';
UPDATE knowledge_points SET prerequisite_ids = '[433]' WHERE name = '条件与循环' AND subject = 'Python';
UPDATE knowledge_points SET prerequisite_ids = '[433]' WHERE name = '函数基础' AND subject = 'Python';
UPDATE knowledge_points SET prerequisite_ids = '[433,435]' WHERE name = '列表与字典' AND subject = 'Python';
UPDATE knowledge_points SET prerequisite_ids = '[433,434,435,436]' WHERE name = '面向对象编程' AND subject = 'Python';
UPDATE knowledge_points SET prerequisite_ids = '[437]' WHERE name = '文件操作' AND subject = 'Python';
UPDATE knowledge_points SET prerequisite_ids = '[437]' WHERE name = '异常处理' AND subject = 'Python';
UPDATE knowledge_points SET prerequisite_ids = '[437,438]' WHERE name = '模块与包' AND subject = 'Python';
UPDATE knowledge_points SET prerequisite_ids = '[437,438,439,440]' WHERE name = '网络爬虫入门' AND subject = 'Python';
UPDATE knowledge_points SET prerequisite_ids = '[437,438,439,440]' WHERE name = '数据分析基础' AND subject = 'Python';
UPDATE knowledge_points SET prerequisite_ids = '[437,438,439,440]' WHERE name = 'Web开发入门' AND subject = 'Python';

UPDATE knowledge_points SET prerequisite_ids = '[]', phase = 'foundation' WHERE name LIKE '%MySQL%安装%' OR name LIKE '%MySQL%环境%';
UPDATE knowledge_points SET prerequisite_ids = '[563]' WHERE name LIKE '%SQL语法%' OR name LIKE '%数据库管理%';
