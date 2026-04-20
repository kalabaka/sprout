/**
 * 用户路由
 * /api/user/*
 */
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middleware/auth');

// 注册
router.post('/register', UserController.register);

// 登录
router.post('/login', UserController.login);

// 获取当前用户信息（需要认证）
router.get('/me', authMiddleware, UserController.getCurrentUser);

// 更新用户信息（需要认证）
router.put('/me', authMiddleware, UserController.updateUserInfo);

// 修改登录用户名（需要认证）
router.put('/username', authMiddleware, UserController.updateLoginUsername);

// 修改密码（需要认证）
router.put('/password', authMiddleware, UserController.changePassword);

// 注销账号（需要认证）
router.delete('/account', authMiddleware, UserController.deleteAccount);

module.exports = router;