const express = require('express');
const router = express.Router();
const StudySessionController = require('../controllers/StudySessionController');
const authMiddleware = require('../middleware/auth');

router.post('/start', authMiddleware, StudySessionController.start);
router.post('/stop', authMiddleware, StudySessionController.stop);
router.get('/active', authMiddleware, StudySessionController.getActive);
router.get('/history', authMiddleware, StudySessionController.getHistory);
router.get('/today-stats', authMiddleware, StudySessionController.getTodayStats);

module.exports = router;
