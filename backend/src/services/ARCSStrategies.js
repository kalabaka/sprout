/**
 * ARCS 动机干预策略库
 * 基于ARCS动机模型设计
 * - Attention (注意): 引起兴趣和好奇心
 * - Confidence (信心): 建立自信心和自我效能感
 * - Relevance (相关性): 与个人目标相关联
 * - Satisfaction (满足感): 获得成就感和满足感
 * 
 * 支持变量替换: {streak}, {count}, {goal}, {progress}
 */

const InterventionLogModel = require('../models/InterventionLogModel');

const ARCS_STRATEGIES = {
  // ============================================
  // 时间偏差相关策略 - 每个维度5-8条
  // ============================================
  'high_time_deviation': [
    {
      message: '检测到近期学习耗时较长，建议将大任务拆分成多个15分钟的小块，逐步完成建立信心。',
      action: 'suggest_breakdown',
      details: { technique: '番茄工作法', duration: 15, breakDuration: 5 }
    },
    {
      message: '学习时间超出预期，可能任务难度过高。建议先复习基础内容，打好基础再前进。',
      action: 'suggest_review',
      details: { suggestion: '回归基础' }
    },
    {
      message: '长时间学习容易疲劳，试试每学习25分钟休息5分钟，保持大脑清醒。',
      action: 'suggest_pomodoro',
      details: { technique: '番茄钟' }
    },
    {
      message: '任务可能比预期复杂，不妨寻求帮助或查找更多学习资源。',
      action: 'suggest_resources',
      details: { suggestion: '寻找外部帮助' }
    },
    {
      message: '学习效率下降时，换个环境或换种方式可能会有意想不到的效果。',
      action: 'suggest_change',
      details: { suggestion: '改变学习方式' }
    },
    {
      message: '你已经很努力了！但过度疲劳反而影响效果，适当休息也是学习的一部分。',
      action: 'suggest_rest',
      details: { reminder: '劳逸结合' }
    }
  ],
  'medium_time_deviation': [
    {
      message: '学习时间有点超预期了，试试换一种学习方法怎么样？或许可以更快、更高效！',
      action: 'suggest_method_change',
      details: { suggestion: '尝试间隔学习' }
    },
    {
      message: '时间管理还有优化空间，记录一下每天的时间分配，找出效率最高的时段。',
      action: 'suggest_tracking',
      details: { technique: '时间记录' }
    },
    {
      message: '连续学习容易疲劳，穿插一些小休息，反而能提高整体效率。',
      action: 'suggest_breaks',
      details: { suggestion: '适度休息' }
    },
    {
      message: '试试把相似的任务放在一起做，减少切换成本。',
      action: 'suggest_batching',
      details: { technique: '任务批处理' }
    },
    {
      message: '学习时间稍长，检查一下是否有分心的情况？专注能让你事半功倍。',
      action: 'suggest_focus',
      details: { reminder: '保持专注' }
    }
  ],
  'low_time_deviation': [
    {
      message: '你的时间管理很棒！继续保持效率，稳步前进！',
      action: 'praise_efficiency',
      details: { reinforcement: 'positive' }
    },
    {
      message: '高效完成学习任务！你的方法很有效，继续保持！',
      action: 'praise_method',
      details: { reinforcement: 'strong_positive' }
    },
    {
      message: '时间控制得很好！这种节奏非常适合长期坚持。',
      action: 'praise_rhythm',
      details: { reinforcement: 'positive' }
    },
    {
      message: '你的学习效率令人印象深刻！可以考虑适当增加一点挑战。',
      action: 'suggest_challenge',
      details: { suggestion: '适度提升难度' }
    },
    {
      message: '时间管理达人！你的经验可以分享给其他同学。',
      action: 'suggest_share',
      details: { suggestion: '分享经验' }
    }
  ],

  // ============================================
  // 完成率相关策略
  // ============================================
  'low_completion': [
    {
      message: '看到部分任务还没完成，建议从最简单的开始，一次只做一件事！',
      action: 'suggest_easy_start',
      details: { strategy: '从易到难' }
    },
    {
      message: '完成率不高没关系，重要的是开始行动。先完成一个小任务试试？',
      action: 'suggest_small_start',
      details: { strategy: '小步快跑' }
    },
    {
      message: '任务可能太多了，试着减少每天的任务量，先养成习惯再说。',
      action: 'suggest_reduce',
      details: { strategy: '减少任务量' }
    },
    {
      message: '不要被未完成的任务吓到，选择一个最感兴趣的先开始！',
      action: 'suggest_interest',
      details: { strategy: '兴趣驱动' }
    },
    {
      message: '完成率低可能是因为目标太大，把任务拆小一点会更容易完成。',
      action: 'suggest_breakdown',
      details: { strategy: '任务拆分' }
    },
    {
      message: '每一个完成的任务都是进步，别太在意总数，专注于当下！',
      action: 'suggest_focus_now',
      details: { mindset: '专注当下' }
    }
  ],
  'medium_completion': [
    {
      message: '你的学习进度不错！想想完成这些任务后，离你的目标就近了一大步！',
      action: 'connect_goal',
      details: { focus: '目标关联' }
    },
    {
      message: '已经完成了一半多，保持这个节奏，胜利就在前方！',
      action: 'encourage_continue',
      details: { reinforcement: 'positive' }
    },
    {
      message: '进度良好！趁热打铁，一鼓作气完成剩余任务！',
      action: 'encourage_momentum',
      details: { strategy: '乘胜追击' }
    },
    {
      message: '你已经证明了自己能做到，继续加油！',
      action: 'build_confidence',
      details: { reinforcement: '信心建设' }
    },
    {
      message: '完成率稳定上升中，你的坚持正在产生效果！',
      action: 'praise_consistency',
      details: { reinforcement: 'positive' }
    }
  ],
  'high_completion': [
    {
      message: '太棒了！你已经完成了这么多内容！这就是努力的最佳证明！',
      action: 'praise_progress',
      details: { reinforcement: 'strong_positive' }
    },
    {
      message: '完成率超高！你的执行力令人佩服，继续保持！',
      action: 'praise_execution',
      details: { reinforcement: 'strong_positive' }
    },
    {
      message: '你已经完成了大部分任务，最后的冲刺会更加精彩！',
      action: 'encourage_finish',
      details: { strategy: '冲刺阶段' }
    },
    {
      message: '出色的完成率！你正在向目标大步迈进！',
      action: 'celebrate_progress',
      details: { celebration: true }
    },
    {
      message: '高完成率背后是你的坚持和努力，为你点赞！',
      action: 'praise_effort',
      details: { reinforcement: 'strong_positive' }
    }
  ],

  // ============================================
  // 得分相关策略
  // ============================================
  'low_score': [
    {
      message: '这次得分不太理想，但别灰心！这只是学习方法需要调整。试试看专项训练？',
      action: 'suggest_practice',
      details: { suggestion: '薄弱环节专项练习' }
    },
    {
      message: '低分只是暂时的，找出错误原因，下次一定能进步！',
      action: 'encourage_analysis',
      details: { strategy: '错题分析' }
    },
    {
      message: '分数不理想时，回到基础重新理解概念往往有帮助。',
      action: 'suggest_review',
      details: { suggestion: '回归基础' }
    },
    {
      message: '每一次失败都是学习的机会，分析问题比分数更重要。',
      action: 'encourage_growth',
      details: { mindset: '成长型思维' }
    },
    {
      message: '低分提醒我们需要调整策略，这正是进步的开始！',
      action: 'encourage_adjustment',
      details: { strategy: '策略调整' }
    },
    {
      message: '不要被分数打击，问问自己：哪里可以改进？',
      action: 'suggest_reflection',
      details: { strategy: '自我反思' }
    }
  ],
  'medium_score': [
    {
      message: '成绩还不错！如果想要更进一步，可以试着挑战一些更有难度的内容！',
      action: 'suggest_challenge',
      details: { challenge: '提高难度' }
    },
    {
      message: '分数中等说明基础不错，继续巩固就能更上一层楼！',
      action: 'encourage_consolidate',
      details: { strategy: '巩固提升' }
    },
    {
      message: '这个分数说明你掌握了大部分内容，再努力一点就能突破！',
      action: 'encourage_breakthrough',
      details: { strategy: '突破瓶颈' }
    },
    {
      message: '成绩稳定，找到自己的薄弱点针对性练习会更好。',
      action: 'suggest_targeted',
      details: { strategy: '针对性练习' }
    },
    {
      message: '中等成绩是很好的起点，保持学习热情，进步会更快！',
      action: 'encourage_enthusiasm',
      details: { reinforcement: 'positive' }
    }
  ],
  'high_score': [
    {
      message: '优秀！你的努力得到了最好的回报！这样的成绩证明了你的能力和潜力！',
      action: 'celebrate_achievement',
      details: { celebration: true }
    },
    {
      message: '高分来之不易，你的学习方法和态度都很棒！',
      action: 'praise_method',
      details: { reinforcement: 'strong_positive' }
    },
    {
      message: '出色的成绩！你已经掌握了这个知识点，可以尝试更有挑战的内容！',
      action: 'suggest_advance',
      details: { suggestion: '进阶学习' }
    },
    {
      message: '高分是对努力的最好回报，继续保持这种学习状态！',
      action: 'encourage_maintain',
      details: { reinforcement: 'strong_positive' }
    },
    {
      message: '你的成绩令人骄傲！分享你的学习方法，帮助更多同学！',
      action: 'suggest_share',
      details: { suggestion: '分享经验' }
    }
  ],

  // ============================================
  // 综合风险策略
  // ============================================
  'high_overall_risk': [
    {
      message: '综合来看需要调整了。停下来想想：当初为什么定这个目标？它对你有多重要？',
      action: 'reflect_on_goal',
      details: { reflection: '初心回顾' }
    },
    {
      message: '学习状态需要调整，建议暂时放慢节奏，先恢复学习动力。',
      action: 'suggest_slow_down',
      details: { strategy: '调整节奏' }
    },
    {
      message: '遇到困难很正常，寻求帮助不是软弱的表现。找老师或同学聊聊？',
      action: 'suggest_help',
      details: { suggestion: '寻求帮助' }
    },
    {
      message: '高风险状态提醒我们需要改变。从小处着手，一步步调整。',
      action: 'suggest_small_steps',
      details: { strategy: '小步调整' }
    },
    {
      message: '学习压力过大时，适当休息和运动能帮助恢复状态。',
      action: 'suggest_self_care',
      details: { suggestion: '自我调节' }
    },
    {
      message: '重新审视学习计划，可能目标设定需要更现实一些。',
      action: 'suggest_replan',
      details: { strategy: '重新规划' }
    }
  ],
  'medium_overall_risk': [
    {
      message: '学习状态有点起伏，这是正常的。试着换换学习环境，或者和朋友一起学习？',
      action: 'suggest_environment',
      details: { suggestion: '改变环境' }
    },
    {
      message: '状态波动时，回顾一下最近的学习成果，给自己一些正向反馈。',
      action: 'suggest_review_success',
      details: { strategy: '回顾成就' }
    },
    {
      message: '中等风险意味着有改进空间，调整一下学习计划可能会有帮助。',
      action: 'suggest_adjustment',
      details: { strategy: '计划调整' }
    },
    {
      message: '保持稳定的学习节奏，避免大起大落。',
      action: 'suggest_stability',
      details: { strategy: '稳定节奏' }
    },
    {
      message: '状态一般时，设定一些小目标来激励自己。',
      action: 'suggest_mini_goals',
      details: { strategy: '小目标激励' }
    }
  ],
  'low_overall_risk': [
    {
      message: '你做得很好！学习节奏稳定，效果也不错。继续保持，胜利就在眼前！',
      action: 'maintain_momentum',
      details: { status: '可持续' }
    },
    {
      message: '状态极佳！你的学习习惯正在形成，继续保持！',
      action: 'praise_habits',
      details: { reinforcement: 'strong_positive' }
    },
    {
      message: '低风险说明你的学习策略很有效，可以考虑增加一些挑战。',
      action: 'suggest_challenge',
      details: { suggestion: '适度挑战' }
    },
    {
      message: '你的学习状态非常健康，这种节奏可以长期维持！',
      action: 'praise_sustainability',
      details: { reinforcement: 'positive' }
    },
    {
      message: '状态稳定是最好的学习基础，继续保持这种势头！',
      action: 'encourage_continuation',
      details: { reinforcement: 'positive' }
    }
  ],

  // ============================================
  // 连续失败策略（新增）
  // ============================================
  'consecutive_failure': [
    {
      message: '检测到你在"{topic}"上遇到了困难，要不要问问AI助手？它可能给你新的启发！',
      action: 'suggest_ai_help',
      details: { showAiButton: true, topic: '{topic}' }
    },
    {
      message: '连续几次没通过，换个角度理解可能会豁然开朗。试试智能问答？',
      action: 'suggest_ai_qa',
      details: { showAiButton: true }
    },
    {
      message: '遇到瓶颈了？AI助手可以帮你分析问题，找到突破口！',
      action: 'suggest_ai_analysis',
      details: { showAiButton: true }
    }
  ]
};

