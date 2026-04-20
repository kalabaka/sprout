const authService = require('../services/authService');
const { success, fail } = require('../utils/response');
const logger = require('../config/logger');

exports.register = async (req, res) => {
  try {
    const { username, password, nickname } = req.body;

    if (!username || !password) {
      return res.status(400).json(fail('用户名和密码不能为空'));
    }

    if (password.length < 6) {
      return res.status(400).json(fail('密码长度不能少于6位'));
    }

    const result = await authService.register(username, password, nickname);

    res.json(success(result, '注册成功'));
  } catch (error) {
    logger.error('注册失败:', error.message);
    res.status(400).json(fail(error.message));
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.status(400).json(fail('用户名和密码不能为空'));
    }

    const result = await authService.login(username, password, rememberMe);

    res.json(success(result, '登录成功'));
  } catch (error) {
    logger.error('登录失败:', error.message);
    res.status(400).json(fail(error.message));
  }
};

exports.checkAvailability = async (req, res) => {
  try {
    const result = await authService.checkRegisterAvailability();

    res.json(success(result));
  } catch (error) {
    logger.error('检查注册可用性失败:', error.message);
    res.status(500).json(fail('检查失败'));
  }
};
