/**
 * 仪表盘服务层
 * 聚合今日概览相关数据
 */
const SemesterService = require('./SemesterService');
const CourseService = require('./CourseService');
const ScheduleModel = require('../models/ScheduleModel');
const LearningTaskModel = require('../models/LearningTaskModel');
const ExamModel = require('../models/examModel');
const { generateReviewPlan, getDefaultChapters } = require('../agents/reviewPlanAgent');
const { pool } = require('../config/database');

class DashboardService {
  /**
   * 获取今日概览
   * @param {number} userId 用户ID
   */
  static async getTodayOverview(userId) {
    console.log('[DashboardService] getTodayOverview called with userId:', userId);
    
    const currentSemester = await SemesterService.getCurrentSemester(userId);
    console.log('[DashboardService] currentSemester:', currentSemester);
    
    const today = new Date();
    const dayOfWeek = today.getDay() || 7;
    const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    
    console.log('[DashboardService] Getting today courses...');
    const todayCourses = await this.getTodayCourses(userId, dayOfWeek);
    console.log('[DashboardService] todayCourses:', todayCourses);
    
    console.log('[DashboardService] Getting pending tasks...');
    const pendingTasks = await this.getTodayPendingTasks(userId);
    console.log('[DashboardService] pendingTasks:', pendingTasks);
    
    console.log('[DashboardService] Getting week stats...');
    const weekStats = await this.getWeekStats(userId);
    console.log('[DashboardService] weekStats:', weekStats);

    let semesterData = null;
    if (currentSemester) {
      const progress = Math.round((currentSemester.current_week / currentSemester.total_weeks) * 100);
      semesterData = {
        id: currentSemester.id,
        name: currentSemester.name,
        currentWeek: currentSemester.current_week,
        totalWeeks: currentSemester.total_weeks,
        progress
      };
    }

    return {
      currentSemester: semesterData,
      today: {
        date: today.toISOString().split('T')[0],
        dayOfWeek,
        dayName: dayNames[today.getDay()]
      },
      courses: todayCourses,
      pendingTasks,
      weekStats
    };
  }

  /**
   * 获取今日课程
   * @param {number} userId 用户ID
   * @param {number} dayOfWeek 星期几
   */
  static async getTodayCourses(userId, dayOfWeek) {
    const schedules = await ScheduleModel.findByUserIdAndDay(userId, dayOfWeek);
    
    return schedules.map(schedule => ({
      id: schedule.course_id,
      name: schedule.course_name,
      teacher: schedule.teacher,
      classroom: schedule.classroom,
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      color: schedule.color,
      weekType: schedule.week_type,
      startWeek: schedule.start_week,
      endWeek: schedule.end_week
    }));
  }

  /**
   * 获取今日待办任务
   * @param {number} userId 用户ID
   */
  static async getTodayPendingTasks(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const sql = `
      SELECT 
        lt.id,
        lt.name as title,
        lt.course_id,
        lt.deadline,
        lt.status,
        lt.difficulty,
        c.name as course_name,
        c.color as course_color
      FROM learning_tasks lt
      LEFT JOIN courses c ON lt.course_id = c.id
      WHERE lt.user_id = ? 
        AND lt.status IN (0, 1)
        AND DATE(lt.deadline) = ?
      ORDER BY lt.deadline ASC
    `;
    
    const [rows] = await pool.execute(sql, [userId, today]);
    
    return rows.map(row => {
      let priority = 'medium';
      if (row.difficulty >= 4) priority = 'high';
      else if (row.difficulty <= 2) priority = 'low';
      
      return {
        id: row.id,
        title: row.title,
        courseId: row.course_id,
        courseName: row.course_name,
        deadline: row.deadline,
        priority: priority,
        status: row.status === 0 ? 'pending' : 'in_progress'
      };
    });
  }

  /**
   * 获取本周统计
   * @param {number} userId 用户ID
   */
  static async getWeekStats(userId) {
    console.log('[DashboardService] getWeekStats called with userId:', userId);
    
    const today = new Date();
    const dayOfWeek = today.getDay() || 7;
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek + 1);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    
    console.log('[DashboardService] weekStartStr:', weekStartStr, 'weekEndStr:', weekEndStr);

    const sql = `
      SELECT 
        COUNT(*) as totalTasks,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as completedTasks,
        SUM(CASE WHEN status IN (0, 1) AND deadline BETWEEN ? AND ? THEN 1 ELSE 0 END) as upcomingDeadlines
      FROM learning_tasks
      WHERE user_id = ?
        AND (
          DATE(created_at) BETWEEN ? AND ?
          OR DATE(deadline) BETWEEN ? AND ?
        )
    `;

    const params = [
      weekStartStr, weekEndStr,
      userId,
      weekStartStr, weekEndStr,
      weekStartStr, weekEndStr
    ];
    
    console.log('[DashboardService] SQL params:', params);

    const [rows] = await pool.execute(sql, params);

    const stats = rows[0];
    