const RISK_TYPE_MAPPING = {
  timeDeviation: {
    high: 'high_time_deviation',
    medium: 'medium_time_deviation',
    low: 'low_time_deviation'
  },
  completionRate: {
    high_completion: 'high_completion',
    medium: 'medium_completion',
    low: 'low_completion'
  },
  score: {
    high: 'high_score',
    medium: 'medium_score',
    low: 'low_score'
  },
  overall: {
    high: 'high_overall_risk',
    medium: 'medium_overall_risk',
    low: 'low_overall_risk'
  }
};

function replaceVariables(message, context = {}) {
  return message
    .replace(/{streak}/g, context.streak || 0)
    .replace(/{count}/g, context.count || 0)
    .replace(/{goal}/g, context.goal || '学习目标')
    .replace(/{progress}/g, context.progress || 0)
    .replace(/{topic}/g, context.topic || '这个知识点');
}

async function getStrategyWithRotation(userId, strategyKey, context = {}) {
  const strategies = ARCS_STRATEGIES[strategyKey];
  if (!strategies || strategies.length === 0) {
    return null;
  }

  const lastIndex = await InterventionLogModel.getLastStrategyIndex(userId, strategyKey);
  const nextIndex = (lastIndex + 1) % strategies.length;
  const strategy = strategies[nextIndex];

  return {
    ...strategy,
    message: replaceVariables(strategy.message, context),
    strategyIndex: nextIndex,
    strategyKey
  };
}

