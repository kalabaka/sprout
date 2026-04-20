const QuizService = require('../services/QuizService');
const { success, fail } = require('../utils/response');
const logger = require('../config/logger');

class QuizController {
  static async getQuiz(req, res) {
    try {
      const kpId = parseInt(req.params.kpId);
      
      if (!kpId) {
        return res.status(400).json(fail('无效的知识点ID'));
      }
      
      const result = await QuizService.getQuizByKnowledgePoint(kpId);
      
      if (result.success) {
        res.json(success(result.quiz, '获取成功'));
      } else {
        res.status(404).json(fail(result.error));
      }
    } catch (error) {
      logger.error('获取自测题失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  static async getQuizForTask(req, res) {
    try {
      const userId = req.user.userId;
      const taskId = parseInt(req.params.taskId);
      
      if (!taskId) {
        return res.status(400).json(fail('无效的任务ID'));
      }
      
      const result = await QuizService.getQuizForTask(taskId, userId);
      
      if (result.success) {
        res.json(success(result.quiz, '获取成功'));
      } else {
        res.status(404).json(fail(result.error));
      }
    } catch (error) {
      logger.error('获取任务自测题失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  static async submitAnswer(req, res) {
    try {
      const userId = req.user.userId;
      const kpId = parseInt(req.params.kpId);
      const { answer, taskId } = req.body;
      
      if (!kpId) {
        return res.status(400).json(fail('无效的知识点ID'));
      }
      
      if (answer === undefined || answer === null) {
        return res.status(400).json(fail('请提供答案'));
      }
      
      const result = await QuizService.submitAnswer(kpId, userId, answer, taskId);
      
      if (result.success) {
        logger.info('quiz', `自测答题: 用户${userId}, 知识点${kpId}, 得分${result.score}, 通过${result.isPassed}`);
        res.json(success(result, result.isPassed ? '恭喜通过！' : '未通过，请继续学习'));
      } else {
        res.status(400).json(fail(result.error));
      }
    } catch (error) {
      logger.error('提交答案失败:', error.message);
      res.status(500).json(fail('提交失败'));
    }
  }

  static async checkUnlocked(req, res) {
    try {
      const userId = req.user.userId;
      const kpId = parseInt(req.params.kpId);
      
      if (!kpId) {
        return res.status(400).json(fail('无效的知识点ID'));
      }
      
      const result = await QuizService.checkKnowledgePointUnlocked(userId, kpId);
      
      res.json(success(result, result.unlocked ? '已解锁' : '未解锁'));
    } catch (error) {
      logger.error('检查解锁状态失败:', error.message);
      res.status(500).json(fail('检查失败'));
    }
  }
}

module.exports = QuizController;
