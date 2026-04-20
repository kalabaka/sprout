const { pool } = require('../config/database');

class TimeSlotModel {
  static async findByUserId(userId) {
    const sql = `
      SELECT * FROM time_slots 
      WHERE user_id = ? 
      ORDER BY slot_order ASC
    `;
    const [rows] = await pool.execute(sql, [userId]);
    return rows;
  }

  static async create(userId, slotData) {
    const sql = `
      INSERT INTO time_slots (user_id, slot_order, label, start_time, end_time)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
      userId,
      slotData.slot_order,
      slotData.label,
      slotData.start_time,
      slotData.end_time
    ]);
    return result.insertId;
  }

  static async update(id, userId, slotData) {
    const sql = `
      UPDATE time_slots 
      SET label = ?, start_time = ?, end_time = ?, slot_order = ?
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await pool.execute(sql, [
      slotData.label,
      slotData.start_time,
      slotData.end_time,
      slotData.slot_order,
      id,
      userId
    ]);
    return result.affectedRows > 0;
  }

  static async delete(id, userId) {
    const sql = 'DELETE FROM time_slots WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(sql, [id, userId]);
    return result.affectedRows > 0;
  }

  static async deleteByUserId(userId) {
    const sql = 'DELETE FROM time_slots WHERE user_id = ?';
    const [result] = await pool.execute(sql, [userId]);
    return result.affectedRows;
  }

  static async batchCreate(userId, slots) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      await connection.execute('DELETE FROM time_slots WHERE user_id = ?', [userId]);
      
      for (const slot of slots) {
        await connection.execute(
          'INSERT INTO time_slots (user_id, slot_order, label, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
          [userId, slot.slot_order, slot.label, slot.start_time, slot.end_time]
        );
      }
      
      await connection.commit();
      return slots.length;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static getDefaultSlots() {
    return [
      { slot_order: 1, label: '第1-2节', start_time: '08:00', end_time: '09:40' },
      { slot_order: 2, label: '第3-4节', start_time: '10:00', end_time: '11:40' },
      { slot_order: 3, label: '第5-6节', start_time: '14:00', end_time: '15:40' },
      { slot_order: 4, label: '第7-8节', start_time: '16:00', end_time: '17:40' },
      { slot_order: 5, label: '第9-10节', start_time: '19:00', end_time: '20:40' }
    ];
  }
}

module.exports = TimeSlotModel;
