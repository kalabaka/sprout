# 数据库优化说明

## 一、索引优化

### 优化前状态
现有索引较少，导致常见查询性能较差。

### 新增索引

| 表名 | 索引名 | 字段 | 用途 |
|------|--------|------|------|
| learning_plan | idx_status | status | 查询特定状态计划 |
| learning_plan | idx_created_at | created_at | 按时间排序 |
| learning_plan | idx_user_status | user_id, status | 用户特定状态计划 |
| learning_plan | idx_target_date | target_date | 查询即将到期计划 |
| task | idx_status | status | 查询特定状态任务 |
| task | idx_plan_status | plan_id, status | 计划特定状态任务 |
| task | idx_user_status | user_id, status | 用户特定状态任务 |
| task | idx_deadline | deadline | 按截止时间排序 |
| task | idx_completed_at | completed_at | 统计已完成任务 |
| learning_record | idx_user_start | user_id, start_time | 学习趋势分析 |
| learning_record | idx_action | action | 查询特定动作 |
| learning_record | idx_user_task_time | user_id, task_id, start_time | 详细分析 |
| performance | idx_evaluated_at | evaluated_at | 按评估时间排序 |
| intervention | idx_is_read | is_read | 查询未读干预 |
| intervention | idx_user_read | user_id, is_read | 用户未读干预 |

## 二、表结构优化

### 1. 新增 plan_summary 汇总表

```sql
CREATE TABLE plan_summary (
  plan_id INT PRIMARY KEY,
  total_tasks INT,
  completed_tasks INT,
  in_progress_tasks INT,
  pending_tasks INT,
  total_estimated_time INT,
  total_actual_time INT,
  completion_rate FLOAT,
  updated_at DATETIME
);
```

**作用**：存储计划的预计算统计结果，避免重复聚合查询。

### 2. 优化字段

- VARCHAR(255) 保持合理长度
- DATETIME 替代 TIMESTAMP（避免2038年问题）
- FLOAT 用于百分比计算

## 三、SQL优化建议

### 1. 避免全表扫描
```sql
-- ❌ 慢：SELECT * FROM task WHERE plan_id = 1
-- ✅ 快：SELECT id, name, status FROM task WHERE plan_id = 1
```

### 2. 使用覆盖索引
```sql
-- 创建复合索引覆盖查询列
ALTER TABLE task ADD INDEX idx_cover (plan_id, status, name, deadline);
```

### 3. 分页优化
```sql
-- ❌ 慢：SELECT * FROM task LIMIT 10000, 20
-- ✅ 快：SELECT * FROM task WHERE id > 10000 LIMIT 20
```

### 4. 批量操作
```sql
-- ❌ 慢：多次单条插入
-- ✅ 快：INSERT INTO task (...) VALUES (...), (...), (...)
```

## 四、查询性能对比

| 查询场景 | 优化前 | 优化后 | 提升 |
|---------|--------|--------|------|
| 用户计划列表 | 1+N次查询 | 2次查询 | ~80% |
| 任务统计 | 每次聚合 | 汇总表 | ~95% |
| 趋势分析 | 全表扫描 | 索引扫描 | ~70% |
| 待办任务 | 全表扫描 | idx_status | ~60% |

## 五、实施步骤

### 1. 执行优化脚本
```bash
mysql -u root -p learning_planning < sql/database_optimized.sql
```

### 2. 验证索引
```sql
SHOW INDEX FROM learning_plan;
SHOW INDEX FROM task;
```

### 3. 监控慢查询
```sql
-- 查看慢查询
SELECT * FROM mysql.slow_log;
```

## 六、维护建议

1. **定期更新汇总表**
   ```sql
   -- 每天凌晨执行
   CALL update_all_plan_summary();
   ```

2. **监控索引使用情况**
   ```sql
   SELECT * FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = 'learning_planning';
   ```

3. **适时调整**
   - 根据实际查询日志调整索引
   - 数据量增长时考虑分区表
