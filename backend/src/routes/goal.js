/**
 * 学习目标路由
 * /api/goal
 */
const express = require('express');
const router = express.Router();
const GoalController = require('../controllers/GoalController');
const authMiddleware = require('../middleware/auth');

// 创建学习目标
router.post('/', authMiddleware, GoalController.createGoal);

// 获取学习目标列表
router.get('/', authMiddleware, GoalController.getGoals);

// 获取学习目标详情
router.get('/:id', authMiddleware, GoalController.getGoalDetail);

// 更新学习目标
router.put('/:id', authMiddleware, GoalController.updateGoal);

// 删除学习目标
router.delete('/:id', authMiddleware, GoalController.deleteGoal);

module.exports = router;