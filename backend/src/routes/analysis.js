/**
 * 数据分析路由
 */
const express = require('express');
const router = express.Router();
const AnalysisController = require('../controllers/AnalysisController');
const authMiddleware = require('../middleware/auth');

// 路由前缀: /api/analysis

// 获取学习趋势数据（需认证）
router.get('/trend', authMiddleware, AnalysisController.getTrend);

// 获取学习统计摘要（需认证）
router.get('/summary', authMiddleware, AnalysisController.getSummary);

// 获取能力雷达数据（需认证）
router.get('/radar', authMiddleware, AnalysisController.getRadar);

module.exports = router;