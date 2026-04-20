const express = require('express');
const router = express.Router();
const ExamController = require('../controllers/examController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', ExamController.createExam);

router.get('/upcoming', ExamController.getUpcomingExams);

router.get('/', ExamController.getExams);

router.get('/:id', ExamController.getExamById);

router.get('/:id/countdown', ExamController.getCountdown);

router.get('/:id/plan', ExamController.getRelatedPlan);

router.post('/:id/generate-review-plan', ExamController.generateReviewPlan);

router.put('/:id', ExamController.updateExam);

router.delete('/:id', ExamController.deleteExam);

module.exports = router;