function getRecommendedStrategy(evaluationResult) {
  const strategies = [];

  if (evaluationResult.timeDeviation > 0.5) {
    strategies.push({ key: 'high_time_deviation', type: 'Confidence' });
  } else if (evaluationResult.timeDeviation > 0) {
    strategies.push({ key: 'medium_time_deviation', type: 'Attention' });
  } else {
    strategies.push({ key: 'low_time_deviation', type: 'Satisfaction' });
  }

  if (evaluationResult.completionRate < 0.4) {
    strategies.push({ key: 'low_completion', type: 'Confidence' });
  } else if (evaluationResult.completionRate < 0.7) {
    strategies.push({ key: 'medium_completion', type: 'Relevance' });
  } else {
    strategies.push({ key: 'high_completion', type: 'Satisfaction' });
  }

  if (evaluationResult.score < 50) {
    strategies.push({ key: 'low_score', type: 'Confidence' });
  } else if (evaluationResult.score < 80) {
    strategies.push({ key: 'medium_score', type: 'Attention' });
  } else {
    strategies.push({ key: 'high_score', type: 'Satisfaction' });
  }

  if (evaluationResult.riskScore > 0.6) {
    strategies.push({ key: 'high_overall_risk', type: 'Relevance' });
  } else if (evaluationResult.riskScore > 0.3) {
    strategies.push({ key: 'medium_overall_risk', type: 'Attention' });
  } else {
    strategies.push({ key: 'low_overall_risk', type: 'Satisfaction' });
  }

  return strategies;
}

async function generateMotivationMessage(strategies, context = {}) {
  const confidenceStrategy = strategies.find(s => s.type === 'Confidence');
  const satisfactionStrategy = strategies.find(s => s.type === 'Satisfaction');
  const primaryStrategyKey = (confidenceStrategy || satisfactionStrategy || strategies[0])?.key;

  if (!primaryStrategyKey) {
    return { message: '继续加油！', action_type: 'encourage', details: {} };
  }

  const userId = context.userId;
  const strategy = await getStrategyWithRotation(userId, primaryStrategyKey, context);

  return {
    message: strategy.message,
    action_type: strategy.action,
    category: strategy.details?.category || 'general',
    details: strategy.details,
    strategyIndex: strategy.strategyIndex,
    strategyKey: primaryStrategyKey,
    all_strategies: strategies.map(s => ({ type: s.type, key: s.key })),
    context: context
  };
}

module.exports = {
  ARCS_STRATEGIES,
  RISK_TYPE_MAPPING,
  getRecommendedStrategy,
  generateMotivationMessage,
  getStrategyWithRotation,
  replaceVariables
};