/**
 * 课程控制器
 * 处理课程和课表相关的HTTP请求
 */
const CourseService = require('../services/CourseService');
const { parseCourseExcel, validateExcelFile, exportCourseExcel, exportCourseExcelTable } = require('../services/CourseImportService');
const { success, fail } = require('../utils/response');

class CourseController {
  /**
   * 添加课程
   * POST /api/courses
   */
  static async create(req, res) {
    try {
      const userId = req.user.userId;
      const { semester_id, name, teacher, classroom, color, credits, start_week, end_week } = req.body;

      if (!semester_id || !name) {
        return res.status(400).json(fail('缺少必要参数'));
      }

      const course = await CourseService.createCourse({
        user_id: userId,
        semester_id,
        name,
        teacher,
        classroom,
        color,
        credits,
        start_week,
        end_week
      });

      res.json(success(course, '课程创建成功'));
    } catch (error) {
      console.error('创建课程失败:', error);
      res.status(500).json(fail(error.message || '创建课程失败'));
    }
  }

  /**
   * 获取用户所有课程
   * GET /api/courses
   */
  static async getAll(req, res) {
    try {
      const userId = req.user.userId;
      const { semester_id } = req.query;

      let courses;
      if (semester_id) {
        const CourseModel = require('../models/CourseModel');
        courses = await CourseModel.findBySemesterId(semester_id);
      } else {
        courses = await CourseService.getUserCourses(userId);
      }

      res.json(success(courses));
    } catch (error) {
      console.error('获取课程列表失败:', error);
      res.status(500).json(fail(error.message || '获取课程列表失败'));
    }
  }

