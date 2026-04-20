/**
 * 知识点数据模型
 * 对应表: knowledge_points
 */
const { pool } = require('../config/database');

class KnowledgeModel {
  static async create(data) {
    const {
      name,
      subject,
      description,
      difficulty = 1,
      estimatedMinutes = 30,
      prerequisiteIds = null,
      phase = 'foundation',
      tags = null,
      resourceUrl = null
    } = data;

    const sql = `
      INSERT INTO knowledge_points (
        name, subject, description, difficulty, estimated_minutes,
        prerequisite_ids, phase, tags, resource_url, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const [result] = await pool.execute(sql, [
      name,
      subject,
      description || null,
      difficulty,
      estimatedMinutes,
      prerequisiteIds ? JSON.stringify(prerequisiteIds) : null,
      phase,
      tags ? JSON.stringify(tags) : null,
      resourceUrl
    ]);

    return result.insertId;
  }

  static async findById(id) {
    const sql = 'SELECT * FROM knowledge_points WHERE id = ?';
    const [rows] = await pool.execute(sql, [id]);
    return rows[0] ? this.formatRow(rows[0]) : null;
  }

  static async findBySubject(subject) {
    const sql = `
      SELECT * FROM knowledge_points 
      WHERE subject = ?
      ORDER BY phase, difficulty, id
    `;
    const [rows] = await pool.execute(sql, [subject]);
    return rows.map(row => this.formatRow(row));
  }

  static async findByPhase(subject, phase) {
    const sql = `
      SELECT * FROM knowledge_points 
      WHERE subject = ? AND phase = ?
      ORDER BY difficulty, id
    `;
    const [rows] = await pool.execute(sql, [subject, phase]);
    return rows.map(row => this.formatRow(row));
  }

  static async findAll() {
    const sql = 'SELECT * FROM knowledge_points ORDER BY subject, phase, difficulty';
    const [rows] = await pool.execute(sql);
    return rows.map(row => this.formatRow(row));
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    const fieldMap = {
      name: 'name',
      subject: 'subject',
      description: 'description',
      difficulty: 'difficulty',
      estimatedMinutes: 'estimated_minutes',
      prerequisiteIds: 'prerequisite_ids',
      phase: 'phase',
      tags: 'tags',
      resourceUrl: 'resource_url'
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        fields.push(`${column} = ?`);
        if (key === 'prerequisiteIds' || key === 'tags') {
          values.push(data[key] ? JSON.stringify(data[key]) : null);
        } else {
          values.push(data[key]);
        }
      }
    }

    if (fields.length === 0) return false;

    values.push(id);
    const sql = `UPDATE knowledge_points SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.execute(sql, values);
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const sql = 'DELETE FROM knowledge_points WHERE id = ?';
    const [result] = await pool.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  static formatRow(row) {
    let tags = [];
    let prerequisiteIds = [];
    
    try {
      if (row.tags) {
        if (typeof row.tags === 'string') {
          tags = JSON.parse(row.tags);
        } else if (Array.isArray(row.tags)) {
          tags = row.tags;
        }
      }
    } catch (e) {
      tags = [];
    }
    
    try {
      if (row.prerequisite_ids) {
        if (typeof row.prerequisite_ids === 'string') {
          prerequisiteIds = JSON.parse(row.prerequisite_ids);
        } else if (Array.isArray(row.prerequisite_ids)) {
          prerequisiteIds = row.prerequisite_ids;
        }
      }
    } catch (e) {
      prerequisiteIds = [];
    }
    
    return {
      ...row,
      prerequisiteIds,
      tags
    };
  }

  static async getSubjects() {
    const sql = 'SELECT DISTINCT subject FROM knowledge_points ORDER BY subject';
    const [rows] = await pool.execute(sql);
    return rows.map(row => row.subject);
  }

  static async getKnowledgePath(subject, userLevel = 'beginner') {
    const allPoints = await this.findBySubject(subject);

    if (allPoints.length === 0) {
      return {
        subject,
        phases: [],
        totalPoints: 0,
        totalMinutes: 0
      };
    }

    const levelDifficultyMap = {
      beginner: [1, 2],
      intermediate: [1, 2, 3],
      advanced: [2, 3]
    };

    const allowedDifficulties = levelDifficultyMap[userLevel] || [1, 2, 3];

    const phaseOrder = ['foundation', 'advanced', 'application'];

    const phases = {};
    phaseOrder.forEach(phase => {
      phases[phase] = [];
    });

    const pointMap = new Map();
    allPoints.forEach(point => {
      pointMap.set(point.id, point);
    });

    allPoints.forEach(point => {
      if (allowedDifficulties.includes(point.difficulty)) {
        phases[point.phase].push(point);
      }
    });

    const sortedPhases = {};
    phaseOrder.forEach(phase => {
      if (phases[phase].length > 0) {
        sortedPhases[phase] = this.topologicalSort(phases[phase], pointMap);
      }
    });

    const totalMinutes = allPoints.reduce((sum, p) => sum + (p.estimated_minutes || 0), 0);

    return {
      subject,
      phases: sortedPhases,
      totalPoints: allPoints.length,
      totalMinutes,
      userLevel
    };
  }

  static topologicalSort(points, pointMap) {
    const result = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (point) => {
      if (visited.has(point.id)) return;
      if (visiting.has(point.id)) return;

      visiting.add(point.id);

      if (point.prerequisiteIds && point.prerequisiteIds.length > 0) {
        for (const prereqId of point.prerequisiteIds) {
          const prereq = pointMap.get(prereqId);
          if (prereq && points.includes(prereq)) {
            visit(prereq);
          }
        }
      }

      visiting.delete(point.id);
      visited.add(point.id);
      result.push(point);
    };

    points.forEach(point => visit(point));

    return result;
  }

  static async getPrerequisites(pointId) {
    const point = await this.findById(pointId);
    if (!point || !point.prerequisiteIds || point.prerequisiteIds.length === 0) {
      return [];
    }

    const prerequisites = [];
    for (const prereqId of point.prerequisiteIds) {
      const prereq = await this.findById(prereqId);
      if (prereq) {
        prerequisites.push(prereq);
      }
    }

    return prerequisites;
  }

  static async getDependents(pointId) {
    const sql = `
      SELECT * FROM knowledge_points 
      WHERE JSON_CONTAINS(prerequisite_ids, ?)
    `;
    const [rows] = await pool.execute(sql, [JSON.stringify(pointId)]);
    return rows.map(row => this.formatRow(row));
  }

  static async getProgress(subject, completedIds) {
    const allPoints = await this.findBySubject(subject);
    const total = allPoints.length;
    const completed = completedIds.filter(id => allPoints.some(p => p.id === id)).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      subject,
      total,
      completed,
      percentage,
      remaining: total - completed
    };
  }

