/**
 * 管理员权限验证中间件
 * 确保只有 Admin 才能访问特定路由
 */
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

async function verifyAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '未提供Token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminId = decoded.id;

    // 检查是否为管理员
    const [rows] = await pool.execute(
      'SELECT id, username, role FROM admins WHERE id = ?',
      [adminId]
    );

    if (rows.length === 0) {
      return res.status(403).json({ success: false, message: '权限不足，仅限管理员访问' });
    }

    // 将管理员信息挂载到 req
    req.admin = rows[0];
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token无效' });
  }
}

/**
 * 超级管理员权限验证中间件
 * 确保只有 super_admin 才能访问特定路由
 */
async function verifySuperAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '未提供Token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminId = decoded.id;

    // 检查是否为超级管理员
    const [rows] = await pool.execute(
      'SELECT id, username, role FROM admins WHERE id = ? AND role = ?',
      [adminId, 'super_admin']
    );

    if (rows.length === 0) {
      return res.status(403).json({ success: false, message: '权限不足，仅限超级管理员访问' });
    }

    req.admin = rows[0];
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token无效' });
  }
}

module.exports = { verifyAdmin, verifySuperAdmin };