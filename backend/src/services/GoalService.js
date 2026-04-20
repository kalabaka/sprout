/**
 * 学习目标服务层
 */
const GoalModel = require('../models/GoalModel');

class GoalService {
  /**
   * 创建学习目标
   */
  static async createGoal(userId, { title, description }) {
    if (!title) {
      throw new Error('目标标题不能为空');
    }
    const goalId = await GoalModel.create(userId, { title, description });
    return { goalId, title, description };
  }

  /**
   * 获取用户的学习目标列表
   */
  static async getGoals(userId) {
    return await GoalModel.findByUserId(userId);
  }

  /**
   * 获取学习目标详情
   */
  static async getGoalDetail(goalId, userId) {
    const goal = await GoalModel.findById(goalId, userId);
    if (!goal) {
      throw new Error('学习目标不存在');
    }
    return goal;
  }

  /**
   * 删除学习目标
   */
  static async deleteGoal(goalId, userId) {
    const success = await GoalModel.delete(goalId, userId);
    if (!success) {
      throw new Error('学习目标不存在');
    }
    return { message: '删除成功' };
  }

  /**
   * 更新学习目标
   */
  static async updateGoal(goalId, userId, { title, description }) {
    if (!title) {
      throw new Error('目标标题不能为空');
    }
    const success = await GoalModel.update(goalId, userId, { title, description });
    if (!success) {
      throw new Error('学习目标不存在');
    }
    return { message: '更新成功' };
  }
}

module.exports = GoalService;