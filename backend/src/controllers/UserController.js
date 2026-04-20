/**
 * 用户控制器
 */
const UserService = require('../services/UserService');
const UserModel = require('../models/UserModel');
const { success, fail } = require('../utils/response');
const logger = require('../config/logger');

class UserController {
  /**
   * 用户注册
   * POST /api/user/register
   */
  static async register(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json(fail('用户名和密码不能为空'));
      }

      if (password.length < 6) {
        return res.status(400).json(fail('密码长度不能少于6位'));
      }

      const result = await UserService.register(username, password);
      logger.info(`用户注册成功: ${username}`);

      res.json(success(result, '注册成功'));
    } catch (error) {
      logger.error('注册失败:', error.message);
      res.status(400).json(fail(error.message));
    }
  }

  /**
   * 用户登录
   * POST /api/user/login
   */
  static async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json(fail('用户名和密码不能为空'));
      }

      const result = await UserService.login(username, password);
      logger.info(`用户登录成功: ${username}`);

      res.json(success(result, '登录成功'));
    } catch (error) {
      logger.error('登录失败:', error.message);
      res.status(401).json(fail(error.message, 401));
    }
  }

  /**
   * 获取当前用户信息
   * GET /api/user/me
   */
  static async getCurrentUser(req, res) {
    try {
      const userId = req.user.userId;
      const user = await UserService.getUserInfo(userId);

      if (!user) {
        return res.status(404).json(fail('用户不存在', 404));
      }

      res.json(success(user));
    } catch (error) {
      logger.error('获取用户信息失败:', error.message);
      res.status(500).json(fail('获取用户信息失败'));
    }
  }

  /**
   * 更新密码
   * PUT /api/user/password
   */
  static async updatePassword(req, res) {
    try {
      const userId = req.user.userId;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json(fail('请提供旧密码和新密码'));
      }

      if (newPassword.length < 6) {
        return res.status(400).json(fail('新密码长度不能少于6位'));
      }

      await UserService.updatePassword(userId, oldPassword, newPassword);
      logger.info(`用户修改密码: ${userId}`);

      res.json(success(null, '密码更新成功'));
    } catch (error) {
      logger.error('修改密码失败:', error.message);
      res.status(400).json(fail(error.message));
    }
  }

  /**
   * 更新用户信息
   */
  static async updateUserInfo(req, res) {
    try {
      const userId = req.user.userId;
      const { username, nickname } = req.body;

      await UserService.updateUserInfo(userId, { username, nickname });
      logger.info(`用户更新信息: ${userId}`);

      // 直接从数据库获取更新后的用户信息，绕过缓存
      const user = await UserModel.findById(userId);
      const { password, ...userInfo } = user; // 移除密码
      res.json(success(userInfo, '用户信息更新成功'));
    } catch (error) {
      logger.error('更新用户信息失败:', error.message);
      res.status(400).json(fail(error.message));
    }
  }

  /**
   * 修改昵称
   * PUT /api/user/nickname
   */
  static async updateNickname(req, res) {
    try {
      const { nickname } = req.body;
      const userId = req.user.userId;

      if (!nickname || nickname.trim() === '') {
        return res.status(400).json(fail('昵称不能为空'));
      }

      await UserService.updateNickname(userId, nickname);
      logger.info(`用户修改昵称: ${userId} -> ${nickname}`);

      res.json(success(null, '昵称更新成功'));
    } catch (error) {
      logger.error('修改昵称失败:', error.message);
      res.status(400).json(fail(error.message));
    }
  }

  /**
   * 修改登录用户名
   * PUT /api/user/username
   */
  static async updateLoginUsername(req, res) {
    try {
      logger.info(`[UpdateUsername] 收到请求: ${JSON.stringify(req.body)}`);
      const { newUsername, password } = req.body;
      const userId = req.user.userId;
      logger.info(`[UpdateUsername] userId: ${userId}, newUsername: ${newUsername}`);

      if (!newUsername || !password) {
        return res.status(400).json(fail('请提供新用户名和当前密码'));
      }

      if (newUsername.length < 2 || newUsername.length > 10) {
        return res.status(400).json(fail('用户名长度需在2-10个字符之间'));
      }

      await UserService.updateLoginUsername(userId, newUsername, password);
      logger.info(`用户修改用户名: ${userId} -> ${newUsername}`);

      res.json(success(null, '用户名修改成功，下次登录请使用新用户名'));
    } catch (error) {
      logger.error('修改用户名失败:', error.message);
      res.status(400).json(fail(error.message));
    }
  }

  /**
   * 修改密码
   * PUT /api/user/password
   */
  static async changePassword(req, res) {
    try {
      const userId = req.user.userId;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json(fail('请提供旧密码和新密码'));
      }

      await UserService.changePassword(userId, oldPassword, newPassword);
      logger.info(`用户修改密码: ${userId}`);

      res.json(success(null, '密码修改成功，请重新登录'));
    } catch (error) {
      logger.error('修改密码失败:', error.message);
      res.status(400).json(fail(error.message));
    }
  }

  /**
   * 注销账号
   * DELETE /api/user/account
   */
  static async deleteAccount(req, res) {
    try {
      const { confirmText } = req.body;
      const userId = req.user.userId;

      if (confirmText !== 'DELETE') {
        return res.status(400).json(fail('确认文本不正确'));
      }

      await UserService.deleteAccount(userId);
      logger.info(`用户注销账号: ${userId}`);

      res.json(success(null, '账号已永久删除'));
    } catch (error) {
      logger.error('注销账号失败:', error.message);
      res.status(500).json(fail('注销失败: ' + error.message));
    }
  }
}

module.exports = UserController;