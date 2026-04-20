/**
 * 学习计划路由
 */
const express = require('express');
const router = express.Router();
const PlanController = require('../controllers/PlanController');
const ReplanController = require('../controllers/ReplanController');
const authMiddleware = require('../middleware/auth');

// 路由前缀: /api/plan

// 检查创建限制（需认证）
router.get('/create/check', authMiddleware, PlanController.checkCreateLimit);

// 创建学习计划（需认证）
router.post('/', authMiddleware, PlanController.createPlan);

// 获取学习计划列表（需认证）
router.get('/', authMiddleware, PlanController.getPlans);

// 获取进行中的计划列表（需认证）
router.get('/active', authMiddleware, PlanController.getActivePlans);

// 创建计划草稿（需认证）
router.post('/draft', authMiddleware, PlanController.createDraft);

// 生成学习路径（需认证）
router.post('/:id/generate', authMiddleware, PlanController.generatePlan);

// 确认创建计划（需认证）
router.post('/:id/confirm', authMiddleware, PlanController.confirmPlan);

// 获取学习计划详情（需认证）
router.get('/:id', authMiddleware, PlanController.getPlanDetail);

// 获取计划完整详情（需认证）
router.get('/:id/detail', authMiddleware, PlanController.getFullDetail);

// 获取进度趋势数据（需认证）
router.get('/:id/progress', authMiddleware, PlanController.getProgressTrend);

// 更新任务排序（需认证）
router.put('/:id/tasks/reorder', authMiddleware, PlanController.reorderTasks);

// 手动添加任务（需认证）
router.post('/:id/tasks', authMiddleware, PlanController.addPlanTask);

// 删除任务（需认证）
router.delete('/:id/tasks/:taskId', authMiddleware, PlanController.deletePlanTask);

// 更新计划设置（需认证）
router.put('/:id/settings', authMiddleware, PlanController.updatePlanSettings);

// 更新计划截止日期（需认证）
router.put('/:id/deadline', authMiddleware, PlanController.updatePlanDeadline);

// 重新规划剩余任务（需认证）
router.post('/:id/replan', authMiddleware, PlanController.replan);

// 检查是否需要重规划（需认证）
router.get('/:id/replan/check', authMiddleware, PlanController.checkReplan);

// 获取重规划历史（需认证）
router.get('/:id/replan/history', authMiddleware, PlanController.getReplanHistory);

// 更新计划状态（需认证）
router.put('/:id/status', authMiddleware, PlanController.updateStatus);

// 获取激励文案（需认证）
router.get('/:id/motivation', authMiddleware, PlanController.getMotivation);

// 更新学习计划（需认证）
router.put('/:id', authMiddleware, PlanController.updatePlan);

// 删除学习计划（需认证）
router.delete('/:id', authMiddleware, PlanController.deletePlan);

// =====================================================
// 动态重规划API
// =====================================================

// 检查是否需要重规划（需认证）
router.get('/:id/replan/check', authMiddleware, ReplanController.checkReplan);

// 执行重规划（需认证）
router.post('/:id/replan', authMiddleware, ReplanController.executeReplan);

// 获取重规划历史（需认证）
router.get('/:id/replan/history', authMiddleware, ReplanController.getReplanHistory);

// 动态重规划学习任务（需认证）
router.post('/replan', authMiddleware, ReplanController.replan);

// 快速重规划（需认证）
router.post('/replan/quick', authMiddleware, ReplanController.quickReplan);

// 获取任务优先级建议（需认证）
router.get('/replan/priority/:goalId', authMiddleware, ReplanController.getPriority);

// 批量更新任务顺序（需认证）
router.post('/replan/update-order', authMiddleware, ReplanController.updateOrder);

module.exports = router;