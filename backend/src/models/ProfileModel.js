/**
 * 用户画像数据模型
 * 对应表: user_profiles, user_mastered_topics
 */
const { pool } = require('../config/database');

class ProfileModel {
  static async getProfile(userId) {
    const sql = 'SELECT * FROM user_profiles WHERE user_id = ?';
    const [rows] = await pool.execute(sql, [userId]);
    if (rows[0]) {
      return this.formatProfile(rows[0]);
    }
    return null;
  }

  static async getOrCreateProfile(userId) {
    let profile = await this.getProfile(userId);
    if (!profile) {
      const sql = `
        INSERT INTO user_profiles (user_id)
        VALUES (?)
      `;
      await pool.execute(sql, [userId]);
      profile = await this.getProfile(userId);
    }
    return profile;
  }

  static async updateProfile(userId, data) {
    const fields = [];
    const values = [];

    const fieldMap = {
      avatarUrl: 'avatar_url',
      nickname: 'nickname',
      bio: 'bio',
      learningPace: 'learning_pace',
      preferredDifficulty: 'preferred_difficulty',
      dailyAvailableMinutes: 'daily_available_minutes',
      availableWeekdays: 'available_weekdays',
      overallLevel: 'overall_level',
      preferVideo: 'prefer_video',
      preferExercise: 'prefer_exercise',
      preferReading: 'prefer_reading'
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        fields.push(`${column} = ?`);
        if (key === 'availableWeekdays') {
          values.push(data[key] ? JSON.stringify(data[key]) : null);
        } else {
          values.push(data[key]);
        }
      }
    }

    if (fields.length === 0) return false;

    values.push(userId);
    const sql = `UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = ?`;
    const [result] = await pool.execute(sql, values);
    return result.affectedRows > 0;
  }

  static async createOrUpdateProfile(userId, data) {
    const {
      learningPace,
      preferredDifficulty,
      dailyAvailableMinutes,
      availableWeekdays,
      overallLevel,
      preferVideo,
      preferExercise,
      preferReading
    } = data;

    const sql = `
      INSERT INTO user_profiles (
        user_id, learning_pace, preferred_difficulty, daily_available_minutes,
        available_weekdays, overall_level, prefer_video, prefer_exercise, prefer_reading
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        learning_pace = VALUES(learning_pace),
        preferred_difficulty = VALUES(preferred_difficulty),
        daily_available_minutes = VALUES(daily_available_minutes),
        available_weekdays = VALUES(available_weekdays),
        overall_level = VALUES(overall_level),
        prefer_video = VALUES(prefer_video),
        prefer_exercise = VALUES(prefer_exercise),
        prefer_reading = VALUES(prefer_reading),
        updated_at = CURRENT_TIMESTAMP
    `;

    await pool.execute(sql, [
      userId,
      learningPace || 'normal',
      preferredDifficulty || 2,
      dailyAvailableMinutes || 60,
      availableWeekdays ? JSON.stringify(availableWeekdays) : null,
      overallLevel || 'beginner',
      preferVideo !== undefined ? preferVideo : true,
      preferExercise !== undefined ? preferExercise : true,
      preferReading !== undefined ? preferReading : false
    ]);

    return this.getProfile(userId);
  }

  static async updateStats(userId, avgDailyMinutes, totalLearnedHours) {
    const sql = `
      INSERT INTO user_profiles (user_id, avg_daily_minutes, total_learned_hours)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        avg_daily_minutes = VALUES(avg_daily_minutes),
        total_learned_hours = VALUES(total_learned_hours),
        updated_at = CURRENT_TIMESTAMP
    `;
    await pool.execute(sql, [userId, avgDailyMinutes || 0, totalLearnedHours || 0]);
  }

  static formatProfile(row) {
    return {
      ...row,
      availableWeekdays: row.available_weekdays ? JSON.parse(row.available_weekdays) : [1, 2, 3, 4, 5, 6, 7]
    };
  }
}

class MasteredTopicModel {
  static async getUserMasteredTopics(userId) {
    const sql = `
      SELECT m.*, k.name as knowledge_point_name, k.subject
      FROM user_mastered_topics m
      JOIN knowledge_points k ON m.knowledge_point_id = k.id
      WHERE m.user_id = ?
      ORDER BY m.mastered_at DESC
    `;
    const [rows] = await pool.execute(sql, [userId]);
    return rows;
  }

  static async getUserMasteredTopicIds(userId, subject = null) {
    let sql = `
      SELECT m.knowledge_point_id
      FROM user_mastered_topics m
      JOIN knowledge_points k ON m.knowledge_point_id = k.id
      WHERE m.user_id = ?
    `;
    const params = [userId];

    if (subject) {
      sql += ' AND k.subject = ?';
      params.push(subject);
    }

    const [rows] = await pool.execute(sql, params);
    return rows.map(r => r.knowledge_point_id);
  }

  static async addMasteredTopic(userId, knowledgePointId, confidenceLevel = 3) {
    const sql = `
      INSERT INTO user_mastered_topics (user_id, knowledge_point_id, confidence_level)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        confidence_level = VALUES(confidence_level),
        mastered_at = CURRENT_TIMESTAMP
    `;
    const [result] = await pool.execute(sql, [userId, knowledgePointId, confidenceLevel]);
    return result.affectedRows > 0;
  }

  static async addMasteredTopics(userId, topics) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const topic of topics) {
        const sql = `
          INSERT INTO user_mastered_topics (user_id, knowledge_point_id, confidence_level)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            confidence_level = VALUES(confidence_level),
            mastered_at = CURRENT_TIMESTAMP
        `;
        await connection.execute(sql, [
          userId,
          topic.knowledgePointId || topic.id,
          topic.confidenceLevel || 3
        ]);
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async removeMasteredTopic(userId, knowledgePointId) {
    const sql = 'DELETE FROM user_mastered_topics WHERE user_id = ? AND knowledge_point_id = ?';
    const [result] = await pool.execute(sql, [userId, knowledgePointId]);
    return result.affectedRows > 0;
  }

  static async clearMasteredTopics(userId, subject = null) {
    let sql = 'DELETE m FROM user_mastered_topics m';
    const params = [userId];

    if (subject) {
      sql += `
        JOIN knowledge_points k ON m.knowledge_point_id = k.id
        WHERE m.user_id = ? AND k.subject = ?
      `;
      params.push(subject);
    } else {
      sql += ' WHERE m.user_id = ?';
    }

    const [result] = await pool.execute(sql, params);
    return result.affectedRows;
  }

  static async getMasteredCount(userId, subject = null) {
    let sql = `
      SELECT COUNT(*) as count
      FROM user_mastered_topics m
      JOIN knowledge_points k ON m.knowledge_point_id = k.id
      WHERE m.user_id = ?
    `;
    const params = [userId];

    if (subject) {
      sql += ' AND k.subject = ?';
      params.push(subject);
    }

    const [rows] = await pool.execute(sql, params);
    return rows[0].count;
  }
}

module.exports = {
  ProfileModel,
  MasteredTopicModel
};
