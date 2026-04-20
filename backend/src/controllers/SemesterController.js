/**
 * 学期控制器
 * 处理学期相关的HTTP请求
 */
const SemesterService = require('../services/SemesterService');
const { success, fail } = require('../utils/response');

class SemesterController {
  /**
   * 创建学期
   * POST /api/semester
   */
  static async create(req, res) {
    try {
      const userId = req.user.userId;
      const { name, start_date, end_date, total_weeks, is_current } = req.body;

      if (!name || !start_date || !end_date || !total_weeks) {
        return res.status(400).json(fail('缺少必要参数'));
      }

      const semester = await SemesterService.createSemester({
        user_id: userId,
        name,
        start_date,
        end_date,
        total_weeks,
        is_current: is_current || false
      });

      if (is_current) {
        await SemesterService.setCurrentSemester(userId, semester.id);
      }

      res.json(success(semester, '学期创建成功'));
    } catch (error) {
      console.error('创建学期失败:', error);
      res.status(500).json(fail(error.message || '创建学期失败'));
    }
  }

  /**
   * 获取当前学期信息
   * GET /api/semester/current
   */
  static async getCurrent(req, res) {
    try {
      const userId = req.user.userId;
      const semester = await SemesterService.getCurrentSemester(userId);

      res.json(success(semester));
    } catch (error) {
      console.error('获取当前学期失败:', error);
      res.status(500).json(fail(error.message || '获取当前学期失败'));
    }
  }

  /**
   * 获取用户所有学期
   * GET /api/semester
   */
  static async getAll(req, res) {
    try {
      const userId = req.user.userId;
      const semesters = await SemesterService.getUserSemesters(userId);

      res.json(success(semesters));
    } catch (error) {
      console.error('获取学期列表失败:', error);
      res.status(500).json(fail(error.message || '获取学期列表失败'));
    }
  }

  /**
   * 更新学期
   * PUT /api/semester/:id
   */
  static async update(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { name, start_date, end_date, total_weeks, is_current } = req.body;

      const semester = await SemesterService.updateSemester(id, userId, {
        name,
        start_date,
        end_date,
        total_weeks,
        is_current
      });

      if (is_current) {
        await SemesterService.setCurrentSemester(userId, id);
      }

      res.json(success(semester, '学期更新成功'));
    } catch (error) {
      console.error('更新学期失败:', error);
      res.status(500).json(fail(error.message || '更新学期失败'));
    }
  }

  /**
   * 设置当前学期
   * POST /api/semester/:id/set-current
   */
  static async setCurrent(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      const semester = await SemesterService.setCurrentSemester(userId, id);

      res.json(success(semester, '已设置为当前学期'));
    } catch (error) {
      console.error('设置当前学期失败:', error);
      res.status(500).json(fail(error.message || '设置当前学期失败'));
    }
  }

  /**
   * 删除学期
   * DELETE /api/semester/:id
   */
  static async delete(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      await SemesterService.deleteSemester(id, userId);

      res.json(success(null, '学期删除成功'));
    } catch (error) {
      console.error('删除学期失败:', error);
      res.status(500).json(fail(error.message || '删除学期失败'));
    }
  }
}

module.exports = SemesterController;
