const express = require('express');
const router = express.Router();
const AchievementController = require('../controllers/AchievementController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/streak', AchievementController.getStreak);

router.get('/badges', AchievementController.getUserBadges);

router.get('/badges/all', AchievementController.getAllBadges);

router.get('/recent', AchievementController.getRecentBadges);

module.exports = router;
