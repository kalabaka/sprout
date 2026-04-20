const express = require('express');
const router = express.Router();
const QuizController = require('../controllers/QuizController');
const authMiddleware = require('../middleware/auth');

router.get('/knowledge-point/:kpId', QuizController.getQuiz);

router.get('/task/:taskId', authMiddleware, QuizController.getQuizForTask);

router.post('/knowledge-point/:kpId/submit', authMiddleware, QuizController.submitAnswer);

router.get('/knowledge-point/:kpId/unlocked', authMiddleware, QuizController.checkUnlocked);

module.exports = router;
