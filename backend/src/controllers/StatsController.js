const { pool } = require('../config/database');
const UserStudyStatsModel = require('../models/UserStudyStatsModel');
const StudySessionModel = require('../models/StudySessionModel');
const logger = require('../config/logger');

const COURSE_COLORS = [
    '#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399',
    '#00D4AA', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'
];

function formatDate(date) {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateUTC(date) {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

class StatsController {
    static async getOverview(req, res) {
        try {
            const userId = req.user.userId;

            const totalSql = `
                SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes
                FROM study_sessions
                WHERE user_id = ? AND status = 'completed'
            `;
            const [totalRows] = await pool.execute(totalSql, [userId]);
            const totalMinutes = totalRows[0].total_minutes || 0;

            const today = formatDate(new Date());
            const todayStats = await UserStudyStatsModel.findByUserAndDate(userId, today);
            const todayMinutes = todayStats?.total_minutes || 0;

            const streak = await UserStudyStatsModel.getStreak(userId);

            const weekSql = `
                SELECT COALESCE(SUM(total_minutes), 0) as week_minutes
                FROM user_study_stats
                WHERE user_id = ? AND stat_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            `;
            const [weekRows] = await pool.execute(weekSql, [userId]);
            const weekMinutes = weekRows[0].week_minutes || 0;

            const monthSql = `
                SELECT COALESCE(SUM(total_minutes), 0) as month_minutes
                FROM user_study_stats
                WHERE user_id = ? AND stat_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            `;
            const [monthRows] = await pool.execute(monthSql, [userId]);
            const monthMinutes = monthRows[0].month_minutes || 0;

            const sessionCountSql = `
                SELECT COUNT(*) as total_sessions
                FROM study_sessions
                WHERE user_id = ? AND status = 'completed'
            `;
            const [sessionRows] = await pool.execute(sessionCountSql, [userId]);
            const totalSessions = sessionRows[0].total_sessions || 0;

            res.json({
                success: true,
                data: {
                    totalMinutes,
                    totalHours: Math.round(totalMinutes / 60 * 10) / 10,
                    todayMinutes,
                    weekMinutes,
                    monthMinutes,
                    streak,
                    totalSessions,
                    avgMinutesPerSession: totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0
                }
            });
        } catch (error) {
            logger.error(`获取学习总览失败: ${error.message}`);
            res.status(500).json({
                success: false,
                message: '获取学习总览失败'
            });
        }
    }

    static async getDistribution(req, res) {
        try {
            const userId = req.user.userId;
            const { days = 30 } = req.query;

            const sql = `
                SELECT 
                    c.id as course_id,
                    c.name as course_name,
                    c.color as course_color,
                    COALESCE(SUM(ss.duration_minutes), 0) as minutes
                FROM study_sessions ss
                LEFT JOIN courses c ON ss.course_id = c.id
                WHERE ss.user_id = ? 
                    AND ss.status = 'completed'
                    AND ss.start_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                GROUP BY c.id, c.name, c.color
                ORDER BY minutes DESC
            `;
            const [rows] = await pool.execute(sql, [userId, parseInt(days)]);

            const noCourseSql = `
                SELECT COALESCE(SUM(duration_minutes), 0) as minutes
                FROM study_sessions
                WHERE user_id = ? 
                    AND status = 'completed'
                    AND course_id IS NULL
                    AND start_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            `;
            const [noCourseRows] = await pool.execute(noCourseSql, [userId, parseInt(days)]);
            const noCourseMinutes = noCourseRows[0].minutes || 0;

            const distribution = [];
            let totalMinutes = 0;

            rows.forEach((row, index) => {
                if (row.course_name) {
                    totalMinutes += row.minutes;
                    distribution.push({
                        courseId: row.course_id,
                        courseName: row.course_name,
                        minutes: row.minutes,
                        color: row.course_color || COURSE_COLORS[index % COURSE_COLORS.length]
                    });
                }
            });

            if (noCourseMinutes > 0) {
                totalMinutes += noCourseMinutes;
                distribution.push({
                    courseId: null,
                    courseName: '未分类',
                    minutes: noCourseMinutes,
                    color: '#909399'
                });
            }

            distribution.forEach(item => {
                item.percentage = totalMinutes > 0 
                    ? Math.round(item.minutes / totalMinutes * 1000) / 10 
                    : 0;
            });

            res.json({
                success: true,
                data: {
                    distribution,
                    totalMinutes,
                    period: `${days}天`
                }
            });
        } catch (error) {
            logger.error(`获取课程分布失败: ${error.message}`);
            res.status(500).json({
                success: false,
                message: '获取课程分布失败'
            });
        }
    }

    static async getTrend(req, res) {
        try {
            const userId = req.user.userId;
            const { days = 7 } = req.query;
            const dayCount = parseInt(days);

            const dates = [];
            for (let i = dayCount - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                dates.push(formatDate(date));
            }

            const stats = await UserStudyStatsModel.findByUserAndDateRange(
                userId,
                dates[0],
                dates[dates.length - 1]
            );

            const statsMap = {};
            stats.forEach(s => {
                statsMap[formatDateUTC(s.stat_date)] = s;
            });

            const trend = dates.map(date => ({
                date,
                dayLabel: formatDayLabel(date),
                totalMinutes: statsMap[date]?.total_minutes || 0,
                sessionCount: statsMap[date]?.session_count || 0,
                taskCompleted: statsMap[date]?.task_completed || 0
            }));

            const totalMinutes = trend.reduce((sum, d) => sum + d.totalMinutes, 0);
            const avgMinutes = Math.round(totalMinutes / dayCount);
            const maxMinutes = Math.max(...trend.map(d => d.totalMinutes));

            res.json({
                success: true,
                data: {
                    trend,
                    summary: {
                        totalMinutes,
                        avgMinutes,
                        maxMinutes,
                        period: `${dayCount}天`
                    }
                }
            });
        } catch (error) {
            logger.error(`获取学习趋势失败: ${error.message}`);
            res.status(500).json({
                success: false,
                message: '获取学习趋势失败'
            });
        }
    }
}

function formatDayLabel(dateStr) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${month}/${day} ${weekdays[date.getDay()]}`;
}

module.exports = StatsController;
