/**
 * 学习计划服务 - 包含业务逻辑
 * 优化：添加缓存、减少N+1查询
 */
const LearningPlanModel = require('../models/LearningPlanModel');
const LearningTaskModel = require('../models/LearningTaskModel');
const PlanningAgent = require('./PlanningAgent');
const ProfileModel = require('../models/ProfileModel');
const UserModel = require('../models/UserModel');
const { cache } = require('./CacheService');
const logger = require('../config/logger');

const SUBJECT_KEYWORDS = {
  python: 'python', java: 'java', javascript: 'javascript', js: 'javascript',
  c: 'c', cpp: 'cpp', 'c++': 'cpp', html: 'html', css: 'css',
  vue: 'vue', react: 'react', nodejs: 'nodejs', 'node.js': 'nodejs',
  spring: 'spring', django: 'django', mysql: 'mysql', mongodb: 'mongodb',
  linux: 'linux', git: 'git', docker: 'docker',
  'machine learning': 'machine_learning', 'deep learning': 'deep_learning',
  ai: 'machine_learning', ml: 'machine_learning', dl: 'deep_learning'
};

function extractSubject(target) {
  const targetLower = target.toLowerCase();
  const keywords = Object.keys(SUBJECT_KEYWORDS).sort((a, b) => b.length - a.length);
  for (const keyword of keywords) {
    if (targetLower.includes(keyword)) {
      return SUBJECT_KEYWORDS[keyword];
    }
  }
  return 'default';
}

async function generatePlanLegacy(target, userId, dailyStudyMinutes = 60) {
  let userProfile = null;
  try {
    userProfile = await ProfileModel.getProfile(userId);
  } catch (e) {
    logger.warn('获取用户画像失败，使用默认设置: ' + e.message);
  }

  const params = {
    userId: userId,
    target: target,
    goalType: 'skill',
    subject: extractSubject(target),
    userLevel: userProfile?.overallLevel || 'beginner',
    masteredTopicIds: [],
    learningPace: userProfile?.learningPace || 'normal',
    dailyStudyMinutes: dailyStudyMinutes,
    availableWeekdays: userProfile?.availableWeekdays || [1, 2, 3, 4, 5, 6, 7]
  };

  const result = await PlanningAgent.generatePlan(params);

  const flatTasks = [];
  if (result.plan && result.plan.phases) {
    result.plan.phases.forEach(phase => {
      phase.tasks.forEach(task => {
        flatTasks.push({
          name: task.name,
          level: task.difficulty || 1,
          duration: task.estimatedMinutes || 60,
          scheduledDate: task.scheduledDate,
          stage: phase.name,
          knowledgePointId: task.knowledgePointId
        });
      });
    });
  }

  return {
    tasks: flatTasks,
    explanation: result.explanation || ''
  };
}

class LearningPlanService {
  // 缓存键前缀
  static CACHE_KEYS = {
    PLANS_LIST: 'plans:',
    PLAN_DETAIL: 'plan:',
    PLAN_STATS: 'planStats:'
  };

  // 缓存TTL配置
  static CACHE_TTL = {
    PLANS_LIST: 30000,   // 30秒
    PLAN_DETAIL: 60000   // 60秒
  };

  // 创建学习计划（包含自动生成学习路径）
  static async createPlan(userId, planData) {
    const { name, goal, targetDate, knowledgePoints, dailyStudyMinutes } = planData;

    const planId = await LearningPlanModel.create(userId, { name, goal, targetDate, knowledgePoints });

    const planResult = await generatePlanLegacy(goal || name, userId, dailyStudyMinutes || 60);
    const tasks = planResult.tasks || [];

    for (const task of tasks) {
      await LearningTaskModel.create(userId, {
        planId,
        name: task.name,
        plannedDuration: task.duration || this.getEstimatedTimeByLevel(task.level),
        difficulty: task.level || 1,
        plannedDate: task.scheduledDate || this.calculateDeadline(task.order),
        knowledgePointId: task.knowledgePointId || null
      });
    }

    cache.deleteByPrefix(this.CACHE_KEYS.PLANS_LIST + userId);

    return { planId, taskCount: tasks.length };
  }

  // 根据难度等级估算学习时间
  static getEstimatedTimeByLevel(level) {
    const timeMap = {
      1: 45,   // 基础阶段45分钟
      2: 60,   // 进阶阶段60分钟
      3: 90    // 应用阶段90分钟
    };
    return timeMap[level] || 60;
  }

