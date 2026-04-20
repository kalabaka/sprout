const { pool } = require('../config/database');

class UserStudyStatsModel {
    static async findByUserAndDate(userId, date) {
        const sql = `
            SELECT * FROM user_study_stats
            WHERE user_id = ? AND stat_date = ?
        `;
        const [rows] = await pool.execute(sql, [userId, date]);
        return rows[0] || null;
    }

    static async findByUserAndDateRange(userId, startDate, endDate) {
        const sql = `
            SELECT * FROM user_study_stats
            WHERE user_id = ? AND stat_date BETWEEN ? AND ?
            ORDER BY stat_date DESC
        `;
        const [rows] = await pool.execute(sql, [userId, startDate, endDate]);
        return rows;
    }

    static async createOrUpdate(userId, date, data) {
        const sql = `
            INSERT INTO user_study_stats (user_id, stat_date, total_minutes, session_count, task_completed, focus_score)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                total_minutes = VALUES(total_minutes),
                session_count = VALUES(session_count),
                task_completed = VALUES(task_completed),
                focus_score = VALUES(focus_score)
        `;
        const [result] = await pool.execute(sql, [
            userId,
            date,
            data.total_minutes || 0,
            data.session_count || 0,
            data.task_completed || 0,
            data.focus_score || 0
        ]);
        return result.affectedRows > 0;
    }

    static async incrementStats(userId, date, field, value = 1) {
        const validFields = ['total_minutes', 'session_count', 'task_completed'];
        if (!validFields.includes(field)) {
            throw new Error(`Invalid field: ${field}`);
        }

        const sql = `
            INSERT INTO user_study_stats (user_id, stat_date, ${field})
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE ${field} = ${field} + ?
        `;
        const [result] = await pool.execute(sql, [userId, date, value, value]);
        return result.affectedRows > 0;
    }

    static async getWeeklySummary(userId) {
        const sql = `
            SELECT 
                COALESCE(SUM(total_minutes), 0) as total_minutes,
                COALESCE(SUM(session_count), 0) as total_sessions,
                COALESCE(SUM(task_completed), 0) as total_tasks,
                COALESCE(AVG(focus_score), 0) as avg_focus_score
            FROM user_study_stats
            WHERE user_id = ? 
                AND stat_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        `;
        const [rows] = await pool.execute(sql, [userId]);
        return rows[0];
    }

    static async getMonthlySummary(userId) {
        const sql = `
            SELECT 
                COALESCE(SUM(total_minutes), 0) as total_minutes,
                COALESCE(SUM(session_count), 0) as total_sessions,
                COALESCE(SUM(task_completed), 0) as total_tasks,
                COALESCE(AVG(focus_score), 0) as avg_focus_score,
                COUNT(*) as active_days
            FROM user_study_stats
            WHERE user_id = ? 
                AND stat_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `;
        const [rows] = await pool.execute(sql, [userId]);
        return rows[0];
    }

    static async getStreak(userId) {
        const sql = `
            SELECT stat_date
            FROM user_study_stats
            WHERE user_id = ? AND total_minutes > 0
            ORDER BY stat_date DESC
            LIMIT 30
        `;
        const [rows] = await pool.execute(sql, [userId]);
        
        if (rows.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < rows.length; i++) {
            const expectedDate = new Date(today);
            expectedDate.setDate(expectedDate.getDate() - i);
            
            const rowDate = new Date(rows[i].stat_date);
            rowDate.setHours(0, 0, 0, 0);

            if (rowDate.getTime() === expectedDate.getTime()) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }
}

module.exports = UserStudyStatsModel;
