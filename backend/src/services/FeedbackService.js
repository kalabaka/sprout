const KnowledgeModel = require('../models/KnowledgeModel');
const logger = require('../config/logger');

class FeedbackService {
  static feedbackTemplates = {
    excellent: {
      range: [90, 100],
      summary: '太棒了！你对{topic}掌握得很好，继续保持！',
      encouragement: '你的努力得到了回报，继续保持这种学习状态！'
    },
    good: {
      range: [70, 89],
      summary: '不错！{topic}还需巩固，建议复习相关概念',
      encouragement: '你已经掌握了大部分内容，再努力一点就能更上一层楼！'
    },
    pass: {
      range: [60, 69],
      summary: '勉强过关，{weakness}需要加强练习',
      encouragement: '别气馁，只要多加练习，一定能取得更好的成绩！'
    },
    needImprove: {
      range: [0, 59],
      summary: '别灰心！{weakness}是重点，建议重新学习并做专项练习',
      encouragement: '失败是成功之母，重新梳理知识点，你一定能行！'
    }
  };

  static getFeedbackLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 60) return 'pass';
    return 'needImprove';
  }

  static async generateFeedback(task, evaluationResult) {
    try {
      const score = evaluationResult?.score ?? 0;
      const level = this.getFeedbackLevel(score);
      const template = this.feedbackTemplates[level];
      
      const topic = await this.getTopic(task);
      const strengths = this.identifyStrengths(evaluationResult, task);
      const weaknesses = this.identifyWeaknesses(evaluationResult, task);
      const suggestions = this.generateSuggestions(weaknesses, task, level);
      const recommendedResources = await this.getRecommendedResources(task, weaknesses);
      
      let summary = template.summary;
      summary = summary.replace('{topic}', topic);
      summary = summary.replace('{weakness}', weaknesses[0] || '相关知识点');
      
      return {
        score,
        level,
        feedback: {
          summary,
          encouragement: template.encouragement,
          strengths,
          weaknesses,
          suggestions,
          recommendedResources,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('生成反馈失败:', error.message);
      return this.getDefaultFeedback(task, evaluationResult);
    }
  }

  static async getTopic(task) {
    if (task.knowledge_point_id) {
      try {
        const kp = await KnowledgeModel.findById(task.knowledge_point_id);
        if (kp) return kp.name;
      } catch (e) {
        // ignore
      }
    }
    return task.name || '本任务';
  }

  static identifyStrengths(evaluationResult, task) {
    const strengths = [];
    
    if (!evaluationResult || !evaluationResult.isAutoEvaluated) {
      if (evaluationResult?.score >= 70) {
        strengths.push('完成了学习任务');
      }
      return strengths;
    }
    
    const { type, isCorrect, score } = evaluationResult;
    
    if (isCorrect) {
      strengths.push('答案完全正确');
    } else if (score >= 50) {
      strengths.push('部分答案正确');
    }
    
    if (type === 'single_choice') {
      if (isCorrect) {
        strengths.push('对概念理解准确');
      }
    } else if (type === 'multiple_choice') {
      if (evaluationResult.userCorrectCount > 0) {
        strengths.push(`正确选择了${evaluationResult.userCorrectCount}个选项`);
      }
    } else if (type === 'fill_blank') {
      if (evaluationResult.matchedKeywords?.length > 0) {
        strengths.push(`正确使用了关键词：${evaluationResult.matchedKeywords.join('、')}`);
      }
    }
    
    if (strengths.length === 0) {
      strengths.push('尝试完成任务');
    }
    
    return strengths;
  }

  static identifyWeaknesses(evaluationResult, task) {
    const weaknesses = [];
    
    if (!evaluationResult || !evaluationResult.isAutoEvaluated) {
      return weaknesses;
    }
    
    const { type, isCorrect, score } = evaluationResult;
    
    if (isCorrect) {
      return weaknesses;
    }
    
    if (type === 'single_choice') {
      weaknesses.push('单选题答题技巧');
      weaknesses.push('概念理解');
    } else if (type === 'multiple_choice') {
      if (evaluationResult.userWrongCount > 0) {
        weaknesses.push('多选题选项分析');
      }
      if (evaluationResult.userCorrectCount < (evaluationResult.correctAnswers?.length || 0)) {
        weaknesses.push('选项遗漏问题');
      }
    } else if (type === 'fill_blank') {
      if (evaluationResult.unmatchedKeywords?.length > 0) {
        weaknesses.push(`关键词遗漏：${evaluationResult.unmatchedKeywords.join('、')}`);
      }
      weaknesses.push('知识点记忆');
    }
    
    if (score < 60) {
      weaknesses.push('基础知识掌握');
    }
    
    return weaknesses;
  }

  static generateSuggestions(weaknesses, task, level) {
    const suggestions = [];
    
    if (level === 'excellent') {
      suggestions.push('可以尝试更高难度的题目');
      suggestions.push('帮助同学解答问题，巩固知识');
      return suggestions;
    }
    
    if (weaknesses.includes('单选题答题技巧')) {
      suggestions.push('仔细审题，注意题目中的关键词');
      suggestions.push('排除法是有效的答题策略');
    }
    
    if (weaknesses.includes('多选题选项分析')) {
      suggestions.push('多选题要逐个分析每个选项');
      suggestions.push('注意选项之间的逻辑关系');
    }
    
    if (weaknesses.includes('选项遗漏问题')) {
      suggestions.push('确保检查所有选项');
      suggestions.push('不要急于作答，仔细阅读每个选项');
    }
    
    if (weaknesses.some(w => w.includes('关键词'))) {
      suggestions.push('复习相关概念的定义和术语');
      suggestions.push('制作知识点卡片帮助记忆');
    }
    
    if (weaknesses.includes('基础知识掌握')) {
      suggestions.push('建议重新学习基础概念');
      suggestions.push('观看相关教学视频');
      suggestions.push('完成基础练习题');
    }
    
    if (weaknesses.includes('概念理解')) {
      suggestions.push('复习教材相关章节');
      suggestions.push('尝试用自己的话解释概念');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('继续练习相关题目');
      suggestions.push('定期复习巩固知识');
    }
    
    return suggestions;
  }

  static async getRecommendedResources(task, weaknesses) {
    const resources = [];
    
    if (weaknesses.length === 0) {
      return resources;
    }
    
    if (weaknesses.includes('基础知识掌握') || weaknesses.includes('概念理解')) {
      resources.push({
        type: 'video',
        title: '基础概念讲解视频',
        description: '系统讲解核心概念，适合基础薄弱的同学'
      });
    }
    
    if (weaknesses.some(w => w.includes('答题技巧') || w.includes('选项'))) {
      resources.push({
        type: 'practice',
        title: '专项练习题库',
        description: '针对薄弱环节的专项练习'
      });
    }
    
    if (weaknesses.some(w => w.includes('关键词') || w.includes('记忆'))) {
      resources.push({
        type: 'flashcard',
        title: '知识点卡片',
        description: '帮助记忆关键术语和概念'
      });
    }
    
    return resources;
  }

  static getDefaultFeedback(task, evaluationResult) {
    const score = evaluationResult?.score ?? 0;
    const level = this.getFeedbackLevel(score);
    
    return {
      score,
      level,
      feedback: {
        summary: '任务已完成',
        encouragement: '继续努力！',
        strengths: ['完成了任务'],
        weaknesses: [],
        suggestions: ['继续练习'],
        recommendedResources: [],
        timestamp: new Date().toISOString()
      }
    };
  }
}

module.exports = FeedbackService;
