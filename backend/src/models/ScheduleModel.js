/**
 * 课表时间数据模型
 * 表结构: course_schedules(id, course_id, day_of_week, start_time, end_time, week_type, created_at)
 */
const { pool } = require('../config/database');

class ScheduleModel {
  /**
   * 创建课表时间
   * @param {object} scheduleData 课表数据 {course_id, day_of_week, start_time, end_time, week_type}
   */
  static async create(scheduleData) {
    const sql = `
      INSERT INTO course_schedules (course_id, day_of_week, start_time, end_time, week_type, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    const [result] = await pool.execute(sql, [
      scheduleData.course_id,
      scheduleData.day_of_week,
      scheduleData.start_time,
      scheduleData.end_time,
      scheduleData.week_type || 'every'
    ]);
    return result.insertId;
  }

  /**
   * 根据ID查找课表时间
   */
  static async findById(id) {
    const sql = 'SELECT * FROM course_schedules WHERE id = ?';
    const [rows] = await pool.execute(sql, [id]);
    return rows[0];
  }

  /**
   * 查找课程的所有课表时间
   */
  static async findByCourseId(courseId) {
    const sql = `
      SELECT * FROM course_schedules 
      WHERE course_id = ?
      ORDER BY day_of_week, start_time
    `;
    const [rows] = await pool.execute(sql, [courseId]);
    return rows;
  }

  /**
   * 查找用户某天的所有课程安排
   */
  static async findByUserIdAndDay(userId, dayOfWeek) {
    const sql = `
      SELECT cs.*, c.name as course_name, c.teacher, c.classroom, c.color
      FROM course_schedules cs
      INNER JOIN courses c ON cs.course_id = c.id
      INNER JOIN semesters s ON c.semester_id = s.id
      WHERE c.user_id = ? AND cs.day_of_week = ? AND s.is_current = TRUE
      ORDER BY cs.start_time
    `;
    const [rows] = await pool.execute(sql, [userId, dayOfWeek]);
    return rows;
  }

  /**
   * 查找用户某周的所有课程安排
   */
  static async findByUserIdAndWeek(userId, weekNumber) {
    const sql = `
      SELECT cs.*, c.name as course_name, c.teacher, c.classroom, c.color
      FROM course_schedules cs
      INNER JOIN courses c ON cs.course_id = c.id
      INNER JOIN semesters s ON c.semester_id = s.id
      WHERE c.user_id = ? AND s.is_current = TRUE
        AND c.start_week <= ? AND c.end_week >= ?
        AND (
          cs.week_type = 'every' 
          OR (cs.week_type = 'odd' AND ? % 2 = 1)
          OR (cs.week_type = 'even' AND ? % 2 = 0)
        )
      ORDER BY cs.day_of_week, cs.start_time
    `;
    const [rows] = await pool.execute(sql, [userId, weekNumber, weekNumber, weekNumber, weekNumber]);
    return rows;
  }

  /**
   * 获取用户当前学期的完整课表
   */
  static async getFullSchedule(userId) {
    const sql = `
      SELECT cs.*, c.name as course_name, c.teacher, c.classroom, c.color, c.credits
      FROM course_schedules cs
      INNER JOIN courses c ON cs.course_id = c.id
      INNER JOIN semesters s ON c.semester_id = s.id
      WHERE c.user_id = ? AND s.is_current = TRUE
      ORDER BY cs.day_of_week, cs.start_time
    `;
    const [rows] = await pool.execute(sql, [userId]);
    return rows;
  }

  /**
   * 更新课表时间
   */
  static async update(id, scheduleData) {
    const fields = [];
    const values = [];

    if (scheduleData.day_of_week !== undefined) {
      fields.push('day_of_week = ?');
      values.push(scheduleData.day_of_week);
    }
    if (scheduleData.start_time !== undefined) {
      fields.push('start_time = ?');
      values.push(scheduleData.start_time);
    }
    if (scheduleData.end_time !== undefined) {
      fields.push('end_time = ?');
      values.push(scheduleData.end_time);
    }
    if (scheduleData.week_type !== undefined) {
      fields.push('week_type = ?');
      values.push(scheduleData.week_type);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const sql = `UPDATE course_schedules SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.execute(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * 删除课表时间
   */
  static async delete(id) {
    const sql = 'DELETE FROM course_schedules WHERE id = ?';
    const [result] = await pool.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * 删除课程的所有课表时间
   */
  static async deleteByCourseId(courseId) {
    const sql = 'DELETE FROM course_schedules WHERE course_id = ?';
    const [result] = await pool.execute(sql, [courseId]);
    return result.affectedRows > 0;
  }

  /**
   * 批量删除多个课程的所有课表时间
   */
  static async deleteByCourseIds(courseIds) {
    if (!courseIds || courseIds.length === 0) return 0;
    const placeholders = courseIds.map(() => '?').join(',');
    const sql = `DELETE FROM course_schedules WHERE course_id IN (${placeholders})`;
    const [result] = await pool.execute(sql, courseIds);
    return result.affectedRows;
  }

  /**
   * 批量创建课表时间
   */
  static async batchCreate(schedulesData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const sql = `
        INSERT INTO course_schedules (course_id, day_of_week, start_time, end_time, week_type, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;

      const insertPromises = schedulesData.map(schedule =>
        connection.execute(sql, [
          schedule.course_id,
          schedule.day_of_week,
          schedule.start_time,
          schedule.end_time,
          schedule.week_type || 'every'
        ])
      );

      await Promise.all(insertPromises);
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = ScheduleModel;
