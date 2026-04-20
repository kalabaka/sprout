/**
 * Motivation Agent - 动机干预Agent
 * 负责生成学习动机干预建议
 *
 * 基于ARCS动机模型：
 * - Attention（注意）：吸引学习者注意力
 * - Relevance（相关）：建立学习内容与学习者的相关性
 * - Confidence（信心）：建立学习信心
 * - Satisfaction（满足）：提供学习满足感
 *
 * 输入：风险等级 + 学习数据
 * 输出：建议列表（数组）
 */

const {
  ARCS_STRATEGIES,
  getRecommendedStrategy,
  generateMotivationMessage
} = require('../services/ARCSStrategies');

/**
 * 风险等级定义
 */
const RISK_LEVELS = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险'
};

/**
 * 高风险干预策略
 * 目标：减少任务 + 激励提示
 */
const HIGH_RISK_STRATEGY = [
  '建议减少每日学习任务数量',
  '从最基础的内容重新学起',
  '给自己设定可达成的短期小目标',
  '每天学习时间控制在1小时以内',
  '适当休息，调整好心态再继续',
  '可以寻求老师或同学的帮助'
];

/**
 * 中风险干预策略
 * 目标：调整学习节奏
 */
const MEDIUM_RISK_STRATEGY = [
  '适当调整学习计划难度',
  '增加休息时间的频率',
  '尝试使用番茄工作法提高效率',
  '将复杂任务拆分为简单步骤',
  '寻找学习伙伴互相监督鼓励',
  '关注学习内容与兴趣的结合点'
];

/**
 * 低风险干预策略
 * 目标：正向反馈
 */
const LOW_RISK_STRATEGY = [
  '保持当前良好的学习节奏',
  '可以尝试挑战更高难度的任务',
  '定期回顾已学内容巩固记忆',
  '你的学习方法很有效，继续坚持',
  '分享学习心得可以帮助更多人',
  '为取得的进步感到自豪'
];

/**
 * 根据风险等级获取对应的策略
 *
 * @param {string} riskLevel 风险等级
 * @returns {Array} 建议列表
 */
function getStrategyByLevel(riskLevel) {
  if (riskLevel.includes('高')) {
    return HIGH_RISK_STRATEGY;
  } else if (riskLevel.includes('中')) {
    return MEDIUM_RISK_STRATEGY;
  } else {
    return LOW_RISK_STRATEGY;
  }
}

/**
 * 生成动机干预建议（主函数）
 *
 * @param {string} riskLevel 风险等级 ('高风险' | '中风险' | '低风险')
 * @param {Object} evaluationData 可选的评估数据 { strategyKey }
 * @returns {Object} 干预结果
 *
 * @example
 * const result = generateMotivation('中风险');
 * // 返回: { level: '中风险', suggestions: [...], quote: '...' }
 *
 * @example
 * const result = generateMotivation('中风险', { strategyKey: 'medium_overall_risk' });
 * // 返回: { level: '中风险', suggestions: [...], quote: '...', arcsMotivation: {...} }
 */
function generateMotivation(riskLevel, evaluationData = {}) {
  // 处理传入的riskLevel类型
  const level = typeof riskLevel === 'string' ? riskLevel :
               riskLevel?.level || '中风险';

  console.log('[Motivation Agent] 生成动机干预, 风险等级:', level);

  const suggestions = getStrategyByLevel(level);
  const quote = getRandomQuote(level);
  const explanation = generateRecommendationReason(level);

  // 如果有strategyKey，获取ARCS动机策略
  let arcsMotivation = null;
  if (evaluationData.strategyKey || riskLevel.strategyKey) {
    const key = evaluationData.strategyKey || riskLevel.strategyKey;
    const intervention = getInterventionByKey(key);
    if (intervention) {
      arcsMotivation = {
        strategyKey: key,
        message: intervention.message,
        action_type: intervention.action,
        category: intervention.category,
        type: intervention.type,
        details: intervention.details
      };
    }
  }

  const result = {
    level: level,
    suggestions: suggestions,
    quote: quote,
    explanation,
    arcsMotivation,  // 新增：ARCS动机干预
    timestamp: new Date().toISOString()
  };

  console.log('[Motivation Agent] 干预建议生成完成\n');

  return result;
}

/**
 * 根据策略Key生成具体干预
 * @param {string} strategyKey 策略Key
 * @returns {Object} 干预内容
 */
function getInterventionByKey(strategyKey) {
  return ARCS_STRATEGIES[strategyKey] || null;
}

/**
 * 生成推荐理由（可解释性）
 *
 * @param {string} riskLevel 风险等级
 * @returns {Object} 推荐理由
 */
