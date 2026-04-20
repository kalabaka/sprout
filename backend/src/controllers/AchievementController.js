const AchievementService = require('../services/AchievementService');
const logger = require('../config/logger');

class AchievementController {
    static async getStreak(req, res) {
        try {
            const userId = req.user.userId;
            const achievements = await AchievementService.getUserAchievements(userId);

            res.json({
                success: true,
                data: {
                    currentStreak: achievements.current_streak || 0,
                    longestStreak: achievements.longest_streak || 0,
                    totalCheckins: achievements.total_checkins || 0,
                    lastCheckinDate: achievements.last_checkin_date || null
                }
            });
        } catch (error) {
            logger.error(`获取打卡统计失败: ${error.message}`);
            res.status(500).json({
                success: false,
                message: '获取打卡统计失败'
            });
        }
    }

    static async getUserBadges(req, res) {
        try {
            const userId = req.user.userId;
            const badges = await AchievementService.getUserBadges(userId);

            const formattedBadges = badges.map(badge => ({
                code: badge.code,
                name: badge.name,
                description: badge.description,
                icon: badge.icon,
                rarity: badge.rarity,
                earnedAt: badge.earned_at
            }));

            res.json({
                success: true,
                data: formattedBadges
            });
        } catch (error) {
            logger.error(`获取用户勋章失败: ${error.message}`);
            res.status(500).json({
                success: false,
                message: '获取用户勋章失败'
            });
        }
    }

    static async getAllBadges(req, res) {
        try {
            const userId = req.user.userId;
            const allBadges = await AchievementService.getAllBadges();
            const userBadges = await AchievementService.getUserBadges(userId);

            const earnedMap = {};
            userBadges.forEach(badge => {
                earnedMap[badge.code] = badge.earned_at;
            });

            const badgesWithStatus = allBadges.map(badge => ({
                code: badge.code,
                name: badge.name,
                description: badge.description,
                icon: badge.icon,
                rarity: badge.rarity,
                conditionType: badge.condition_type,
                conditionValue: badge.condition_value,
                earned: !!earnedMap[badge.code],
                earnedAt: earnedMap[badge.code] || null
            }));

            res.json({
                success: true,
                data: badgesWithStatus
            });
        } catch (error) {
            logger.error(`获取所有勋章失败: ${error.message}`);
            res.status(500).json({
                success: false,
                message: '获取所有勋章失败'
            });
        }
    }

    static async getRecentBadges(req, res) {
        try {
            const userId = req.user.userId;
            const badges = await AchievementService.getUserBadges(userId);
            
            const recentBadges = badges.slice(0, 3).map(badge => ({
                code: badge.code,
                name: badge.name,
                description: badge.description,
                icon: badge.icon,
                rarity: badge.rarity,
                earnedAt: badge.earned_at
            }));

            res.json({
                success: true,
                data: recentBadges
            });
        } catch (error) {
            logger.error(`获取最近勋章失败: ${error.message}`);
            res.status(500).json({
                success: false,
                message: '获取最近勋章失败'
            });
        }
    }
}

module.exports = AchievementController;
