const { pool } = require('../config/database');

class ExamModel {
    static async create(data) {
        const sql = `
            INSERT INTO exams (user_id, course_id, name, exam_date, exam_time, location, priority, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(sql, [
            data.user_id,
            data.course_id || null,
            data.name,
            data.exam_date,
            data.exam_time || '09:00',
            data.location || null,
            data.priority || 'medium',
            data.notes || null
        ]);
        return result.insertId;
    }

    static async findById(id) {
        const sql = `
            SELECT e.*, c.name as course_name, c.color as course_color
            FROM exams e
            LEFT JOIN courses c ON e.course_id = c.id
            WHERE e.id = ?
        `;
        const [rows] = await pool.execute(sql, [id]);
        return rows[0] || null;
    }

    static async findByUserId(userId, orderBy = 'exam_date') {
        const validOrder = ['exam_date', 'created_at', 'priority', 'name'].includes(orderBy) ? orderBy : 'exam_date';
        const sql = `
            SELECT e.*, c.name as course_name, c.color as course_color,
                   lp.id as related_plan_id
            FROM exams e
            LEFT JOIN courses c ON e.course_id = c.id
            LEFT JOIN learning_plan lp ON lp.exam_id = e.id AND lp.user_id = e.user_id
            WHERE e.user_id = ?
            ORDER BY e.${validOrder} ASC
        `;
        const [rows] = await pool.execute(sql, [userId]);
        return rows;
    }

    static async findUpcoming(userId, limit = 3) {
        const sql = `
            SELECT e.*, c.name as course_name, c.color as course_color,
                   lp.id as related_plan_id
            FROM exams e
            LEFT JOIN courses c ON e.course_id = c.id
            LEFT JOIN learning_plan lp ON lp.exam_id = e.id AND lp.user_id = e.user_id
            WHERE e.user_id = ? AND e.exam_date >= CURDATE()
            ORDER BY e.exam_date ASC, e.exam_time ASC
            LIMIT ?
        `;
        const [rows] = await pool.execute(sql, [userId, limit]);
        return rows;
    }

    static async update(id, data) {
        const fields = [];
        const values = [];

        if (data.course_id !== undefined) {
            fields.push('course_id = ?');
            values.push(data.course_id);
        }
        if (data.name !== undefined) {
            fields.push('name = ?');
            values.push(data.name);
        }
        if (data.exam_date !== undefined) {
            fields.push('exam_date = ?');
            values.push(data.exam_date);
        }
        if (data.exam_time !== undefined) {
            fields.push('exam_time = ?');
            values.push(data.exam_time);
        }
        if (data.location !== undefined) {
            fields.push('location = ?');
            values.push(data.location);
        }
        if (data.priority !== undefined) {
            fields.push('priority = ?');
            values.push(data.priority);
        }
        if (data.notes !== undefined) {
            fields.push('notes = ?');
            values.push(data.notes);
        }

        if (fields.length === 0) return false;

        values.push(id);
        const sql = `UPDATE exams SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await pool.execute(sql, values);
        return result.affectedRows > 0;
    }

    static async delete(id) {
        const sql = 'DELETE FROM exams WHERE id = ?';
        const [result] = await pool.execute(sql, [id]);
        return result.affectedRows > 0;
    }

    static async findByCourseId(courseId) {
        const sql = `
            SELECT * FROM exams
            WHERE course_id = ?
            ORDER BY exam_date ASC
        `;
        const [rows] = await pool.execute(sql, [courseId]);
        return rows;
    }
}

module.exports = ExamModel;
