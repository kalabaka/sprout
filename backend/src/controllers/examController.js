const ExamService = require('../services/examService');
const LearningPlanModel = require('../models/LearningPlanModel');
const PlanPhaseModel = require('../models/PlanPhaseModel');
const LearningTaskModel = require('../models/LearningTaskModel');
const PlanningAgent = require('../services/PlanningAgent');
const logger = require('../config/logger');

class ExamController {
    static async createExam(req, res) {
        try {
            const userId = req.user.userId;
            const { course_id, name, exam_date, exam_time, location, priority, notes } = req.body;

            if (!name || !exam_date) {
                return res.status(400).json({
                    success: false,
                    message: '考试名称和考试日期为必填项'
                });
            }

            const exam = await ExamService.createExam(userId, {
                course_id,
                name,
                exam_date,
                exam_time,
                location,
                priority,
                notes
            });

            res.status(201).json({
                success: true,
                data: exam,
                message: '考试创建成功'
            });
        } catch (error) {
            console.error('创建考试失败:', error);
            res.status(500).json({
                success: false,
                message: '创建考试失败'
            });
        }
    }

    static async getExams(req, res) {
        try {
            const userId = req.user.userId;
            const { orderBy } = req.query;

            const exams = await ExamService.getExamsByUser(userId, orderBy);

            res.json({
                success: true,
                data: exams,
                total: exams.length
            });
        } catch (error) {
            console.error('获取考试列表失败:', error);
            res.status(500).json({
                success: false,
                message: '获取考试列表失败'
            });
        }
    }

    static async getUpcomingExams(req, res) {
        try {
            const userId = req.user.userId;
            const { limit } = req.query;

            const exams = await ExamService.getUpcomingExams(userId, parseInt(limit) || 3);

            res.json({
                success: true,
                data: exams,
                total: exams.length
            });
        } catch (error) {
            console.error('获取即将到来的考试失败:', error);
            res.status(500).json({
                success: false,
                message: '获取即将到来的考试失败'
            });
        }
    }

    static async getCountdown(req, res) {
        try {
            const userId = req.user.userId;
            const examId = parseInt(req.params.id);

            const countdown = await ExamService.getCountdown(examId, userId);

            if (!countdown) {
                return res.status(404).json({
                    success: false,
                    message: '考试不存在或无权限访问'
                });
            }

            res.json({
                success: true,
                data: countdown
            });
        } catch (error) {
            console.error('获取考试倒计时失败:', error);
            res.status(500).json({
                success: false,
                message: '获取考试倒计时失败'
            });
        }
    }

    static async getExamById(req, res) {
        try {
            const userId = req.user.userId;
            const examId = parseInt(req.params.id);

            const exam = await ExamService.getExamById(examId, userId);

            if (!exam) {
                return res.status(404).json({
                    success: false,
                    message: '考试不存在或无权限访问'
                });
            }

            res.json({
                success: true,
                data: exam
            });
        } catch (error) {
            console.error('获取考试详情失败:', error);
            res.status(500).json({
                success: false,
                message: '获取考试详情失败'
            });
        }
    }

    static async updateExam(req, res) {
        try {
            const userId = req.user.userId;
            const examId = parseInt(req.params.id);
            const updateData = req.body;

            const exam = await ExamService.updateExam(examId, userId, updateData);

            if (!exam) {
                return res.status(404).json({
                    success: false,
                    message: '考试不存在或无权限访问'
                });
            }

            res.json({
                success: true,
                data: exam,
                message: '考试更新成功'
            });
        } catch (error) {
            console.error('更新考试失败:', error);
            res.status(500).json({
                success: false,
                message: '更新考试失败'
            });
        }
    }

    static async deleteExam(req, res) {
        try {
            const userId = req.user.userId;
            const examId = parseInt(req.params.id);

            const deleted = await ExamService.deleteExam(examId, userId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: '考试不存在或无权限访问'
                });
            }

