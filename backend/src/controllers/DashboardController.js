/**
 * 仪表盘控制器
 * 处理今日概览相关的HTTP请求
 */
const DashboardService = require('../services/DashboardService');

class DashboardController {
  /**
   * 获取今日概览
   * GET /api/dashboard/today
   */
  static async getTodayOverview(req, res) {
    try {
      const userId = req.user.userId;
      const data = await DashboardService.getTodayOverview(userId);

      const [examCountdown, upcomingDDL, reviewSuggestion] = await Promise.all([
        DashboardService.getExamCountdown(userId, 3),
        DashboardService.getUpcomingDDL(userId, 5),
        DashboardService.getReviewSuggestion(userId)
      ]);

      data.examCountdown = examCountdown;
      data.upcomingDDL = upcomingDDL;
      data.reviewSuggestion = reviewSuggestion;

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('获取今日概览失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取今日概览失败'
      });
    }
  }

  /**
   * 获取学习进度
   * GET /api/dashboard/progress
   */
  static async getLearningProgress(req, res) {
    try {
      const userId = req.user.userId;
      const data = await DashboardService.getLearningProgress(userId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('获取学习进度失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取学习进度失败'
      });
    }
  }

  /**
   * 获取近期课程安排
   * GET /api/dashboard/upcoming-courses
   */
  static async getUpcomingCourses(req, res) {
    try {
      const userId = req.user.userId;
      const { days = 7 } = req.query;
      const data = await DashboardService.getUpcomingCourses(userId, parseInt(days));

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('获取近期课程安排失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取近期课程安排失败'
      });
    }
  }

  /**
   * 获取学习趋势
   * GET /api/dashboard/trend
   */
  static async getLearningTrend(req, res) {
    try {
      const userId = req.user.userId;
      const { days = 7 } = req.query;
      const data = await DashboardService.getLearningTrend(userId, parseInt(days));

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('获取学习趋势失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取学习趋势失败'
      });
    }
  }

  /**
   * 获取完整仪表盘数据
   * GET /api/dashboard/full
   */
  static async getFullDashboard(req, res) {
    try {
      const userId = req.user.userId;
      
      const [todayOverview, learningProgress, upcomingCourses, learningTrend] = await Promise.all([
        DashboardService.getTodayOverview(userId),
        DashboardService.getLearningProgress(userId),
        DashboardService.getUpcomingCourses(userId, 7),
        DashboardService.getLearningTrend(userId, 7)
      ]);

      res.json({
        success: true,
        data: {
          todayOverview,
          learningProgress,
          upcomingCourses,
          learningTrend
        }
      });
    } catch (error) {
      console.error('获取完整仪表盘数据失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取完整仪表盘数据失败'
      });
    }
  }
}

module.exports = DashboardController;
