const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { pool } = require('../config/database');

async function upgradeCourseWeeks() {
  const connection = await pool.getConnection();
  
  try {
    console.log('开始升级课程表结构...');
    
    await connection.beginTransaction();
    
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'courses' 
      AND COLUMN_NAME IN ('start_week', 'end_week')
    `);
    
    if (columns.length === 0) {
      console.log('添加 start_week 和 end_week 字段到 courses 表...');
      
      await connection.execute(`
        ALTER TABLE courses 
        ADD COLUMN start_week INT DEFAULT 1 COMMENT '起始周',
        ADD COLUMN end_week INT DEFAULT 20 COMMENT '结束周'
      `);
      
      console.log('字段添加成功');
    } else {
      console.log('courses 表已存在 start_week/end_week 字段，跳过添加');
    }
    
    const [courses] = await connection.execute(`
      SELECT c.id, MIN(cs.start_week) as start_week, MAX(cs.end_week) as end_week
      FROM courses c
      LEFT JOIN course_schedules cs ON c.id = cs.course_id
      WHERE c.start_week IS NULL OR c.end_week IS NULL
      GROUP BY c.id
    `);
    
    if (courses.length > 0) {
      console.log(`迁移 ${courses.length} 门课程的周次数据...`);
      
      for (const course of courses) {
        const startWeek = course.start_week || 1;
        const endWeek = course.end_week || 20;
        
        await connection.execute(`
          UPDATE courses 
          SET start_week = ?, end_week = ? 
          WHERE id = ?
        `, [startWeek, endWeek, course.id]);
      }
      
      console.log('周次数据迁移完成');
    }
    
    await connection.commit();
    console.log('升级完成！');
    
  } catch (error) {
    await connection.rollback();
    console.error('升级失败:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

upgradeCourseWeeks();
