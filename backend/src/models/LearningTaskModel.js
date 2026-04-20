/**
 * 学习任务实例数据模型
 * 对应表: learning_tasks
 */
const { pool } = require('../config/database');

function formatLocalDate(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

class LearningTaskModel {
  static async getUniqueTaskName(userId, taskName) {
    const countSql = `
      SELECT COUNT(*) as count FROM learning_tasks 
      WHERE user_id = ? AND name = ?
    `;
    const [countRows] = await pool.execute(countSql, [userId, taskName]);
    const sameNameCount = countRows[0].count;
    
    if (sameNameCount === 0) {
      return taskName;
    }
    
    const baseName = taskName.replace(/\s*\(\d+\)$/, '');
    const checkPatternSql = `
      SELECT name FROM learning_tasks 
      WHERE user_id = ? AND (name = ? OR name LIKE ?)
      ORDER BY name
    `;
    const [existingTasks] = await pool.execute(checkPatternSql, [userId, baseName, `${baseName} (%)`]);
    
    let maxNumber = 1;
    for (const task of existingTasks) {
      if (task.name === baseName) {
        maxNumber = Math.max(maxNumber, 2);
      } else {
        const match = task.name.match(/\((\d+)\)$/);
        if (match) {
          maxNumber = Math.max(maxNumber, parseInt(match[1]) + 1);
        }
      }
    }
    
    const uniqueName = `${baseName} (${maxNumber})`;
    console.log(`[LearningTaskModel] 任务名称自动编号: "${taskName}" -> "${uniqueName}" (userId: ${userId}, 同名数量: ${sameNameCount})`);
    return uniqueName;
  }

  static async create(userId, { 
    goalId, 
    knowledgePointId, 
    courseId, 
    planId,
    phaseId,
    title, 
    name,
    description,
    plannedDuration, 
    plannedDate,
    sortOrder,
    difficulty,
    category,
    needsReview
  }) {
    const baseName = name || title || '未命名任务';
    console.log(`[LearningTaskModel.create] 开始创建任务: baseName="${baseName}", userId=${userId}`);
    const taskName = await this.getUniqueTaskName(userId, baseName);
    console.log(`[LearningTaskModel.create] 最终任务名称: "${baseName}" -> "${taskName}"`);
    const validDate = plannedDate && plannedDate !== 'NaN-NaN-NaN' && !plannedDate.includes('NaN') 
      ? plannedDate 
      : null;
    
    const sql = `
      INSERT INTO learning_tasks (
        user_id, plan_id, phase_id, knowledge_point_id,
        name, description, planned_duration, planned_date, sort_order, difficulty, category, needs_review, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `;
    const [result] = await pool.execute(sql, [
      userId,
      planId ?? null,
      phaseId ?? null,
      knowledgePointId ?? null,
      taskName,
      description ?? null,
      plannedDuration ?? 60,
      validDate,
      sortOrder ?? 0,
      difficulty ?? 2,
      category ?? 'cognitive',
      needsReview !== undefined ? (needsReview ? 1 : 0) : 1
    ]);
    return result.insertId;
  }

  // 获取用户所有学习任务
  static async findByUserId(userId, options = {}) {
    let sql = 'SELECT * FROM learning_tasks WHERE user_id = ?';
    const params = [userId];

    if (options.status !== undefined) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    sql += ' ORDER BY created_at DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  static async findByPlanId(planId, userId) {
    const sql = 'SELECT * FROM learning_tasks WHERE plan_id = ? AND user_id = ? ORDER BY sort_order ASC, created_at ASC';
    const [rows] = await pool.execute(sql, [planId, userId]);
    return rows;
  }

  static async findIncompleteByPlanId(planId, userId) {
    const sql = `
      SELECT * FROM learning_tasks 
      WHERE plan_id = ? AND user_id = ? AND status NOT IN (2, 3)
      ORDER BY sort_order ASC, created_at ASC
    `;
    const [rows] = await pool.execute(sql, [planId, userId]);
    return rows;
  }

  static async findCompletedByPlanId(planId, userId) {
    const sql = `
      SELECT * FROM learning_tasks 
      WHERE plan_id = ? AND user_id = ? AND status = 2
      ORDER BY completed_at DESC
    `;
    const [rows] = await pool.execute(sql, [planId, userId]);
    return rows;
  }

  static async countByPlanId(planId, userId) {
    const sql = 'SELECT COUNT(*) as count FROM learning_tasks WHERE plan_id = ? AND user_id = ?';
    const [rows] = await pool.execute(sql, [planId, userId]);
    return rows[0].count;
  }

  static async countCompletedByPlanId(planId, userId) {
    const sql = 'SELECT COUNT(*) as count FROM learning_tasks WHERE plan_id = ? AND user_id = ? AND status = 2';
    const [rows] = await pool.execute(sql, [planId, userId]);
    return rows[0].count;
  }

  static async cancelByPlanId(planId, userId) {
    const sql = `
      UPDATE learning_tasks 
      SET status = 3, completed_at = NOW()
      WHERE plan_id = ? AND user_id = ? AND status NOT IN (2, 3)
    `;
    const [result] = await pool.execute(sql, [planId, userId]);
    return result.affectedRows;
  }

  static async deleteByPlanId(planId, userId) {
    const sql = 'DELETE FROM learning_tasks WHERE plan_id = ? AND user_id = ? AND status != 2';
    const [result] = await pool.execute(sql, [planId, userId]);
    return result.affectedRows;
  }

  static async getMaxPlannedDate(planId, userId) {
    const sql = 'SELECT MAX(planned_date) as maxDate FROM learning_tasks WHERE plan_id = ? AND user_id = ?';
    const [rows] = await pool.execute(sql, [planId, userId]);
    return rows[0].maxDate;
  }

  static async update(id, userId, data) {
    const fields = [];
    const params = [];

    if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
    if (data.planned_duration !== undefined) { fields.push('planned_duration = ?'); params.push(data.planned_duration); }
    if (data.planned_date !== undefined) { fields.push('planned_date = ?'); params.push(data.planned_date); }
    if (data.difficulty !== undefined) { fields.push('difficulty = ?'); params.push(data.difficulty); }
    if (data.deadline !== undefined) { fields.push('deadline = ?'); params.push(data.deadline); }
    if (data.phase_id !== undefined) { fields.push('phase_id = ?'); params.push(data.phase_id); }
    if (data.is_overdue !== undefined) { fields.push('is_overdue = ?'); params.push(data.is_overdue ? 1 : 0); }
    if (data.status !== undefined) { fields.push('status = ?'); params.push(data.status); }

    if (fields.length === 0) return false;

    params.push(id, userId);
    const sql = `UPDATE learning_tasks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
    const [result] = await pool.execute(sql, params);
    return result.affectedRows > 0;
  }

  static async cancel(id, userId) {
    const sql = `
      UPDATE learning_tasks 
      SET status = 3, completed_at = NOW()
      WHERE id = ? AND user_id = ? AND status NOT IN (2, 3)
    `;
    const [result] = await pool.execute(sql, [id, userId]);
    return result.affectedRows > 0;
  }

  static async markOverdueTasks(userId) {
    const today = formatLocalDate();
    const sql = `
      UPDATE learning_tasks 
      SET is_overdue = 1
      WHERE user_id = ? AND planned_date < ? AND status = 0 AND is_overdue = 0
    `;
    const [result] = await pool.execute(sql, [userId, today]);
    return result.affectedRows;
  }

  static async getConsecutiveFailures(userId, limit = 5) {
    const sql = `
      SELECT * FROM learning_tasks 
      WHERE user_id = ? AND status = 2 AND self_score IS NOT NULL AND self_score < 60
      ORDER BY completed_at DESC
      LIMIT ?
    `;
    const [rows] = await pool.execute(sql, [userId, limit]);
    return rows;
  }

  static async findByUserIdAndStatus(userId, status) {
    const sql = 'SELECT * FROM learning_tasks WHERE user_id = ? AND status = ? ORDER BY created_at DESC';
    const [rows] = await pool.execute(sql, [userId, status]);
    return rows;
  }

  static async createTask(userId, data) {
    const sql = `
      INSERT INTO learning_tasks (
        user_id, plan_id, phase_id, knowledge_point_id, name, description,
        planned_duration, difficulty, stage, status, deadline, planned_date, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
      userId,
      data.planId || null,
      data.phaseId || null,
      data.knowledgePointId || null,
      data.name,
      data.description || null,
      data.plannedDuration || 60,
      data.difficulty || 2,
      data.stage || null,
      data.status || 0,
      data.deadline || null,
      data.plannedDate || null,
      data.sortOrder || 0
    ]);
    return result.insertId;
  }

  static async getTodayTasks(userId) {
    const today = formatLocalDate();
    const sql = `
      SELECT * FROM learning_tasks 
      WHERE user_id = ? AND planned_date = ? AND status = 0
      ORDER BY sort_order ASC
    `;
    const [rows] = await pool.execute(sql, [userId, today]);
    return rows;
  }

  static async getOverdueTasks(userId) {
    const today = formatLocalDate();
    const sql = `
      SELECT * FROM learning_tasks 
      WHERE user_id = ? AND planned_date < ? AND status = 0
      ORDER BY planned_date ASC
    `;
    const [rows] = await pool.execute(sql, [userId, today]);
    return rows;
  }

  static async getTaskStatsByPlan(planId, userId) {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as cancelled,
        AVG(CASE WHEN status = 2 AND self_score IS NOT NULL THEN self_score ELSE NULL END) as avgScore
      FROM learning_tasks 
      WHERE plan_id = ? AND user_id = ?
    `;
    const [rows] = await pool.execute(sql, [planId, userId]);
    return rows[0];
  }

  static async getTasksByDateRange(userId, startDate, endDate) {
    const sql = `
      SELECT * FROM learning_tasks 
      WHERE user_id = ? AND planned_date BETWEEN ? AND ?
      ORDER BY planned_date ASC, sort_order ASC
    `;
    const [rows] = await pool.execute(sql, [userId, startDate, endDate]);
    return rows;
  }

  static async getTasksByDate(userId, date) {
    const sql = `
      SELECT * FROM learning_tasks 
      WHERE user_id = ? AND planned_date = ?
      ORDER BY sort_order ASC
    `;
    const [rows] = await pool.execute(sql, [userId, date]);
    return rows;
  }

  static async updateSortOrder(taskId, userId, sortOrder) {
    const sql = 'UPDATE learning_tasks SET sort_order = ? WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(sql, [sortOrder, taskId, userId]);
    return result.affectedRows > 0;
  }

  static async batchUpdateSortOrder(tasks, userId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      for (const task of tasks) {
        await connection.execute(
          'UPDATE learning_tasks SET sort_order = ? WHERE id = ? AND user_id = ?',
          [task.sortOrder, task.id, userId]
        );
      }
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // 根据课程ID查找任务
  static async findByCourseId(courseId, options = {}) {
    let sql = 'SELECT * FROM learning_tasks WHERE course_id = ?';
    const params = [courseId];

    if (options.status !== undefined) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    sql += ' ORDER BY created_at DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  // 获取指定任务
  static async findById(id, userId) {
    const sql = 'SELECT * FROM learning_tasks WHERE id = ? AND user_id = ?';
    const [rows] = await pool.execute(sql, [id, userId]);
    return rows[0];
  }

  // 开始任务
  static async start(id, userId) {
    const sql = `
      UPDATE learning_tasks
      SET status = 1, started_at = NOW()
      WHERE id = ? AND user_id = ? AND status = 0
    `;
    const [result] = await pool.execute(sql, [id, userId]);
    return result.affectedRows > 0;
  }

  // 暂停任务
  static async pause(id, userId, elapsedSeconds = 0) {
    const sql = `
      UPDATE learning_tasks
      SET status = 4, elapsed_seconds = ?
      WHERE id = ? AND user_id = ? AND status = 1
    `;
    const [result] = await pool.execute(sql, [elapsedSeconds, id, userId]);
    return result.affectedRows > 0;
  }

  // 恢复任务
  static async resume(id, userId) {
    const sql = `
      UPDATE learning_tasks
      SET status = 1
      WHERE id = ? AND user_id = ? AND status = 4
    `;
    const [result] = await pool.execute(sql, [id, userId]);
    return result.affectedRows > 0;
  }

  // 完成任务
  static async complete(id, userId, { actualDuration }) {
    const task = await this.findById(id, userId);
    if (!task) return false;

    const actualMinutes = actualDuration || task.planned_duration || 30;

    const sql = `
      UPDATE learning_tasks
      SET status = 2,
          actual_duration = ?,
          completed_at = NOW()
      WHERE id = ? AND user_id = ?
    `;

    const [result] = await pool.execute(sql, [
      actualMinutes,
      id,
      userId
    ]);

    if (result.affectedRows > 0 && task.plan_id) {
      const LearningPlanModel = require('./LearningPlanModel');
      await LearningPlanModel.updateProgressByTasks(task.plan_id, userId);
    }

    return result.affectedRows > 0;
  }

  // 跳过任务
  static async skip(id, userId) {
    const sql = `
      UPDATE learning_tasks
      SET status = 3, completed_at = NOW()
      WHERE id = ? AND user_id = ? AND status = 0
    `;
    const [result] = await pool.execute(sql, [id, userId]);
    return result.affectedRows > 0;
  }

  // 删除任务
  static async delete(id, userId) {
    const sql = 'DELETE FROM learning_tasks WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(sql, [id, userId]);
    return result.affectedRows > 0;
  }

  // 获取任务统计
  static async getStats(userId) {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as skipped,
        SUM(actual_duration) as totalTime,
        AVG(self_score) as avgScore
      FROM learning_tasks
      WHERE user_id = ?
    `;
    const [rows] = await pool.execute(sql, [userId]);
    return rows[0];
  }

  // 获取今日任务
  static async findToday(userId) {
    const sql = `
      SELECT * FROM learning_tasks
      WHERE user_id = ?
        AND DATE(created_at) = CURDATE()
        AND status != 3
      ORDER BY status, created_at
    `;
    const [rows] = await pool.execute(sql, [userId]);
    return rows;
  }

  // 获取连续学习天数
  static async getStreakDays(userId) {
    const sql = `
      SELECT DISTINCT DATE(completed_at) as completion_date
      FROM learning_tasks
      WHERE user_id = ? AND status = 2 AND completed_at IS NOT NULL
      ORDER BY completed_at DESC
    `;
    const [rows] = await pool.execute(sql, [userId]);

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < rows.length; i++) {
      const completionDate = new Date(rows[i].completion_date);
      completionDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (completionDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  static calculatePriority(deadline, estimatedMinutes) {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursRemaining = (deadlineDate - now) / (1000 * 60 * 60);

    if (hoursRemaining <= 0) return 10;
    if (hoursRemaining <= 24) return 9;
    if (hoursRemaining <= 72) return 7;
    if (hoursRemaining <= 168) return 5;
    return 3;
  }

  static async createDDLTask(userId, taskData) {
    const { title, description, courseId, deadline, estimatedMinutes, planId } = taskData;

    const priority = this.calculatePriority(deadline, estimatedMinutes);
    const taskName = await this.getUniqueTaskName(userId, title);

    const sql = `
      INSERT INTO learning_tasks (user_id, plan_id, course_id, name, description, task_type, deadline, estimated_minutes, priority, status)
      VALUES (?, ?, ?, ?, ?, 'ddl', ?, ?, ?, 0)
    `;
    const [result] = await pool.execute(sql, [
      userId,
      planId || null,
      courseId || null,
      taskName,
      description || null,
      deadline,
      estimatedMinutes || 60,
      priority
    ]);
    return result.insertId;
  }

  static async findUpcomingDDL(userId, limit = 10) {
    const sql = `
      SELECT t.*, c.name as course_name, c.color as course_color
      FROM learning_tasks t
      LEFT JOIN courses c ON t.course_id = c.id
      WHERE t.user_id = ?
        AND t.task_type = 'ddl'
        AND t.status = 0
        AND t.deadline >= CURDATE()
      ORDER BY t.deadline ASC, t.priority DESC
      LIMIT ?
    `;
    const [rows] = await pool.execute(sql, [userId, limit]);
    return rows;
  }

  static async findOverdueDDL(userId) {
    const sql = `
      SELECT t.*, c.name as course_name, c.color as course_color
      FROM learning_tasks t
      LEFT JOIN courses c ON t.course_id = c.id
      WHERE t.user_id = ?
        AND t.task_type = 'ddl'
        AND t.status = 0
        AND t.deadline < CURDATE()
      ORDER BY t.deadline ASC
    `;
    const [rows] = await pool.execute(sql, [userId]);
    return rows;
  }

  static async updateProgress(id, userId, progressData) {
    const fields = [];
    const values = [];

    if (progressData.actual_duration !== undefined) {
      fields.push('actual_duration = ?');
      values.push(progressData.actual_duration);
    }
    if (progressData.status !== undefined) {
      fields.push('status = ?');
      values.push(progressData.status);
      if (progressData.status === 2) {
        fields.push('completed_at = NOW()');
      }
    }
    if (progressData.quality_score !== undefined) {
      fields.push('quality_score = ?');
      values.push(progressData.quality_score);
    }

    if (fields.length === 0) return false;

    values.push(id, userId);
    const sql = `UPDATE learning_tasks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
    const [result] = await pool.execute(sql, values);
    return result.affectedRows > 0;
  }

  static async updateDDLTask(id, userId, taskData) {
    const { title, description, courseId, planId, deadline, estimatedMinutes } = taskData;
    
    const priority = this.calculatePriority(deadline, estimatedMinutes);
    
    const sql = `
      UPDATE learning_tasks 
      SET name = ?, description = ?, course_id = ?, plan_id = ?, deadline = ?, estimated_minutes = ?, priority = ?
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await pool.execute(sql, [
      title,
      description || null,
      courseId || null,
      planId || null,
      deadline,
      estimatedMinutes || 60,
      priority,
      id,
      userId
    ]);
    return result.affectedRows > 0;
  }

  static async update(id, userId, taskData) {
    const fields = [];
    const values = [];

    if (taskData.name !== undefined) {
      fields.push('name = ?');
      values.push(taskData.name);
    }
    if (taskData.description !== undefined) {
      fields.push('description = ?');
      values.push(taskData.description || null);
    }
    if (taskData.planned_duration !== undefined) {
      fields.push('planned_duration = ?');
      values.push(taskData.planned_duration);
    }
    if (taskData.planned_date !== undefined) {
      fields.push('planned_date = ?');
      values.push(taskData.planned_date || null);
    }
    if (taskData.difficulty !== undefined) {
      fields.push('difficulty = ?');
      values.push(taskData.difficulty);
    }
    if (taskData.deadline !== undefined) {
      fields.push('deadline = ?');
      values.push(taskData.deadline || null);
    }

    if (fields.length === 0) return false;

    values.push(id, userId);
    const sql = `UPDATE learning_tasks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
    const [result] = await pool.execute(sql, values);
    return result.affectedRows > 0;
  }

  static async findDDLByUserId(userId) {
    const sql = `
      SELECT t.*, c.name as course_name, c.color as course_color
      FROM learning_tasks t
      LEFT JOIN courses c ON t.course_id = c.id
      WHERE t.user_id = ? AND t.task_type = 'ddl'
      ORDER BY t.deadline ASC, t.priority DESC
    `;
    const [rows] = await pool.execute(sql, [userId]);
    return rows;
  }

  static async findDDLByPlanId(planId, userId) {
    const sql = `
      SELECT t.*, c.name as course_name, c.color as course_color
      FROM learning_tasks t
      LEFT JOIN courses c ON t.course_id = c.id
      WHERE t.plan_id = ? AND t.user_id = ? AND t.task_type = 'ddl'
      ORDER BY t.deadline ASC, t.priority DESC
    `;
    const [rows] = await pool.execute(sql, [planId, userId]);
    return rows;
  }

  static async findByPlanId(planId, userId) {
    const sql = `
      SELECT * FROM learning_tasks
      WHERE plan_id = ? AND user_id = ? AND (task_type IS NULL OR task_type != 'ddl')
      ORDER BY sort_order ASC, created_at ASC
    `;
    const [rows] = await pool.execute(sql, [planId, userId]);
    return rows;
  }

  static async findByPhaseId(phaseId) {
    const sql = `
      SELECT * FROM learning_tasks
      WHERE phase_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `;
    const [rows] = await pool.execute(sql, [phaseId]);
    return rows;
  }

  static async updateOrder(taskId, sortOrder, phaseId) {
    const sql = `
      UPDATE learning_tasks
      SET sort_order = ?, phase_id = COALESCE(?, phase_id)
      WHERE id = ?
    `;
    const [result] = await pool.execute(sql, [sortOrder, phaseId, taskId]);
    return result.affectedRows > 0;
  }

  static async findCompletedByPlanId(planId, userId) {
    const sql = `
      SELECT * FROM learning_tasks
      WHERE plan_id = ? AND user_id = ? AND status = 2
      ORDER BY completed_at DESC
    `;
    const [rows] = await pool.execute(sql, [planId, userId]);
    return rows;
  }

  static async deleteByPlanId(planId, userId, keepCompleted = false) {
    let sql;
    let params;
    
    if (keepCompleted) {
      sql = `DELETE FROM learning_tasks WHERE plan_id = ? AND user_id = ? AND status = 0`;
      params = [planId, userId];
    } else {
      sql = `DELETE FROM learning_tasks WHERE plan_id = ? AND user_id = ?`;
      params = [planId, userId];
    }
    
    const [result] = await pool.execute(sql, params);
    return result.affectedRows;
  }

  static async countByPhaseId(phaseId) {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as completed
      FROM learning_tasks
      WHERE phase_id = ?
    `;
    const [rows] = await pool.execute(sql, [phaseId]);
    return rows[0];
  }

  static async getCompletionStats(planId, userId) {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as inProgress
      FROM learning_tasks
      WHERE plan_id = ? AND user_id = ?
    `;
    const [rows] = await pool.execute(sql, [planId, userId]);
    return rows[0];
  }

  static async updateAutoScore(id, score) {
    const sql = `
      UPDATE learning_tasks
      SET auto_score = ?
      WHERE id = ?
    `;
    const [result] = await pool.execute(sql, [score, id]);
    return result.affectedRows > 0;
  }

  static async findByIdWithoutUser(id) {
    const sql = 'SELECT * FROM learning_tasks WHERE id = ?';
    const [rows] = await pool.execute(sql, [id]);
    return rows[0];
  }

  static async createQuizTask(userId, taskData) {
    const { title, description, taskSubtype, questionData, planId, phaseId } = taskData;
    
    const taskName = await this.getUniqueTaskName(userId, title);
    
    const sql = `
      INSERT INTO learning_tasks (
        user_id, plan_id, phase_id, name, description, 
        task_type, task_subtype, question_data, status
      )
      VALUES (?, ?, ?, ?, ?, 'quiz', ?, ?, 0)
    `;
    const [result] = await pool.execute(sql, [
      userId,
      planId || null,
      phaseId || null,
      taskName,
      description || null,
      taskSubtype || 'single_choice',
      JSON.stringify(questionData)
    ]);
    return result.insertId;
  }
}

module.exports = LearningTaskModel;