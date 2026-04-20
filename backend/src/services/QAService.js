/**
 * 智能问答服务
 */
const ChatHistoryModel = require('../models/ChatHistoryModel');
const LLMService = require('./LLMService');
const LearningTaskModel = require('../models/LearningTaskModel');
const logger = require('../config/logger');

class QAService {
  /**
   * 处理用户提问
   */
  static async ask(userId, { taskId, question }) {
    logger.info('QA', `用户提问: "${question}"`);

    // 1. 保存用户问题
    await ChatHistoryModel.create(userId, {
      taskId,
      role: 'user',
      content: question
    });

    // 2. 获取历史上下文
    const history = await ChatHistoryModel.getContext(userId, taskId, 5);

    // 3. 获取任务信息作为上下文
    let taskName = null;
    if (taskId) {
      try {
        const tasks = await LearningTaskModel.findByUserId(userId, { planId: null });
        const currentTask = tasks.find(t => t.id === taskId);
        taskName = currentTask?.name || null;
      } catch (e) {
        logger.warn('QA', '获取任务信息失败');
      }
    }

    // 4. 生成回答
    let answer;
    try {
      // 优先使用LLM服务
      answer = await LLMService.getAiResponse(
        { taskName },
        history,
        question
      );
    } catch (llmError) {
      logger.warn('QA', `LLM调用失败，使用本地回答: ${llmError.message}`);
      // LLM失败时使用本地回答
      answer = await this.generateAnswer(question, history);
    }

    // 5. 保存助手回答
    await ChatHistoryModel.create(userId, {
      taskId,
      role: 'assistant',
      content: answer
    });

    logger.info('QA', `回答: "${answer.substring(0, 50)}..."`);

    return {
      answer,
      historyCount: history.length + 1
    };
  }

  /**
   * 本地回答生成器（LLM不可用时的备用方案）
   */
  static async generateAnswer(question, history) {
    const lowerQuestion = question.toLowerCase();

    // 构建上下文
    const contextStr = history.map(h => `${h.role}: ${h.content}`).join('\n');

    // 简单问答模式匹配
    if (lowerQuestion.includes('计划') || lowerQuestion.includes('学习计划')) {
      return `根据你的学习计划，我建议：

1. 📚 先完成当前的基础知识学习
2. 📈 每天保持1-2小时的学习时间
3. 💪 定期复习巩固所学内容

坚持就是胜利！`;
    }

    if (lowerQuestion.includes('困难') || lowerQuestion.includes('难')) {
      return `遇到困难是很正常的！给你几个建议：

1. 🔍 先拆分问题为小块
2. 📖 查阅官方文档
3. 👥 在社区提问
4. 😴 适当休息后再尝试

记住，困难是成长的一部分！`;
    }

    if (lowerQuestion.includes('时间') || lowerQuestion.includes('多久')) {
      return `学习时间安排建议：

- 🍅 使用番茄工作法：25分钟学习，5分钟休息
- 🌅 早上头脑清醒，适合学习新知识
- 🌙 晚上适合复习和总结

根据自己的节奏来安排最重要！`;
    }

    if (lowerQuestion.includes('效率') || lowerQuestion.includes('快')) {
      return `提高学习效率的小技巧：

1. 🎯 设定明确的小目标
2. 📝 边学边做笔记
3. 🔄 定期回顾复习
4. 🛑 远离手机等干扰

专注力是关键！`;
    }

    if (lowerQuestion.includes('python') || lowerQuestion.includes('py')) {
      return `Python学习建议：

1. 📖 先掌握基础语法（变量、数据类型、条件、循环）
2. 💻 多动手敲代码，实践出真知
3. 📚 推荐资源：官方文档、《Python编程：从入门到实践》
4. 🏢 可以尝试小项目：爬虫、数据分析、自动化脚本

有问题随时问我！`;
    }

    if (lowerQuestion.includes('java')) {
      return `Java学习建议：

1. 📖 掌握基础语法和面向对象概念
2. 🔧 熟悉IDE（如IntelliJ IDEA）
3. 📚 推荐：《Java核心技术卷》《Effective Java》
4. 💪 多做练习，逐步深入

记住，编程需要大量练习！`;
    }

    // 默认回答
    return `感谢你的提问！${contextStr ? `关于之前的讨论：${contextStr.substring(0, 100)}...\n\n` : ''}针对"${question}"，我的建议是：

1. 先理解问题的核心
2. 分解成小步骤解决
3. 多动手实践

如果还有疑问，欢迎继续问我！`;
  }

  /**
   * 获取历史记录
   */
  static async getHistory(userId, taskId) {
    return await ChatHistoryModel.findByTaskId(userId, taskId);
  }

  /**
   * 清除历史
   */
  static async clearHistory(userId, taskId) {
    return await ChatHistoryModel.clear(userId, taskId);
  }
}

module.exports = QAService;
