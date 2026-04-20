const LearningTaskModel = require('../models/LearningTaskModel');
const logger = require('../config/logger');

class AutoEvaluationService {
  static evaluateSingleChoice(userAnswer, correctAnswer) {
    const isCorrect = userAnswer.toUpperCase() === correctAnswer.toUpperCase();
    return {
      isCorrect,
      score: isCorrect ? 100 : 0,
      feedback: isCorrect 
        ? '回答正确！' 
        : `回答错误。正确答案是 ${correctAnswer}。`,
      correctAnswer
    };
  }

  static evaluateMultipleChoice(userAnswers, correctAnswers) {
    const userSet = new Set(userAnswers.map(a => a.toUpperCase()));
    const correctSet = new Set(correctAnswers.map(a => a.toUpperCase()));
    
    const correctCount = [...userSet].filter(a => correctSet.has(a)).length;
    const wrongCount = [...userSet].filter(a => !correctSet.has(a)).length;
    const missedCount = [...correctSet].filter(a => !userSet.has(a)).length;
    
    let score = 0;
    if (correctSet.size > 0) {
      if (wrongCount === 0 && missedCount === 0) {
        score = 100;
      } else if (wrongCount === 0) {
        score = Math.round((correctCount / correctSet.size) * 100);
      } else {
        score = Math.max(0, Math.round((correctCount - wrongCount) / correctSet.size * 100));
      }
    }
    
    const isCorrect = score === 100;
    
    return {
      isCorrect,
      score,
      feedback: isCorrect 
        ? '回答正确！' 
        : `正确答案是 ${[...correctSet].join(', ')}。`,
      correctAnswers: [...correctSet],
      userCorrectCount: correctCount,
      userWrongCount: wrongCount
    };
  }

  static evaluateFillBlank(userAnswer, keywords, matchMode = 'any') {
    const answerLower = userAnswer.toLowerCase();
    const matchedKeywords = [];
    const unmatchedKeywords = [];
    
    for (const keyword of keywords) {
      if (answerLower.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      } else {
        unmatchedKeywords.push(keyword);
      }
    }
    
    let score = 0;
    let isCorrect = false;
    
    if (keywords.length > 0) {
      const matchRatio = matchedKeywords.length / keywords.length;
      
      if (matchMode === 'all') {
        score = Math.round(matchRatio * 100);
        isCorrect = matchRatio === 1;
      } else {
        if (matchedKeywords.length > 0) {
          score = Math.round(matchRatio * 100);
          isCorrect = matchRatio >= 0.5;
        }
      }
    }
    
    let feedback = '';
    if (isCorrect) {
      feedback = `回答正确！匹配到关键词：${matchedKeywords.join('、')}`;
    } else if (matchedKeywords.length > 0) {
      feedback = `部分正确。匹配到关键词：${matchedKeywords.join('、')}。`;
      if (unmatchedKeywords.length > 0) {
        feedback += `未匹配：${unmatchedKeywords.join('、')}`;
      }
    } else {
      feedback = '回答未匹配到任何关键词。';
    }
    
    return {
      isCorrect,
      score,
      feedback,
      matchedKeywords,
      unmatchedKeywords,
      matchMode
    };
  }

  static async evaluateTask(taskId, userSubmission) {
    try {
      const task = await LearningTaskModel.findByIdWithoutUser(taskId);
      
      if (!task) {
        return {
          success: false,
          error: '任务不存在'
        };
      }
      
      const taskSubtype = task.task_subtype || 'subjective';
      
      if (taskSubtype === 'subjective') {
        return {
          success: true,
          type: 'subjective',
          score: userSubmission.selfScore || null,
          feedback: '主观题已提交，等待人工评分',
          isAutoEvaluated: false
        };
      }
      
      if (!task.question_data) {
        return {
          success: false,
          error: '题目数据缺失'
        };
      }
      
      const questionData = typeof task.question_data === 'string' 
        ? JSON.parse(task.question_data) 
        : task.question_data;
      
      let result;
      
      switch (taskSubtype) {
        case 'single_choice':
          result = this.evaluateSingleChoice(
            userSubmission.answer,
            questionData.correct
          );
          break;
          
        case 'multiple_choice':
          result = this.evaluateMultipleChoice(
            userSubmission.answers || [],
            questionData.correct || []
          );
          break;
          
        case 'fill_blank':
          result = this.evaluateFillBlank(
            userSubmission.answer,
            questionData.keywords || [],
            questionData.match_mode || 'any'
          );
          break;
          
        default:
          return {
            success: false,
            error: '未知的任务类型'
          };
      }
      
      await LearningTaskModel.updateAutoScore(taskId, result.score);
      
      logger.info(`任务 ${taskId} 自动评测完成，得分: ${result.score}`);
      
      return {
        success: true,
        type: taskSubtype,
        isAutoEvaluated: true,
        ...result
      };
    } catch (error) {
      logger.error(`自动评测失败: ${error.message}`);
      return {
        success: false,
        error: '评测过程出错'
      };
    }
  }

  static generateFeedback(evaluationResult, task) {
    const { type, score, isCorrect, feedback } = evaluationResult;
    
    let encouragement = '';
    if (score >= 90) {
      encouragement = '太棒了！继续保持！';
    } else if (score >= 70) {
      encouragement = '做得不错，还有提升空间！';
    } else if (score >= 50) {
      encouragement = '继续努力，你可以做得更好！';
    } else {
      encouragement = '别灰心，多练习就能进步！';
    }
    
    const suggestions = [];
    
    if (type === 'single_choice' || type === 'multiple_choice') {
      if (!isCorrect) {
        suggestions.push('建议复习相关知识点');
        suggestions.push('仔细审题，注意选项细节');
      }
    } else if (type === 'fill_blank') {
      if (evaluationResult.unmatchedKeywords?.length > 0) {
        suggestions.push(`注意关键词：${evaluationResult.unmatchedKeywords.join('、')}`);
      }
    }
    
    return {
      score,
      feedback,
      encouragement,
      suggestions,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = AutoEvaluationService;
