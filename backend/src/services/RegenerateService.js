const LearningPlanModel = require('../models/LearningPlanModel');
const LearningTaskModel = require('../models/LearningTaskModel');
const ReplanLogModel = require('../models/ReplanLogModel');
const PlanningAgent = require('./PlanningAgent');
const evaluationAgent = require('../agents/evaluationAgent');
const NotificationService = require('./NotificationService');
const logger = require('../config/logger');

class RegenerateService {
  static async checkReplanNeeded(planId, userId) {
    try {
      const plan = await LearningPlanModel.findById(planId, userId);
      if (!plan) {
        return { needReplan: false, reason: '计划不存在' };
      }

      const tasks = await LearningTaskModel.findByPlanId(planId);
      if (!tasks || tasks.length === 0) {
        return { needReplan: false, reason: '无任务数据' };
      }

      const completedTasks = tasks.filter(t => t.status === 2);
      const failedTasks = tasks.filter(t => t.status === 3);
      const pendingTasks = tasks.filter(t => t.status === 0 || t.status === 1);

      let consecutiveFailures = 0;
      const sortedByDate = [...tasks].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      for (const task of sortedByDate) {
        if (task.status === 3) {
          consecutiveFailures++;
        } else {
          break;
        }
      }

      const completionRate = tasks.length > 0 
        ? completedTasks.length / tasks.length 
        : 1;

      const recentScores = completedTasks
        .filter(t => t.self_score !== null)
        .slice(-5)
        .map(t => t.self_score);

      const now = new Date();
      const planStart = new Date(plan.created_at);
      const totalDays = Math.max(1, Math.ceil((now - planStart) / (1000 * 60 * 60 * 24)));
      const expectedProgress = totalDays / 30;
      const actualProgress = completionRate;
      const timeDeviation = Math.max(0, expectedProgress - actualProgress);

      const result = evaluationAgent.checkReplanNeeded({
        consecutiveFailures,
        timeDeviation,
        completionRate,
        recentScores
      });

      return {
        ...result,
        planId,
        stats: {
          totalTasks: tasks.length,
          completedTasks: completedTasks.length,
          pendingTasks: pendingTasks.length,
          failedTasks: failedTasks.length,
          completionRate: Math.round(completionRate * 100),
          consecutiveFailures
        }
      };
    } catch (error) {
      logger.error('检查重规划需求失败:', error.message);
      return { needReplan: false, reason: error.message };
    }
  }

  static async regeneratePlan(planId, userId, triggerReason) {
    const connection = await LearningPlanModel.getConnection();
    
    try {
      await connection.beginTransaction();

      const plan = await LearningPlanModel.findById(planId, userId);
      if (!plan) {
        throw new Error('计划不存在');
      }

      const allTasks = await LearningTaskModel.findByPlanId(planId);
      const completedTasks = allTasks.filter(t => t.status === 2);
      const pendingTasks = allTasks.filter(t => t.status === 0 || t.status === 1);

      const beforeTotalTasks = allTasks.length;

      logger.info(`开始重规划: planId=${planId}, 已完成=${completedTasks.length}, 待处理=${pendingTasks.length}`);

      for (const task of pendingTasks) {
        await connection.execute(
          'DELETE FROM learning_tasks WHERE id = ?',
          [task.id]
        );
      }

      const masteredTopicIds = completedTasks
        .filter(t => t.knowledge_point_id)
        .map(t => t.knowledge_point_id);

      const planParams = {
        userId,
        target: plan.name,
        goalType: 'skill',
        subject: this.extractSubject(plan.name),
        userLevel: 'intermediate',
        masteredTopicIds,
        learningPace: 'relaxed',
        dailyStudyMinutes: 45,
        availableWeekdays: [1, 2, 3, 4, 5, 6, 7]
      };

      const planResult = await PlanningAgent.generatePlan(planParams);

      const newTasks = [];
      if (planResult.plan && planResult.plan.phases) {
        for (const phase of planResult.plan.phases) {
          for (const task of phase.tasks) {
            const taskId = await LearningTaskModel.create(userId, {
              planId,
              phaseId: null,
              name: task.name,
              description: task.description || null,
              plannedDuration: task.estimatedMinutes || 60,
              scheduledDate: task.scheduledDate,
              knowledgePointId: task.knowledgePointId
            });
            newTasks.push({ id: taskId, ...task });
          }
        }
      }

      const afterTotalTasks = completedTasks.length + newTasks.length;

      const adjustedDates = {
        originalEnd: plan.target_date,
        newStart: new Date().toISOString().split('T')[0],
        newEnd: planResult.plan?.stats?.estimatedDays 
          ? new Date(Date.now() + planResult.plan.stats.estimatedDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : null
      };

      const logId = await ReplanLogModel.create({
        planId,
        triggerReason,
        beforeTotalTasks,
        afterTotalTasks,
        adjustedDates
      });

      await connection.commit();

      await NotificationService.createNotification(userId, {
        type: 'system',
        title: '学习计划已调整',
        content: `您的学习计划已根据学习进度重新调整。原有${beforeTotalTasks}个任务，调整后${afterTotalTasks}个任务。`,
        relatedId: planId,
        relatedType: 'plan'
      });

      logger.info(`重规划完成: planId=${planId}, logId=${logId}, 新任务数=${newTasks.length}`);

      return {
        success: true,
        logId,
        beforeTotalTasks,
        afterTotalTasks,
        newTasksCount: newTasks.length,
        preservedTasksCount: completedTasks.length,
        adjustedDates
      };
    } catch (error) {
      await connection.rollback();
      logger.error('重规划失败:', error.message);
      throw error;
    } finally {
      connection.release();
    }
  }

  static extractSubject(planName) {
    const subjects = ['Python', 'Java', 'JavaScript', 'React', 'Vue', 'Node', 'SQL', 'MySQL', '算法', '数据结构'];
    for (const subject of subjects) {
      if (planName.toLowerCase().includes(subject.toLowerCase())) {
        return subject;
      }
    }
    return '通用';
  }

  static async getReplanHistory(planId, limit = 10) {
    return await ReplanLogModel.findByPlanId(planId, limit);
  }

  static async getReplanStats(planId) {
    return await ReplanLogModel.getStats(planId);
  }
}

module.exports = RegenerateService;
