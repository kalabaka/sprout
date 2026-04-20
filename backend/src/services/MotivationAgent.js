const LLMService = require('./LLMService');
const logger = require('../config/logger');

class MotivationAgent {
  static async generate(plan) {
    try {
      const progress = plan.progress || 0;
      const totalTasks = plan.total_tasks || 0;
      const completedTasks = plan.completed_tasks || 0;

      let tone = 'encouraging';
      if (progress < 30) {
        tone = 'motivating';
      } else if (progress < 60) {
        tone = 'encouraging';
      } else if (progress < 90) {
        tone = 'celebrating';
      } else {
        tone = 'congratulating';
      }

      const prompt = this.buildPrompt(plan, tone);

      const message = await LLMService.callLLM([
        { role: 'system', content: '你是一个温暖、有感染力的学习激励助手。你的话语要简短有力，能激发学习动力。' },
        { role: 'user', content: prompt }
      ]);

      return {
        message,
        tone,
        progress,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('生成激励文案失败:', error.message);
      return this.getFallbackMotivation(plan);
    }
  }

  static buildPrompt(plan, tone) {
    const progress = plan.progress || 0;
    const name = plan.name || '学习计划';
    const remaining = (plan.total_tasks || 0) - (plan.completed_tasks || 0);

    const toneGuides = {
      motivating: '用户刚开始或进度较慢，需要激发动力和信心。',
      encouraging: '用户正在稳步前进，需要持续的鼓励和支持。',
      celebrating: '用户已经完成了大部分任务，需要庆祝和肯定。',
      congratulating: '用户即将完成，需要祝贺和总结。'
    };

    return `你是一个学习激励助手。

计划名称：${name}
当前进度：${progress.toFixed(1)}%
已完成任务：${plan.completed_tasks || 0}/${plan.total_tasks || 0}
剩余任务：${remaining}

${toneGuides[tone]}

请生成一句简短（20字以内）的激励文案，要温暖有力量，能激发学习动力。
不要使用emoji，直接输出文案。`;
  }

  static getFallbackMotivation(plan) {
    const progress = plan.progress || 0;
    const messages = {
      low: [
        '每一次开始都是进步的开始！',
        '坚持就是胜利，加油！',
        '相信自己，你一定可以的！'
      ],
      medium: [
        '你已经走了很远，继续加油！',
        '每一步都是成长，保持节奏！',
        '稳扎稳打，胜利在望！'
      ],
      high: [
        '太棒了，胜利就在眼前！',
        '冲刺阶段，坚持就是胜利！',
        '你做得很棒，继续前进！'
      ]
    };

    let category = 'low';
    if (progress >= 60) category = 'high';
    else if (progress >= 30) category = 'medium';

    const randomMessage = messages[category][Math.floor(Math.random() * messages[category].length)];

    return {
      message: randomMessage,
      tone: category === 'high' ? 'celebrating' : category === 'medium' ? 'encouraging' : 'motivating',
      progress,
      timestamp: new Date().toISOString()
    };
  }

  static async generateDailyTip(plan) {
    try {
      const prompt = `为正在学习"${plan.name}"的同学生成一个今日学习小贴士。
要求：
1. 简短实用（30字以内）
2. 针对性强
3. 可操作性强

直接输出贴士内容，不要其他解释。`;

      const tip = await LLMService.callLLM([
        { role: 'system', content: '你是一个学习效率专家，擅长给出简洁实用的学习建议。' },
        { role: 'user', content: prompt }
      ]);

      return {
        tip,
        date: new Date().toISOString().split('T')[0]
      };
    } catch (error) {
      logger.error('生成每日贴士失败:', error.message);
      return {
        tip: '专注当下，一次只做一件事。',
        date: new Date().toISOString().split('T')[0]
      };
    }
  }

  static async generateCompletionCelebration(plan) {
    try {
      const prompt = `用户刚刚完成了学习计划"${plan.name}"！
总任务数：${plan.total_tasks || 0}
累计学习时长：${plan.total_minutes || 0}分钟

请生成一段简短的庆祝文案（50字以内），肯定用户的努力和成就。
要温暖、真诚、有感染力。`;

      const celebration = await LLMService.callLLM([
        { role: 'system', content: '你是一个温暖真诚的伙伴，善于表达祝贺和肯定。' },
        { role: 'user', content: prompt }
      ]);

      return {
        celebration,
        stats: {
          totalTasks: plan.total_tasks,
          totalMinutes: plan.total_minutes
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('生成完成庆祝文案失败:', error.message);
      return {
        celebration: '恭喜你完成了学习计划！你的坚持和努力值得赞赏！',
        stats: {
          totalTasks: plan.total_tasks,
          totalMinutes: plan.total_minutes
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = MotivationAgent;
