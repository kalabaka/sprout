const ExamModel = require('../models/examModel');

function calculateCountdown(examDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(examDate);
    exam.setHours(0, 0, 0, 0);

    const diffTime = exam - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
        days: diffDays,
        isToday: diffDays === 0,
        isTomorrow: diffDays === 1,
        isOverdue: diffDays < 0,
        display: diffDays < 0 ? '已结束' : diffDays === 0 ? '今天考试！' : `${diffDays}天`
    };
}

function formatDate(date) {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTime(time) {
    if (!time) return null;
    if (typeof time === 'string') return time;
    const d = new Date(time);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function formatExamWithCountdown(exam) {
    const countdown = calculateCountdown(exam.exam_date);
    return {
        id: exam.id,
        name: exam.name,
        examDate: formatDate(exam.exam_date),
        examTime: formatTime(exam.exam_time),
        location: exam.location,
        priority: exam.priority,
        notes: exam.notes,
        courseId: exam.course_id,
        courseName: exam.course_name || null,
        courseColor: exam.course_color || null,
        daysRemaining: countdown.days,
        countdown: countdown,
        createdAt: exam.created_at,
        relatedPlanId: exam.related_plan_id || null
    };
}

class ExamService {
    static async createExam(userId, examData) {
        const examId = await ExamModel.create({
            user_id: userId,
            ...examData
        });
        return ExamModel.findById(examId);
    }

    static async getExamsByUser(userId, orderBy = 'exam_date') {
        const exams = await ExamModel.findByUserId(userId, orderBy);
        return exams.map(formatExamWithCountdown);
    }

    static async getUpcomingExams(userId, limit = 3) {
        const exams = await ExamModel.findUpcoming(userId, limit);
        return exams.map(formatExamWithCountdown);
    }

    static async getExamById(examId, userId) {
        const exam = await ExamModel.findById(examId);
        if (!exam || exam.user_id !== userId) {
            return null;
        }
        return formatExamWithCountdown(exam);
    }

    static async getCountdown(examId, userId) {
        const exam = await ExamModel.findById(examId);
        if (!exam || exam.user_id !== userId) {
            return null;
        }
        return {
            exam_id: exam.id,
            exam_name: exam.name,
            exam_date: exam.exam_date,
            exam_time: exam.exam_time,
            ...calculateCountdown(exam.exam_date)
        };
    }

    static async updateExam(examId, userId, updateData) {
        const exam = await ExamModel.findById(examId);
        if (!exam || exam.user_id !== userId) {
            return null;
        }
        await ExamModel.update(examId, updateData);
        return ExamModel.findById(examId);
    }

    static async deleteExam(examId, userId) {
        const exam = await ExamModel.findById(examId);
        if (!exam || exam.user_id !== userId) {
            return false;
        }
        return ExamModel.delete(examId);
    }

    static async getExamsByCourse(courseId, userId) {
        const exams = await ExamModel.findByCourseId(courseId);
        return exams.filter(exam => exam.user_id === userId).map(formatExamWithCountdown);
    }
}

module.exports = ExamService;
