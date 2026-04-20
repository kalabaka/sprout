/**
 * Evaluation Agent - 评估Agent
 * 负责评估学习风险和效果
 *
 * 功能：
 * 1. 基于多维度指标计算学习风险
 * 2. 评估学习效果
 * 3. 生成风险评估报告
 *
 * 输入：
 * - timeDeviation: 时间偏差 (如: 0.2 表示超时20%, -0.1表示提前10%)
 * - completionRate: 完成率 (0-1, 如: 0.8 表示80%)
 * - score: 自评得分 (0-100)
 *
 * 输出示例：
 * {
 *   score: 0.65,        // 风险值 0~1
 *   level: "中风险",     // 风险等级
 *   reason: "完成率较低" // 风险原因
 * }
 */

/**
 * 权重配置
 * 可根据实际需求调整各指标权重
 */
const WEIGHTS = {
  timeDeviation: 0.35,
  completionRate: 0.40,
  score: 0.25
};

const RISK_THRESHOLDS = {
  LOW: 0.3,
  MEDIUM: 0.6
};

const REPLAN_TRIGGERS = {
  consecutive_failures: 3,
  time_deviation_threshold: 0.5,
  completion_rate_threshold: 0.3
};

/**
 * 计算时间偏差风险得分
 *
 * 逻辑说明：
 * - 负偏差(提前完成) -> 低风险
 * - 零偏差(按时完成) -> 低风险
 * - 正偏差(超时) -> 高风险，超时越多风险越高
 *
 * @param {number} deviation 时间偏差 (如: 0.2 = 超时20%)
 * @returns {number} 风险得分 (0-1, 1为最高风险)
 */
function calculateTimeRisk(deviation) {
  // 偏差为空时返回中等风险
  if (deviation === null || deviation === undefined || isNaN(deviation)) {
    return 0.5;
  }

  // 提前完成或按时完成 -> 低风险
  if (deviation <= 0) {
    return 0.2;
  }

  // 超时 0-20% -> 轻微风险
  if (deviation <= 0.2) {
    return 0.3 + deviation * 1.5;
  }

  // 超时 20-50% -> 中等风险
  if (deviation <= 0.5) {
    return 0.5 + (deviation - 0.2) * 1.0;
  }

  // 超时 50%+ -> 高风险
  return 0.8 + Math.min((deviation - 0.5) * 0.4, 0.2);
}

/**
 * 计算完成率风险得分
 *
 * 逻辑说明：
 * - 完成率越高 -> 风险越低
 * - 完成率低于50% -> 高风险
 *
 * @param {number} rate 完成率 (0-1)
 * @returns {number} 风险得分 (0-1, 1为最高风险)
 */
function calculateCompletionRisk(rate) {
  // 完成率为空时返回中等风险
  if (rate === null || rate === undefined || isNaN(rate)) {
    return 0.5;
  }

  // 归一化到 0-1
  const normalizedRate = Math.max(0, Math.min(1, rate));

  // 完成率 >= 80% -> 低风险
  if (normalizedRate >= 0.8) {
    return 0.2;
  }

  // 完成率 60-80% -> 轻微风险
  if (normalizedRate >= 0.6) {
    return 0.3 + (0.8 - normalizedRate) * 1.5;
  }

  // 完成率 40-60% -> 中等风险
  if (normalizedRate >= 0.4) {
    return 0.5 + (0.6 - normalizedRate) * 1.5;
  }

  // 完成率 < 40% -> 高风险
  return 0.8 + (0.4 - normalizedRate) * 0.5;
}

/**
 * 计算自评得分风险
 *
 * 逻辑说明：
 * - 得分越高 -> 风险越低
 * - 得分低于60分 -> 较高风险
 *
 * @param {number} score 自评得分 (0-100)
 * @returns {number} 风险得分 (0-1, 1为最高风险)
 */
