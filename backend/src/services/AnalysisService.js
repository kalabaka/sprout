/**
 * Analysis Service - 学习数据分析服务
 *
 * 功能：
 * 1. 统计学习完成率
 * 2. 统计每日学习时长
 * 3. 输出学习趋势数据（按天）
 * 4. 生成统计报告
 *
 * 输入：学习记录列表
 * 输出：分析结果对象
 */

const moment = require('moment');

class AnalysisService {
  /**
   * 计算学习完成率
   *
   * @param {Array} tasks 任务列表
   * @returns {number} 完成率 (0-1)
   */
  static calculateCompletionRate(tasks) {
    if (!tasks || tasks.length === 0) {
      return 0;
    }

    const completed = tasks.filter(task => task.status === 2 || task.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100) / 100;
  }

  /**
   * 统计总学习时长
   *
   * @param {Array} tasks 任务列表
   * @returns {number} 总时长(分钟)
   */
  static calculateTotalTime(tasks) {
    if (!tasks || tasks.length === 0) {
      return 0;
    }

    return tasks.reduce((total, task) => {
      return total + (task.actual_time || task.estimatedTime || 0);
    }, 0);
  }

  /**
   * 计算平均学习时长
   *
   * @param {Array} tasks 任务列表
   * @returns {number} 平均时长(分钟)
   */
  static calculateAverageTime(tasks) {
    if (!tasks || tasks.length === 0) {
      return 0;
    }

    const total = this.calculateTotalTime(tasks);
    return Math.round(total / tasks.length);
  }

