/**
 * 用户配置控制器
 */
const { ProfileModel, MasteredTopicModel } = require('../models/ProfileModel');
const UserProfileService = require('../services/UserProfileService');
const KnowledgeModel = require('../models/KnowledgeModel');
const { success, fail } = require('../utils/response');

/**
 * 获取当前用户配置
 */
async function getProfile(req, res) {
  try {
    const userId = req.user.userId;
    const profile = await ProfileModel.getOrCreateProfile(userId);
    res.json(success(profile));
  } catch (error) {
    res.status(500).json(fail('获取配置失败: ' + error.message, 500));
  }
}

/**
 * 更新当前用户配置
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.userId;
    const data = req.body;

    await ProfileModel.updateProfile(userId, data);

    const updated = await ProfileModel.getProfile(userId);
    res.json(success(updated, '配置更新成功'));
  } catch (error) {
    res.status(500).json(fail('更新配置失败: ' + error.message, 500));
  }
}

/**
 * 上传头像
 */
async function uploadAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json(fail('未选择文件', 400));
    }

    const userId = req.user.userId;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    await ProfileModel.updateProfile(userId, { avatar_url: avatarUrl });

    res.json(success({ avatar_url: avatarUrl }, '头像上传成功'));
  } catch (error) {
    res.status(500).json(fail('上传失败: ' + error.message, 500));
  }
}

/**
 * 获取用户学习偏好
 */
async function getLearningPrefs(req, res) {
  try {
    const userId = req.user.userId;
    const result = await UserProfileService.getLearningPrefs(userId);
    res.json(success(result));
  } catch (error) {
    res.status(500).json(fail('获取学习偏好失败: ' + error.message, 500));
  }
}

/**
 * 更新用户学习偏好
 */
async function updateLearningPrefs(req, res) {
  try {
    const userId = req.user.userId;
    const data = req.body;

    const profile = await UserProfileService.updateLearningPrefs(userId, data);
    res.json(success(profile, '学习偏好更新成功'));
  } catch (error) {
    res.status(500).json(fail('更新学习偏好失败: ' + error.message, 500));
  }
}

/**
 * 获取某学科知识点列表（用于勾选已掌握）
 */
async function getSubjectKnowledge(req, res) {
  try {
    const userId = req.user.userId;
    const { subject } = req.params;

    if (!subject) {
      return res.status(400).json(fail('缺少学科参数', 400));
    }

    const result = await UserProfileService.getSubjectKnowledgeForSelection(userId, subject);
    res.json(success(result));
  } catch (error) {
    res.status(500).json(fail('获取知识点列表失败: ' + error.message, 500));
  }
}

/**
 * 保存已掌握知识点
 */
async function saveMasteredTopics(req, res) {
  try {
    const userId = req.user.userId;
    const { subject, topicIds, confidenceLevel } = req.body;

    if (!topicIds || !Array.isArray(topicIds)) {
      return res.status(400).json(fail('知识点ID列表格式错误', 400));
    }

    const result = await UserProfileService.saveMasteredTopics(userId, subject, topicIds, confidenceLevel);
    res.json(success(result, '已掌握知识点保存成功'));
  } catch (error) {
    res.status(500).json(fail('保存已掌握知识点失败: ' + error.message, 500));
  }
}

/**
 * 获取用户推荐学习路径
 */
async function getRecommendedPath(req, res) {
  try {
    const userId = req.user.userId;
    const { subject } = req.params;

    if (!subject) {
      return res.status(400).json(fail('缺少学科参数', 400));
    }

    const result = await UserProfileService.getRecommendedPath(userId, subject);
    res.json(success(result));
  } catch (error) {
    res.status(500).json(fail('获取推荐路径失败: ' + error.message, 500));
  }
}

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  getLearningPrefs,
  updateLearningPrefs,
  getSubjectKnowledge,
  saveMasteredTopics,
  getRecommendedPath
};