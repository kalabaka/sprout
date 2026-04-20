/**
 * 上下文感知的智能问答代理
 * 根据用户学习状态和任务上下文，动态构建提示词并调用LLM
 */
const LearningTaskModel = require('../models/LearningTaskModel');
const ChatHistoryModel = require('../models/ChatHistoryModel');
const LLMService = require('./LLMService');
const evaluationAgent = require('../agents/evaluationAgent');
const logger = require('../config/logger');

/**
 * 系统提示词模板
 */
const SYSTEM_PROMPT_TEMPLATE = `你是一位专业的大学学习辅导助手。
用户信息：
- 当前用户正在学习：{taskName}
- 学习阶段：{stage}
- 任务难度：{difficulty}/5
- 当前进度：{progress}%
- 学习状态：{learningStatus}

你的角色：
1. 根据用户的当前学习进度和状态，提供针对性的指导
2. 用鼓励的语气帮助用户克服困难
3. 如果用户遇到问题，给出具体的解决建议
4. 保持简洁专业的回答风格
5. 请用中文回答问题

约束：
- 如果问题与当前学习任务无关，提醒用户回到任务上来
- 回答要实用、具体，避免空泛的理论
- 适当使用emoji增加亲和力`;

/**
 * 学习状态标签
 */
const LEARNING_STATUS_LABELS = {
  normal: '正常进行中',
  risk: '存在风险，需要关注',
  high_risk: '高风险状态，需要干预',
  completed: '已完成学习任务'
};

/**
 * 处理用户提问
 * @param {number} userId - 用户ID
 * @param {number} taskId - 任务ID
 * @param {string} question - 用户问题
 * @returns {Object} { success, answer, contextUsed }
 */
async function handleQuestion(userId, taskId, question) {
  try {
    logger.info('QA-Agent', `处理问题: taskId=${taskId}, question=${question.substring(0, 30)}...`);

    // 1. 获取任务上下文
    const taskContext = await getTaskContext(userId, taskId);

    // 2. 获取用户风险等级
    const riskLevel = await getUserRiskLevel(userId, taskId);

    // 3. 获取最近的对话历史 (6条)
    const history = await getRecentHistory(userId, taskId, 6);

    // 4. 构建动态System Prompt
    const systemPrompt = buildSystemPrompt(taskContext, riskLevel, history);

    // 5. 调用LLM获取回答
    const answer = await callLLMWithContext(systemPrompt, history, question);

    // 6. 保存到chat_history
    await saveChatHistory(userId, taskId, question, answer);

    logger.info('QA-Agent', `回答生成完成, contextUsed=${Object.keys(taskContext).join(',')}`);

    return {
      success: true,
      answer,
      contextUsed: {
        taskName: taskContext.taskName,
        stage: taskContext.stage,
        difficulty: taskContext.difficulty,
        progress: taskContext.progress,
        riskLevel
      }
    };
  } catch (error) {
    logger.error('QA-Agent', `处理失败: ${error.message}`);
    return {
      success: false,
      answer: '抱歉，我现在无法回答你。请稍后再试。',
      contextUsed: null
    };
  }
}

/**
 * 获取任务上下文
 */
async function getTaskContext(userId, taskId) {
  const context = {
    taskName: '通用学习',
    description: '',
    difficulty: 2,
    stage: '基础阶段',
    progress: 0,
    status: 0
  };

  if (!taskId) {
    return context;
  }

  try {
    const tasks = await LearningTaskModel.findByUserId(userId, { planId: null });
    const currentTask = tasks.find(t => t.id === taskId);

    if (currentTask) {
      context.taskName = currentTask.name || context.taskName;
      context.description = currentTask.description || '';
      context.difficulty = currentTask.difficulty || 2;
      context.stage = currentTask.stage || '基础阶段';
      context.progress = calculateProgress(tasks, taskId);
      context.status = currentTask.status;
    }
  } catch (e) {
    logger.warn('QA-Agent', `获取任务上下文失败: ${e.message}`);
  }

  return context;
}

/**
 * 计算当前任务进度
 */
function calculateProgress(tasks, currentTaskId) {
  if (!tasks || tasks.length === 0) return 0;

  // 找到当前任务在计划中的位置
  const currentIndex = tasks.findIndex(t => t.id === currentTaskId);
  if (currentIndex <= 0) return 10;

  // 已完成的任务比例
  const completedCount = tasks.slice(0, currentIndex).filter(t => t.status === 2).length;
  return Math.round((completedCount / currentIndex) * 100);
}

/**
 * 获取用户风险等级
 */
async function getUserRiskLevel(userId, taskId) {
  try {
    const evaluation = await evaluationAgent.evaluateUser(userId);
    // evaluationAgent 返回的评估结果包含 riskLevel
    return evaluation?.riskLevel || 'normal';
  } catch (e) {
    logger.warn('QA-Agent', `获取风险等级失败: ${e.message}`);
    return 'normal';
  }
}

/**
 * 获取最近的对话历史
 */
async function getRecentHistory(userId, taskId, limit = 6) {
  try {
    const history = await ChatHistoryModel.getContext(userId, taskId, limit);
    return history.map(item => ({
      role: item.role,
      content: item.content
    }));
  } catch (e) {
    logger.warn('QA-Agent', `获取历史失败: ${e.message}`);
    return [];
  }
}

/**
 * 构建System Prompt
 */
function buildSystemPrompt(taskContext, riskLevel, history) {
  let prompt = SYSTEM_PROMPT_TEMPLATE;

  // 替换变量
  prompt = prompt.replace('{taskName}', taskContext.taskName || '通用学习');
  prompt = prompt.replace('{stage}', taskContext.stage || '基础阶段');
  prompt = prompt.replace('{difficulty}', taskContext.difficulty || 2);
  prompt = prompt.replace('{progress}', taskContext.progress || 0);

  // 根据风险等级调整学习状态
  const learningStatus = riskLevel === 'high_risk'
    ? LEARNING_STATUS_LABELS.high_risk
    : riskLevel === 'risk'
      ? LEARNING_STATUS_LABELS.risk
      : taskContext.status === 2
        ? LEARNING_STATUS_LABELS.completed
        : LEARNING_STATUS_LABELS.normal;

  prompt = prompt.replace('{learningStatus}', learningStatus);

  return prompt;
}

/**
 * 调用LLM
 */
async function callLLMWithContext(systemPrompt, history, question) {
  const messages = [];

  // System Prompt
  messages.push({
    role: 'system',
    content: systemPrompt
  });

  // 历史对话
  if (history && history.length > 0) {
    history.forEach(item => {
      messages.push({
        role: item.role,
        content: item.content
      });
    });
  }

  // 当前问题
  messages.push({
    role: 'user',
    content: question
  });

  try {
    return await LLMService.callLLM(messages);
  } catch (error) {
    logger.error('QA-Agent', `LLM调用失败: ${error.message}`);
    throw error;
  }
}

/**
 * 保存聊天记录
 */
async function saveChatHistory(userId, taskId, question, answer) {
  try {
    // 保存用户问题
    await ChatHistoryModel.create(userId, {
      taskId,
      role: 'user',
      content: question
    });

    // 保存助手回答
    await ChatHistoryModel.create(userId, {
      taskId,
      role: 'assistant',
      content: answer
    });
  } catch (e) {
    logger.warn('QA-Agent', `保存聊天记录失败: ${e.message}`);
  }
}

module.exports = {
  handleQuestion,
  getTaskContext,
  getUserRiskLevel,
  getRecentHistory,
  buildSystemPrompt,
  callLLMWithContext,
  saveChatHistory
};