/**
 * 任务路由
 */
const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/TaskController');
const LearningTaskController = require('../controllers/LearningTaskController');
const authMiddleware = require('../middleware/auth');

// 路由前缀: /api/task

// 获取用户所有任务（需认证）
router.get('/', authMiddleware, LearningTaskController.getAllTasks);

// 获取任务列表（需认证）
router.get('/:planId', authMiddleware, TaskController.getTasks);

// 开始任务（需认证）
router.post('/:id/start', authMiddleware, TaskController.startTask);

// 暂停任务（需认证）
router.post('/:id/pause', authMiddleware, TaskController.pauseTask);

// 恢复任务（需认证）
router.post('/:id/resume', authMiddleware, TaskController.resumeTask);

// 完成任务（需认证）
router.post('/:id/complete', authMiddleware, TaskController.completeTask);

// 获取任务统计（需认证）
router.get('/:planId/stats', authMiddleware, TaskController.getTaskStats);

// =====================================================
// 学习任务实例API (新模块)
// =====================================================

// 获取今日推荐任务（需认证）
router.get('/today/recommend', authMiddleware, LearningTaskController.getTodayTasks);

// 获取任务详情（需认证）
router.get('/detail/:id', authMiddleware, LearningTaskController.getTaskDetail);

// 开始学习任务（需认证）
router.post('/detail/:id/start', authMiddleware, LearningTaskController.startLearningTask);

// 完成任务（需认证）
router.post('/detail/:id/complete', authMiddleware, LearningTaskController.completeLearningTask);

// 跳过任务（需认证）
router.post('/detail/:id/skip', authMiddleware, LearningTaskController.skipLearningTask);

// 获取用户学习统计（需认证）
router.get('/stats/learning', authMiddleware, LearningTaskController.getLearningStats);

// 获取任务历史（需认证）
router.get('/history', authMiddleware, LearningTaskController.getTaskHistory);

// =====================================================
// DDL任务API
// =====================================================

// 创建DDL任务（需认证）
router.post('/ddl', authMiddleware, LearningTaskController.createDDLTask);

// 获取所有DDL任务（需认证）
router.get('/ddl', authMiddleware, LearningTaskController.getAllDDLTasks);

// 获取计划关联的DDL任务（需认证）
router.get('/ddl/plan/:planId', authMiddleware, LearningTaskController.getPlanDDLTasks);

// 获取即将截止的DDL任务（需认证）
router.get('/ddl/upcoming', authMiddleware, LearningTaskController.getUpcomingDDL);

// 获取已逾期的DDL任务（需认证）
router.get('/ddl/overdue', authMiddleware, LearningTaskController.getOverdueDDL);

// 更新任务进度（需认证）
router.put('/:id/progress', authMiddleware, LearningTaskController.updateTaskProgress);

// 更新任务信息（需认证）
router.put('/:id', authMiddleware, LearningTaskController.updateTask);

// 删除任务（需认证）
router.delete('/:id', authMiddleware, LearningTaskController.deleteTask);

// 更新DDL任务（需认证）
router.put('/ddl/:id', authMiddleware, LearningTaskController.updateDDLTask);

// =====================================================
// 客观题任务API
// =====================================================

// 创建客观题任务（需认证）
router.post('/quiz', authMiddleware, LearningTaskController.createQuizTask);

module.exports = router;