    return {
      totalTasks: stats.totalTasks || 0,
      completedTasks: stats.completedTasks || 0,
      upcomingDeadlines: stats.upcomingDeadlines || 0
    };
  }

  /**
   * 获取学习进度统计
   * @param {number} userId 用户ID
   */
  static async getLearningProgress(userId) {
    const sql = `
      SELECT 
        COUNT(*) as totalTasks,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as pendingTasks,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as inProgressTasks,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as completedTasks,
        SUM(actual_duration) as totalStudyTime
      FROM learning_tasks
      WHERE user_id = ?
    `;

    const [rows] = await pool.execute(sql, [userId]);
    const stats = rows[0];

    return {
      totalTasks: stats.totalTasks || 0,
      pendingTasks: stats.pendingTasks || 0,
      inProgressTasks: stats.inProgressTasks || 0,
      completedTasks: stats.completedTasks || 0,
      totalStudyTime: stats.totalStudyTime || 0,
      completionRate: stats.totalTasks > 0 
        ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
        : 0
    };
  }

  /**
   * 获取近期课程安排
   * @param {number} userId 用户ID
   * @param {number} days 天数
   */
  static async getUpcomingCourses(userId, days = 7) {
    const today = new Date();
    const dayOfWeek = today.getDay() || 7;
    
    const courses = [];
    const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dow = date.getDay() || 7;
      
      const dayCourses = await ScheduleModel.findByUserIdAndDay(userId, dow);
      
      if (dayCourses.length > 0) {
        courses.push({
          date: date.toISOString().split('T')[0],
          dayOfWeek: dow,
          dayName: dayNames[date.getDay()],
          courses: dayCourses.map(c => ({
            id: c.course_id,
            name: c.course_name,
            teacher: c.teacher,
            classroom: c.classroom,
            startTime: c.start_time,
            endTime: c.end_time,
            color: c.color
          }))
        });
      }
    }

    return courses;
  }

  /**
   * 获取学习趋势数据
   * @param {number} userId 用户ID
   * @param {number} days 天数
   */
  static async getLearningTrend(userId, days = 7) {
    const sql = `
      SELECT 
        DATE(completed_at) as date,
        COUNT(*) as completedTasks,
        SUM(actual_duration) as studyTime
      FROM learning_tasks
      WHERE user_id = ?
        AND status = 2
        AND completed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(completed_at)
      ORDER BY date ASC
    `;

    const [rows] = await pool.execute(sql, [userId, days]);

    return rows.map(row => ({
      date: row.date,
      completedTasks: row.completedTasks,
      studyTime: row.studyTime || 0
    }));
  }

  static async getExamCountdown(userId, limit = 3) {
    const exams = await ExamModel.findUpcoming(userId, limit);

    return exams.map(exam => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const examDate = new Date(exam.exam_date);
      examDate.setHours(0, 0, 0, 0);
      const daysRemaining = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

      return {
        id: exam.id,
        name: exam.name,
        examDate: exam.exam_date,
        examTime: exam.exam_time,
        location: exam.location,
        daysRemaining,
        display: daysRemaining <= 0 ? '已结束' : daysRemaining === 0 ? '今天' : `${daysRemaining}天`,
        priority: exam.priority,
        courseName: exam.course_name,
        courseColor: exam.course_color
      };
    });
  }

  static async getUpcomingDDL(userId, limit = 5) {
    const tasks = await LearningTaskModel.findUpcomingDDL(userId, limit);

    return tasks.map(task => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadline = new Date(task.deadline);
      deadline.setHours(23, 59, 59, 999);
      const diffMs = deadline - today;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let timeRemaining = '';
      if (diffDays <= 0) {
        timeRemaining = '已逾期';
      } else if (diffDays === 1) {
        timeRemaining = '明天';
      } else if (diffDays <= 7) {
        timeRemaining = `${diffDays}天后`;
      } else {
        timeRemaining = `${Math.ceil(diffDays / 7)}周后`;
      }

      return {
        id: task.id,
        title: task.name,
        courseName: task.course_name,
        courseColor: task.course_color,
        deadline: task.deadline,
        timeRemaining,
        priority: task.priority,
        isUrgent: diffDays <= 2
      };
    });
  }

  static async getReviewSuggestion(userId) {
    const exams = await ExamModel.findUpcoming(userId, 1);

    if (exams.length === 0) {
      return null;
    }

    const exam = exams[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(exam.exam_date);
    examDate.setHours(0, 0, 0, 0);
    const daysRemaining = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
      return null;
    }

    const totalChapters = exam.course_name 
      ? getDefaultChapters(exam.course_name) 
      : 10;

    const schedules = await ScheduleModel.getFullSchedule(userId);
    const availableTimeSlots = schedules.map(s => ({
      dayOfWeek: s.day_of_week,
      startTime: s.start_time,
      endTime: s.end_time
    }));

    const planResult = generateReviewPlan(exam, availableTimeSlots, totalChapters);

    if (planResult.error) {
      return null;
    }

    const todayPlan = planResult.plan.find(p => {
      const planDate = new Date(p.date);
      planDate.setHours(0, 0, 0, 0);
      return planDate.getTime() === today.getTime();
    });

    if (!todayPlan) {
      return null;
    }

    return {
      examId: exam.id,
      examName: exam.name,
      examDate: exam.exam_date,
      daysRemaining,
      todayPlan: todayPlan.content,
      suggestedMinutes: todayPlan.suggestedMinutes,
      reason: planResult.reason
    };
  }
}

module.exports = DashboardService;