  /**
   * 统计每日学习时长
   *
   * @param {Array} records 学习记录列表
   * @returns {Array} 每日学习时长 [{date, duration}]
   */
  static calculateDailyTime(records) {
    if (!records || records.length === 0) {
      return [];
    }

    const dailyMap = new Map();

    records.forEach(record => {
      const date = moment(record.start_time || record.created_at).format('YYYY-MM-DD');
      const duration = record.duration || 0;

      if (dailyMap.has(date)) {
        dailyMap.set(date, dailyMap.get(date) + duration);
      } else {
        dailyMap.set(date, duration);
      }
    });

    // 转换为数组并按日期排序
    const dailyData = Array.from(dailyMap.entries())
      .map(([date, duration]) => ({ date, duration }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return dailyData;
  }

  /**
   * 生成学习趋势数据
   *
   * @param {Array} records 学习记录列表
   * @param {number} days 返回最近天数(默认7天)
   * @returns {Object} 趋势数据
   */
  static generateTrend(records, days = 7) {
    if (!records || records.length === 0) {
      return {
        labels: [],
        data: [],
        dates: []
      };
    }

    const now = moment();
    const labels = [];
    const data = [];
    const dates = [];

    // 生成最近days天的数据
    for (let i = days - 1; i >= 0; i--) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      const dayLabel = moment().subtract(i, 'days').format('MM-DD');

      // 计算当天的学习时长
      const dayRecords = records.filter(r => {
        const recordDate = moment(r.start_time || r.created_at).format('YYYY-MM-DD');
        return recordDate === date;
      });

      const duration = dayRecords.reduce((sum, r) => sum + (r.duration || 0), 0);

      labels.push(dayLabel);
      data.push(duration);
      dates.push(date);
    }

    return { labels, data, dates };
  }

  /**
   * 统计任务难度分布
   *
   * @param {Array} tasks 任务列表
   * @returns {Object} 难度分布 {easy, medium, hard}
   */
  static calculateDifficultyDistribution(tasks) {
    if (!tasks || tasks.length === 0) {
      return { easy: 0, medium: 0, hard: 0 };
    }

    const distribution = { easy: 0, medium: 0, hard: 0 };

    tasks.forEach(task => {
      const difficulty = task.difficulty || 1;
      if (difficulty <= 2) {
        distribution.easy++;
      } else if (difficulty === 3) {
        distribution.medium++;
      } else {
        distribution.hard++;
      }
    });

    return {
      easy: Math.round(distribution.easy / tasks.length * 100) / 100,
      medium: Math.round(distribution.medium / tasks.length * 100) / 100,
      hard: Math.round(distribution.hard / tasks.length * 100) / 100
    };
  }

  /**
   * 计算学习效率
   *
   * @param {Array} tasks 任务列表
   * @returns {number} 效率得分 (0-100)
   */
  static calculateEfficiency(tasks) {
    if (!tasks || tasks.length === 0) {
      return 0;
    }

    // 基于时间偏差和质量评分计算效率
    let totalScore = 0;
    let validCount = 0;

    tasks.forEach(task => {
      if (task.time_deviation !== null && task.time_deviation !== undefined) {
        // 时间偏差越小效率越高
        const timeScore = Math.max(0, 1 - Math.abs(task.time_deviation));
        totalScore += timeScore;
        validCount++;
      }
    });

    if (validCount === 0) {
      return 50; // 默认中等效率
    }

    return Math.round((totalScore / validCount) * 100);
  }

  // ============================================
  // 扩展功能：效率指标、趋势、风险曲线
  // ============================================

  /**
   * 计算综合学习效率指标
   * 效率 = 完成率 / 总学习时间（小时）
   *
   * @param {Array} tasks 任务列表
   * @param {Array} records 学习记录
   * @returns {Object} 效率指标
   */
  static calculateEfficiencyMetrics(tasks, records) {
    const completionRate = this.calculateCompletionRate(tasks);
    const totalTime = this.calculateTotalTime(tasks);
    const totalHours = totalTime / 60 || 1; // 转换为小时

    // 基础效率：完成率/时间
    const baseEfficiency = totalHours > 0 ? completionRate / totalHours : 0;

    // 时间效率：按时完成率
    const onTimeRate = this.calculateOnTimeRate(tasks);

    // 质量效率：平均得分
    const qualityScore = this.calculateQualityScore(tasks);

    // 综合效率
    const overallEfficiency = Math.min(1, (baseEfficiency * 0.4 + onTimeRate * 0.3 + qualityScore * 0.3));

    return {
      overall: Math.round(overallEfficiency * 100) / 100,
      overallText: `${Math.round(overallEfficiency * 100)}%`,
      completionRate,
      totalHours: Math.round(totalHours * 10) / 10,
      onTimeRate,
      qualityScore,
      rating: this.getEfficiencyRating(overallEfficiency)
    };
  }

  /**
   * 计算按时完成率
   */
  static calculateOnTimeRate(tasks) {
    if (!tasks || tasks.length === 0) return 0;

    const completedTasks = tasks.filter(t => t.status === 2 || t.status === 'completed');
    if (completedTasks.length === 0) return 0;

    const onTimeTasks = completedTasks.filter(t => {
      return t.time_deviation !== null && t.time_deviation !== undefined && t.time_deviation <= 0;
    });

    return Math.round(onTimeTasks.length / completedTasks.length * 100) / 100;
  }

  /**
   * 计算质量得分
   */
  static calculateQualityScore(tasks) {
    if (!tasks || tasks.length === 0) return 0;

    const completedTasks = tasks.filter(t => t.status === 2 || t.status === 'completed');
    if (completedTasks.length === 0) return 0;

    const totalScore = completedTasks.reduce((sum, t) => {
      return sum + (t.quality_score || t.estimatedTime ? 80 : 0);
    }, 0);

    return Math.round(totalScore / completedTasks.length) / 100;
  }

  /**
   * 获取效率评级
   */
  static getEfficiencyRating(efficiency) {
    if (efficiency >= 0.8) return '优秀';
    if (efficiency >= 0.6) return '良好';
    if (efficiency >= 0.4) return '一般';
    return '需改进';
  }

  /**
   * 生成详细的学习趋势（最近N天）
   *
   * @param {Array} records 学习记录
   * @param {number} days 天数
   * @returns {Object} 趋势数据
   */
  static generateDetailedTrend(records, days = 7) {
    const trendData = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      const dayLabel = moment().subtract(i, 'days').format('MM-DD');

      const dayRecords = records.filter(r => {
        const recordDate = moment(r.start_time || r.created_at).format('YYYY-MM-DD');
        return recordDate === date;
      });

      const duration = dayRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
      const taskCount = dayRecords.length;

      trendData.push({
        date,
        label: dayLabel,
        duration,
        durationText: duration > 0 ? `${duration}分钟` : '0',
        taskCount
      });
    }

    // 计算趋势（上升/下降/平稳）
    const trend = this.calculateTrendDirection(trendData.map(t => t.duration));

    return {
      days: trendData,
      labels: trendData.map(t => t.label),
      data: trendData.map(t => t.duration),
      summary: {
        totalDuration: trendData.reduce((sum, t) => sum + t.duration, 0),
        avgDuration: Math.round(trendData.reduce((sum, t) => sum + t.duration, 0) / days),
        trend
      }
    };
  }

