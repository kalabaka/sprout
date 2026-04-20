const StudySessionModel = require('../models/StudySessionModel');
const UserStudyStatsModel = require('../models/UserStudyStatsModel');

function formatDate(date) {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatSession(session) {
    if (!session) return null;
    return {
        id: session.id,
        userId: session.user_id,
        taskId: session.task_id,
        taskName: session.task_name,
        courseId: session.course_id,
        courseName: session.course_name,
        startTime: session.start_time,
        endTime: session.end_time,
        durationMinutes: session.duration_minutes,
        plannedMinutes: session.planned_minutes,
        mode: session.mode,
        status: session.status,
        notes: session.notes,
        createdAt: session.created_at
    };
}

class StudySessionService {
    static async startSession(userId, options = {}) {
        const activeSession = await StudySessionModel.findActiveByUser(userId);
        if (activeSession) {
            await StudySessionModel.cancel(activeSession.id);
        }

        const sessionId = await StudySessionModel.create({
            user_id: userId,
            task_id: options.taskId,
            course_id: options.courseId,
            start_time: new Date(),
            planned_minutes: options.plannedMinutes || 60,
            mode: options.mode || 'countup',
            notes: options.notes
        });

        return StudySessionModel.findById(sessionId);
    }

    static async getActiveSession(userId) {
        const session = await StudySessionModel.findActiveByUser(userId);
        return formatSession(session);
    }

    static async completeSession(sessionId, userId, notes = null) {
        const session = await StudySessionModel.findById(sessionId);
        if (!session || session.user_id !== userId) {
            throw new Error('会话不存在或无权限');
        }

        const endTime = new Date();
        const durationMinutes = Math.ceil((endTime - new Date(session.start_time)) / (1000 * 60));

        await StudySessionModel.complete(sessionId, endTime, durationMinutes);

        if (notes) {
            await StudySessionModel.update(sessionId, { notes });
        }

        const statDate = formatDate(session.start_time);
        await UserStudyStatsModel.incrementStats(userId, statDate, 'total_minutes', durationMinutes);
        await UserStudyStatsModel.incrementStats(userId, statDate, 'session_count', 1);

        return StudySessionModel.findById(sessionId);
    }

    static async cancelSession(sessionId, userId) {
        const session = await StudySessionModel.findById(sessionId);
        if (!session || session.user_id !== userId) {
            throw new Error('会话不存在或无权限');
        }

        return StudySessionModel.cancel(sessionId);
    }

    static async getSessionHistory(userId, options = {}) {
        const sessions = await StudySessionModel.findByUser(userId, options);
        return sessions.map(formatSession);
    }

    static async getTodayStats(userId) {
        const stats = await StudySessionModel.getTodayStats(userId);
        return {
            sessionCount: stats.session_count || 0,
            totalMinutes: stats.total_minutes || 0,
            avgMinutes: Math.round(stats.avg_minutes || 0)
        };
    }

    static async getWeeklyStats(userId) {
        const sessions = await StudySessionModel.getWeeklyStats(userId);
        const summary = await UserStudyStatsModel.getWeeklySummary(userId);
        const streak = await UserStudyStatsModel.getStreak(userId);

        return {
            dailyData: sessions.map(s => ({
                date: formatDate(s.date),
                sessionCount: s.session_count,
                totalMinutes: s.total_minutes
            })),
            summary: {
                totalMinutes: summary.total_minutes || 0,
                totalSessions: summary.total_sessions || 0,
                avgFocusScore: Math.round((summary.avg_focus_score || 0) * 100) / 100
            },
            streak
        };
    }

    static async getMonthlyStats(userId) {
        const summary = await UserStudyStatsModel.getMonthlySummary(userId);
        const streak = await UserStudyStatsModel.getStreak(userId);

        return {
            totalMinutes: summary.total_minutes || 0,
            totalSessions: summary.total_sessions || 0,
            totalTasks: summary.total_tasks || 0,
            avgFocusScore: Math.round((summary.avg_focus_score || 0) * 100) / 100,
            activeDays: summary.active_days || 0,
            streak
        };
    }

    static async onTaskCompleted(userId) {
        const today = formatDate(new Date());
        await UserStudyStatsModel.incrementStats(userId, today, 'task_completed', 1);
    }
}

module.exports = StudySessionService;
