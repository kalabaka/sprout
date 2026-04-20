/**
 * 通知路由
 */
const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, NotificationController.getNotifications);

router.get('/unread/count', authMiddleware, NotificationController.getUnreadCount);

router.put('/read/all', authMiddleware, NotificationController.markAllAsRead);

router.put('/:id/read', authMiddleware, NotificationController.markAsRead);

router.delete('/:id', authMiddleware, NotificationController.deleteNotification);

router.get('/settings', authMiddleware, NotificationController.getSettings);

router.put('/settings', authMiddleware, NotificationController.updateSettings);

module.exports = router;