function calculateScoreRisk(score) {
  // 分数为空时返回中等风险
  if (score === null || score === undefined || isNaN(score)) {
    return 0.5;
  }

  // 归一化到 0-1
  const normalizedScore = Math.max(0, Math.min(100, score)) / 100;

  // 得分 >= 80 -> 低风险
  if (normalizedScore >= 0.8) {
    return 0.2;
  }

  // 得分 60-80 -> 轻微风险
  if (normalizedScore >= 0.6) {
    return 0.3 + (0.8 - normalizedScore) * 1.5;
  }

  // 得分 40-60 -> 中等风险
  if (normalizedScore >= 0.4) {
    return 0.5 + (0.6 - normalizedScore) * 1.5;
  }

  // 得分 < 40 -> 高风险
  return 0.8 + (0.4 - normalizedScore) * 0.5;
}

/**
 * 综合计算风险值
 *
 * 风险公式：
 * riskScore = α * timeRisk + β * completionRisk + γ * scoreRisk
 *
 * @param {number} timeDeviation 时间偏差
 * @param {number} completionRate 完成率
 * @param {number} score 自评得分
 * @param {Object} customWeights 自定义权重
 * @returns {number} 风险值 (0-1)
 */
function calculateRiskScore(timeDeviation, completionRate, score, customWeights = {}) {
  const weights = { ...WEIGHTS, ...customWeights };

  const timeRisk = calculateTimeRisk(timeDeviation);
  const completionRisk = calculateCompletionRisk(completionRate);
  const scoreRisk = calculateScoreRisk(score);

  // 加权计算综合风险
  const riskScore =
    timeRisk * weights.timeDeviation +
    completionRisk * weights.completionRate +
    scoreRisk * weights.score;

  return Math.max(0, Math.min(1, riskScore));
}

/**
 * 获取风险等级
 *
 * @param {number} riskScore 风险值 (0-1)
 * @returns {string} 风险等级
 */
function getRiskLevel(riskScore) {
  if (riskScore < RISK_THRESHOLDS.LOW) {
    return '低风险';
  } else if (riskScore < RISK_THRESHOLDS.MEDIUM) {
    return '中风险';
  } else {
    return '高风险';
  }
}

/**
 * 生成风险原因
 *
 * 分析各维度指标，找出主要风险因素
 *
 * @param {number} timeDeviation 时间偏差
 * @param {number} completionRate 完成率
 * @param {number} score 自评得分
 * @returns {string} 风险原因描述
 */
function generateRiskReason(timeDeviation, completionRate, score) {
  const reasons = [];

  // 分析时间偏差
  if (timeDeviation !== null && timeDeviation !== undefined) {
    if (timeDeviation > 0.5) {
      reasons.push('严重超时');
    } else if (timeDeviation > 0.2) {
      reasons.push('存在超时情况');
    }
  }

  // 分析完成率
  if (completionRate !== null && completionRate !== undefined) {
    if (completionRate < 0.4) {
      reasons.push('完成率过低');
    } else if (completionRate < 0.6) {
      reasons.push('完成率较低');
    } else if (completionRate < 0.8) {
      reasons.push('完成率有待提高');
    }
  }

  // 分析自评得分
  if (score !== null && score !== undefined) {
    if (score < 40) {
      reasons.push('自评得分较低');
    } else if (score < 60) {
      reasons.push('自评得分不理想');
    }
  }

  // 如果没有明显问题
  if (reasons.length === 0) {
    if (timeDeviation <= 0 && completionRate >= 0.8 && score >= 80) {
      return '学习状态良好';
    }
    return '存在一定风险，建议关注';
  }

  return reasons.join('，');
}

/**
 * 生成风险来源详细分析（可解释性）
 *
 * @param {Object} params 评估参数
 * @param {number} riskScore 风险值
 * @param {string} riskLevel 风险等级
 * @returns {Object} 详细分析
 */
