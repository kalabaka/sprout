/**
 * 课程数据模型
 * 表结构: courses(id, user_id, semester_id, name, teacher, classroom, color, credits, start_week, end_week, created_at, updated_at)
 */
const { pool } = require('../config/database');

class CourseModel {
  /**
   * 创建课程
   * @param {object} courseData 课程数据 {user_id, semester_id, name, teacher, classroom, color, credits, start_week, end_week}
   */
  static async create(courseData) {
    const sql = `
      INSERT INTO courses (user_id, semester_id, name, teacher, classroom, color, credits, start_week, end_week, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    const [result] = await pool.execute(sql, [
      courseData.user_id,
      courseData.semester_id,
      courseData.name,
      courseData.teacher || null,
      courseData.classroom || null,
      courseData.color || '#409EFF',
      courseData.credits || 0.0,
      courseData.start_week || 1,
      courseData.end_week || 20
    ]);
    return result.insertId;
  }

  /**
   * 根据ID查找课程
   */
  static async findById(id) {
    const sql = 'SELECT * FROM courses WHERE id = ?';
    const [rows] = await pool.execute(sql, [id]);
    return rows[0];
  }

  /**
   * 查找用户的所有课程
   */
  static async findByUserId(userId) {
    const sql = `
      SELECT c.*, s.name as semester_name 
      FROM courses c
      LEFT JOIN semesters s ON c.semester_id = s.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `;
    const [rows] = await pool.execute(sql, [userId]);
    return rows;
  }

  /**
   * 查找学期的所有课程（包含时间安排）
   */
  static async findBySemesterId(semesterId) {
    const sql = `
      SELECT 
        c.*,
        cs.id as schedule_id,
        cs.day_of_week,
        cs.start_time,
        cs.end_time,
        cs.week_type
      FROM courses c
      LEFT JOIN course_schedules cs ON c.id = cs.course_id
      WHERE c.semester_id = ?
      ORDER BY c.created_at DESC, cs.day_of_week ASC, cs.start_time ASC
    `;
    const [rows] = await pool.execute(sql, [semesterId]);
    
    const coursesMap = new Map();
    rows.forEach(row => {
      if (!coursesMap.has(row.id)) {
        coursesMap.set(row.id, {
          id: row.id,
          user_id: row.user_id,
          semester_id: row.semester_id,
          name: row.name,
          teacher: row.teacher,
          classroom: row.classroom,
          color: row.color,
          credits: row.credits,
          start_week: row.start_week,
          end_week: row.end_week,
          created_at: row.created_at,
          updated_at: row.updated_at,
          schedules: []
        });
      }
      
      if (row.schedule_id) {
        coursesMap.get(row.id).schedules.push({
          id: row.schedule_id,
          day_of_week: row.day_of_week,
          start_time: row.start_time,
          end_time: row.end_time,
          week_type: row.week_type
        });
      }
    });
    
    return Array.from(coursesMap.values());
  }

  /**
   * 更新课程
   */
  static async update(id, courseData) {
    const fields = [];
    const values = [];

    if (courseData.name !== undefined) {
      fields.push('name = ?');
      values.push(courseData.name);
    }
    if (courseData.teacher !== undefined) {
      fields.push('teacher = ?');
      values.push(courseData.teacher);
    }
    if (courseData.classroom !== undefined) {
      fields.push('classroom = ?');
      values.push(courseData.classroom);
    }
    if (courseData.color !== undefined) {
      fields.push('color = ?');
      values.push(courseData.color);
    }
    if (courseData.credits !== undefined) {
      fields.push('credits = ?');
      values.push(courseData.credits);
    }
    if (courseData.start_week !== undefined) {
      fields.push('start_week = ?');
      values.push(courseData.start_week);
    }
    if (courseData.end_week !== undefined) {
      fields.push('end_week = ?');
      values.push(courseData.end_week);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const sql = `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.execute(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * 删除课程
   */
  static async delete(id) {
    const sql = 'DELETE FROM courses WHERE id = ?';
    const [result] = await pool.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * 根据ID数组查询课程
   */
  static async findByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const sql = `SELECT * FROM courses WHERE id IN (${placeholders})`;
    const [rows] = await pool.execute(sql, ids);
    return rows;
  }

  /**
   * 批量删除课程
   */
  static async batchDelete(ids) {
    if (!ids || ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM courses WHERE id IN (${placeholders})`;
    const [result] = await pool.execute(sql, ids);
    return result.affectedRows;
  }

  /**
   * 根据用户和学期删除所有课程（返回删除数量）
   */
  static async deleteByUserAndSemester(userId, semesterId) {
    const sql = `
      DELETE FROM courses 
      WHERE user_id = ? AND semester_id = ?
    `;
    const [result] = await pool.execute(sql, [userId, semesterId]);
    return result.affectedRows;
  }

  /**
   * 批量创建课程
   */
  static async batchCreate(coursesData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const sql = `
        INSERT INTO courses (user_id, semester_id, name, teacher, classroom, color, credits, start_week, end_week, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const insertPromises = coursesData.map(course => 
        connection.execute(sql, [
          course.user_id,
          course.semester_id,
          course.name,
          course.teacher || null,
          course.classroom || null,
          course.color || '#409EFF',
          course.credits || 0.0,
          course.start_week || 1,
          course.end_week || 20
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

module.exports = CourseModel;
