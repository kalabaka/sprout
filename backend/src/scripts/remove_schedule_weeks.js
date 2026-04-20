require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/database');

async function removeScheduleWeeks() {
  const connection = await pool.getConnection();
  
  try {
    console.log('开始移除 course_schedules 表中的周次字段...');
    
    await connection.beginTransaction();
    
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'course_schedules' 
      AND COLUMN_NAME IN ('start_week', 'end_week')
    `);
    
    if (columns.length > 0) {
      console.log('移除 start_week 和 end_week 字段...');
      
      await connection.execute(`
        ALTER TABLE course_schedules 
        DROP COLUMN start_week,
        DROP COLUMN end_week
      `);
      
      console.log('字段移除成功');
    } else {
      console.log('course_schedules 表已不存在 start_week/end_week 字段，跳过移除');
    }
    
    await connection.commit();
    console.log('迁移完成！');
    
  } catch (error) {
    await connection.rollback();
    console.error('迁移失败:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

removeScheduleWeeks();
