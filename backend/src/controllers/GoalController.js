/**
 * 学习目标控制器
 */
const GoalService = require('../services/GoalService');
const { success, fail } = require('../utils/response');
const logger = require('../config/logger');

class GoalController {
  /**
   * 创建学习目标
   * POST /api/goal
   */
  static async createGoal(req, res) {
    try {
      const userId = req.user.userId;
      const { title, description } = req.body;

      if (!title) {
        return res.status(400).json(fail('目标标题不能为空'));
      }

      const result = await GoalService.createGoal(userId, { title, description });
      logger.info(`创建学习目标: ${title}`);

      res.json(success(result, '创建成功'));
    } catch (error) {
      logger.error('创建学习目标失败:', error.message);
      res.status(500).json(fail(error.message));
    }
  }

  /**
   * 获取学习目标列表
   * GET /api/goal
   */
  static async getGoals(req, res) {
    try {
      const userId = req.user.userId;
      const goals = await GoalService.getGoals(userId);

      res.json(success(goals));
    } catch (error) {
      logger.error('获取学习目标失败:', error.message);
      res.status(500).json(fail('获取失败'));
    }
  }

  /**
   * 获取学习目标详情
   * GET /api/goal/:id
   */
  static async getGoalDetail(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      const goal = await GoalService.getGoalDetail(id, userId);

      res.json(success(goal));
    } catch (error) {
      logger.error('获取目标详情失败:', error.message);
      res.status(404).json(fail(error.message, 404));
    }
  }

  /**
   * 删除学习目标
   * DELETE /api/goal/:id
   */
  static async deleteGoal(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      await GoalService.deleteGoal(id, userId);
      logger.info(`删除学习目标: ${id}`);

      res.json(success(null, '删除成功'));
    } catch (error) {
      logger.error('删除学习目标失败:', error.message);
      res.status(404).json(fail(error.message, 404));
    }
  }

  /**
   * 更新学习目标
   * PUT /api/goal/:id
   */
  static async updateGoal(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { title, description } = req.body;

      if (!title) {
        return res.status(400).json(fail('目标标题不能为空'));
      }

      await GoalService.updateGoal(id, userId, { title, description });
      logger.info(`更新学习目标: ${id}`);

      res.json(success(null, '更新成功'));
    } catch (error) {
      logger.error('更新学习目标失败:', error.message);
      res.status(500).json(fail(error.message));
    }
  }
}

module.exports = GoalController;