  /**
   * 计算趋势方向
   */
  static calculateTrendDirection(data) {
    if (data.length < 2) return 'stable';

    const recent = data.slice(-3);
    const older = data.slice(0, 3);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const diff = (recentAvg - olderAvg) / (olderAvg || 1);

    if (diff > 0.2) return 'up';
    if (diff < -0.2) return 'down';
    return 'stable';
  }

  /**
   * 生成风险变化曲线（最近N天）
   *
   * @param {Array} tasks 任务列表
   * @param {Array} records 学习记录
   * @param {number} days 天数
   * @returns {Object} 风险变化数据
   */
  static generateRiskTrend(tasks, records, days = 7) {
    const riskData = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      const dayLabel = moment().subtract(i, 'days').format('MM-DD');

      // 获取当天的任务完成情况
      const dayRecords = records.filter(r => {
        const recordDate = moment(r.start_time || r.created_at).format('YYYY-MM-DD');
        return recordDate === date;
      });

      // 计算当天的完成率
      const completedCount = dayRecords.filter(r => r.action === 'complete').length;
      const totalCount = dayRecords.length || 1;
      const dayCompletionRate = totalCount > 0 ? completedCount / totalCount : 0;

      // 计算当天的效率
      const dayDuration = dayRecords.reduce((sum, r) => sum + (r.duration || 0), 0);

      // 简单计算风险值（完成率越低风险越高）
      const riskScore = 1 - dayCompletionRate;

      riskData.push({
        date,
        label: dayLabel,
        riskScore: Math.round(riskScore * 100) / 100,
        riskLevel: riskScore < 0.3 ? '低风险' : riskScore < 0.6 ? '中风险' : '高风险',
        completionRate: dayCompletionRate,
        duration: dayDuration
      });
    }

    // 计算平均风险
    const avgRisk = riskData.reduce((sum, d) => sum + d.riskScore, 0) / days;
    const currentRisk = riskData[riskData.length - 1]?.riskScore || 0;