function generateRecommendationReason(riskLevel) {
  const reasonMap = {
    '高风险': {
      title: '干预强度：高',
      basis: '当前学习风险较高，需要强有力的干预措施',
      strategy: '采用"减负+激励"策略',
      expectedEffect: '降低学习压力，恢复学习信心',
      details: [
        { aspect: '任务量', recommendation: '减少每日任务', reason: '避免学习疲劳' },
        { aspect: '难度', recommendation: '从基础开始', reason: '重建学习信心' },
        { aspect: '时间', recommendation: '控制学习时长', reason: '防止过度疲劳' }
      ]
    },
    '中风险': {
      title: '干预强度：中',
      basis: '存在一定风险，需要适当调整',
      strategy: '采用"调整+优化"策略',
      expectedEffect: '改善学习状态，提高效率',
      details: [
        { aspect: '节奏', recommendation: '调整学习频率', reason: '找到适合自己的节奏' },
        { aspect: '方法', recommendation: '改进学习方法', reason: '提高学习效率' },
        { aspect: '监督', recommendation: '寻求外部监督', reason: '保持学习动力' }
      ]
    },
    '低风险': {
      title: '干预强度：低',
      basis: '学习状态良好，保持即可',
      strategy: '采用"正向反馈"策略',
      expectedEffect: '巩固学习成果，持续进步',
      details: [
        { aspect: '保持', recommendation: '维持当前状态', reason: '保持良好势头' },
        { aspect: '挑战', recommendation: '适度提升难度', reason: '促进能力提升' },
        { aspect: '分享', recommendation: '分享学习心得', reason: '加深知识理解' }
      ]
    }
  };

  // 处理传入的风险等级格式
  let levelKey = '中风险';
  if (riskLevel.includes('高')) levelKey = '高风险';
  else if (riskLevel.includes('低')) levelKey = '低风险';

  return reasonMap[levelKey];
}

/**
 * 生成简化版建议列表（返回数组）
 *
 * @param {string} riskLevel 风险等级
 * @returns {Array} 建议列表
 *
 * @example
 * const list = getMotivationList('高风险');
 * // 返回: ['建议减少每日学习任务数量', '从最基础的内容重新学起', ...]
 */
function getMotivationList(riskLevel) {
  return getStrategyByLevel(riskLevel);
}

/**
 * 获取随机激励语录
 *
 * @param {string} riskLevel 风险等级
 * @returns {string} 激励语录
 */
function getRandomQuote(riskLevel) {
  const quotes = {
    '高风险': [
      '停下来是为了更好地前进',
      '重新开始永远不晚',
      '循序渐进才是最快的学习方法'
    ],
    '中风险': [
      '困难只是暂时的',
      '每一步都算数',
      '坚持就是胜利'
    ],
    '低风险': [
      '学习是最好的投资',
      '每天进步一点点',
      '你比想象中更优秀'
    ]
  };

  let levelKey = '中风险';
  if (riskLevel.includes('高')) levelKey = '高风险';
  else if (riskLevel.includes('低')) levelKey = '低风险';

  const levelQuotes = quotes[levelKey];
  return levelQuotes[Math.floor(Math.random() * levelQuotes.length)];
}

/**
 * 根据学习数据生成个性化建议
 *
 * @param {Object} data 学习数据
 * @param {number} data.completionRate 完成率 (0-1)
 * @param {number} data.streakDays 连续学习天数
 * @param {number} data.totalTasks 总任务数
 * @param {number} data.completedTasks 已完成任务数
 * @returns {Array} 个性化建议列表
 */
function getPersonalizedSuggestions(data) {
  const { completionRate, streakDays, totalTasks, completedTasks } = data;
  const suggestions = [];

  // 基于完成率的建议
  if (completionRate !== undefined) {
    if (completionRate < 0.3) {
      suggestions.push('刚开始学习，不要急于求成，稳扎稳打最重要');
    } else if (completionRate < 0.6) {
      suggestions.push('已完成近半，保持当前节奏继续前进');
    } else if (completionRate < 1) {
      suggestions.push('胜利在望，坚持完成最后的学习任务');
    } else {
      suggestions.push('恭喜！已完成全部学习任务');
    }
  }

  // 基于连续学习天数的建议
  if (streakDays !== undefined) {
    if (streakDays >= 7) {
      suggestions.push(`太棒了！已连续学习${streakDays}天`);
    } else if (streakDays >= 3) {
      suggestions.push(`已养成${streakDays}天学习习惯，继续保持`);
    }
  }

  // 基于任务进度的建议
  if (totalTasks && completedTasks) {
    const remaining = totalTasks - completedTasks;
    if (remaining > 0 && remaining <= 3) {
      suggestions.push(`还有${remaining}个任务就完成了加油！`);
    }
  }

  return suggestions;
}

/**
 * 导出模块
 */
module.exports = {
  generateMotivation,
  getMotivationList,
  getPersonalizedSuggestions,
  getRandomQuote,
  getInterventionByKey,
  RISK_LEVELS,
  HIGH_RISK_STRATEGY,
  MEDIUM_RISK_STRATEGY,
  LOW_RISK_STRATEGY,
  ARCS_STRATEGIES
};
