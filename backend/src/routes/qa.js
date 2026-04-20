/**
 * 智能问答路由
 */
const express = require('express');
const router = express.Router();
const QAController = require('../controllers/QAController');
const authMiddleware = require('../middleware/auth');

// 路由前缀: /api/qa

// 发送问题（需认证）
router.post('/ask', authMiddleware, QAController.ask);

// 获取历史记录（需认证）
router.get('/history/:taskId', authMiddleware, QAController.getHistory);

// 清除历史记录（需认证）
router.delete('/history/:taskId', authMiddleware, QAController.clearHistory);

module.exports = router;
