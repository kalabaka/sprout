const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const SystemConfigService = require('./systemConfigService');
const logger = require('../config/logger');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;

class AuthService {
  static async register(username, password, nickname) {
    const checkResult = await SystemConfigService.checkCanRegister();
    if (!checkResult.canRegister) {
      throw new Error('注册已达上限，暂时无法注册');
    }

    const existing = await UserModel.findByUsername(username);
    if (existing) {
      throw new Error('用户名已被占用');
    }

    const userId = await UserModel.create({
      username,
      password,
      nickname: nickname || username
    });

    const token = this.generateToken(userId, username);

    logger.info('auth', `用户注册成功: ${username}`);

    return { userId, token };
  }

  static async login(username, password, rememberMe = false) {
    const user = await UserModel.findByUsername(username);
    if (!user) {
      throw new Error('账号不存在');
    }

    const isValid = await UserModel.verifyPassword(password, user.password);
    if (!isValid) {
      throw new Error('密码错误');
    }

    // 根据记住我决定 Token 有效期
    const expiresIn = rememberMe ? '7d' : '24h';
    const token = this.generateToken(user.id, user.username, expiresIn);

    logger.info('auth', `用户登录成功: ${username}`);

    return {
      userId: user.id,
      username: user.username,
      nickname: user.nickname,
      token,
      expiresIn
    };
  }

  static async checkRegisterAvailability() {
    return await SystemConfigService.checkCanRegister();
  }

  static generateToken(userId, username, expiresIn = '24h') {
    return jwt.sign(
      { userId, username },
      JWT_SECRET,
      { expiresIn }
    );
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
}

module.exports = AuthService;