  /**
   * 更新课程
   * PUT /api/courses/:id
   */
  static async update(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { name, teacher, classroom, color, credits, start_week, end_week } = req.body;

      const course = await CourseService.updateCourse(id, userId, {
        name,
        teacher,
        classroom,
        color,
        credits,
        start_week,
        end_week
      });

      res.json(success(course, '课程更新成功'));
    } catch (error) {
      console.error('更新课程失败:', error);
      res.status(500).json(fail(error.message || '更新课程失败'));
    }
  }

  /**
   * 删除课程
   * DELETE /api/courses/:id
   */
  static async delete(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      await CourseService.deleteCourse(id, userId);

      res.json(success(null, '课程删除成功'));
    } catch (error) {
      console.error('删除课程失败:', error);
      res.status(500).json(fail(error.message || '删除课程失败'));
    }
  }

  /**
   * 批量删除课程
   * DELETE /api/courses/batch
   */
  static async batchDelete(req, res) {
    try {
      const userId = req.user.userId;
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json(fail('请选择要删除的课程'));
      }

      const result = await CourseService.batchDeleteCourses(ids, userId);

      res.json(success(result, `成功删除${result.deleted}门课程`));
    } catch (error) {
      console.error('批量删除课程失败:', error);
      res.status(500).json(fail(error.message || '批量删除课程失败'));
    }
  }

  /**
   * 清空指定学期的所有课程
   * DELETE /api/courses/clear
   */
  static async clearCourses(req, res) {
    try {
      const userId = req.user.userId;
      const { semesterId } = req.body;

      if (!semesterId) {
        return res.status(400).json(fail('缺少学期ID'));
      }

      const result = await CourseService.clearSemesterCourses(userId, semesterId);

      res.json(success({ 
        deletedCount: result.deletedCount 
      }, `已清空 ${result.deletedCount} 门课程`));
    } catch (error) {
      console.error('清空课表失败:', error);
      res.status(500).json(fail(error.message || '清空课表失败'));
    }
  }

  /**
   * 添加课程时间安排
   * POST /api/courses/:courseId/schedules
   */
  static async addSchedule(req, res) {
    try {
      const userId = req.user.userId;
      const { courseId } = req.params;
      const { day_of_week, start_time, end_time, week_type } = req.body;

      if (!day_of_week || !start_time || !end_time) {
        return res.status(400).json(fail('缺少必要参数'));
      }

      const schedule = await CourseService.addSchedule(courseId, userId, {
        day_of_week,
        start_time,
        end_time,
        week_type
      });

      res.json(success(schedule, '时间安排添加成功'));
    } catch (error) {
      console.error('添加时间安排失败:', error);
      res.status(500).json(fail(error.message || '添加时间安排失败'));
    }
  }

  /**
   * 获取本周课表
   * GET /api/courses/schedules/week
   */
  static async getWeekSchedule(req, res) {
    try {
      const userId = req.user.userId;
      const schedule = await CourseService.getWeekSchedule(userId);

      res.json(success(schedule));
    } catch (error) {
      console.error('获取本周课表失败:', error);
      res.status(500).json(fail(error.message || '获取本周课表失败'));
    }
  }

  /**
   * 获取某天的课表
   * GET /api/courses/schedules/day
   */
  static async getDaySchedule(req, res) {
    try {
      const userId = req.user.userId;
      const { day_of_week } = req.query;

      if (!day_of_week) {
        return res.status(400).json(fail('缺少day_of_week参数'));
      }

      const schedules = await CourseService.getDaySchedule(userId, parseInt(day_of_week));

      res.json(success(schedules));
    } catch (error) {
      console.error('获取某天课表失败:', error);
      res.status(500).json(fail(error.message || '获取某天课表失败'));
    }
  }

  /**
   * 获取完整课表
   * GET /api/courses/schedules/full
   */
  static async getFullSchedule(req, res) {
    try {
      const userId = req.user.userId;
      const schedules = await CourseService.getFullSchedule(userId);

      res.json(success(schedules));
    } catch (error) {
      console.error('获取完整课表失败:', error);
      res.status(500).json(fail(error.message || '获取完整课表失败'));
    }
  }

  /**
   * 更新课程时间安排
   * PUT /api/courses/schedules/:scheduleId
   */
  static async updateSchedule(req, res) {
    try {
      const userId = req.user.userId;
      const { scheduleId } = req.params;
      const { day_of_week, start_time, end_time, week_type } = req.body;

      const schedule = await CourseService.updateSchedule(scheduleId, userId, {
        day_of_week,
        start_time,
        end_time,
        week_type
      });

      res.json(success(schedule, '时间安排更新成功'));
    } catch (error) {
      console.error('更新时间安排失败:', error);
      res.status(500).json(fail(error.message || '更新时间安排失败'));
    }
  }

  /**
   * 删除课程时间安排
   * DELETE /api/courses/schedules/:scheduleId
   */
  static async deleteSchedule(req, res) {
    try {
      const userId = req.user.userId;
      const { scheduleId } = req.params;

      await CourseService.deleteSchedule(scheduleId, userId);

      res.json(success(null, '时间安排删除成功'));
    } catch (error) {
      console.error('删除时间安排失败:', error);
      res.status(500).json(fail(error.message || '删除时间安排失败'));
    }
  }

  /**
   * 上传Excel课表文件
   * POST /api/courses/upload-excel
   */
  static async uploadExcel(req, res) {
    try {
      const userId = req.user.userId;
      const { semester_id } = req.body;

      if (!req.file) {
        return res.status(400).json(fail('请上传Excel文件'));
      }

      if (!semester_id) {
        return res.status(400).json(fail('缺少学期ID'));
      }

      const validation = validateExcelFile(req.file.buffer);
      if (!validation.valid) {
        return res.status(400).json(fail(validation.message));
      }

      const parseResult = parseCourseExcel(req.file.buffer);
      const courses = parseResult.courses;
      
      if (courses.length === 0) {
        return res.status(400).json(fail(parseResult.error || '未能从Excel中解析出课程信息，请检查文件格式'));
      }

      const result = await CourseService.importCourses(userId, parseInt(semester_id), courses);

      res.json(success(result, `成功导入${result.success}门课程${result.failed > 0 ? `，失败${result.failed}门` : ''}`));
    } catch (error) {
      console.error('上传Excel课表失败:', error);
      res.status(500).json(fail(error.message || '上传Excel课表失败'));
    }
  }

  /**
   * 预览Excel课表
   * POST /api/courses/preview-excel
   */
  static async previewExcel(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json(fail('请上传Excel文件'));
      }

      const validation = validateExcelFile(req.file.buffer);
      if (!validation.valid) {
        return res.status(400).json(fail(validation.message));
      }

      const parseResult = parseCourseExcel(req.file.buffer);
      const courses = parseResult.courses;

      res.json(success({
        total: courses.length,
        courses: courses.slice(0, 20),
        allCourses: courses,
        error: parseResult.error
      }, courses.length > 0 ? `共解析出${courses.length}门课程` : (parseResult.error || '未能解析出课程')));
    } catch (error) {
      console.error('预览Excel课表失败:', error);
      res.status(500).json(fail(error.message || '预览Excel课表失败'));
    }
  }

  /**
   * 导出课表Excel
   * GET /api/courses/export
   */
  static async exportExcel(req, res) {
    try {
      const userId = req.user.userId;
      const { semester_id, format = 'standard' } = req.query;

      if (!semester_id) {
        return res.status(400).json(fail('缺少学期ID'));
      }

      const courses = await CourseService.getCoursesBySemester(userId, parseInt(semester_id));
      const semester = await CourseService.getSemesterById(parseInt(semester_id));
      const semesterName = semester ? semester.name : '课表';

      let excelBuffer;
      if (format === 'table') {
        excelBuffer = exportCourseExcelTable(courses, semesterName);
      } else {
        excelBuffer = exportCourseExcel(courses, semesterName);
      }

      const filename = encodeURIComponent(`${semesterName}-课表.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);
      
      res.send(excelBuffer);
    } catch (error) {
      console.error('导出课表失败:', error);
      res.status(500).json(fail(error.message || '导出课表失败'));
    }
  }
}

module.exports = CourseController;
