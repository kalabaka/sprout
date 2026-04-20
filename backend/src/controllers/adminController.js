/**
 * 管理员控制器 - 用户管理和资源管理 API
 */
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

// 1. 获取系统概览数据
exports.getDashboardStats = async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT COUNT(*) as total FROM user');
    const [plans] = await pool.execute('SELECT COUNT(*) as total FROM learning_plan');
    const [activePlans] = await pool.execute("SELECT COUNT(*) as total FROM learning_plan WHERE status = 'active'");
    const [tasks] = await pool.execute('SELECT COUNT(*) as total FROM learning_tasks');
    const [completedTasks] = await pool.execute('SELECT COUNT(*) as total FROM learning_tasks WHERE status = 2');
    const [todayUsers] = await pool.execute("SELECT COUNT(*) as total FROM user WHERE DATE(created_at) = CURDATE()");
    const [bannedUsers] = await pool.execute("SELECT COUNT(*) as total FROM user WHERE status = 'banned'");
    
    const [todayActive] = await pool.execute(`
      SELECT COUNT(DISTINCT user_id) as total 
      FROM study_sessions 
      WHERE DATE(start_time) = CURDATE()
    `);
    
    const [highRiskUsers] = await pool.execute(`
      SELECT COUNT(DISTINCT user_id) as total 
      FROM intervention_logs 
      WHERE intervention_type = 'warning' 
        AND sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    const [mediumRiskUsers] = await pool.execute(`
      SELECT COUNT(DISTINCT user_id) as total 
      FROM intervention_logs 
      WHERE intervention_type = 'suggestion' 
        AND sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    const [lowRiskUsers] = await pool.execute(`
      SELECT COUNT(DISTINCT user_id) as total 
      FROM intervention_logs 
      WHERE intervention_type = 'motivation' 
        AND sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    
    const [pendingFeedback] = await pool.execute(`
      SELECT COUNT(*) as total 
      FROM intervention_logs 
      WHERE read_at IS NULL
    `);

    res.json({
      success: true,
      data: {
        totalUsers: users[0].total,
        totalPlans: plans[0].total,
        activePlans: activePlans[0].total,
        totalTasks: tasks[0].total,
        completedTasks: completedTasks[0].total,
        todayUsers: todayUsers[0].total,
        todayActive: todayActive[0].total,
        bannedUsers: bannedUsers[0].total,
        riskUsers: {
          high: highRiskUsers[0].total,
          medium: mediumRiskUsers[0].total,
          low: lowRiskUsers[0].total
        },
        pendingFeedback: pendingFeedback[0].total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. 获取用户列表 (支持分页和搜索)
exports.getUserList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const keyword = req.query.keyword || '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    if (keyword) {
      whereClause = 'WHERE username LIKE ? OR email LIKE ? OR nickname LIKE ?';
      params = [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`];
    }

    // 查询列表
    const listQuery = `SELECT id, username, email, nickname, created_at, status FROM user ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const [rows] = await pool.execute(listQuery, [...params, limit, offset]);

    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM user ${whereClause}`;
    const [countRows] = await pool.execute(countQuery, params);

    res.json({
      success: true,
      data: rows,
      total: countRows[0].total,
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. 禁用/启用用户
exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId, status } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: '缺少用户ID' });
    }

    if (!['active', 'banned'].includes(status)) {
      return res.status(400).json({ success: false, message: '无效的状态值' });
    }

    await pool.execute('UPDATE user SET status = ? WHERE id = ?', [status, userId]);

    res.json({ success: true, message: `用户状态已更新为 ${status === 'active' ? '正常' : '禁用'}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. 获取指定用户详情
exports.getUserDetail = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await pool.execute(
      'SELECT id, username, email, nickname, avatar, created_at, status FROM user WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const [stats] = await pool.execute(
      `SELECT
        COUNT(*) as totalTasks,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as completedTasks,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as inProgressTasks,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as pendingTasks,
        SUM(actual_duration) as totalTime,
        AVG(self_score) as avgScore
      FROM learning_tasks WHERE user_id = ?`,
      [userId]
    );

    const [plans] = await pool.execute(
      `SELECT 
        id, name, status, progress, goal_type, created_at,
        total_tasks, completed_tasks
      FROM learning_plan 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 10`,
      [userId]
    );

    const [planCount] = await pool.execute(
      'SELECT COUNT(*) as total FROM learning_plan WHERE user_id = ?',
      [userId]
    );

    const [studySessions] = await pool.execute(
      `SELECT 
        COUNT(*) as totalSessions,
        COALESCE(SUM(duration_minutes), 0) as totalMinutes,
        COALESCE(SUM(CASE WHEN DATE(start_time) = CURDATE() THEN duration_minutes ELSE 0 END), 0) as todayMinutes
      FROM study_sessions 
      WHERE user_id = ? AND status = 'completed'`,
      [userId]
    );

    const [interventions] = await pool.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) as unread
      FROM intervention_logs 
      WHERE user_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        ...rows[0],
        stats: stats[0],
        plans: plans,
        planCount: planCount[0].total,
        studySessions: studySessions[0],
        interventions: interventions[0]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. 添加学习资源
exports.addResource = async (req, res) => {
  try {
    const { title, type, url, tags, difficulty_level, status } = req.body;
    const adminId = req.admin.id;

    if (!title || !type || !url) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    if (!['video', 'document', 'exercise'].includes(type)) {
      return res.status(400).json({ success: false, message: '无效的资源类型' });
    }

    const [result] = await pool.execute(
      'INSERT INTO learning_resources (title, type, url, tags, difficulty_level, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, type, url, JSON.stringify(tags || []), difficulty_level || 1, status || 'active', adminId]
    );

    res.json({
      success: true,
      message: '资源添加成功',
      resourceId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. 获取学习资源列表
exports.getResourceList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const keyword = req.query.keyword || '';
    const type = req.query.type || '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    if (keyword || type) {
      const conditions = [];
      if (keyword) {
        conditions.push('(title LIKE ? OR tags LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`);
      }
      if (type) {
        conditions.push('type = ?');
        params.push(type);
      }
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const listQuery = `SELECT * FROM learning_resources ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const [rows] = await pool.execute(listQuery, [...params, limit, offset]);

    const countQuery = `SELECT COUNT(*) as total FROM learning_resources ${whereClause}`;
    const [countRows] = await pool.execute(countQuery, params);

    res.json({
      success: true,
      data: rows,
      total: countRows[0].total,
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. 更新学习资源
exports.updateResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { title, type, url, tags, difficulty_level, status } = req.body;

    const updates = [];
    const params = [];

    if (title) {
      updates.push('title = ?');
      params.push(title);
    }
    if (type) {
      if (!['video', 'document', 'exercise'].includes(type)) {
        return res.status(400).json({ success: false, message: '无效的资源类型' });
      }
      updates.push('type = ?');
      params.push(type);
    }
    if (url) {
      updates.push('url = ?');
      params.push(url);
    }
    if (tags) {
      updates.push('tags = ?');
      params.push(JSON.stringify(tags));
    }
    if (difficulty_level) {
      updates.push('difficulty_level = ?');
      params.push(difficulty_level);
    }
    if (status) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ success: false, message: '无效的状态值' });
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有要更新的字段' });
    }

    params.push(resourceId);
    const sql = `UPDATE learning_resources SET ${updates.join(', ')} WHERE id = ?`;

    await pool.execute(sql, params);

    res.json({ success: true, message: '资源更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. 删除学习资源
exports.deleteResource = async (req, res) => {
  try {
    const { resourceId } = req.params;

    const [result] = await pool.execute('DELETE FROM learning_resources WHERE id = ?', [resourceId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '资源不存在' });
    }

    res.json({ success: true, message: '资源删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 9. 获取干预日志统计
exports.getInterventionStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const [rows] = await pool.execute(
      `SELECT
        DATE(sent_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN user_response = 'adopted' THEN 1 ELSE 0 END) as adopted,
        SUM(CASE WHEN user_response = 'ignored' THEN 1 ELSE 0 END) as ignored
      FROM intervention_logs
      WHERE sent_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(sent_at)
      ORDER BY date DESC`,
      [parseInt(days)]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 10. 获取管理员信息
exports.getAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.id;

    const [rows] = await pool.execute(
      'SELECT id, username, role, created_at FROM admins WHERE id = ?',
      [adminId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '管理员不存在' });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 11. 修改管理员密码
exports.changeAdminPassword = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: '两次输入的新密码不一致' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: '新密码长度至少6位' });
    }

    const [rows] = await pool.execute('SELECT password FROM admins WHERE id = ?', [adminId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '管理员不存在' });
    }

    const currentHashedPassword = rows[0].password;

    const isMatch = await bcrypt.compare(oldPassword, currentHashedPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: '原密码错误' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.execute('UPDATE admins SET password = ? WHERE id = ?', [newHashedPassword, adminId]);

    res.json({ success: true, message: '密码修改成功，请重新登录' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 11. 删除用户
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: '缺少用户ID' });
    }

    const [users] = await pool.execute('SELECT id FROM user WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    await pool.execute('DELETE FROM user WHERE id = ?', [userId]);

    res.json({ success: true, message: '用户删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== 管理员账号管理 ====================

// 12. 获取管理员列表
exports.getAdminList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const keyword = req.query.keyword || '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    if (keyword) {
      whereClause = 'WHERE username LIKE ?';
      params = [`%${keyword}%`];
    }

    const listQuery = `SELECT id, username, role, created_at FROM admins ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const [rows] = await pool.execute(listQuery, [...params, limit, offset]);

    const countQuery = `SELECT COUNT(*) as total FROM admins ${whereClause}`;
    const [countRows] = await pool.execute(countQuery, params);

    res.json({
      success: true,
      data: rows,
      total: countRows[0].total,
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 13. 添加管理员
exports.addAdmin = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    if (!['super_admin', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: '无效的角色类型' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '密码长度至少6位' });
    }

    const [existing] = await pool.execute('SELECT id FROM admins WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    const [countRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM admins WHERE role = ?',
      [role]
    );
    const currentCount = countRows[0].count;

    if (role === 'super_admin' && currentCount >= 3) {
      return res.status(400).json({ success: false, message: '超级管理员数量已达上限（最多3个）' });
    }

    if (role === 'admin' && currentCount >= 9) {
      return res.status(400).json({ success: false, message: '普通管理员数量已达上限（最多9个）' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.execute(
      'INSERT INTO admins (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );

    res.json({
      success: true,
      message: '管理员添加成功',
      adminId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 14. 更新管理员信息
exports.updateAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { username, role } = req.body;

    if (!adminId) {
      return res.status(400).json({ success: false, message: '缺少管理员ID' });
    }

    const [existing] = await pool.execute('SELECT id, role FROM admins WHERE id = ?', [adminId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: '管理员不存在' });
    }

    if (role && !['super_admin', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: '无效的角色类型' });
    }

    const updates = [];
    const params = [];

    if (username) {
      const [duplicate] = await pool.execute('SELECT id FROM admins WHERE username = ? AND id != ?', [username, adminId]);
      if (duplicate.length > 0) {
        return res.status(400).json({ success: false, message: '用户名已存在' });
      }
      updates.push('username = ?');
      params.push(username);
    }

    if (role && role !== existing[0].role) {
      const [countRows] = await pool.execute(
        'SELECT COUNT(*) as count FROM admins WHERE role = ?',
        [role]
      );
      const currentCount = countRows[0].count;

      if (role === 'super_admin' && currentCount >= 3) {
        return res.status(400).json({ success: false, message: '超级管理员数量已达上限（最多3个）' });
      }

      if (role === 'admin' && currentCount >= 9) {
        return res.status(400).json({ success: false, message: '普通管理员数量已达上限（最多9个）' });
      }

      updates.push('role = ?');
      params.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有要更新的字段' });
    }

    params.push(adminId);
    const sql = `UPDATE admins SET ${updates.join(', ')} WHERE id = ?`;
    await pool.execute(sql, params);

    res.json({ success: true, message: '管理员信息更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 15. 删除管理员
exports.deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const currentAdminId = req.admin.id;

    if (!adminId) {
      return res.status(400).json({ success: false, message: '缺少管理员ID' });
    }

    if (parseInt(adminId) === currentAdminId) {
      return res.status(400).json({ success: false, message: '不能删除自己的账号' });
    }

    const [existing] = await pool.execute('SELECT id FROM admins WHERE id = ?', [adminId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: '管理员不存在' });
    }

    await pool.execute('DELETE FROM admins WHERE id = ?', [adminId]);

    res.json({ success: true, message: '管理员删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 16. 重置管理员密码
exports.resetAdminPassword = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { newPassword } = req.body;

    if (!adminId) {
      return res.status(400).json({ success: false, message: '缺少管理员ID' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: '密码长度至少6位' });
    }

    const [existing] = await pool.execute('SELECT id FROM admins WHERE id = ?', [adminId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: '管理员不存在' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.execute('UPDATE admins SET password = ? WHERE id = ?', [hashedPassword, adminId]);

    res.json({ success: true, message: '密码重置成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== 系统配置 ====================

// 17. 获取系统配置
exports.getSystemConfig = async (req, res) => {
  try {
    const SystemConfigService = require('../services/systemConfigService');
    const configs = await SystemConfigService.getAll();
    
    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 18. 更新系统配置
exports.updateSystemConfig = async (req, res) => {
  try {
    const { key, value, description } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({ success: false, message: '配置键和值不能为空' });
    }
    
    const SystemConfigService = require('../services/systemConfigService');
    const result = await SystemConfigService.set(key, value, description);
    
    if (result) {
      res.json({ success: true, message: '配置更新成功' });
    } else {
      res.status(400).json({ success: false, message: '配置更新失败' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 19. 获取风险用户列表
exports.getRiskUsers = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    
    const [rows] = await pool.execute(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.status,
        u.created_at,
        MAX(il.sent_at) as last_intervention,
        COUNT(CASE WHEN il.intervention_type = 'warning' THEN 1 END) as warning_count,
        COUNT(CASE WHEN il.intervention_type = 'suggestion' THEN 1 END) as suggestion_count,
        COUNT(CASE WHEN il.intervention_type = 'motivation' THEN 1 END) as motivation_count,
        COUNT(*) as total_interventions
      FROM user u
      INNER JOIN intervention_logs il ON u.id = il.user_id
      WHERE il.sent_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY u.id, u.username, u.email, u.status, u.created_at
      ORDER BY warning_count DESC, suggestion_count DESC, total_interventions DESC
    `, [days]);

    let lastActiveMap = new Map();
    if (rows.length > 0) {
      const [lastActiveRows] = await pool.execute(`
        SELECT 
          user_id,
          MAX(start_time) as last_active
        FROM study_sessions
        WHERE user_id IN (${rows.map(r => r.id).join(',')})
        GROUP BY user_id
      `);
      lastActiveMap = new Map(lastActiveRows.map(r => [r.user_id, r.last_active]));
    }

    const riskUsers = rows.map(user => {
      let riskLevel = '低';
      let riskScore = 70;
      let reason = '学习状态需要关注';

      if (user.warning_count >= 2) {
        riskLevel = '高';
        riskScore = 25;
        reason = '多次触发高风险预警，需要重点关注';
      } else if (user.warning_count >= 1) {
        riskLevel = '高';
        riskScore = 35;
        reason = '触发高风险预警，学习状态堪忧';
      } else if (user.suggestion_count >= 3) {
        riskLevel = '中';
        riskScore = 45;
        reason = '多次收到学习建议，任务完成率较低';
      } else if (user.suggestion_count >= 1) {
        riskLevel = '中';
        riskScore = 55;
        reason = '学习进度落后，需要督促';
      } else if (user.motivation_count >= 2) {
        riskLevel = '低';
        riskScore = 65;
        reason = '学习积极性下降，需要激励';
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        status: user.status,
        riskLevel,
        riskScore,
        reason,
        lastActive: lastActiveMap.get(user.id) || user.last_intervention,
        totalInterventions: user.total_interventions,
        warningCount: user.warning_count,
        suggestionCount: user.suggestion_count
      };
    });

    const highRisk = riskUsers.filter(u => u.riskLevel === '高').length;
    const mediumRisk = riskUsers.filter(u => u.riskLevel === '中').length;
    const lowRisk = riskUsers.filter(u => u.riskLevel === '低').length;

    res.json({
      success: true,
      data: {
        users: riskUsers,
        summary: {
          total: riskUsers.length,
          high: highRisk,
          medium: mediumRisk,
          low: lowRisk
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 20. 获取用户反馈列表
exports.getUserFeedback = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE il.feedback IS NOT NULL';
    let params = [];

    if (status === 'pending') {
      whereClause += ' AND il.read_at IS NULL';
    } else if (status === 'handled') {
      whereClause += ' AND il.read_at IS NOT NULL';
    }

    const listQuery = `
      SELECT 
        il.id,
        il.user_id,
        u.username,
        il.intervention_type as type,
        il.title,
        il.content,
        il.feedback,
        il.feedback_at as createdAt,
        il.read_at,
        CASE WHEN il.read_at IS NULL THEN 'pending' ELSE 'handled' END as status
      FROM intervention_logs il
      LEFT JOIN user u ON il.user_id = u.id
      ${whereClause}
      ORDER BY il.feedback_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.execute(listQuery, [...params, limit, offset]);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM intervention_logs il
      ${whereClause}
    `;
    const [countRows] = await pool.execute(countQuery, params);

    const pendingQuery = `
      SELECT COUNT(*) as total
      FROM intervention_logs
      WHERE feedback IS NOT NULL AND read_at IS NULL
    `;
    const [pendingRows] = await pool.execute(pendingQuery);

    const feedbackList = rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      username: row.username || '未知用户',
      type: getFeedbackType(row.type, row.feedback),
      title: row.title,
      content: row.feedback === 'helpful' 
        ? `用户认为干预有帮助: ${row.title}` 
        : row.feedback === 'not_helpful'
        ? `用户认为干预无帮助: ${row.title}`
        : row.feedback || row.content,
      originalContent: row.content,
      feedback: row.feedback,
      createdAt: row.createdAt,
      status: row.status
    }));

    res.json({
      success: true,
      data: feedbackList,
      total: countRows[0].total,
      page,
      limit,
      pendingCount: pendingRows[0].total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 21. 处理用户反馈
exports.handleUserFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { reply } = req.body;

    await pool.execute(
      'UPDATE intervention_logs SET read_at = NOW() WHERE id = ?',
      [feedbackId]
    );

    res.json({ success: true, message: '反馈已处理' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

function getFeedbackType(interventionType, feedback) {
  if (feedback === 'helpful') return '正面反馈';
  if (feedback === 'not_helpful') return '负面反馈';
  
  const types = {
    'warning': '风险预警',
    'suggestion': '学习建议',
    'motivation': '激励鼓励',
    'feedback': '任务反馈'
  };
  return types[interventionType] || '其他';
}

// 22. 获取统计数据
exports.getStatistics = async (req, res) => {
  try {
    const range = req.query.range || 'week';
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    let userDateCondition = '';
    let sessionDateCondition = '';
    let planDateCondition = '';
    let interventionDateCondition = '';
    let taskDateCondition = '';
    let params = [];
    
    if (range === 'today') {
      userDateCondition = 'DATE(created_at) = CURDATE()';
      sessionDateCondition = 'DATE(start_time) = CURDATE()';
      planDateCondition = 'DATE(created_at) = CURDATE()';
      interventionDateCondition = 'DATE(sent_at) = CURDATE()';
      taskDateCondition = 'DATE(completed_at) = CURDATE()';
    } else if (range === 'week') {
      userDateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      sessionDateCondition = 'start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      planDateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      interventionDateCondition = 'sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      taskDateCondition = 'completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (range === 'month') {
      userDateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      sessionDateCondition = 'start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      planDateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      interventionDateCondition = 'sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      taskDateCondition = 'completed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    } else if (range === 'custom' && startDate && endDate) {
      params = [startDate, endDate + ' 23:59:59'];
      userDateCondition = 'created_at BETWEEN ? AND ?';
      sessionDateCondition = 'start_time BETWEEN ? AND ?';
      planDateCondition = 'created_at BETWEEN ? AND ?';
      interventionDateCondition = 'sent_at BETWEEN ? AND ?';
      taskDateCondition = 'completed_at BETWEEN ? AND ?';
    } else {
      userDateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      sessionDateCondition = 'start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      planDateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      interventionDateCondition = 'sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      taskDateCondition = 'completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    }

    const [userGrowth] = await pool.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users
      FROM user 
      WHERE ${userDateCondition}
      GROUP BY DATE(created_at)
      ORDER BY date
    `, params);

    const [totalUsers] = await pool.execute('SELECT COUNT(*) as total FROM user');
    const [prevTotalUsers] = await pool.execute(`
      SELECT COUNT(*) as total FROM user 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    const userGrowthRate = prevTotalUsers[0].total > 0 
      ? ((totalUsers[0].total - prevTotalUsers[0].total) / prevTotalUsers[0].total * 100).toFixed(1)
      : 0;

    const [activeUsers] = await pool.execute(`
      SELECT 
        DATE(start_time) as date,
        COUNT(DISTINCT user_id) as dau
      FROM study_sessions 
      WHERE ${sessionDateCondition}
      GROUP BY DATE(start_time)
      ORDER BY date
    `, params);

    const [todayActive] = await pool.execute(`
      SELECT COUNT(DISTINCT user_id) as dau FROM study_sessions WHERE DATE(start_time) = CURDATE()
    `);

    const [planDistribution] = await pool.execute(`
      SELECT 
        goal_type as name,
        COUNT(*) as value
      FROM learning_plan
      WHERE ${planDateCondition}
      GROUP BY goal_type
    `, params);

    const [heatmapData] = await pool.execute(`
      SELECT 
        DAYOFWEEK(start_time) as day_of_week,
        HOUR(start_time) as hour,
        SUM(duration_minutes) as total_minutes
      FROM study_sessions
      WHERE start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DAYOFWEEK(start_time), HOUR(start_time)
    `);

    const [taskStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as completed
      FROM learning_tasks
    `);

    const [studyTime] = await pool.execute(`
      SELECT COALESCE(SUM(duration_minutes), 0) as total FROM study_sessions WHERE status = 'completed'
    `);

    const [planCount] = await pool.execute('SELECT COUNT(*) as total FROM learning_plan');

    const [riskTrend] = await pool.execute(`
      SELECT 
        DATE(sent_at) as date,
        SUM(CASE WHEN intervention_type = 'warning' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN intervention_type = 'suggestion' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN intervention_type = 'motivation' THEN 1 ELSE 0 END) as low
      FROM intervention_logs
      WHERE ${interventionDateCondition}
      GROUP BY DATE(sent_at)
      ORDER BY date
    `, params);

    const [planCountInRange] = await pool.execute(`
      SELECT COUNT(*) as count FROM learning_plan WHERE ${planDateCondition}
    `, params);

    const [taskCountInRange] = await pool.execute(`
      SELECT COUNT(*) as count FROM learning_tasks WHERE status = 2 AND ${taskDateCondition}
    `, params);

    const [sessionCountInRange] = await pool.execute(`
      SELECT COUNT(*) as count FROM study_sessions WHERE ${sessionDateCondition}
    `, params);

    const maxCount = Math.max(planCountInRange[0].count, taskCountInRange[0].count, sessionCountInRange[0].count, 1);
    const finalFeatureRanking = [
      { name: '创建学习计划', count: planCountInRange[0].count, percentage: Math.round(planCountInRange[0].count / maxCount * 100) },
      { name: '任务打卡', count: taskCountInRange[0].count, percentage: Math.round(taskCountInRange[0].count / maxCount * 100) },
      { name: '学习会话', count: sessionCountInRange[0].count, percentage: Math.round(sessionCountInRange[0].count / maxCount * 100) }
    ].sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        userGrowth: {
          rate: userGrowthRate,
          data: userGrowth,
          total: totalUsers[0].total
        },
        activeUsers: {
          dau: todayActive[0].dau || 0,
          data: activeUsers
        },
        planDistribution: planDistribution.map(p => ({
          name: p.name || '其他',
          value: p.value
        })),
        heatmapData: heatmapData,
        riskTrend: riskTrend,
        featureRanking: finalFeatureRanking,
        summaries: {
          totalUsers: totalUsers[0].total,
          totalPlans: planCount[0].total,
          completedTasks: taskStats[0].completed || 0,
          totalStudyTime: studyTime[0].total || 0
        }
      }
    });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 23. 获取操作日志
exports.getOperationLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const action = req.query.action || '';
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (action) {
      whereConditions.push('action = ?');
      params.push(action);
    }
    if (startDate) {
      whereConditions.push('DATE(created_at) >= ?');
      params.push(startDate);
    }
    if (endDate) {
      whereConditions.push('DATE(created_at) <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const [logs] = await pool.execute(`
      SELECT * FROM operation_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const [countRows] = await pool.execute(`
      SELECT COUNT(*) as total FROM operation_logs ${whereClause}
    `, params);

    res.json({
      success: true,
      data: logs,
      total: countRows[0].total,
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 24. 记录操作日志
exports.logOperation = async (operatorId, operatorName, action, targetType, targetId, targetName, detail, ipAddress) => {
  try {
    await pool.execute(`
      INSERT INTO operation_logs (operator_id, operator_name, action, target_type, target_id, target_name, detail, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [operatorId, operatorName, action, targetType, targetId, targetName, detail, ipAddress]);
  } catch (error) {
    console.error('Log operation error:', error);
  }
};

// 25. 获取错误日志
exports.getErrorLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const level = req.query.level || '';
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (level) {
      whereConditions.push('level = ?');
      params.push(level.toUpperCase());
    }
    if (startDate) {
      whereConditions.push('DATE(created_at) >= ?');
      params.push(startDate);
    }
    if (endDate) {
      whereConditions.push('DATE(created_at) <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const [logs] = await pool.execute(`
      SELECT * FROM error_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const [countRows] = await pool.execute(`
      SELECT COUNT(*) as total FROM error_logs ${whereClause}
    `, params);

    res.json({
      success: true,
      data: logs,
      total: countRows[0].total,
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 26. 记录错误日志
exports.logError = async (level, message, source, stackTrace, requestUrl, requestMethod, userId, ipAddress) => {
  try {
    await pool.execute(`
      INSERT INTO error_logs (level, message, source, stack_trace, request_url, request_method, user_id, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [level, message, source, stackTrace, requestUrl, requestMethod, userId, ipAddress]);
  } catch (error) {
    console.error('Log error error:', error);
  }
};

// 27. 获取通知模板列表
exports.getNotificationTemplates = async (req, res) => {
  try {
    const [templates] = await pool.execute(`
      SELECT * FROM notification_templates ORDER BY created_at DESC
    `);
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 28. 获取单个通知模板
exports.getNotificationTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const [templates] = await pool.execute(`
      SELECT * FROM notification_templates WHERE id = ?
    `, [id]);
    if (templates.length === 0) {
      return res.status(404).json({ success: false, message: '模板不存在' });
    }
    res.json({ success: true, data: templates[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 29. 创建通知模板
exports.createNotificationTemplate = async (req, res) => {
  try {
    const { name, type, content, variables, enabled } = req.body;
    if (!name || !type || !content) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }
    const [result] = await pool.execute(`
      INSERT INTO notification_templates (name, type, content, variables, enabled)
      VALUES (?, ?, ?, ?, ?)
    `, [name, type, content, JSON.stringify(variables || []), enabled !== false]);
    res.json({ success: true, data: { id: result.insertId, name, type, content, variables, enabled: enabled !== false } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 30. 更新通知模板
exports.updateNotificationTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, content, variables, enabled } = req.body;
    await pool.execute(`
      UPDATE notification_templates 
      SET name = ?, type = ?, content = ?, variables = ?, enabled = ?
      WHERE id = ?
    `, [name, type, content, JSON.stringify(variables || []), enabled, id]);
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 31. 删除通知模板
exports.deleteNotificationTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute(`DELETE FROM notification_templates WHERE id = ?`, [id]);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 32. 切换模板启用状态
exports.toggleNotificationTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    await pool.execute(`
      UPDATE notification_templates SET enabled = ? WHERE id = ?
    `, [enabled, id]);
    res.json({ success: true, message: '状态更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 33. 获取管理员待处理事项
exports.getPendingItems = async (req, res) => {
  try {
    const items = [];

    const [pendingFeedback] = await pool.execute(`
      SELECT il.id, il.user_id, il.title, il.content, il.sent_at as time, u.username
      FROM intervention_logs il
      LEFT JOIN user u ON il.user_id = u.id
      WHERE il.read_at IS NULL
      ORDER BY il.sent_at DESC
      LIMIT 10
    `);

    pendingFeedback.forEach(item => {
      items.push({
        id: `feedback_${item.id}`,
        type: 'feedback',
        title: item.title || '用户反馈待处理',
        content: item.content,
        time: item.time,
        username: item.username,
        priority: 'warning',
        priorityText: '中',
        targetId: item.id
      });
    });

    const [riskUsers] = await pool.execute(`
      SELECT DISTINCT il.user_id, u.username, MAX(il.sent_at) as last_time
      FROM intervention_logs il
      LEFT JOIN user u ON il.user_id = u.id
      WHERE il.intervention_type = 'warning' 
        AND il.sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY il.user_id, u.username
      ORDER BY last_time DESC
      LIMIT 5
    `);

    riskUsers.forEach(item => {
      items.push({
        id: `risk_${item.user_id}`,
        type: 'risk',
        title: `用户 ${item.username || '未知'} 触发风险预警`,
        time: item.last_time,
        username: item.username,
        priority: 'danger',
        priorityText: '高',
        targetId: item.user_id
      });
    });

    items.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({
      success: true,
      data: items.slice(0, 10),
      total: items.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 34. 标记待处理事项已读
exports.markPendingItemRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (id.startsWith('feedback_')) {
      const feedbackId = id.replace('feedback_', '');
      await pool.execute(`
        UPDATE intervention_logs SET read_at = NOW() WHERE id = ?
      `, [feedbackId]);
    }

    res.json({ success: true, message: '已标记为已读' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 35. 获取实时动态
exports.getActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const activities = [];

    const [newUsers] = await pool.execute(`
      SELECT id, username, created_at 
      FROM user 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    newUsers.forEach(user => {
      activities.push({
        id: `register_${user.id}`,
        type: 'register',
        username: user.username,
        action: '刚刚注册',
        target: '',
        time: user.created_at
      });
    });

    const [newPlans] = await pool.execute(`
      SELECT lp.id, lp.title, lp.created_at, u.username 
      FROM learning_plan lp
      LEFT JOIN user u ON lp.user_id = u.id
      WHERE lp.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY lp.created_at DESC 
      LIMIT 10
    `);
    newPlans.forEach(plan => {
      activities.push({
        id: `plan_${plan.id}`,
        type: 'plan',
        username: plan.username || '未知用户',
        action: '创建了学习计划',
        target: plan.title,
        time: plan.created_at
      });
    });

    const [completedTasks] = await pool.execute(`
      SELECT lt.id, lt.task_name, lt.updated_at, u.username 
      FROM learning_tasks lt
      LEFT JOIN user u ON lt.user_id = u.id
      WHERE lt.status = 2 
        AND lt.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY lt.updated_at DESC 
      LIMIT 10
    `);
    completedTasks.forEach(task => {
      activities.push({
        id: `task_${task.id}`,
        type: 'task',
        username: task.username || '未知用户',
        action: '完成了任务',
        target: task.task_name,
        time: task.updated_at
      });
    });

    const [riskWarnings] = await pool.execute(`
      SELECT il.id, il.user_id, il.sent_at, u.username 
      FROM intervention_logs il
      LEFT JOIN user u ON il.user_id = u.id
      WHERE il.intervention_type = 'warning'
        AND il.sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY il.sent_at DESC 
      LIMIT 5
    `);
    riskWarnings.forEach(warning => {
      activities.push({
        id: `risk_${warning.id}`,
        type: 'risk',
        username: warning.username || '未知用户',
        action: '触发风险预警',
        target: '',
        time: warning.sent_at
      });
    });

    try {
      const [badges] = await pool.execute(`
        SELECT ub.id, ub.earned_at, u.username, b.name as badge_name
        FROM user_badges ub
        LEFT JOIN user u ON ub.user_id = u.id
        LEFT JOIN badges b ON ub.badge_id = b.id
        WHERE ub.earned_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY ub.earned_at DESC 
        LIMIT 10
      `);
      badges.forEach(badge => {
        activities.push({
          id: `badge_${badge.id}`,
          type: 'badge',
          username: badge.username || '未知用户',
          action: '获得了勋章',
          target: badge.badge_name || '勋章',
          time: badge.earned_at
        });
      });
    } catch (e) {
      // 表可能不存在，忽略
    }

    const [studySessions] = await pool.execute(`
      SELECT ss.id, ss.user_id, ss.start_time, ss.duration, u.username 
      FROM study_sessions ss
      LEFT JOIN user u ON ss.user_id = u.id
      WHERE ss.duration >= 7200
        AND ss.start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY ss.start_time DESC 
      LIMIT 5
    `);
    studySessions.forEach(session => {
      const hours = Math.floor(session.duration / 3600);
      activities.push({
        id: `study_${session.id}`,
        type: 'study',
        username: session.username || '未知用户',
        action: '学习时长达到',
        target: `${hours}小时`,
        time: session.start_time
      });
    });

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({
      success: true,
      data: activities.slice(0, limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 36. 获取学习计划列表
exports.getPlans = async (req, res) => {
  try {
    const { keyword, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '1=1';
    const params = [];

    if (keyword) {
      whereClause += ' AND (lp.name LIKE ? OR u.username LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (status) {
      whereClause += ' AND lp.status = ?';
      params.push(status);
    }

    const [plans] = await pool.execute(`
      SELECT lp.id, lp.name as title, lp.status, lp.created_at, lp.start_date, lp.end_date,
             u.username,
             (SELECT COUNT(*) FROM learning_tasks lt WHERE lt.plan_id = lp.id) as total_tasks,
             (SELECT COUNT(*) FROM learning_tasks lt WHERE lt.plan_id = lp.id AND lt.status = 2) as completed_tasks
      FROM learning_plan lp
      LEFT JOIN user u ON lp.user_id = u.id
      WHERE ${whereClause}
      ORDER BY lp.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `, params);

    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM learning_plan lp
      LEFT JOIN user u ON lp.user_id = u.id
      WHERE ${whereClause}
    `, params);

    const formattedPlans = plans.map(plan => {
      const totalTasks = plan.total_tasks || 0;
      const completedTasks = plan.completed_tasks || 0;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: plan.id,
        title: plan.title,
        username: plan.username || '未知用户',
        status: plan.status,
        statusText: getStatusText(plan.status),
        progress,
        totalTasks,
        completedTasks,
        startDate: plan.start_date,
        endDate: plan.end_date,
        createdAt: plan.created_at
      };
    });

    res.json({
      success: true,
      data: formattedPlans,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('获取计划列表失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 37. 获取计划详情
exports.getPlanDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const [plans] = await pool.execute(`
      SELECT lp.id, lp.name as title, lp.status, lp.description, lp.goal, lp.goal_type,
             lp.start_date, lp.end_date, lp.target_date, lp.progress, lp.created_at, lp.updated_at,
             u.username
      FROM learning_plan lp
      LEFT JOIN user u ON lp.user_id = u.id
      WHERE lp.id = ?
    `, [id]);

    if (plans.length === 0) {
      return res.status(404).json({ success: false, message: '计划不存在' });
    }

    const plan = plans[0];

    const [tasks] = await pool.execute(`
      SELECT id, task_name, status, scheduled_date, completed_at
      FROM learning_tasks
      WHERE plan_id = ?
      ORDER BY scheduled_date ASC
    `, [id]);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 2).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      success: true,
      data: {
        ...plan,
        totalTasks,
        completedTasks,
        progress,
        statusText: getStatusText(plan.status),
        tasks
      }
    });
  } catch (error) {
    console.error('获取计划详情失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 38. 删除学习计划
exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const [plans] = await pool.execute('SELECT name FROM learning_plan WHERE id = ?', [id]);
    if (plans.length === 0) {
      return res.status(404).json({ success: false, message: '计划不存在' });
    }

    await pool.execute('DELETE FROM learning_tasks WHERE plan_id = ?', [id]);
    await pool.execute('DELETE FROM learning_plan WHERE id = ?', [id]);

    res.json({ success: true, message: '计划删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

function getStatusText(status) {
  const statusMap = {
    'draft': '草稿',
    'active': '进行中',
    'paused': '暂停',
    'completed': '已完成',
    'archived': '已归档'
  };
  return statusMap[status] || status;
};