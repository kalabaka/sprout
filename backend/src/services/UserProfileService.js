/**
 * 用户画像服务
 */
const { ProfileModel, MasteredTopicModel } = require('../models/ProfileModel');
const KnowledgeModel = require('../models/KnowledgeModel');
const logger = require('../config/logger');

class UserProfileService {
  static async getLearningPrefs(userId) {
    const profile = await ProfileModel.getProfile(userId);
    const masteredTopics = await MasteredTopicModel.getUserMasteredTopics(userId);

    return {
      profile: profile || this.getDefaultProfile(),
      masteredTopics,
      masteredCount: masteredTopics.length
    };
  }

  static async updateLearningPrefs(userId, data) {
    const profile = await ProfileModel.createOrUpdateProfile(userId, data);

    logger.info(`更新用户学习偏好: 用户${userId}`);

    return profile;
  }

  static async saveMasteredTopics(userId, subject, topicIds, confidenceLevel = 3) {
    if (subject) {
      await MasteredTopicModel.clearMasteredTopics(userId, subject);
    }

    const topics = topicIds.map(id => ({
      knowledgePointId: id,
      confidenceLevel
    }));

    await MasteredTopicModel.addMasteredTopics(userId, topics);

    logger.info(`保存已掌握知识点: 用户${userId}, 学科${subject}, 数量${topicIds.length}`);

    return {
      success: true,
      count: topicIds.length
    };
  }

  static async getSubjectKnowledgeForSelection(userId, subject) {
    const allPoints = await KnowledgeModel.findBySubject(subject);
    const masteredIds = await MasteredTopicModel.getUserMasteredTopicIds(userId, subject);

    const pointsWithStatus = allPoints.map(point => ({
      ...point,
      mastered: masteredIds.includes(point.id)
    }));

    return {
      subject,
      points: pointsWithStatus,
      total: allPoints.length,
      masteredCount: masteredIds.length
    };
  }

  static async getRecommendedPath(userId, subject) {
    const profile = await ProfileModel.getProfile(userId);
    const masteredIds = await MasteredTopicModel.getUserMasteredTopicIds(userId, subject);

    const userLevel = profile?.overall_level || 'beginner';
    const knowledgePath = await KnowledgeModel.getKnowledgePath(subject, userLevel);

    const phasesWithStatus = {};
    for (const [phase, points] of Object.entries(knowledgePath.phases)) {
      phasesWithStatus[phase] = points.map(point => ({
        ...point,
        mastered: masteredIds.includes(point.id)
      }));
    }

    const nextRecommended = await KnowledgeModel.getNextRecommended(subject, masteredIds);

    return {
      ...knowledgePath,
      phases: phasesWithStatus,
      masteredIds,
      nextRecommended,
      profile
    };
  }

  static async calculateUserLevel(userId) {
    const masteredTopics = await MasteredTopicModel.getUserMasteredTopics(userId);

    if (masteredTopics.length === 0) {
      return 'beginner';
    }

    const avgConfidence = masteredTopics.reduce((sum, t) => sum + (t.confidence_level || 3), 0) / masteredTopics.length;
    const count = masteredTopics.length;

    if (count >= 20 && avgConfidence >= 4) {
      return 'advanced';
    } else if (count >= 10 && avgConfidence >= 3) {
      return 'intermediate';
    }

    return 'beginner';
  }

  static async updateLearningStats(userId) {
    const StudySessionModel = require('../models/StudySessionModel');
    const stats = await StudySessionModel.getUserStats(userId);

    const totalMinutes = stats.totalMinutes || 0;
    const totalHours = Math.floor(totalMinutes / 60);

    const daysActive = stats.daysActive || 1;
    const avgDailyMinutes = Math.round(totalMinutes / daysActive);

    await ProfileModel.updateStats(userId, avgDailyMinutes, totalHours);

    const newLevel = await this.calculateUserLevel(userId);
    const profile = await ProfileModel.getProfile(userId);

    if (profile && profile.overall_level !== newLevel) {
      await ProfileModel.createOrUpdateProfile(userId, {
        ...profile,
        overallLevel: newLevel
      });
    }

    return {
      avgDailyMinutes,
      totalLearnedHours: totalHours,
      level: newLevel
    };
  }

  static getDefaultProfile() {
    return {
      learning_pace: 'normal',
      preferred_difficulty: 2,
      daily_available_minutes: 60,
      available_weekdays: [1, 2, 3, 4, 5, 6, 7],
      overall_level: 'beginner',
      prefer_video: true,
      prefer_exercise: true,
      prefer_reading: false,
      avg_daily_minutes: 0,
      total_learned_hours: 0
    };
  }
}

module.exports = UserProfileService;