            res.json({
                success: true,
                message: '考试删除成功'
            });
        } catch (error) {
            console.error('删除考试失败:', error);
            res.status(500).json({
                success: false,
                message: '删除考试失败'
            });
        }
    }

    static async getRelatedPlan(req, res) {
        try {
            const userId = req.user.userId;
            const examId = parseInt(req.params.id);

            const exam = await ExamService.getExamById(examId, userId);
            if (!exam) {
                return res.status(404).json({
                    success: false,
                    message: '考试不存在或无权限访问'
                });
            }

            const plans = await LearningPlanModel.findByUserId(userId);
            const relatedPlan = plans.find(p => p.exam_id === examId);

            res.json({
                success: true,
                data: relatedPlan || null,
                hasPlan: !!relatedPlan
            });
        } catch (error) {
            console.error('获取关联计划失败:', error);
            res.status(500).json({
                success: false,
                message: '获取关联计划失败'
            });
        }
    }

    static async generateReviewPlan(req, res) {
        try {
            const userId = req.user.userId;
            const examId = parseInt(req.params.id);
            const { dailyStudyMinutes, availableWeekdays, userLevel } = req.body;

            const exam = await ExamService.getExamById(examId, userId);
            if (!exam) {
                return res.status(404).json({
                    success: false,
                    message: '考试不存在或无权限访问'
                });
            }

            const existingPlans = await LearningPlanModel.findByUserId(userId);
            const existingPlan = existingPlans.find(p => p.exam_id === examId);
            if (existingPlan) {
                return res.status(400).json({
                    success: false,
                    message: '该考试已有关联的复习计划',
                    data: existingPlan
                });
            }

            logger.info(`开始为考试 ${exam.name} 生成复习计划`);

            const planData = await PlanningAgent.generateReviewPlan({
                exam: {
                    id: exam.id,
                    name: exam.name,
                    exam_date: exam.examDate,
                    course_id: exam.courseId,
                    scope: exam.notes
                },
                constraints: {
                    dailyStudyMinutes: dailyStudyMinutes || 60,
                    availableWeekdays: availableWeekdays || [1, 2, 3, 4, 5, 6, 7],
                    userLevel: userLevel || 'intermediate'
                }
            });

            const planId = await LearningPlanModel.create(userId, {
                name: `${exam.name} 复习计划`,
                goal: `备考：${exam.name}`,
                goalType: 'exam',
                examId: examId,
                courseId: exam.courseId,
                targetDate: exam.examDate,
                dailyStudyMinutes: dailyStudyMinutes || 60,
                totalTasks: planData.plan.stats.totalTasks,
                totalMinutes: planData.plan.stats.totalMinutes
            });

            logger.info(`创建计划记录成功，planId: ${planId}`);

            let totalTasksCreated = 0;
            let endDate = null;

            for (let i = 0; i < planData.plan.phases.length; i++) {
                const phaseInfo = planData.plan.phases[i];
                
                const phaseId = await PlanPhaseModel.create(planId, {
                    name: phaseInfo.name,
                    description: `复习阶段：${phaseInfo.name}`,
                    phaseOrder: i + 1
                });

                logger.info(`创建阶段 ${phaseInfo.name}，phaseId: ${phaseId}`);

                for (let j = 0; j < phaseInfo.tasks.length; j++) {
                    const taskInfo = phaseInfo.tasks[j];
                    
                    await LearningTaskModel.create(userId, {
                        planId: planId,
                        phaseId: phaseId,
                        name: taskInfo.name,
                        description: taskInfo.description || null,
                        plannedDuration: taskInfo.estimatedMinutes || 60,
                        plannedDate: taskInfo.scheduledDate || null,
                        sortOrder: j + 1,
                        difficulty: taskInfo.difficulty || 2
                    });

                    totalTasksCreated++;

                    if (taskInfo.scheduledDate) {
                        const taskDate = new Date(taskInfo.scheduledDate);
                        if (!endDate || taskDate > endDate) {
                            endDate = taskDate;
                        }
                    }
                }

                await PlanPhaseModel.updateTaskCount(phaseId);
            }

            await LearningPlanModel.update(planId, userId, {
                totalTasks: totalTasksCreated,
                endDate: endDate ? formatDate(endDate) : null
            });

            await LearningPlanModel.updateStatus(planId, userId, 'active');

            logger.info(`复习计划创建完成，共 ${totalTasksCreated} 个任务`);

            const createdPlan = await LearningPlanModel.findById(planId, userId);

            res.json({
                success: true,
                data: {
                    planId: planId,
                    plan: {
                        id: planId,
                        name: createdPlan.name,
                        goalType: 'exam',
                        totalTasks: totalTasksCreated,
                        endDate: endDate ? formatDate(endDate) : null,
                        phases: planData.plan.phases.length
                    },
                    explanation: planData.explanation
                },
                message: '复习计划创建成功'
            });
        } catch (error) {
            logger.error('生成复习计划失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '生成复习计划失败'
            });
        }
    }
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

module.exports = ExamController;
