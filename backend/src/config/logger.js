/**
 * Logger - 日志模块
 *
 * 功能：
 * 1. 记录用户操作日志
 * 2. 记录错误日志
 * 3. 记录系统运行日志
 *
 * 格式：[时间] [级别] [模块] 内容
 * 输出：控制台 + 文件 (logs/app.log)
 */

const fs = require('fs');
const path = require('path');

// 日志级别
const LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG'
};

// 日志模块
const MODULES = {
  SYSTEM: 'SYSTEM',       // 系统运行
  USER: 'USER',          // 用户操作
  AGENT: 'AGENT',        // 智能体
  CONTROLLER: 'CTRL',    // 控制器
  DATABASE: 'DB',        // 数据库
  API: 'API'             // 接口
};

// 日志目录
const LOG_DIR = path.join(__dirname, '../../logs');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_FILE = path.join(LOG_DIR, 'app.log');
const ERROR_FILE = path.join(LOG_DIR, 'error.log');

/**
 * 格式化日志消息
 * 格式：[时间] [级别] [模块] 内容
 */
function formatMessage(level, module, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] [${module}] ${message}`;
}

/**
 * 写入日志文件
 */
function writeToFile(message, isError = false) {
  const file = isError ? ERROR_FILE : LOG_FILE;
  fs.appendFileSync(file, message + '\n');
}

/**
 * 日志输出
 */
function output(level, module, message, isError = false) {
  const formatted = formatMessage(level, module, message);

  // 输出到控制台
  if (level === LEVELS.ERROR) {
    console.error(formatted);
  } else if (level === LEVELS.WARN) {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }

  // 写入文件
  writeToFile(formatted, isError);
}

/**
 * Logger 对象
 */
const logger = {
  MODULES,

  /**
   * 信息日志
   * @param {string} module 模块名称
   * @param {string} message 日志内容
   */
  info(module, message) {
    output(LEVELS.INFO, module, message);
  },

  /**
   * 警告日志
   * @param {string} module 模块名称
   * @param {string} message 日志内容
   */
  warn(module, message) {
    output(LEVELS.WARN, module, message);
  },

  /**
   * 错误日志
   * @param {string} module 模块名称
   * @param {string} message 日志内容
   */
  error(module, message) {
    output(LEVELS.ERROR, module, message, true);
  },

  /**
   * 调试日志
   * @param {string} module 模块名称
   * @param {string} message 日志内容
   */
  debug(module, message) {
    if (process.env.NODE_ENV === 'development') {
      output(LEVELS.DEBUG, module, message);
    }
  },

  // ============================================
  // 便捷方法
  // ============================================

  // 系统日志
  system(message) {
    this.info(MODULES.SYSTEM, message);
  },

  // 用户操作日志
  user(message) {
    this.info(MODULES.USER, message);
  },

  // 智能体日志
  agent(message) {
    this.info(MODULES.AGENT, message);
  },

  // 控制器日志
  controller(message) {
    this.info(MODULES.CONTROLLER, message);
  },

  // 数据库日志
  db(message) {
    this.info(MODULES.DATABASE, message);
  },

  // API日志
  api(message) {
    this.info(MODULES.API, message);
  },

  // 错误便捷方法
  userError(message) {
    this.error(MODULES.USER, message);
  },

  agentError(message) {
    this.error(MODULES.AGENT, message);
  },

  controllerError(message) {
    this.error(MODULES.CONTROLLER, message);
  },

  dbError(message) {
    this.error(MODULES.DATABASE, message);
  }
};

module.exports = logger;