    return {
      days: riskData,
      labels: riskData.map(t => t.label),
      data: riskData.map(t => Math.round(t.riskScore * 100)),
      summary: {
        averageRisk: Math.round(avgRisk * 100) / 100,
        currentRisk: Math.round(currentRisk * 100) / 100,
        trend: avgRisk > currentRisk ? 'improving' : avgRisk < currentRisk ? 'worsening' : 'stable'
      }
    };
  }

  /**
   * 生成学习报告（主函数）
   *
   * @param {Object} params 分析参数
   * @param {Array} params.tasks 任务列表
   * @param {Array} params.records 学习记录列表
   * @returns {Object} 分析报告
   */
  static generateReport(params) {
    const { tasks = [], records = [] } = params;

    console.log('[Analysis Service] 开始分析学习数据...');
    console.log('[Analysis Service] 任务数:', tasks.length, '记录数:', records.length);

    // 1. 计算完成率
    const completionRate = this.calculateCompletionRate(tasks);

    // 2. 计算总时长
    const totalTime = this.calculateTotalTime(tasks);

    // 3. 计算平均时长
    const averageTime = this.calculateAverageTime(tasks);

    // 4. 生成趋势数据(最近7天)
    const trend = this.generateTrend(records, 7);

    // 5. 统计难度分布
    const difficultyDistribution = this.calculateDifficultyDistribution(tasks);

    // 6. 计算效率
    const efficiency = this.calculateEfficiency(tasks);

    // 7. 计算综合效率指标（扩展）
    const efficiencyMetrics = this.calculateEfficiencyMetrics(tasks, records);

    // 8. 生成详细学习趋势（扩展）
    const detailedTrend = this.generateDetailedTrend(records, 7);

    // 9. 生成风险变化曲线（扩展）
    const riskTrend = this.generateRiskTrend(tasks, records, 7);

    // 7. 统计每日详情
    const dailyStats = this.calculateDailyTime(records);

    const report = {
      // 完成率
      completionRate,
      completionRateText: `${Math.round(completionRate * 100)}%`,

      // 时长统计
      totalTime,
      totalTimeText: this.formatTime(totalTime),
      averageTime,
      averageTimeText: this.formatTime(averageTime),

      // 趋势数据(适配前端图表)
      trend: {
        labels: trend.labels,
        data: trend.data,
        dates: trend.dates
      },

      // 难度分布
      difficultyDistribution,

      // 学习效率
      efficiency,
      efficiencyText: `${efficiency}分`,

      // 每日统计
      dailyStats,

      // 统计时间范围
      dateRange: {
        start: trend.dates[0] || null,
        end: trend.dates[trend.dates.length - 1] || null
      },

      // 任务状态统计
      taskStats: {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 2 || t.status === 'completed').length,
        inProgress: tasks.filter(t => t.status === 1 || t.status === 'in_progress').length,
        pending: tasks.filter(t => t.status === 0 || t.status === 'pending').length
      },

      // ==================== 扩展数据（适配前端图表）====================

      // 学习效率指标
      efficiencyMetrics,

      // 详细学习趋势（最近7天）
      detailedTrend: {
        labels: detailedTrend.labels,
        data: detailedTrend.data,
        summary: detailedTrend.summary
      },

      // 风险变化曲线
      riskTrend: {
        labels: riskTrend.labels,
        data: riskTrend.data,
        summary: riskTrend.summary
      }
    };

    console.log('[Analysis Service] 分析完成: 完成率=', report.completionRateText, '总时长=', report.totalTimeText, '效率=', efficiencyMetrics.overallText);

    return report;
  }

  /**
   * 格式化时长
   *
   * @param {number} minutes 分钟数
   * @returns {string} 格式化后的字符串
   */
  static formatTime(minutes) {
    if (minutes < 60) {
      return `${minutes}分钟`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) {
      return `${hours}小时`;
    }

    return `${hours}小时${mins}分钟`;
  }

  /**
   * 获取图表配置数据
   *
   * @param {Object} report 分析报告
   * @returns {Object} 图表配置
   */
  static getChartConfig(report) {
    return {
      // 柱状图 - 每日学习时长
      barChart: {
        labels: report.trend.labels,
        datasets: [{
          label: '学习时长(分钟)',
          data: report.trend.data,
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 1
        }]
      },

      // 饼图 - 任务难度分布
      pieChart: {
        labels: ['简单', '中等', '困难'],
        datasets: [{
          data: [
            report.difficultyDistribution.easy * 100,
            report.difficultyDistribution.medium * 100,
            report.difficultyDistribution.hard * 100
          ],
          backgroundColor: [
            'rgba(39, 174, 96, 0.8)',
            'rgba(241, 196, 15, 0.8)',
            'rgba(231, 76, 60, 0.8)'
          ],
          borderColor: [
            'rgba(39, 174, 96, 1)',
            'rgba(241, 196, 15, 1)',
            'rgba(231, 76, 60, 1)'
          ],
          borderWidth: 1
        }]
      },

      // 环形图 - 任务完成进度
      doughnutChart: {
        labels: ['已完成', '进行中', '待开始'],
        datasets: [{
          data: [
            report.taskStats.completed,
            report.taskStats.inProgress,
            report.taskStats.pending
          ],
          backgroundColor: [
            'rgba(39, 174, 96, 0.8)',
            'rgba(102, 126, 234, 0.8)',
            'rgba(149, 165, 166, 0.8)'
          ],
          borderColor: [
            'rgba(39, 174, 96, 1)',
            'rgba(102, 126, 234, 1)',
            'rgba(149, 165, 166, 1)'
          ],
          borderWidth: 1
        }]
      }
    };
  }
}

module.exports = AnalysisService;
