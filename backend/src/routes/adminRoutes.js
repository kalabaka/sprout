/**
 * 管理员路由
 * 所有路由都需要管理员权限验证
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAdmin, verifySuperAdmin } = require('../middleware/adminAuth');

// 所有路由都需要管理员权限
router.use(verifyAdmin);

// ==================== 仪表盘 ====================
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/interventions', adminController.getInterventionStats);
router.get('/statistics', adminController.getStatistics);

// ==================== 用户管理 ====================
router.get('/users', adminController.getUserList);
router.get('/users/:userId', adminController.getUserDetail);
router.put('/users/status', adminController.toggleUserStatus);
router.delete('/users/:userId', adminController.deleteUser);
router.get('/risk-users', adminController.getRiskUsers);

// ==================== 用户反馈 ====================
router.get('/feedback', adminController.getUserFeedback);
router.put('/feedback/:feedbackId', adminController.handleUserFeedback);

// ==================== 资源管理 ====================
router.get('/resources', adminController.getResourceList);
router.post('/resources', adminController.addResource);
router.put('/resources/:resourceId', adminController.updateResource);
router.delete('/resources/:resourceId', adminController.deleteResource);

// ==================== 管理员个人信息 ====================
router.get('/profile', adminController.getAdminProfile);
router.put('/profile/password', adminController.changeAdminPassword);

// ==================== 管理员账号管理（仅超级管理员）====================
router.get('/admins', verifySuperAdmin, adminController.getAdminList);
router.post('/admins', verifySuperAdmin, adminController.addAdmin);
router.put('/admins/:adminId', verifySuperAdmin, adminController.updateAdmin);
router.delete('/admins/:adminId', verifySuperAdmin, adminController.deleteAdmin);
router.put('/admins/:adminId/password', verifySuperAdmin, adminController.resetAdminPassword);

// ==================== 系统配置 ====================
router.get('/config', adminController.getSystemConfig);
router.put('/config', adminController.updateSystemConfig);

// ==================== 日志审计 ====================
router.get('/logs/operation', adminController.getOperationLogs);
router.get('/logs/error', adminController.getErrorLogs);

// ==================== 通知模板 ====================
router.get('/notification-templates', adminController.getNotificationTemplates);
router.get('/notification-templates/:id', adminController.getNotificationTemplate);
router.post('/notification-templates', adminController.createNotificationTemplate);
router.put('/notification-templates/:id', adminController.updateNotificationTemplate);
router.delete('/notification-templates/:id', adminController.deleteNotificationTemplate);
router.put('/notification-templates/:id/toggle', adminController.toggleNotificationTemplate);

// ==================== 待处理事项 ====================
router.get('/pending-items', adminController.getPendingItems);
router.put('/pending-items/:id/read', adminController.markPendingItemRead);

// ==================== 实时动态 ====================
router.get('/activities', adminController.getActivities);

// ==================== 学习计划管理 ====================
router.get('/plans', adminController.getPlans);
router.get('/plans/:id', adminController.getPlanDetail);
router.delete('/plans/:id', adminController.deletePlan);

module.exports = router;