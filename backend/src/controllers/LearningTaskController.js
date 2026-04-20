/**
 * 学习任务实例控制器
 * 处理学习任务的生命周期管理
 */
const LearningTaskModel = require('../models/LearningTaskModel');
const LearningPlanModel = require('../models/LearningPlanModel');
const InterventionLogModel = require('../models/InterventionLogModel');
const KnowledgeModel = require('../models/KnowledgeModel');
const NotificationTrigger = require('../services/NotificationTrigger');
const AutoEvaluationService = require('../services/AutoEvaluationService');
const FeedbackService = require('../services/FeedbackService');
const { success, fail } = require('../utils/response');
const logger = require('../config/logger');

function formatLocalDate(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const d = new Date(dateStr);
    return formatLocalDate(d);
  }
  if (dateStr instanceof Date) {
    return formatLocalDate(dateStr);
  }
  return dateStr;
}

class LearningTaskController {
  // 获取用户所有任务
  static async getAllTasks(req, res) {
    try {
      const userId = req.user.userId;
      const tasks = await LearningTaskModel.findByUserId(userId);
      
      res.json(success(tasks, '获取成功'));
    } catch (error) {
      logger.error('获取所有任务失败:', error.message);
      res.status(500).json(fail('获取任务失败'));
    }
  }

  // 获取今日推荐任务
  static async getTodayTasks(req, res) {
    try {
      const userId = req.user.userId;
      const today = formatLocalDate();

      // 获取用户未完成的任务
      const tasks = await LearningTaskModel.findByUserId(userId, { status: 0 });

      // 获取可用的知识点
      const availableKnowledge = await KnowledgeModel.findAvailable(userId);

      // 合并任务和知识点，优先推荐
      const recommendTasks = [];

      // 添加用户的任务
      for (const task of tasks.slice(0, 3)) {
        recommendTasks.push({
          type: 'user_task',
          id: task.id,
          title: task.title,
          knowledgePointId: task.knowledge_point_id,
          plannedDuration: task.planned_duration,
          status: task.status
        });
      }

      // 添加推荐的知识点
      for (const kp of availableKnowledge.slice(0, 2)) {
        recommendTasks.push({
          type: 'knowledge',
          id: kp.id,
          title: kp.name,
          difficulty: kp.difficulty,
          resourceUrl: kp.resource_url,
          estimatedMinutes: kp.estimated_minutes
        });
      }

      // 按计划时长排序（短的在前，更容易开始）
      recommendTasks.sort((a, b) => (a.plannedDuration || a.estimatedMinutes || 30) - (b.plannedDuration || b.estimatedMinutes || 30));

      logger.info('task', `获取今日推荐任务: 用户${userId}, 共${recommendTasks.length}个`);

      res.json(success({
        date: today,
        tasks: recommendTasks,
        totalCount: recommendTasks.length
      }, '获取成功'));
    } catch (error) {
      logger.error('获取今日任务失败:', error.message);
      res.status(500).json(fail('获取任务失败'));
    }
  }

