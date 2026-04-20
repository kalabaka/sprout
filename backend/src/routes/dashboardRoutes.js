/**
 * 仪表盘路由
 * 路由前缀: /api/dashboard
 */
const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/today', DashboardController.getTodayOverview);
router.get('/progress', DashboardController.getLearningProgress);
router.get('/upcoming-courses', DashboardController.getUpcomingCourses);
router.get('/trend', DashboardController.getLearningTrend);
router.get('/full', DashboardController.getFullDashboard);

module.exports = router;
