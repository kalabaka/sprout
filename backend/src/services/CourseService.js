/**
 * 课程服务层
 * 处理课程和课表相关的业务逻辑
 */
const CourseModel = require('../models/CourseModel');
const ScheduleModel = require('../models/ScheduleModel');
const SemesterModel = require('../models/SemesterModel');
const SemesterService = require('./SemesterService');

class CourseService {
  /**
   * 创建课程
   * @param {object} courseData 课程数据
   */
  static async createCourse(courseData) {
    const courseId = await CourseModel.create(courseData);
    return await CourseModel.findById(courseId);
  }

  /**
   * 获取用户所有课程
   * @param {number} userId 用户ID
   */
  static async getUserCourses(userId) {
    return await CourseModel.findByUserId(userId);
  }

  /**
   * 更新课程
   * @param {number} id 课程ID
   * @param {number} userId 用户ID
   * @param {object} courseData 课程数据
   */
  static async updateCourse(id, userId, courseData) {
    const course = await CourseModel.findById(id);
    
    if (!course || course.user_id !== userId) {
      throw new Error('课程不存在或无权限');
    }

    await CourseModel.update(id, courseData);
    return await CourseModel.findById(id);
  }

  /**
   * 删除课程
   * @param {number} id 课程ID
   * @param {number} userId 用户ID
   */
  static async deleteCourse(id, userId) {
    const course = await CourseModel.findById(id);
    
    if (!course || course.user_id !== userId) {
      throw new Error('课程不存在或无权限');
    }

    await ScheduleModel.deleteByCourseId(id);
    return await CourseModel.delete(id);
  }

  /**
   * 批量删除课程
   * @param {number[]} ids 课程ID数组
   * @param {number} userId 用户ID
   */
  static async batchDeleteCourses(ids, userId) {
    if (!ids || ids.length === 0) {
      throw new Error('请选择要删除的课程');
    }

    const courses = await CourseModel.findByIds(ids);
    
    const invalidCourses = courses.filter(c => c.user_id !== userId);
    if (invalidCourses.length > 0) {
      throw new Error('部分课程无权限删除');
    }

    const validIds = courses.map(c => c.id);
    if (validIds.length === 0) {
      return { deleted: 0 };
    }

    await ScheduleModel.deleteByCourseIds(validIds);
    const deleted = await CourseModel.batchDelete(validIds);

    return { deleted };
  }

  /**
   * 清空指定学期的所有课程
   * @param {number} userId 用户ID
   * @param {number} semesterId 学期ID
   */
  static async clearSemesterCourses(userId, semesterId) {
    const semester = await SemesterModel.findById(semesterId);
    
    if (!semester || semester.user_id !== userId) {
      throw new Error('学期不存在或无权限');
    }

    const courses = await CourseModel.findBySemesterId(semesterId);
    const courseIds = courses.map(c => c.id);
    
    if (courseIds.length === 0) {
      return { deletedCount: 0 };
    }

    await ScheduleModel.deleteByCourseIds(courseIds);
    const deletedCount = await CourseModel.deleteByUserAndSemester(userId, semesterId);

    return { deletedCount };
  }

  /**
   * 添加课程时间安排
   * @param {number} courseId 课程ID
   * @param {number} userId 用户ID
   * @param {object} scheduleData 时间数据
   */
  static async addSchedule(courseId, userId, scheduleData) {
    const course = await CourseModel.findById(courseId);
    
    if (!course || course.user_id !== userId) {
      throw new Error('课程不存在或无权限');
    }

    const scheduleId = await ScheduleModel.create({
      course_id: courseId,
      ...scheduleData
    });

    return await ScheduleModel.findById(scheduleId);
  }

  /**
   * 获取本周课表
   * @param {number} userId 用户ID
   */
  static async getWeekSchedule(userId) {
    const currentSemester = await SemesterService.getCurrentSemester(userId);
    
    if (!currentSemester) {
      return {
        week: 1,
        schedules: []
      };
    }

    const schedules = await ScheduleModel.findByUserIdAndWeek(
      userId,
      currentSemester.current_week
    );

    return {
      week: currentSemester.current_week,
      semester: currentSemester,
      schedules
    };
  }

  /**
   * 获取某天的课表
   * @param {number} userId 用户ID
   * @param {number} dayOfWeek 星期几 (1-7)
   */
  static async getDaySchedule(userId, dayOfWeek) {
    return await ScheduleModel.findByUserIdAndDay(userId, dayOfWeek);
  }

