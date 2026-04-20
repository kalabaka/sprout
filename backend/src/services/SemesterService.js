/**
 * 学期服务层
 * 处理学期相关的业务逻辑
 */
const SemesterModel = require('../models/SemesterModel');

class SemesterService {
  /**
   * 计算当前是第几教学周
   * @param {string} startDate 开学日期
   * @param {number} totalWeeks 总周数
   * @returns {number} 当前周数
   */
  static calculateCurrentWeek(startDate, totalWeeks) {
    const now = new Date();
    const start = new Date(startDate);
    const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    const week = Math.ceil((diffDays + 1) / 7);

    if (week < 1) return 1;
    if (week > totalWeeks) return totalWeeks;
    return week;
  }

  /**
   * 创建学期
   * @param {object} semesterData 学期数据
   */
  static async createSemester(semesterData) {
    const semesterId = await SemesterModel.create(semesterData);
    return await SemesterModel.findById(semesterId);
  }

  /**
   * 获取用户当前学期信息（含当前周计算）
   * @param {number} userId 用户ID
   */
  static async getCurrentSemester(userId) {
    const semester = await SemesterModel.findCurrentByUserId(userId);
    
    if (!semester) {
      return null;
    }

    const currentWeek = this.calculateCurrentWeek(
      semester.start_date,
      semester.total_weeks
    );

    return {
      ...semester,
      current_week: currentWeek
    };
  }

  /**
   * 获取用户所有学期
   * @param {number} userId 用户ID
   */
  static async getUserSemesters(userId) {
    return await SemesterModel.findByUserId(userId);
  }

  /**
   * 更新学期
   * @param {number} id 学期ID
   * @param {number} userId 用户ID
   * @param {object} semesterData 学期数据
   */
  static async updateSemester(id, userId, semesterData) {
    const semester = await SemesterModel.findById(id);
    
    if (!semester || semester.user_id !== userId) {
      throw new Error('学期不存在或无权限');
    }

    await SemesterModel.update(id, semesterData);
    return await SemesterModel.findById(id);
  }

  /**
   * 设置当前学期
   * @param {number} userId 用户ID
   * @param {number} semesterId 学期ID
   */
  static async setCurrentSemester(userId, semesterId) {
    const semester = await SemesterModel.findById(semesterId);
    
    if (!semester || semester.user_id !== userId) {
      throw new Error('学期不存在或无权限');
    }

    await SemesterModel.setCurrent(userId, semesterId);
    return await this.getCurrentSemester(userId);
  }

  /**
   * 删除学期
   * @param {number} id 学期ID
   * @param {number} userId 用户ID
   */
  static async deleteSemester(id, userId) {
    const semester = await SemesterModel.findById(id);
    
    if (!semester || semester.user_id !== userId) {
      throw new Error('学期不存在或无权限');
    }

    return await SemesterModel.delete(id);
  }
}

module.exports = SemesterService;
