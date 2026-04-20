const { pool } = require('../config/database');
const NotificationTrigger = require('./NotificationTrigger');
const logger = require('../config/logger');

function formatDate(date) {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

class AchievementService {
    static async updateCheckinStreak(userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const today = formatDate(new Date());
            
            const [statsRows] = await connection.execute(
                `SELECT is_checkin FROM user_study_stats 
                 WHERE user_id = ? AND stat_date = ?`,
                [userId, today]
            );

            if (statsRows.length > 0 && statsRows[0].is_checkin) {
                logger.info(`用户 ${userId} 今日已打卡，跳过`);
                await connection.commit();
                return { alreadyCheckedIn: true };
            }

            const [achievementRows] = await connection.execute(
                `SELECT * FROM user_achievements WHERE user_id = ?`,
                [userId]
            );

            let achievement = achievementRows[0];
            let currentStreak = 1;
            let longestStreak = 1;
            let totalCheckins = 1;

            if (achievement) {
                const lastCheckinDate = achievement.last_checkin_date;
                totalCheckins = achievement.total_checkins + 1;

                if (lastCheckinDate) {
                    const lastDate = new Date(lastCheckinDate);
                    const todayDate = new Date(today);
                    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        currentStreak = achievement.current_streak + 1;
                    } else if (diffDays === 0) {
                        currentStreak = achievement.current_streak;
                        totalCheckins = achievement.total_checkins;
                    } else {
                        currentStreak = 1;
                    }
                }

                longestStreak = Math.max(achievement.longest_streak, currentStreak);

                await connection.execute(
                    `UPDATE user_achievements 
                     SET current_streak = ?, longest_streak = ?, total_checkins = ?, last_checkin_date = ?
                     WHERE user_id = ?`,
                    [currentStreak, longestStreak, totalCheckins, today, userId]
                );
            } else {
                await connection.execute(
                    `INSERT INTO user_achievements (user_id, current_streak, longest_streak, total_checkins, last_checkin_date)
                     VALUES (?, ?, ?, ?, ?)`,
                    [userId, currentStreak, longestStreak, totalCheckins, today]
                );
            }

            if (statsRows.length > 0) {
                await connection.execute(
                    `UPDATE user_study_stats SET is_checkin = TRUE 
                     WHERE user_id = ? AND stat_date = ?`,
                    [userId, today]
                );
            } else {
                await connection.execute(
                    `INSERT INTO user_study_stats (user_id, stat_date, is_checkin) 
                     VALUES (?, ?, TRUE)`,
                    [userId, today]
                );
            }

            await connection.commit();
            logger.info(`用户 ${userId} 打卡成功，连续 ${currentStreak} 天`);

            return {
                alreadyCheckedIn: false,
                currentStreak,
                longestStreak,
                totalCheckins
            };
        } catch (error) {
            await connection.rollback();
            logger.error(`打卡失败: ${error.message}`);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async checkAndAwardBadges(userId) {
        try {
            const [earnedBadges] = await pool.execute(
                `SELECT badge_code FROM user_badges WHERE user_id = ?`,
                [userId]
            );
            const earnedCodes = earnedBadges.map(b => b.badge_code);

            const [allBadges] = await pool.execute(
                `SELECT * FROM badges`
            );

            const newBadges = [];

            for (const badge of allBadges) {
                if (earnedCodes.includes(badge.code)) {
                    continue;
                }

                const earned = await this.checkBadgeCondition(userId, badge);
                
                if (earned) {
                    await pool.execute(
                        `INSERT INTO user_badges (user_id, badge_code) VALUES (?, ?)`,
                        [userId, badge.code]
                    );
                    newBadges.push({
                        code: badge.code,
                        name: badge.name,
                        icon: badge.icon,
                        rarity: badge.rarity,
                        description: badge.description
                    });
                    logger.info(`用户 ${userId} 获得勋章: ${badge.name}`);

                    NotificationTrigger.triggerAchievement(userId, badge.name, badge.description).catch(err => {
                        logger.error('触发成就通知失败:', err.message);
                    });
                }
            }

            return newBadges;
        } catch (error) {
            logger.error(`检测勋章失败: ${error.message}`);
            return [];
        }
    }

    static async checkBadgeCondition(userId, badge) {
        const { condition_type, condition_value } = badge;

        switch (condition_type) {
            case 'start_time_before':
                return await this.checkStartTimeBefore(userId, condition_value);
            
            case 'start_time_after':
                return await this.checkStartTimeAfter(userId, condition_value);
            
            case 'daily_duration':
                return await this.checkDailyDuration(userId, condition_value);
            
            case 'streak_days':
                return await this.checkStreakDays(userId, condition_value);
            
            case 'total_hours':
                return await this.checkTotalHours(userId, condition_value);
            
            case 'perfect_week':
                return await this.checkPerfectWeek(userId, condition_value);
            
            case 'total_checkins':
                return await this.checkTotalCheckins(userId, condition_value);
            
            default:
                return false;
        }
    }

    static async checkStartTimeBefore(userId, hour) {
        const sql = `
            SELECT COUNT(*) as count
            FROM study_sessions
            WHERE user_id = ? 
                AND status = 'completed'
                AND DATE(start_time) = CURDATE()
                AND HOUR(start_time) < ?
        `;
        const [rows] = await pool.execute(sql, [userId, hour]);
        return rows[0].count > 0;
    }

    static async checkStartTimeAfter(userId, hour) {
        const sql = `
            SELECT COUNT(*) as count
            FROM study_sessions
            WHERE user_id = ? 
                AND status = 'completed'
                AND DATE(start_time) = CURDATE()
                AND HOUR(start_time) >= ?
        `;
        const [rows] = await pool.execute(sql, [userId, hour]);
        return rows[0].count > 0;
    }

    static async checkDailyDuration(userId, minutes) {
        const sql = `
            SELECT COALESCE(SUM(duration_minutes), 0) as total
            FROM study_sessions
            WHERE user_id = ? 
                AND status = 'completed'
                AND DATE(start_time) = CURDATE()
        `;
        const [rows] = await pool.execute(sql, [userId]);
        return rows[0].total >= minutes;
    }

    static async checkStreakDays(userId, days) {
        const sql = `
            SELECT current_streak 
            FROM user_achievements 
            WHERE user_id = ?
        `;
        const [rows] = await pool.execute(sql, [userId]);
        return rows.length > 0 && rows[0].current_streak >= days;
    }

    static async checkTotalHours(userId, hours) {
        const minutes = hours * 60;
        const sql = `
            SELECT COALESCE(SUM(duration_minutes), 0) as total
            FROM study_sessions
            WHERE user_id = ? AND status = 'completed'
        `;
        const [rows] = await pool.execute(sql, [userId]);
        return rows[0].total >= minutes;
    }

    static async checkPerfectWeek(userId, days) {
        const sql = `
            SELECT COUNT(*) as count
            FROM user_study_stats
            WHERE user_id = ?
                AND total_minutes >= 120
                AND stat_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        `;
        const [rows] = await pool.execute(sql, [userId, days]);
        return rows[0].count >= days;
    }

    static async checkTotalCheckins(userId, count) {
        const sql = `
            SELECT total_checkins 
            FROM user_achievements 
            WHERE user_id = ?
        `;
        const [rows] = await pool.execute(sql, [userId]);
        return rows.length > 0 && rows[0].total_checkins >= count;
    }

    static async getUserAchievements(userId) {
        const [rows] = await pool.execute(
            `SELECT * FROM user_achievements WHERE user_id = ?`,
            [userId]
        );
        return rows[0] || {
            current_streak: 0,
            longest_streak: 0,
            total_checkins: 0,
            last_checkin_date: null
        };
    }

    static async getUserBadges(userId) {
        const sql = `
            SELECT b.*, ub.earned_at
            FROM user_badges ub
            JOIN badges b ON ub.badge_code = b.code
            WHERE ub.user_id = ?
            ORDER BY ub.earned_at DESC
        `;
        const [rows] = await pool.execute(sql, [userId]);
        return rows;
    }

    static async getAllBadges() {
        const [rows] = await pool.execute(
            `SELECT * FROM badges ORDER BY 
             FIELD(rarity, 'legendary', 'epic', 'rare', 'common')`
        );
        return rows;
    }
}

module.exports = AchievementService;