function generateRiskExplanation(params, riskScore, riskLevel) {
  const { timeDeviation, completionRate, score } = params;

  // 计算各维度风险贡献
  const timeRisk = calculateTimeRisk(timeDeviation);
  const completionRisk = calculateCompletionRisk(completionRate);
  const scoreRisk = calculateScoreRisk(score);

  // 计算贡献占比
  const total = timeRisk + completionRisk + scoreRisk;

  const contributions = {
    time: total > 0 ? Math.round(timeRisk / total * 100) : 0,
    completion: total > 0 ? Math.round(completionRisk / total * 100) : 0,
    score: total > 0 ? Math.round(scoreRisk / total * 100) : 0
  };

  return {
    summary: {
      riskLevel,
      riskScore: Math.round(riskScore * 100) / 100,
      evaluation: riskLevel === '低风险' ? '学习状态良好' : riskLevel === '中风险' ? '存在一定风险' : '风险较高'
    },
    dimensions: {
      timeDeviation: { value: timeDeviation, risk: timeRisk, analysis: timeDeviation > 0.5 ? '严重超时' : timeDeviation > 0 ? '存在超时' : '正常' },
      completionRate: { value: completionRate, risk: completionRisk, analysis: completionRate < 0.4 ? '完成率过低' : completionRate < 0.6 ? '完成率一般' : '完成良好' },
      score: { value: score, risk: scoreRisk, analysis: score < 60 ? '得分较低' : score < 80 ? '得分一般' : '得分良好' }
    },
    mainSources: getMainSources(contributions),
    suggestions: getSuggestionsList(contributions, riskLevel)
  };
}

function getMainSources(contributions) {
  const list = [
    { name: '时间管理', value: contributions.time },
    { name: '任务完成', value: contributions.completion },
    { name: '学习质量', value: contributions.score }
  ].sort((a, b) => b.value - a.value).filter(s => s.value > 0);
  return list.map((s, i) => ({ factor: s.name, proportion: `${s.value}%`, priority: i + 1 }));
}

function getSuggestionsList(contributions, riskLevel) {
  const suggestions = [];
  if (contributions.time > 30) suggestions.push('时间管理：建议使用番茄工作法');
  if (contributions.completion > 30) suggestions.push('任务完成：建议拆分任务逐步完成');
  if (contributions.score > 30) suggestions.push('学习质量：建议加强基础知识');
  if (suggestions.length === 0) suggestions.push('继续保持当前学习状态');
  return suggestions;
}

/**
 * 获取评估策略Key
 * 根据风险维度确定需要使用的ARCS策略
 *
 * @param {Object} params 评估参数
 * @param {number} riskScore 综合风险值
 * @returns {string} 策略Key
 */
function getStrategyKey(params, riskScore) {
  const { timeDeviation, completionRate, score } = params;

  // 优先使用综合风险策略（与ARCS策略库对应）
  if (riskScore >= 0.6) {
    return 'high_overall_risk';
  } else if (riskScore >= 0.3) {
    return 'medium_overall_risk';
  } else {
    return 'low_overall_risk';
  }
}

/**
 * 评估学习风险（主函数）
 *
 * @param {Object} params 评估参数
 * @param {number} params.timeDeviation 时间偏差
 * @param {number} params.completionRate 完成率
 * @param {number} params.score 自评得分
 * @returns {Object} 评估结果
 *
 * @example
 * const result = evaluateRisk({
 *   timeDeviation: 0.3,
 *   completionRate: 0.6,
 *   score: 75
 * });
 *
 * // 返回: { score: 0.45, level: "中风险", reason: "存在超时情况，完成率有待提高" }
 */
function evaluateRisk(params) {
  const { timeDeviation, completionRate, score } = params;

  console.log('[Evaluation Agent] 开始评估学习风险...');
  console.log('[Evaluation Agent] 指标: timeDeviation=', timeDeviation, 'completionRate=', completionRate, 'score=', score);

  // 1. 计算综合风险值
  const riskScore = calculateRiskScore(timeDeviation, completionRate, score);

  // 2. 获取风险等级
  const riskLevel = getRiskLevel(riskScore);

  // 3. 生成风险原因
  const riskReason = generateRiskReason(timeDeviation, completionRate, score);

  // 4. 生成风险来源分析
  const explanation = generateRiskExplanation(params, riskScore, riskLevel);

  // 5. 获取对应的ARCS策略Key
  const strategyKey = getStrategyKey(params, riskScore);

  // 6. 构建返回结果
  const result = {
    score: Math.round(riskScore * 100) / 100,  // 保留两位小数
    level: riskLevel,
    reason: riskReason,
    strategyKey: strategyKey,  // 新增：用于motivationAgent查找策略
    explanation
  };

  console.log('[Evaluation Agent] 评估完成: score=', result.score, 'level=', result.level, 'strategyKey=', result.strategyKey, '\n');

  return result;
}

