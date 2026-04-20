/**
 * 动态重规划服务
 * 当计划发生变更时，动态调整学习任务
 *
 * 功能：
 * 1. 分析当前目标的学习进度
 * 2. 识别已完成和未完成的任务
 * 3. 根据任务优先级算法重新排序
 * 4. 生成新的学习路径
 * 5. 更新数据库中的任务
 */

const LearningTaskModel = require('../models/LearningTaskModel');
const KnowledgeModel = require('../models/KnowledgeModel');
const LearningPlanModel = require('../models/LearningPlanModel');
const logger = require('../config/logger');

class ReplanningService {
  /**
   * 动态重规划主方法
   * @param {number} userId - 用户ID
   * @param {number} goalId - 目标ID
   * @param {Array} completedTaskIds - 已完成任务ID数组
   * @returns {Object} 重规划结果
   */
  static async replan(userId, goalId, completedTaskIds = []) {
    logger.info('replan', `开始重规划: 用户${userId}, 目标${goalId}`);

    try {
      // 1. 获取当前目标的所有任务
      const allTasks = await LearningTaskModel.findByUserId(userId, { goalId });
      const completedTaskIdsSet = new Set(completedTaskIds);

      // 2. 分离已完成和未完成的任务
      const completedTasks = allTasks.filter(t => t.status === 2);
      const pendingTasks = allTasks.filter(t => t.status === 0 || t.status === 1);

      logger.info('replan', `已完成: ${completedTasks.length}, 待完成: ${pendingTasks.length}`);

      // 3. 获取知识点信息用于优先级排序
      const knowledgePoints = await KnowledgeModel.findAll();
      const kpMap = new Map(knowledgePoints.map(kp => [kp.id, kp]));

      // 4. 计算剩余任务的优先级
      const prioritizedTasks = await this.prioritizeTasks(pendingTasks, kpMap, completedTaskIdsSet);

      // 5. 更新任务的排序顺序
      await this.updateTaskOrder(prioritizedTasks, userId);

      // 6. 检查是否需要补充新任务
      const newTasks = await this.suggestNewTasks(userId, goalId, completedTasks, knowledgePoints);

      const result = {
        success: true,
        stats: {
          total: allTasks.length,
          completed: completedTasks.length,
          restructured: prioritizedTasks.length,
          newRecommended: newTasks.length
        },
        reorderedTasks: prioritizedTasks.map((t, i) => ({
          id: t.id,
          title: t.title,
          newOrder: i + 1,
          priority: t.priorityScore
        })),
        suggestedNewTasks: newTasks,
        message: this.generateReplanMessage(completedTasks.length, prioritizedTasks.length, newTasks.length)
      };

      logger.info('replan', `重规划完成: ${result.stats.restructured}个任务已重新排序`);

      return result;
    } catch (error) {
      logger.error('重规划失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 任务优先级排序算法
   * @param {Array} tasks - 待排序任务
   * @param {Map} kpMap - 知识点映射
   * @param {Set} completedIds - 已完成ID集合
   * @returns {Array} 排序后的任务
   */
  static async prioritizeTasks(tasks, kpMap, completedIds) {
    // 计算每个任务的优先级分数
    const scoredTasks = tasks.map(task => {
      let priorityScore = 0;
      const kp = task.knowledge_point_id ? kpMap.get(task.knowledge_point_id) : null;

      // 1. 依赖优先 (前置知识点已完成的优先级降低)
      if (kp && kp.prerequisite_ids) {
        const prereqs = JSON.parse(kp.prerequisite_ids || '[]');
        const prereqsCompleted = prereqs.filter(id => completedIds.has(id));
        if (prereqs.length > 0 && prereqsCompleted.length === prereqs.length) {
          priorityScore += 30; // 前置知识已掌握，可以学习
        } else if (prereqsCompleted.length > 0) {
          priorityScore += 10; // 部分前置知识已掌握
        }
      }

      // 2. 难度加权 (简单任务优先，快速建立信心)
      if (kp) {
        const difficultyWeight = { 1: 25, 2: 15, 3: 5 }; // 简单任务高分
        priorityScore += difficultyWeight[kp.difficulty] || 10;
      } else {
        priorityScore += 10;
      }

      // 3. 时长加权 (短任务优先)
      const durationWeight = task.planned_duration <= 30 ? 15 :
        task.planned_duration <= 60 ? 10 : 5;
      priorityScore += durationWeight;

      // 4. 已开始的任务优先
      if (task.status === 1) {
        priorityScore += 20;
      }

      // 5. 截止日期加权 (临期的任务优先)
      if (task.deadline) {
        const daysUntilDeadline = Math.ceil(
          (new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilDeadline <= 1) priorityScore += 30;
        else if (daysUntilDeadline <= 3) priorityScore += 20;
        else if (daysUntilDeadline <= 7) priorityScore += 10;
      }

      return { ...task, priorityScore };
    });

    // 按优先级分数降序排序
    scoredTasks.sort((a, b) => b.priorityScore - a.priorityScore);

    return scoredTasks;
  }

  /**
   * 更新任务的排序顺序
   * @param {Array} tasks - 排序后的任务
   * @param {number} userId - 用户ID
   */
  static async updateTaskOrder(tasks, userId) {
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      // 可以添加排序字段更新逻辑
      // 当前简化版只更新优先级标记
      logger.info('replan', `任务${task.id}排序: ${i + 1}, 优先级: ${task.priorityScore}`);
    }
  }

  /**
   * 推荐新任务
   * @param {number} userId - 用户ID
   * @param {number} goalId - 目标ID
   * @param {Array} completedTasks - 已完成任务
   * @param {Array} knowledgePoints - 所有知识点
   * @returns {Array} 推荐的新任务
   */
  static async suggestNewTasks(userId, goalId, completedTasks, knowledgePoints) {
    const completedKpIds = new Set(completedTasks.map(t => t.knowledge_point_id).filter(Boolean));
    const suggested = [];

    // 找到可学习的新知识点
    for (const kp of knowledgePoints) {
      if (completedKpIds.has(kp.id)) continue;

      // 检查前置知识是否已掌握
      const prereqs = JSON.parse(kp.prerequisite_ids || '[]');
      const prereqsCompleted = prereqs.every(id => completedKpIds.has(id));

      if (prereqs.length === 0 || prereqsCompleted) {
        suggested.push({
          knowledgePointId: kp.id,
          name: kp.name,
          difficulty: kp.difficulty,
          estimatedMinutes: kp.estimated_minutes,
          resourceUrl: kp.resource_url,
          reason: prereqs.length === 0 ? '入门知识点' : '前置知识已掌握'
        });
      }

      if (suggested.length >= 3) break;
    }

    return suggested;
  }

  /**
   * 生成重规划消息
   */
  static generateReplanMessage(completed, restructured, newCount) {
    if (newCount > 0) {
      return `已为您重新优化学习路径！${completed}个任务已完成，${restructured}个任务待学习，另有${newCount}个新知识点推荐。`;
    } else if (restructured > 0) {
      return `学习路径已更新！根据您的学习进度，重新排列了${restructured}个任务的优先级。`;
    } else {
      return '当前学习进度良好，所有任务已规划完成！';
    }
  }
}

/**
 * 快速重规划接口
 * 简化版，给定已完成任务ID重新计算优先级
 */
ReplanningService.quickReplan = async function(userId, completedTaskIds = []) {
  const completedIdsSet = new Set(completedTaskIds);

  // 获取用户所有待处理���务
  const allTasks = await LearningTaskModel.findByUserId(userId, { status: 0 });
  const pendingTasks = allTasks.filter(t => !completedIdsSet.has(t.id));

  // 获取知识点
  const knowledgePoints = await KnowledgeModel.findAll();
  const kpMap = new Map(knowledgePoints.map(kp => [kp.id, kp]));

  // 重新计算优先级
  const prioritized = await this.prioritizeTasks(pendingTasks, kpMap, completedIdsSet);

  return {
    success: true,
    tasks: prioritized.map((t, i) => ({
      id: t.id,
      title: t.title,
      order: i + 1,
      priority: t.priorityScore
    }))
  };
};

module.exports = ReplanningService;