  /**
   * 获取完整课表
   * @param {number} userId 用户ID
   */
  static async getFullSchedule(userId) {
    return await ScheduleModel.getFullSchedule(userId);
  }

  /**
   * 批量导入课程和课表
   * @param {number} userId 用户ID
   * @param {number} semesterId 学期ID
   * @param {Array} coursesData 课程数据数组
   */
  static async importCourses(userId, semesterId, coursesData) {
    const semester = await SemesterModel.findById(semesterId);
    
    if (!semester || semester.user_id !== userId) {
      throw new Error('学期不存在或无权限');
    }

    const connection = await require('../config/database').pool.getConnection();
    try {
      await connection.beginTransaction();

      const colors = [
        '#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399',
        '#9B59B6', '#1ABC9C', '#3498DB', '#E74C3C', '#F39C12',
        '#2ECC71', '#34495E', '#16A085', '#27AE60', '#2980B9',
        '#8E44AD', '#2C3E50', '#F1C40F', '#E67E22', '#D35400'
      ];
      
      let colorIndex = 0;
      const courseColors = new Map();
      const createdCourses = new Map();

      for (const courseData of coursesData) {
        let courseColor = courseData.color;
        if (!courseColor) {
          const baseName = courseData.name.replace(/\(.*节\)/, '').trim();
          if (courseColors.has(baseName)) {
            courseColor = courseColors.get(baseName);
          } else {
            courseColor = colors[colorIndex % colors.length];
            courseColors.set(baseName, courseColor);
            colorIndex++;
          }
        }

        const courseKey = `${courseData.name}_${courseData.teacher || ''}_${courseData.classroom || ''}`;
        
        let courseId;
        if (createdCourses.has(courseKey)) {
          courseId = createdCourses.get(courseKey).id;
        } else {
          courseId = await CourseModel.create({
            user_id: userId,
            semester_id: semesterId,
            name: courseData.name,
            teacher: courseData.teacher,
            classroom: courseData.classroom,
            color: courseColor,
            credits: courseData.credits || 0.0,
            start_week: courseData.weeks?.start || 1,
            end_week: courseData.weeks?.end || 20
          });
          createdCourses.set(courseKey, { id: courseId, weeks: courseData.weeks });
        }

        if (courseData.schedules && courseData.schedules.length > 0) {
          const schedulePromises = courseData.schedules.map(schedule =>
            ScheduleModel.create({
              course_id: courseId,
              ...schedule
            })
          );
          await Promise.all(schedulePromises);
        } else if (courseData.dayOfWeek) {
          await ScheduleModel.create({
            course_id: courseId,
            day_of_week: courseData.dayOfWeek,
            start_time: courseData.startTime,
            end_time: courseData.endTime,
            week_type: 'every'
          });
        }
      }

      await connection.commit();
      return { success: createdCourses.size, failed: 0 };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 更新课程时间安排
   * @param {number} scheduleId 时间安排ID
   * @param {number} userId 用户ID
   * @param {object} scheduleData 时间数据
   */
  static async updateSchedule(scheduleId, userId, scheduleData) {
    const schedule = await ScheduleModel.findById(scheduleId);
    
    if (!schedule) {
      throw new Error('时间安排不存在');
    }

    const course = await CourseModel.findById(schedule.course_id);
    
    if (!course || course.user_id !== userId) {
      throw new Error('无权限');
    }

    await ScheduleModel.update(scheduleId, scheduleData);
    return await ScheduleModel.findById(scheduleId);
  }

  /**
   * 删除课程时间安排
   * @param {number} scheduleId 时间安排ID
   * @param {number} userId 用户ID
   */
  static async deleteSchedule(scheduleId, userId) {
    const schedule = await ScheduleModel.findById(scheduleId);
    
    if (!schedule) {
      throw new Error('时间安排不存在');
    }

    const course = await CourseModel.findById(schedule.course_id);
    
    if (!course || course.user_id !== userId) {
      throw new Error('无权限');
    }

    return await ScheduleModel.delete(scheduleId);
  }

  /**
   * 获取用户每天的空余时间
   * @param {number} userId 用户ID
   * @param {number} defaultMinutes 默认每日学习时长（无课表时使用）
   * @returns {Array} 每天空余时间 [{ dayOfWeek, availableMinutes, busySlots }]
   */
  static async getUserFreeTime(userId, defaultMinutes = 60) {
    const fullSchedule = await ScheduleModel.getFullSchedule(userId);

    if (!fullSchedule || fullSchedule.length === 0) {
      const result = [];
      for (let day = 1; day <= 7; day++) {
        result.push({
          dayOfWeek: day,
          availableMinutes: defaultMinutes,
          busySlots: [],
          hasSchedule: false
        });
      }
      return result;
    }

    const daySchedules = {};
    for (let day = 1; day <= 7; day++) {
      daySchedules[day] = [];
    }

    fullSchedule.forEach(schedule => {
      const day = schedule.day_of_week;
      if (day >= 1 && day <= 7) {
        daySchedules[day].push({
          startTime: schedule.start_time,
          endTime: schedule.end_time,
          courseName: schedule.course_name
        });
      }
    });

    const result = [];
    for (let day = 1; day <= 7; day++) {
      const schedules = daySchedules[day];
      
      schedules.sort((a, b) => {
        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return timeA.localeCompare(timeB);
      });

      let totalBusyMinutes = 0;
      const busySlots = [];

      schedules.forEach(schedule => {
        if (schedule.startTime && schedule.endTime) {
          const startParts = schedule.startTime.split(':').map(Number);
          const endParts = schedule.endTime.split(':').map(Number);
          
          const startMinutes = startParts[0] * 60 + startParts[1];
          const endMinutes = endParts[0] * 60 + endParts[1];
          
          const duration = endMinutes - startMinutes;
          if (duration > 0) {
            totalBusyMinutes += duration;
            busySlots.push({
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              duration,
              courseName: schedule.course_name
            });
          }
        }
      });

      const totalDayMinutes = 16 * 60;
      const availableMinutes = Math.max(0, totalDayMinutes - totalBusyMinutes);
      const studyMinutes = Math.min(availableMinutes, Math.max(defaultMinutes, 60));

      result.push({
        dayOfWeek: day,
        availableMinutes: studyMinutes,
        busySlots,
        totalBusyMinutes,
        hasSchedule: true
      });
    }

    return result;
  }

  /**
   * 获取指定学期的课程（带时间安排）
   * @param {number} userId 用户ID
   * @param {number} semesterId 学期ID
   */
  static async getCoursesBySemester(userId, semesterId) {
    const courses = await CourseModel.findBySemesterId(semesterId);
    const userCourses = courses.filter(c => c.user_id === userId);
    
    const result = [];
    for (const course of userCourses) {
      const schedules = await ScheduleModel.findByCourseId(course.id);
      if (schedules && schedules.length > 0) {
        for (const schedule of schedules) {
          result.push({
            id: course.id,
            name: course.name,
            teacher: course.teacher,
            classroom: course.classroom,
            color: course.color,
            dayOfWeek: schedule.day_of_week,
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            weeks: course.start_week && course.end_week 
              ? { start: course.start_week, end: course.end_week }
              : null,
            weekType: schedule.week_type
          });
        }
      } else {
        result.push({
          id: course.id,
          name: course.name,
          teacher: course.teacher,
          classroom: course.classroom,
          color: course.color,
          dayOfWeek: null,
          startTime: null,
          endTime: null,
          weeks: course.start_week && course.end_week 
            ? { start: course.start_week, end: course.end_week }
            : null,
          weekType: null
        });
      }
    }
    
    return result;
  }

  /**
   * 获取学期信息
   * @param {number} semesterId 学期ID
   */
  static async getSemesterById(semesterId) {
    return await SemesterModel.findById(semesterId);
  }

  /**
   * 获取用户指定日期的空余时间
   * @param {number} userId 用户ID
   * @param {Date} date 日期
   * @param {number} defaultMinutes 默认学习时长
   * @returns {Object} 空余时间信息
   */
  static async getFreeTimeForDate(userId, date, defaultMinutes = 60) {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
    const freeTimeData = await this.getUserFreeTime(userId, defaultMinutes);
    return freeTimeData.find(d => d.dayOfWeek === dayOfWeek) || {
      dayOfWeek,
      availableMinutes: defaultMinutes,
      busySlots: [],
      hasSchedule: false
    };
  }
}

module.exports = CourseService;
