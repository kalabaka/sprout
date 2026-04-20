const KnowledgeModel = require('../models/KnowledgeModel');
const LearningRecordModel = require('../models/LearningRecordModel');
const logger = require('../config/logger');

class QuizService {
  static async getQuizByKnowledgePoint(kpId) {
    try {
      const kp = await KnowledgeModel.findById(kpId);
      
      if (!kp) {
        return {
          success: false,
          error: '知识点不存在'
        };
      }
      
      if (!kp.has_quiz || !kp.quiz_data) {
        return {
          success: false,
          error: '该知识点暂无自测题'
        };
      }
      
      const quizData = typeof kp.quiz_data === 'string' 
        ? JSON.parse(kp.quiz_data) 
        : kp.quiz_data;
      
      return {
        success: true,
        quiz: {
          knowledgePointId: kpId,
          knowledgePointName: kp.name,
          type: quizData.type,
          question: quizData.question,
          options: quizData.options || null,
          passScore: kp.quiz_pass_score || 60
        }
      };
    } catch (error) {
      logger.error('获取自测题失败:', error.message);
      return {
        success: false,
        error: '获取自测题失败'
      };
    }
  }

  static async submitAnswer(kpId, userId, answer, taskId = null) {
    try {
      const kp = await KnowledgeModel.findById(kpId);
      
      if (!kp) {
        return {
          success: false,
          error: '知识点不存在'
        };
      }
      
      if (!kp.has_quiz || !kp.quiz_data) {
        return {
          success: false,
          error: '该知识点暂无自测题'
        };
      }
      
      const quizData = typeof kp.quiz_data === 'string' 
        ? JSON.parse(kp.quiz_data) 
        : kp.quiz_data;
      
      const result = this.evaluateAnswer(quizData, answer);
      const passScore = kp.quiz_pass_score || 60;
      const isPassed = result.score >= passScore;
      
      await LearningRecordModel.createQuizRecord(userId, {
        taskId,
        knowledgePointId: kpId,
        score: result.score,
        isPassed
      });
      
      return {
        success: true,
        correct: result.correct,
        score: result.score,
        correctAnswer: result.correctAnswer,
        explanation: quizData.explanation,
        isPassed,
        passScore,
        knowledgePointId: kpId
      };
    } catch (error) {
      logger.error('提交答案失败:', error.message);
      return {
        success: false,
        error: '提交答案失败'
      };
    }
  }

  static evaluateAnswer(quizData, userAnswer) {
    const { type } = quizData;
    
    switch (type) {
      case 'single_choice':
        return this.evaluateSingleChoice(quizData, userAnswer);
      case 'true_false':
        return this.evaluateTrueFalse(quizData, userAnswer);
      case 'fill_blank':
        return this.evaluateFillBlank(quizData, userAnswer);
      default:
        return {
          correct: false,
          score: 0,
          correctAnswer: null
        };
    }
  }

  static evaluateSingleChoice(quizData, userAnswer) {
    const correct = userAnswer.toUpperCase() === quizData.correct.toUpperCase();
    return {
      correct,
      score: correct ? 100 : 0,
      correctAnswer: quizData.correct
    };
  }

  static evaluateTrueFalse(quizData, userAnswer) {
    const userBool = userAnswer === true || userAnswer === 'true' || userAnswer === 1;
    const correctBool = quizData.correct === true || quizData.correct === 'true';
    const isCorrect = userBool === correctBool;
    
    return {
      correct: isCorrect,
      score: isCorrect ? 100 : 0,
      correctAnswer: correctBool ? '正确' : '错误'
    };
  }

  static evaluateFillBlank(quizData, userAnswer) {
    const { keywords, match_mode } = quizData;
    const userAnswerLower = (userAnswer || '').toLowerCase().trim();
    
    const matchedKeywords = keywords.filter(kw => 
      userAnswerLower.includes(kw.toLowerCase())
    );
    
    const matchCount = matchedKeywords.length;
    const totalKeywords = keywords.length;
    
    let score = 0;
    if (match_mode === 'all') {
      score = matchCount === totalKeywords ? 100 : Math.round((matchCount / totalKeywords) * 50);
    } else {
      score = matchCount > 0 ? 100 : 0;
    }
    
    return {
      correct: score === 100,
      score,
      correctAnswer: keywords.join(' 或 '),
      matchedKeywords,
      totalKeywords
    };
  }

  static async getQuizForTask(taskId, userId) {
    try {
      const LearningTaskModel = require('../models/LearningTaskModel');
      const task = await LearningTaskModel.findById(taskId, userId);
      
      if (!task) {
        return {
          success: false,
          error: '任务不存在'
        };
      }
      
      if (!task.knowledge_point_id) {
        return {
          success: false,
          error: '任务未关联知识点'
        };
      }
      
      return await this.getQuizByKnowledgePoint(task.knowledge_point_id);
    } catch (error) {
      logger.error('获取任务自测题失败:', error.message);
      return {
        success: false,
        error: '获取自测题失败'
      };
    }
  }

  static async checkKnowledgePointUnlocked(userId, kpId) {
    try {
      const kp = await KnowledgeModel.findById(kpId);
      
      if (!kp) {
        return { unlocked: false, reason: '知识点不存在' };
      }
      
      if (!kp.has_quiz) {
        return { unlocked: true, reason: '无需测试' };
      }
      
      const LearningRecordModel = require('../models/LearningRecordModel');
      const records = await LearningRecordModel.findByUserAndKnowledgePoint(userId, kpId);
      
      const passedRecord = records.find(r => r.quiz_passed === true);
      
      if (passedRecord) {
        return { unlocked: true, reason: '已通过测试' };
      }
      
      return { 
        unlocked: false, 
        reason: '需要通过自测题',
        hasQuiz: true,
        quizData: kp.quiz_data
      };
    } catch (error) {
      logger.error('检查知识点解锁状态失败:', error.message);
      return { unlocked: false, reason: '检查失败' };
    }
  }
}

module.exports = QuizService;
