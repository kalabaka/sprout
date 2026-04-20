/**
 * JWT认证中间件
 */
const UserService = require('../services/UserService');
const { fail } = require('../utils/response');
const logger = require('../config/logger');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  logger.info(`[Auth] 请求路径: ${req.method} ${req.path}`);
  logger.info(`[Auth] Authorization header: ${authHeader ? '存在' : '不存在'}`);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('[Auth] 未提供认证令牌');
    return res.status(401).json(fail('未提供认证令牌', 401));
  }

  const token = authHeader.substring(7);
  logger.info(`[Auth] Token长度: ${token.length}`);

  const decoded = UserService.verifyToken(token);
  logger.info(`[Auth] Token验证结果: ${decoded ? `userId=${decoded.userId}` : '无效'}`);

  if (!decoded) {
    logger.warn('[Auth] 令牌无效或已过期');
    return res.status(401).json(fail('令牌无效或已过期', 401));
  }

  req.user = decoded;
  next();
};

module.exports = authMiddleware;