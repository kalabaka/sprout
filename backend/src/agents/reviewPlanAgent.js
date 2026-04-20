/**
 * 复习规划智能体
 * 根据考试信息和可用时间生成复习计划
 */

/**
 * 生成复习计划
 * @param {Object} exam - 考试信息 { id, name, exam_date, course_id }
 * @param {Array} availableTimeSlots - 可用时间段（来自课表空余时间）
 * @param {number} totalChapters - 总章节数（用户输入或默认）
 * @returns {Object} 复习计划
 */
function generateReviewPlan(exam, availableTimeSlots, totalChapters = 10) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(exam.exam_date);
    examDate.setHours(0, 0, 0, 0);

    const daysRemaining = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
        return { error: '考试已过，无法生成复习计划' };
    }

    const chaptersPerDay = totalChapters / daysRemaining;

    const plans = [];
    let currentChapter = 1;

    for (let i = 0; i < daysRemaining; i++) {
        const planDate = new Date(today);
        planDate.setDate(today.getDate() + i);

        const startChapter = Math.floor(currentChapter);
        const endChapter = Math.min(Math.floor(currentChapter + chaptersPerDay), totalChapters);

        const availableMinutes = getAvailableMinutesForDate(planDate, availableTimeSlots);

        plans.push({
            date: planDate.toISOString().split('T')[0],
            dayIndex: i + 1,
            startChapter,
            endChapter,
            content: startChapter === endChapter 
                ? `复习第${startChapter}章` 
                : `复习第${startChapter}-${endChapter}章`,
            suggestedMinutes: Math.min(availableMinutes, 120),
            explanation: `根据剩余${daysRemaining}天均分${totalChapters}章内容生成`
        });

        currentChapter = endChapter + 0.1;
    }

    return {
        examId: exam.id,
        examName: exam.name,
        examDate: exam.exam_date,
        daysRemaining,
        totalChapters,
        plan: plans,
        reason: `采用时间均分算法，将${totalChapters}章内容分配到${daysRemaining}天，每天约${chaptersPerDay.toFixed(1)}章`
    };
}

/**
 * 获取指定日期的可用学习时长（分钟）
 * @param {Date} date - 日期
 * @param {Array} timeSlots - 时间段数组
 * @returns {number} 可用分钟数
 */
function getAvailableMinutesForDate(date, timeSlots) {
    if (!timeSlots || timeSlots.length === 0) {
        return 120;
    }

    const dayOfWeek = date.getDay() || 7;
    const daySlots = timeSlots.filter(slot => slot.dayOfWeek === dayOfWeek);

    return daySlots.reduce((total, slot) => {
        const startTime = slot.startTime || slot.start_time;
        const endTime = slot.endTime || slot.end_time;

        if (!startTime || !endTime) return total;

        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        return total + (endH * 60 + endM) - (startH * 60 + startM);
    }, 0);
}

/**
 * 生成智能复习计划（考虑难度和重要性）
 * @param {Object} exam - 考试信息
 * @param {Array} availableTimeSlots - 可用时间段
 * @param {Object} options - 配置选项
 * @returns {Object} 智能复习计划
 */
function generateSmartReviewPlan(exam, availableTimeSlots, options = {}) {
    const {
        totalChapters = 10,
        difficultyDistribution = null,
        priorityChapters = [],
        dailyMaxMinutes = 180,
        reviewRounds = 1
    } = options;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(exam.exam_date);
    examDate.setHours(0, 0, 0, 0);

    const daysRemaining = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
        return { error: '考试已过，无法生成复习计划' };
    }

    const plans = [];
    const chaptersPerDay = totalChapters / (daysRemaining / reviewRounds);

    let currentChapter = 1;

    for (let round = 1; round <= reviewRounds; round++) {
        const roundLabel = reviewRounds > 1 ? `（第${round}轮）` : '';
        currentChapter = 1;

        for (let i = 0; i < daysRemaining / reviewRounds; i++) {
            const planDate = new Date(today);
            planDate.setDate(today.getDate() + (round - 1) * Math.floor(daysRemaining / reviewRounds) + i);

            if (planDate > examDate) break;

            const startChapter = Math.floor(currentChapter);
            const endChapter = Math.min(Math.floor(currentChapter + chaptersPerDay), totalChapters);

            const availableMinutes = getAvailableMinutesForDate(planDate, availableTimeSlots);
            const suggestedMinutes = Math.min(availableMinutes, dailyMaxMinutes);

            plans.push({
                date: planDate.toISOString().split('T')[0],
                round,
                dayIndex: i + 1,
                startChapter,
                endChapter,
                content: startChapter === endChapter
                    ? `复习第${startChapter}章${roundLabel}`
                    : `复习第${startChapter}-${endChapter}章${roundLabel}`,
                suggestedMinutes,
                isPriority: priorityChapters.some(ch => ch >= startChapter && ch <= endChapter),
                explanation: generateExplanation(round, reviewRounds, daysRemaining, totalChapters)
            });

            currentChapter = endChapter + 0.1;
        }
    }

    return {
        examId: exam.id,
        examName: exam.name,
        examDate: exam.exam_date,
        daysRemaining,
        totalChapters,
        reviewRounds,
        plan: plans,
        summary: {
            totalStudyDays: plans.length,
            averageMinutesPerDay: Math.round(plans.reduce((sum, p) => sum + p.suggestedMinutes, 0) / plans.length),
            priorityDays: plans.filter(p => p.isPriority).length
        },
        reason: `智能规划：${reviewRounds}轮复习，共${totalChapters}章，分配到${daysRemaining}天`
    };
}

/**
 * 生成复习说明
 */
function generateExplanation(round, totalRounds, daysRemaining, totalChapters) {
    if (totalRounds === 1) {
        return `根据剩余${daysRemaining}天均分${totalChapters}章内容`;
    }
    return `第${round}轮复习：巩固第${round === 1 ? '一' : round}遍知识点`;
}

/**
 * 根据课程获取默认章节数
 */
function getDefaultChapters(courseName) {
    const chapterMap = {
        '高等数学': 12,
        '线性代数': 6,
        '概率论': 8,
        '大学英语': 10,
        '大学物理': 15,
        '数据结构': 10,
        '操作系统': 8,
        '计算机网络': 7,
        '数据库': 8
    };

    for (const [key, value] of Object.entries(chapterMap)) {
        if (courseName && courseName.includes(key)) {
            return value;
        }
    }

    return 10;
}

module.exports = {
    generateReviewPlan,
    generateSmartReviewPlan,
    getAvailableMinutesForDate,
    getDefaultChapters
};