  // 计算任务截止时间
  static calculateDeadline(order) {
    const daysToAdd = order * 2;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + daysToAdd);
    return deadline.toISOString().split('T')[0];
  }

  // 获取计划列表（带缓存优化）
  static async getPlans(userId) {
    const cacheKey = `${this.CACHE_KEYS.PLANS_LIST}${userId}`;

    // 尝试从缓存获取
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 获取计划列表
    const plans = await LearningPlanModel.findByUserId(userId);

    // 批量获取所有计划的任务统计（优化：1次查询代替N次）
    if (plans.length > 0) {
      const planIds = plans.map(p => p.id);
      const allStats = await this.getStatsByPlanIds(planIds, userId);

      // 合并统计到计划
      const statsMap = new Map(allStats.map(s => [s.plan_id, s]));
      for (const plan of plans) {
        plan.taskStats = statsMap.get(plan.id) || { total: 0, completed: 0, inProgress: 0 };
      }
    }

    // 存入缓存
    cache.set(cacheKey, plans, this.CACHE_TTL.PLANS_LIST);

    return plans;
  }

  // 批量获取计划的任务统计（优化：1次查询）
  static async getStatsByPlanIds(planIds, userId) {
    if (!planIds || planIds.length === 0) return [];

    // 构建单个查询获取多个计划的统计
    const placeholders = planIds.map(() => '?').join(',');
    const sql = `
      SELECT plan_id,
             COUNT(*) as total,
             SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as completed,
             SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as inProgress
      FROM learning_tasks
      WHERE plan_id IN (${placeholders}) AND user_id = ?
      GROUP BY plan_id
    `;

    const { pool } = require('../config/database');
    const [rows] = await pool.execute(sql, [...planIds, userId]);
    return rows;
  }

  // 获取计划详情（带缓存）
  static async getPlanDetail(planId, userId) {
    const cacheKey = `${this.CACHE_KEYS.PLAN_DETAIL}${planId}:${userId}`;

    // 尝试从缓存获取
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const plan = await LearningPlanModel.findById(planId, userId);
    if (!plan) {
      throw new Error('学习计划不存在');
    }

    const tasks = await LearningTaskModel.findByPlanId(planId, userId);

    const result = { plan, tasks };

    // 存入缓存
    cache.set(cacheKey, result, this.CACHE_TTL.PLAN_DETAIL);

    return result;
  }

  // 更新计划后清除缓存
  static async updatePlan(planId, userId, data) {
    await LearningPlanModel.update(planId, userId, data);
    cache.delete(`${this.CACHE_KEYS.PLAN_DETAIL}${planId}:${userId}`);
    cache.deleteByPrefix(this.CACHE_KEYS.PLANS_LIST + userId);
  }

  // 删除计划后清除缓存
  static async deletePlan(planId, userId) {
    await LearningPlanModel.delete(planId, userId);
    cache.delete(`${this.CACHE_KEYS.PLAN_DETAIL}${planId}:${userId}`);
    cache.deleteByPrefix(this.CACHE_KEYS.PLANS_LIST + userId);
  }

  static async checkCreateLimit(userId) {
    const user = await UserModel.findById(userId);
    
    if (user && user.role === 'admin') {
      return { canCreate: true, reason: '', counts: {} };
    }
    
    const totalCount = await LearningPlanModel.countByUser(userId);
    const activeCount = await LearningPlanModel.countByUserAndStatus(userId, 'active');
    
    const limits = {
      maxTotal: 20,
      maxActive: 5
    };
    
    if (totalCount >= limits.maxTotal) {
      return {
        canCreate: false,
        reason: `已达计划数量上限（${limits.maxTotal}个），请归档或删除旧计划`,
        counts: { total: totalCount, active: activeCount }
      };
    }
    
    if (activeCount >= limits.maxActive) {
      return {
        canCreate: false,
        reason: `你已有 ${activeCount} 个进行中的计划，建议先完成或暂停部分计划`,
        counts: { total: totalCount, active: activeCount }
      };
    }
    
    return {
      canCreate: true,
      reason: '',
      counts: { total: totalCount, active: activeCount }
    };
  }
}

module.exports = LearningPlanService;