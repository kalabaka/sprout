/**
 * 错误处理中间件
 *
 * 统一处理所有API错误，返回标准格式：
 * {
 *   code: number,
 *   message: string,
 *   data: null
 * }
 */

const logger = require('../config/logger');
const { fail, CODE } = require('../utils/response');

/**
 * 404 处理中间件
 */
function notFoundHandler(req, res) {
  res.status(CODE.NOT_FOUND).json(
    fail('接口不存在', CODE.NOT_FOUND)
  );
}

/**
 * 全局错误处理中间件
 *
 * @param {Error} err 错误对象
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 * @param {function} next 下一步函数
 */
function errorHandler(err, req, res, next) {
  // 记录错误日志
  logger.error(`[Error] ${err.message}`);
  logger.error(err.stack);

  // 处理不同类型的错误
  let errorMessage = '服务器内部错误';
  let errorCode = CODE.SERVER_ERROR;

  if (err.name === 'ValidationError') {
    // 参数验证错误
    errorMessage = err.message || '请求参数错误';
    errorCode = CODE.BAD_REQUEST;
  } else if (err.name === 'UnauthorizedError') {
    // JWT认证错误
    errorMessage = '令牌无效或已过期';
    errorCode = CODE.UNAUTHORIZED;
  } else if (err.code === 'ER_DUP_ENTRY') {
    // 数据库唯一键冲突
    errorMessage = '数据已存在';
    errorCode = CODE.BAD_REQUEST;
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    // 外键约束错误
    errorMessage = '关联数据不存在';
    errorCode = CODE.BAD_REQUEST;
  } else if (err.message) {
    // 业务逻辑错误
    errorMessage = err.message;
    // 根据错误消息判断错误码
    if (errorMessage.includes('不存在') || errorMessage.includes('找不到')) {
      errorCode = CODE.NOT_FOUND;
    } else if (errorMessage.includes('未授权') || errorMessage.includes('权限')) {
      errorCode = CODE.UNAUTHORIZED;
    }
  }

  // 返回统一格式的错误响应
  res.status(errorCode).json(fail(errorMessage, errorCode));
}

/**
 * 异步错误处理包装器
 *
 * 用于包装异步路由处理器，自动捕获错误
 *
 * @param {function} fn 异步处理函数
 * @returns {function} 包装后的函数
 *
 * @example
 * router.get('/user', asyncHandler(async (req, res) => {
 *   const user = await User.findById(req.params.id);
 *   if (!user) throw new Error('用户不存在');
 *   res.json(success(user));
 * }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler
};