  // 获取任务详情
  static async getTaskDetail(req, res) {
    try {
      const userId = req.user.userId;
      const taskId = parseInt(req.params.id);

      if (!taskId) {
        return res.status(400).json(fail('无效的任务ID'));
      }

      const task = await LearningTaskModel.findById(taskId, userId);

      if (!task) {
        return res.status(404).json(fail('任务不存在'));
      }

      // 如果有关联知识点，获取知识点详情
      let knowledgePoint = null;
      if (task.knowledge_point_id) {
        knowledgePoint = await KnowledgeModel.findById(task.knowledge_point_id);
      }

      res.json(success({
        ...task,
        knowledgePoint
      }, '获取成功'));
    } catch (error) {
      logger.error('获取任务详情失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  // 开始学习任务
  static async startLearningTask(req, res) {
    try {
      const userId = req.user.userId;
      const taskId = parseInt(req.params.id);

      // 验证任务ID
      if (!taskId) {
        return res.status(400).json(fail('无效的任务ID'));
      }

      const task = await LearningTaskModel.findById(taskId, userId);
      if (!task) {
        return res.status(404).json(fail('任务不存在'));
      }

      if (task.status !== 0) {
        return res.status(400).json(fail('任务已不是待开始状态'));
      }

      const plan = await LearningPlanModel.findById(task.plan_id, userId);
      if (plan && plan.status === 'paused') {
        return res.status(400).json(fail('计划已暂停，请先恢复计划后再开始任务'));
      }

      // 记录开始时间
      const started = await LearningTaskModel.start(taskId, userId);

      if (started) {
        // 记录干预日志（用户开始学习）
        await InterventionLogModel.create(userId, {
          interventionType: 'progress',
          title: '开始学习任务',
          content: `您已开始学习"${task.title}"，加油！`,
          triggerEvent: 'task_start'
        });

        logger.info('task', `开始任务: 用户${userId}, 任务${taskId}`);
        res.json(success(null, '任务已开始'));
      } else {
        res.status(400).json(fail('启动失败'));
      }
    } catch (error) {
      logger.error('开始任务失败:', error.message);
      res.status(500).json(fail('操作失败'));
    }
  }

  // 完成任务
  static async completeLearningTask(req, res) {
    try {
      const userId = req.user.userId;
      const taskId = parseInt(req.params.id);
      const { actualDuration, selfScore, answer, answers } = req.body;

      if (!taskId) {
        return res.status(400).json(fail('无效的任务ID'));
      }

      const task = await LearningTaskModel.findById(taskId, userId);
      if (!task) {
        return res.status(404).json(fail('任务不存在'));
      }

      if (task.status !== 1) {
        return res.status(400).json(fail('只有进行中的任务才能完成'));
      }

      const actualMinutes = actualDuration ? Math.floor(actualDuration / 60) : task.planned_duration;
      
      let finalScore = null;
      let evaluationResult = null;
      let isAutoEvaluated = false;
      
      const taskSubtype = task.task_subtype || 'subjective';
      
      if (taskSubtype !== 'subjective' && (answer || answers)) {
        const userSubmission = { answer, answers, selfScore };
        evaluationResult = await AutoEvaluationService.evaluateTask(taskId, userSubmission);
        
        if (evaluationResult.success && evaluationResult.isAutoEvaluated) {
          finalScore = evaluationResult.score;
          isAutoEvaluated = true;
        }
      }
      
      if (!isAutoEvaluated && selfScore !== undefined) {
        finalScore = Math.min(100, Math.max(0, parseInt(selfScore)));
      }

      const timeDeviation = task.planned_duration > 0
        ? ((task.planned_duration - actualMinutes) / task.planned_duration * 100).toFixed(2)
        : 0;

      const completed = await LearningTaskModel.complete(taskId, userId, {
        actualDuration: actualMinutes,
        selfScore: finalScore
      });

      if (completed) {
        const LearningRecordModel = require('../models/LearningRecordModel');
        await LearningRecordModel.create(userId, {
          taskId: taskId,
          recordType: 'complete',
          duration: actualMinutes,
          score: finalScore,
          notes: req.body.notes || ''
        });

        if (actualMinutes < task.planned_duration * 0.7) {
          await LearningTaskController.checkEarlyCompletion(taskId, userId);
        }

        let showAiHelper = false;
        let aiHelperTopic = null;
        let showReplanSuggestion = false;
        
        if (finalScore < 60 && task.knowledge_point_id) {
          await InterventionLogModel.recordFailure(userId, task.knowledge_point_id, taskId, finalScore);
          
          const hasConsecutiveFailures = await InterventionLogModel.checkConsecutiveFailures(
            userId, 
            task.knowledge_point_id, 
            3
          );
          
          if (hasConsecutiveFailures) {
            showAiHelper = true;
            aiHelperTopic = task.title || task.name;
            
            const KnowledgeModel = require('../models/KnowledgeModel');
            const kp = await KnowledgeModel.findById(task.knowledge_point_id);
            
            await InterventionLogModel.create(userId, {
              interventionType: 'consecutive_failure',
              title: '学习困难提醒',
              content: `检测到你在"${aiHelperTopic}"上遇到了困难，要不要问问AI助手？它可能给你新的启发！`,
              triggerEvent: `consecutive_failure_${task.knowledge_point_id}`
            });
            
            logger.info('task', `检测到连续失败: 用户${userId}, 知识点${task.knowledge_point_id}`);
          }
        } else if (finalScore >= 60 && task.knowledge_point_id) {
          await InterventionLogModel.clearFailures(userId, task.knowledge_point_id);
        }

        const totalFailures = await InterventionLogModel.getTotalFailures(userId);
        if (totalFailures >= 3) {
          showReplanSuggestion = true;
          await InterventionLogModel.create(userId, {
            interventionType: 'replan_suggestion',
            title: '重规划建议',
            content: '检测到您近期学习遇到较多困难，建议重新规划学习计划',
            triggerEvent: 'consecutive_task_failures'
          });
        }

        const feedbackResult = await FeedbackService.generateFeedback(task, {
          ...evaluationResult,
          score: finalScore,
          isAutoEvaluated
        });

        await InterventionLogModel.create(userId, {
          interventionType: 'feedback',
          title: '任务完成反馈',
          content: feedbackResult.feedback.summary,
          triggerEvent: 'task_complete'
        });

        logger.info('task', `完成任务: 用户${userId}, 任务${taskId}, 用时${actualMinutes}分钟, 得分${finalScore}, 自动评测:${isAutoEvaluated}`);
        
        res.json(success({
          actualDuration: actualMinutes,
          score: finalScore,
          timeDeviation,
          isAutoEvaluated,
          evaluationResult: isAutoEvaluated ? evaluationResult : null,
          feedback: feedbackResult.feedback,
          showAiHelper,
          aiHelperTopic,
          aiHelperQuestion: showAiHelper ? `请帮我理解${aiHelperTopic}的核心概念` : null,
          showReplanSuggestion
        }, '任务已完成'));
      } else {
        res.status(400).json(fail('完成失败'));
      }
    } catch (error) {
      logger.error('完成任务失败:', error.message);
      res.status(500).json(fail('操作失败'));
    }
  }

  // 跳过任务
  static async skipLearningTask(req, res) {
    try {
      const userId = req.user.userId;
      const taskId = parseInt(req.params.id);

      if (!taskId) {
        return res.status(400).json(fail('无效的任务ID'));
      }

      const skipped = await LearningTaskModel.skip(taskId, userId);

      if (skipped) {
        logger.info('task', `跳过任务: 用户${userId}, 任务${taskId}`);
        res.json(success(null, '已跳过'));
      } else {
        res.status(400).json(fail('跳过失败'));
      }
    } catch (error) {
      logger.error('跳过任务失败:', error.message);
      res.status(500).json(fail('操作失败'));
    }
  }

  // 获取学习统计
  static async getLearningStats(req, res) {
    try {
      const userId = req.user.userId;

      const stats = await LearningTaskModel.getStats(userId);
      const streakDays = await LearningTaskModel.getStreakDays(userId);
      const todayTasks = await LearningTaskModel.findToday(userId);

      res.json(success({
        total: stats.total || 0,
        completed: stats.completed || 0,
        inProgress: stats.inProgress || 0,
        pending: stats.pending || 0,
        skipped: stats.skipped || 0,
        totalTime: stats.totalTime || 0, // 分钟
        avgScore: stats.avgScore ? Math.round(stats.avgScore) : 0,
        streakDays: streakDays,
        todayTasks: todayTasks.length
      }, '获取成功'));
    } catch (error) {
      logger.error('获取统计失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  // 获取任务历史
  static async getTaskHistory(req, res) {
    try {
      const userId = req.user.userId;
      const { status, limit = 20 } = req.query;

      const options = { status: status ? parseInt(status) : undefined };
      if (limit) options.limit = parseInt(limit);

      const tasks = await LearningTaskModel.findByUserId(userId, options);

      res.json(success(tasks, '获取成功'));
    } catch (error) {
      logger.error('获取历史失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  static async createDDLTask(req, res) {
    try {
      const userId = req.user.userId;
      const { title, description, courseId, deadline, estimatedMinutes, planId } = req.body;

      if (!title || !deadline) {
        return res.status(400).json(fail('任务标题和截止时间为必填项'));
      }

      const taskId = await LearningTaskModel.createDDLTask(userId, {
        title,
        description,
        courseId,
        deadline,
        estimatedMinutes,
        planId
      });

      const task = await LearningTaskModel.findById(taskId, userId);

      NotificationTrigger.triggerTaskReminder(userId, taskId, title, deadline).catch(err => {
        logger.error('触发任务提醒通知失败:', err.message);
      });

      logger.info('task', `创建DDL任务: 用户${userId}, 任务${taskId}`);
      res.status(201).json(success(task, 'DDL任务创建成功'));
    } catch (error) {
      logger.error('创建DDL任务失败:', error.message);
      res.status(500).json(fail('创建失败'));
    }
  }

  static async getUpcomingDDL(req, res) {
    try {
      const userId = req.user.userId;
      const { limit } = req.query;

      const tasks = await LearningTaskModel.findUpcomingDDL(userId, parseInt(limit) || 10);

      const tasksWithCountdown = tasks.map(task => {
        const deadline = new Date(task.deadline);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        deadline.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

        return {
          ...task,
          countdown: {
            days: diffDays,
            isToday: diffDays === 0,
            isTomorrow: diffDays === 1,
            isOverdue: diffDays < 0,
            display: diffDays < 0 ? '已逾期' : diffDays === 0 ? '今天截止' : diffDays === 1 ? '明天截止' : `${diffDays}天后截止`
          }
        };
      });

      res.json(success(tasksWithCountdown, '获取成功'));
    } catch (error) {
      logger.error('获取即将截止任务失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  static async getOverdueDDL(req, res) {
    try {
      const userId = req.user.userId;

      const tasks = await LearningTaskModel.findOverdueDDL(userId);

      const tasksWithOverdue = tasks.map(task => {
        const deadline = new Date(task.deadline);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        deadline.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((now - deadline) / (1000 * 60 * 60 * 24));

        return {
          ...task,
          overdueDays: diffDays,
          display: `已逾期${diffDays}天`
        };
      });

      res.json(success(tasksWithOverdue, '获取成功'));
    } catch (error) {
      logger.error('获取逾期任务失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  static async updateTaskProgress(req, res) {
    try {
      const userId = req.user.userId;
      const taskId = parseInt(req.params.id);
      const { actual_duration, status, quality_score } = req.body;

      if (!taskId) {
        return res.status(400).json(fail('无效的任务ID'));
      }

      const task = await LearningTaskModel.findById(taskId, userId);
      if (!task) {
        return res.status(404).json(fail('任务不存在'));
      }

      const updated = await LearningTaskModel.updateProgress(taskId, userId, {
        actual_duration,
        status,
        quality_score
      });

      if (updated) {
        const updatedTask = await LearningTaskModel.findById(taskId, userId);
        logger.info('task', `更新任务进度: 用户${userId}, 任务${taskId}`);
        res.json(success(updatedTask, '更新成功'));
      } else {
        res.status(400).json(fail('更新失败'));
      }
    } catch (error) {
      logger.error('更新任务进度失败:', error.message);
      res.status(500).json(fail('更新失败'));
    }
  }

  static async getAllDDLTasks(req, res) {
    try {
      const userId = req.user.userId;

      const tasks = await LearningTaskModel.findDDLByUserId(userId);

      res.json(success(tasks, '获取成功'));
    } catch (error) {
      logger.error('获取DDL任务列表失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  static async getPlanDDLTasks(req, res) {
    try {
      const userId = req.user.userId;
      const planId = parseInt(req.params.planId);

      if (!planId) {
        return res.status(400).json(fail('无效的计划ID'));
      }

      const tasks = await LearningTaskModel.findDDLByPlanId(planId, userId);

      res.json(success(tasks, '获取成功'));
    } catch (error) {
      logger.error('获取计划DDL任务列表失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  static async updateTask(req, res) {
    try {
      const userId = req.user.userId;
      const taskId = parseInt(req.params.id);
      const { name, description, planned_duration, planned_date, difficulty, deadline, phase_id } = req.body;

      if (!taskId) {
        return res.status(400).json(fail('无效的任务ID'));
      }

      const task = await LearningTaskModel.findById(taskId, userId);
      if (!task) {
        return res.status(404).json(fail('任务不存在'));
      }

      if (task.status === 2) {
        return res.status(403).json(fail('已完成的任务不能修改'));
      }

      const updated = await LearningTaskModel.update(taskId, userId, {
        name,
        description,
        planned_duration,
        planned_date,
        difficulty,
        deadline,
        phase_id
      });

      if (updated) {
        logger.info(`更新任务: 用户${userId}, 任务${taskId}`);
        res.json(success(null, '更新成功'));
      } else {
        res.status(400).json(fail('更新失败'));
      }
    } catch (error) {
      logger.error('更新任务失败:', error.message);
      res.status(500).json(fail(error.message));
    }
  }

  static async deleteTask(req, res) {
    try {
      const userId = req.user.userId;
      const taskId = parseInt(req.params.id);

      if (!taskId) {
        return res.status(400).json(fail('无效的任务ID'));
      }

      const task = await LearningTaskModel.findById(taskId, userId);
      if (!task) {
        return res.status(404).json(fail('任务不存在'));
      }

      if (task.status === 2) {
        return res.status(403).json(fail('已完成的任务不能删除'));
      }

      const deleted = await LearningTaskModel.delete(taskId, userId);

      if (deleted) {
        logger.info('task', `删除任务: 用户${userId}, 任务${taskId}`);
        res.json(success(null, '删除成功'));
      } else {
        res.status(400).json(fail('删除失败'));
      }
    } catch (error) {
      logger.error('删除任务失败:', error.message);
      res.status(500).json(fail('删除失败'));
    }
  }

  static async updateDDLTask(req, res) {
    try {
      const userId = req.user.userId;
      const taskId = parseInt(req.params.id);
      const { title, description, courseId, planId, deadline, estimatedMinutes } = req.body;

      if (!taskId) {
        return res.status(400).json(fail('无效的任务ID'));
      }

      if (!title || !deadline) {
        return res.status(400).json(fail('任务标题和截止时间为必填项'));
      }

      const task = await LearningTaskModel.findById(taskId, userId);
      if (!task) {
        return res.status(404).json(fail('任务不存在'));
      }

      const updated = await LearningTaskModel.updateDDLTask(taskId, userId, {
        title,
        description,
        courseId,
        planId,
        deadline,
        estimatedMinutes
      });

      if (updated) {
        const updatedTask = await LearningTaskModel.findById(taskId, userId);
        logger.info('task', `更新DDL任务: 用户${userId}, 任务${taskId}`);
        res.json(success(updatedTask, '更新成功'));
      } else {
        res.status(400).json(fail('更新失败'));
      }
    } catch (error) {
      logger.error('更新DDL任务失败:', error.message);
      res.status(500).json(fail('更新失败'));
    }
  }

  static async createQuizTask(req, res) {
    try {
      const userId = req.user.userId;
      const { title, description, taskSubtype, questionData, planId, phaseId } = req.body;

      if (!title) {
        return res.status(400).json(fail('任务标题为必填项'));
      }

      if (!questionData) {
        return res.status(400).json(fail('题目数据为必填项'));
      }

      const validSubtypes = ['single_choice', 'multiple_choice', 'fill_blank'];
      if (taskSubtype && !validSubtypes.includes(taskSubtype)) {
        return res.status(400).json(fail('无效的任务子类型'));
      }

      const taskId = await LearningTaskModel.createQuizTask(userId, {
        title,
        description,
        taskSubtype,
        questionData,
        planId,
        phaseId
      });

      const task = await LearningTaskModel.findById(taskId, userId);

      logger.info('task', `创建客观题任务: 用户${userId}, 任务${taskId}, 类型:${taskSubtype}`);
      res.status(201).json(success(task, '客观题任务创建成功'));
    } catch (error) {
      logger.error('创建客观题任务失败:', error.message);
      res.status(500).json(fail('创建失败'));
    }
  }
}

module.exports = LearningTaskController;

LearningTaskController.checkEarlyCompletion = async function(taskId, userId) {
  try {
    const task = await LearningTaskModel.findById(taskId, userId);
    if (!task || !task.plan_id) return;

    const planTasks = await LearningTaskModel.findByPlanId(task.plan_id, userId);
    const currentIndex = planTasks.findIndex(t => t.id === taskId);
    
    if (currentIndex === -1 || currentIndex === planTasks.length - 1) return;

    const nextTask = planTasks[currentIndex + 1];
    if (nextTask && nextTask.status === 0) {
      const today = formatLocalDate();
      const nextTaskDate = parseLocalDate(nextTask.planned_date);
      if (nextTaskDate && nextTaskDate > today) {
        await LearningTaskModel.update(nextTask.id, userId, {
          planned_date: today
        });
        logger.info('task', `提前解锁后续任务: 用户${userId}, 任务${nextTask.id}`);
      }
    }
  } catch (error) {
    logger.error('检查提前完成失败:', error.message);
  }
};

LearningTaskController.handleTaskTimeout = async function(taskId, userId) {
  try {
    const task = await LearningTaskModel.findById(taskId, userId);
    if (!task) return;

    const plannedDateStr = parseLocalDate(task.planned_date);
    const todayStr = formatLocalDate();

    if (todayStr > plannedDateStr && task.status === 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await LearningTaskModel.update(taskId, userId, {
        is_overdue: true,
        planned_date: formatLocalDate(tomorrow)
      });

      await InterventionLogModel.create(userId, {
        interventionType: 'task_timeout',
        title: '任务超时提醒',
        content: `任务"${task.title || task.name}"已超时，已自动顺延至明天`,
        triggerEvent: 'task_timeout'
      });

      logger.info('task', `任务超时顺延: 用户${userId}, 任务${taskId}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('处理任务超时失败:', error.message);
    return false;
  }
};

LearningTaskController.handleTaskSkip = async function(taskId, userId) {
  try {
    const task = await LearningTaskModel.findById(taskId, userId);
    if (!task) return false;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    await LearningTaskModel.update(taskId, userId, {
      planned_date: tomorrowStr
    });

    logger.info('task', `任务跳过顺延: 用户${userId}, 任务${taskId} -> ${tomorrowStr}`);
    return true;
  } catch (error) {
    logger.error('处理任务跳过失败:', error.message);
    return false;
  }
};