  static async getNextRecommended(subject, completedIds) {
    const allPoints = await this.findBySubject(subject);
    const completedSet = new Set(completedIds);

    for (const point of allPoints) {
      if (completedSet.has(point.id)) continue;

      if (!point.prerequisiteIds || point.prerequisiteIds.length === 0) {
        return point;
      }

      const allPrereqsCompleted = point.prerequisiteIds.every(
        prereqId => completedSet.has(prereqId)
      );

      if (allPrereqsCompleted) {
        return point;
      }
    }

    return null;
  }

  static async findAvailable(userId) {
    const completedSql = `
      SELECT knowledge_point_id FROM learning_tasks
      WHERE user_id = ? AND status = 2 AND knowledge_point_id IS NOT NULL
    `;
    const [completed] = await pool.execute(completedSql, [userId]);
    const completedIds = completed.map(t => t.knowledge_point_id);

    const placeholders = completedIds.map(() => '?').join(',');
    const finalSql = `
      SELECT * FROM knowledge_points
      WHERE id NOT IN (SELECT knowledge_point_id FROM learning_tasks WHERE user_id = ? AND status = 2)
      AND (
        prerequisite_ids = '[]'
        OR prerequisite_ids = ''
        OR prerequisite_ids IS NULL
        ${completedIds.length > 0 ? `OR JSON_OVERLAPS(prerequisite_ids, JSON_ARRAY(${placeholders}))` : ''}
      )
      ORDER BY difficulty
    `;

    const params = [userId, ...completedIds];
    const [rows] = await pool.execute(finalSql, params);
    return rows.map(row => this.formatRow(row));
  }

  static async getKnowledgeMap() {
    const sql = 'SELECT * FROM knowledge_points ORDER BY difficulty, id';
    const [rows] = await pool.execute(sql);

    const map = { 1: [], 2: [], 3: [] };
    rows.forEach(kp => {
      map[kp.difficulty].push(this.formatRow(kp));
    });
    return map;
  }
}

module.exports = KnowledgeModel;
