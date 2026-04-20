/**
 * 用户服务层
 * 处理业务逻辑
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const UserModel = require('../models/UserModel');
const { cache } = require('./CacheService');
const logger = require('../config/logger');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;

class UserService {
  /**
   * 用户注册
   * @param {string} username 用户名
   * @param {string} password 密码
   * @returns {object} 注册结果
   */
  static async register(username, password) {
    // 检查用户名是否已存在
    const existingUser = await UserModel.findByUsername(username);
    if (existingUser) {
      throw new Error('用户名已存在');
    }

    // 创建用户
    const userId = await UserModel.create(username, password);

    // 生成Token
    const token = this.generateToken(userId, username);

    return { userId, username, token };
  }

  /**
   * 用户登录
   * @param {string} username 用户名
   * @param {string} password 密码
   * @returns {object} 登录结果
   */
  static async login(username, password) {
    logger.info(`[Login] 尝试登录: "${username}"`);

    // 查找用户
    const user = await UserModel.findByUsername(username);
    logger.info(`[Login] 查找结果:`, user ? `id=${user.id}, username=${user.username}` : 'null');

    if (!user) {
      logger.info(`[Login] 用户不存在`);
      throw new Error('用户名或密码错误');
    }

    // 验证密码
    const isValid = await UserModel.verifyPassword(password, user.password);
    logger.info(`[Login] 密码验证结果: ${isValid}`);

    if (!isValid) {
      logger.info(`[Login] 密码错误`);
      throw new Error('用户名或密码错误');
    }

    // 生成Token
    const token = this.generateToken(user.id, user.username);
    logger.info(`[Login] 登录成功: userId=${user.id}`);

    return {
      userId: user.id,
      username: user.username,
      token
    };
  }

  /**
   * 获取当前用户信息（带缓存）
   * @param {number} userId 用户ID
   * @returns {object} 用户信息
   */
  static async getUserInfo(userId) {
    const cacheKey = `user:${userId}`;

    // 尝试从缓存获取
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 移除密码字段，避免泄露
    const { password, ...userInfo } = user;

    // 存入缓存（用户信息变更频率低，可缓存较久）
    cache.set(cacheKey, userInfo, 120000); // 2分钟

    return userInfo;
  }

  /**
   * 更新用户密码
   * @param {number} userId 用户ID
   * @param {string} oldPassword 旧密码
   * @param {string} newPassword 新密码
   */
  static async updatePassword(userId, oldPassword, newPassword) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    const isValid = await UserModel.verifyPassword(oldPassword, user.password);
    if (!isValid) {
      throw new Error('原密码错误');
    }

    const success = await UserModel.updatePassword(userId, newPassword);
    if (!success) {
      throw new Error('密码更新失败');
    }
    return { message: '密码更新成功' };
  }

  /**
   * 生成JWT Token
   * @param {number} userId 用户ID
   * @param {string} username 用户名
   * @returns {string} Token
   */
  static generateToken(userId, username) {
    return jwt.sign(
      { userId, username },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
  static async getUserById(userId) {
    const [rows] = await pool.execute(
      'SELECT id, username, nickname, email, avatar, created_at FROM user WHERE id = ?',
      [userId]
    );
    return rows[0];
  }

  static async updateUserInfo(userId, data) {
    if (data.username !== undefined) {
      // 检查新用户名是否已存在
      const [existing] = await pool.execute('SELECT id, username FROM user WHERE username = ? AND id != ?', [data.username, userId]);
      if (existing.length > 0) {
        throw new Error('用户名已存在');
      }

      // 获取当前用户名
      const [current] = await pool.execute('SELECT username FROM user WHERE id = ?', [userId]);
      logger.info(`[UpdateUserInfo] 用户 ${userId} 从 "${current[0].username}" 更新为 "${data.username}"`);

      await pool.execute('UPDATE user SET username = ? WHERE id = ?', [data.username, userId]);
    }
    if (data.nickname !== undefined) {
      await pool.execute('UPDATE user SET nickname = ? WHERE id = ?', [data.nickname, userId]);
    }

    // 清除用户信息缓存
    cache.delete(`user:${userId}`);
  }

  /**
   * 修改登录用户名（需要验证当前密码）
   * @param {number} userId 用户ID
   * @param {string} newUsername 新用户名
   * @param {string} currentPassword 当前密码
   */
  static async updateLoginUsername(userId, newUsername, currentPassword) {
    logger.info(`[UpdateUsername] userId=${userId}, newUsername=${newUsername}`);

    // 1. 获取用户
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    logger.info(`[UpdateUsername] 找到用户: ${user.username}`);

    // 2. 验证当前密码
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    logger.info(`[UpdateUsername] 密码验证: ${isMatch}`);
    if (!isMatch) {
      throw new Error('当前密码错误，无法修改用户名');
    }

    // 3. 检查新用户名是否被占用
    const existingUser = await UserModel.findByUsername(newUsername);
    logger.info(`[UpdateUsername] 查重结果: ${existingUser ? existingUser.id : '无'}`);
    if (existingUser && existingUser.id !== userId) {
      throw new Error('该用户名已被其他用户注册');
    }

    // 4. 更新用户名
    await pool.execute('UPDATE user SET username = ? WHERE id = ?', [newUsername, userId]);
    logger.info(`[UpdateUsername] 更新完成`);

    // 清除缓存
    cache.delete(`user:${userId}`);

    return { success: true, message: '用户名修改成功，下次登录请使用新用户名' };
  }

  /**
   * 修改昵称
   * @param {number} userId 用户ID
   * @param {string} newNickname 新昵称
   */
  static async updateNickname(userId, newNickname) {
    if (!newNickname || newNickname.trim() === '') {
      throw new Error('昵称不能为空');
    }

    await pool.execute('UPDATE user SET nickname = ? WHERE id = ?', [newNickname, userId]);

    // 清除缓存
    cache.delete(`user:${userId}`);

    return { success: true, message: '昵称修改成功' };
  }

  /**
   * 修改密码
   * @param {number} userId 用户ID
   * @param {string} oldPassword 旧密码
   * @param {string} newPassword 新密码
   */
  static async changePassword(userId, oldPassword, newPassword) {
    // 1. 获取用户当前哈希密码
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 2. 验证旧密码
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new Error('原密码错误');
    }

    // 3. 校验新密码强度
    if (newPassword.length < 6) {
      throw new Error('新密码长度不能少于6位');
    }

    // 4. 加密新密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 5. 更新数据库
    await pool.execute('UPDATE user SET password = ? WHERE id = ?', [hashedPassword, userId]);

    return { success: true, message: '密码修改成功，请重新登录' };
  }

  /**
   * 注销账号
   * @param {number} userId 用户ID
   */
  static async deleteAccount(userId) {
    // 检查用户是否存在
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 删除用户（会级联删除相关数据）
    await pool.execute('DELETE FROM user WHERE id = ?', [userId]);

    // 清除缓存
    cache.delete(`user:${userId}`);

    return { success: true, message: '账号已注销' };
  }
}

module.exports = UserService;