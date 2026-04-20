/**
 * 统一响应格式工具
 *
 * 所有API统一返回格式：
 * {
 *   code: number,    // 状态码
 *   message: string, // 提示信息
 *   data: any        // 响应数据
 * }
 */

const CODE = {
  SUCCESS: 200,           // 成功
  CREATED: 201,          // 创建成功
  BAD_REQUEST: 400,      // 请求参数错误
  UNAUTHORIZED: 401,     // 未授权
  FORBIDDEN: 403,        // 禁止访问
  NOT_FOUND: 404,        // 资源不存在
  SERVER_ERROR: 500      // 服务器内部错误
};

/**
 * 成功响应
 * @param {any} data 数据
 * @param {string} message 提示信息
 * @returns {object} 响应对象
 */
const success = (data = null, message = '操作成功') => ({
  code: CODE.SUCCESS,
  message,
  data
});

/**
 * 创建成功响应
 * @param {any} data 数据
 * @param {string} message 提示信息
 * @returns {object} 响应对象
 */
const created = (data = null, message = '创建成功') => ({
  code: CODE.CREATED,
  message,
  data
});

/**
 * 失败响应
 * @param {string} message 提示信息
 * @param {number} code 状态码
 * @returns {object} 响应对象
 */
const fail = (message = '操作失败', code = CODE.BAD_REQUEST) => ({
  code,
  message,
  data: null
});

/**
 * 业务错误响应
 */
const error = {
  badRequest: (message = '请求参数错误') => fail(message, CODE.BAD_REQUEST),
  unauthorized: (message = '未授权，请先登录') => fail(message, CODE.UNAUTHORIZED),
  forbidden: (message = '禁止访问') => fail(message, CODE.FORBIDDEN),
  notFound: (message = '资源不存在') => fail(message, CODE.NOT_FOUND),
  serverError: (message = '服务器内部错误') => fail(message, CODE.SERVER_ERROR)
};

/**
 * 分页响应
 * @param {Array} list 数据列表
 * @param {number} total 总数
 * @param {number} page 当前页码
 * @param {number} pageSize 每页数量
 * @returns {object} 响应对象
 */
const paginated = (list, total, page = 1, pageSize = 10) => ({
  code: CODE.SUCCESS,
  message: '查询成功',
  data: {
    list,
    pagination: {
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / pageSize)
    }
  }
});

module.exports = {
  CODE,
  success,
  created,
  fail,
  error,
  paginated
};