/**
 * 批量评估多个任务
 *
 * @param {Array} tasks 任务列表
 * @returns {Array} 评估结果列表
 */
function evaluateBatch(tasks) {
  return tasks.map((task, index) => ({
    taskId: task.id || index + 1,
    taskName: task.name || `任务${index + 1}`,
    ...evaluateRisk({
      timeDeviation: task.timeDeviation,
      completionRate: task.completionRate,
      score: task.score
    })
  }));
}

/**
 * 获取评估建议
 *
 * 根据风险等级返回改进建议
 *
 * @param {string} riskLevel 风险等级
 * @returns {Object} 评估建议
 */
function getSuggestions(riskLevel) {
  const suggestions = {
    '低风险': {
      status: '良好',
      suggestion: '继续保持当前学习节奏，定期复盘巩固',
      action: ['定期回顾学习内容', '尝试挑战更高难度任务', '分享学习心得']
    },
    '中风险': {
      status: '需关注',
      suggestion: '建议适当调整学习计划，加强薄弱环节',
      action: ['分析任务未完成原因', '调整学习时间分配', '增加练习强度']
    },
    '高风险': {
      status: '需干预',
      suggestion: '建议立即调整学习策略，必要时寻求帮助',
      action: ['重新评估学习目标', '制定详细改进计划', '考虑寻求老师或同伴指导']
    }
  };

  return suggestions[riskLevel] || suggestions['低风险'];
}

function checkReplanNeeded(params) {
  const {
    consecutiveFailures = 0,
    timeDeviation = 0,
    completionRate = 1,
    recentScores = []
  } = params;

  const triggers = [];
  let needReplan = false;

  if (consecutiveFailures >= REPLAN_TRIGGERS.consecutive_failures) {
    triggers.push({
      type: 'consecutive_failures',
      value: consecutiveFailures,
      threshold: REPLAN_TRIGGERS.consecutive_failures,
      message: `连续 ${consecutiveFailures} 个任务未完成`
    });
    needReplan = true;
  }

  if (timeDeviation > REPLAN_TRIGGERS.time_deviation_threshold) {
    triggers.push({
      type: 'time_deviation',
      value: timeDeviation,
      threshold: REPLAN_TRIGGERS.time_deviation_threshold,
      message: `当前进度落后计划 ${Math.round(timeDeviation * 100)}%`
    });
    needReplan = true;
  }

  if (completionRate < REPLAN_TRIGGERS.completion_rate_threshold) {
    triggers.push({
      type: 'completion_rate',
      value: completionRate,
      threshold: REPLAN_TRIGGERS.completion_rate_threshold,
      message: `完成率仅 ${Math.round(completionRate * 100)}%`
    });
    needReplan = true;
  }

  const avgScore = recentScores.length > 0
    ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
    : null;

  if (avgScore !== null && avgScore < 60) {
    triggers.push({
      type: 'low_scores',
      value: avgScore,
      threshold: 60,
      message: `近期平均得分 ${Math.round(avgScore)} 分`
    });
    needReplan = true;
  }

  return {
    needReplan,
    triggers,
    summary: triggers.length > 0
      ? triggers.map(t => t.message).join('；')
      : '学习进度正常'
  };
}

module.exports = {
  evaluateRisk,
  evaluateBatch,
  calculateRiskScore,
  getRiskLevel,
  generateRiskReason,
  getSuggestions,
  getStrategyKey,
  calculateTimeRisk,
  calculateCompletionRisk,
  calculateScoreRisk,
  checkReplanNeeded,
  WEIGHTS,
  RISK_THRESHOLDS,
  REPLAN_TRIGGERS
};
