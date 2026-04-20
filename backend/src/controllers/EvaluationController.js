/**
 * 风险评估控制器
 * 提供用户学习风险自查相关API
 */
const evaluationAgent = require('../agents/evaluationAgent');
const LearningTaskModel = require('../models/LearningTaskModel');
const LearningRecordModel = require('../models/LearningRecordModel');
const LearningPlanModel = require('../models/LearningPlanModel');
const { success, fail } = require('../utils/response');
const logger = require('../config/logger');

class EvaluationController {
  static async getCurrentRisk(req, res) {
    try {
      const userId = req.user.userId;

      const stats = await LearningTaskModel.getStats(userId);
      const recentRecords = await LearningRecordModel.findRecent(userId, 7);

      const total = stats.total || 0;
      const completed = stats.completed || 0;
      const completionRate = total > 0 ? completed / total : 1;
      
      const avgScore = stats.avgScore || 75;
      
      let totalPlannedDuration = 0;
      let totalActualDuration = 0;
      
      const recentTasks = await LearningTaskModel.findByUserId(userId, { limit: 10 });
      for (const task of recentTasks) {
        if (task.status === 2) {
          totalPlannedDuration += task.planned_duration || 60;
          totalActualDuration += task.actual_duration || task.planned_duration || 60;
        }
      }
      
      const timeDeviation = totalPlannedDuration > 0 
        ? (totalActualDuration - totalPlannedDuration) / totalPlannedDuration 
        : 0;

      const evaluation = evaluationAgent.evaluateRisk({
        timeDeviation,
        completionRate,
        score: avgScore
      });

      const suggestions = evaluationAgent.getSuggestions(evaluation.level);

      const result = {
        riskScore: evaluation.score,
        riskLevel: evaluation.level,
        riskReason: evaluation.reason,
        strategyKey: evaluation.strategyKey,
        explanation: evaluation.explanation,
        suggestions: suggestions,
        metrics: {
          completionRate: Math.round(completionRate * 100),
          avgScore: Math.round(avgScore),
          timeDeviation: Math.round(timeDeviation * 100),
          totalTasks: total,
          completedTasks: completed
        },
        evaluatedAt: new Date().toISOString()
      };

      logger.info(`风险评估: 用户${userId}, 风险等级${evaluation.level}, 得分${evaluation.score}`);
      res.json(success(result));
    } catch (error) {
      logger.error('获取当前风险失败:', error.message);
      res.status(500).json(fail('获取风险评估失败'));
    }
  }

  static async getRiskTrend(req, res) {
    try {
      const userId = req.user.userId;
      const { period = 'week' } = req.query;
      
      const days = period === 'month' ? 30 : 7;
      const dailyStats = await LearningRecordModel.getDailyStats(userId, days);

      const trendData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayStat = dailyStats.find(s => s.date.toISOString().split('T')[0] === dateStr);
        
        if (dayStat) {
          const completionRate = dayStat.taskCount > 0 ? 1 : 0;
          const avgScore = dayStat.avgScore || 75;
          
          const evaluation = evaluationAgent.evaluateRisk({
            timeDeviation: 0,
            completionRate,
            score: avgScore
          });
          
          trendData.push({
            date: dateStr,
            riskScore: evaluation.score,
            riskLevel: evaluation.level,
            taskCount: dayStat.taskCount,
            totalDuration: dayStat.totalDuration,
            avgScore: Math.round(avgScore)
          });
        } else {
          trendData.push({
            date: dateStr,
            riskScore: 0.3,
            riskLevel: '低风险',
            taskCount: 0,
            totalDuration: 0,
            avgScore: null
          });
        }
      }

      const summary = {
        avgRiskScore: trendData.reduce((sum, d) => sum + d.riskScore, 0) / trendData.length,
        highRiskDays: trendData.filter(d => d.riskLevel === '高风险').length,
        mediumRiskDays: trendData.filter(d => d.riskLevel === '中风险').length,
        lowRiskDays: trendData.filter(d => d.riskLevel === '低风险').length,
        totalTasks: trendData.reduce((sum, d) => sum + d.taskCount, 0),
        totalDuration: trendData.reduce((sum, d) => sum + d.totalDuration, 0)
      };

      res.json(success({
        period,
        trend: trendData,
        summary
      }));
    } catch (error) {
      logger.error('获取风险趋势失败:', error.message);
      res.status(500).json(fail('获取趋势数据失败'));
    }
  }

  static async getPlanRisk(req, res) {
    try {
      const userId = req.user.userId;
      const planId = parseInt(req.params.planId);

      if (!planId) {
        return res.status(400).json(fail('无效的计划ID'));
      }

      const plan = await LearningPlanModel.findById(planId, userId);
      if (!plan) {
        return res.status(404).json(fail('计划不存在'));
      }

      const completionStats = await LearningTaskModel.getCompletionStats(planId, userId);
      const total = completionStats.total || 0;
      const completed = completionStats.completed || 0;
      const completionRate = total > 0 ? completed / total : 1;

      const tasks = await LearningTaskModel.findByPlanId(planId, userId);
      let totalPlannedDuration = 0;
      let totalActualDuration = 0;
      let totalScore = 0;
      let scoredCount = 0;

      for (const task of tasks) {
        if (task.status === 2) {
          totalPlannedDuration += task.planned_duration || 60;
          totalActualDuration += task.actual_duration || task.planned_duration || 60;
          if (task.self_score) {
            totalScore += task.self_score;
            scoredCount++;
          }
        }
      }

      const timeDeviation = totalPlannedDuration > 0 
        ? (totalActualDuration - totalPlannedDuration) / totalPlannedDuration 
        : 0;
      
      const avgScore = scoredCount > 0 ? totalScore / scoredCount : 75;

      const evaluation = evaluationAgent.evaluateRisk({
        timeDeviation,
        completionRate,
        score: avgScore
      });

      const suggestions = evaluationAgent.getSuggestions(evaluation.level);

      const isDelayed = completionRate < 0.5 && plan.target_date && new Date() > new Date(plan.target_date);

      const result = {
        planId,
        planName: plan.name,
        riskScore: evaluation.score,
        riskLevel: evaluation.level,
        riskReason: evaluation.reason,
        isDelayed,
        delayWarning: isDelayed ? '进度滞后，建议调整学习计划' : null,
        metrics: {
          completionRate: Math.round(completionRate * 100),
          avgScore: Math.round(avgScore),
          timeDeviation: Math.round(timeDeviation * 100),
          totalTasks: total,
          completedTasks: completed,
          remainingTasks: total - completed
        },
        suggestions: suggestions,
        evaluatedAt: new Date().toISOString()
      };

      res.json(success(result));
    } catch (error) {
      logger.error('获取计划风险失败:', error.message);
      res.status(500).json(fail('获取计划风险失败'));
    }
  }

  static async getDetailedMetrics(req, res) {
    try {
      const userId = req.user.userId;

      const stats = await LearningTaskModel.getStats(userId);
      const recentRecords = await LearningRecordModel.findRecent(userId, 7);
      const dailyStats = await LearningRecordModel.getDailyStats(userId, 7);

      const total = stats.total || 0;
      const completed = stats.completed || 0;
      const completionRate = total > 0 ? completed / total : 1;
      const avgScore = stats.avgScore || 75;

      const recentTasks = await LearningTaskModel.findByUserId(userId, { limit: 10 });
      let totalPlannedDuration = 0;
      let totalActualDuration = 0;
      
      for (const task of recentTasks) {
        if (task.status === 2) {
          totalPlannedDuration += task.planned_duration || 60;
          totalActualDuration += task.actual_duration || task.planned_duration || 60;
        }
      }
      
      const timeDeviation = totalPlannedDuration > 0 
        ? (totalActualDuration - totalPlannedDuration) / totalPlannedDuration 
        : 0;

      const evaluation = evaluationAgent.evaluateRisk({
        timeDeviation,
        completionRate,
        score: avgScore
      });

      const metricsTable = [
        {
          name: '综合风险',
          current: Math.round(evaluation.score * 100) + '%',
          normalRange: '0-30%',
          status: evaluation.level === '低风险' ? '正常' : evaluation.level === '中风险' ? '需关注' : '需干预',
          statusType: evaluation.level === '低风险' ? 'success' : evaluation.level === '中风险' ? 'warning' : 'danger'
        },
        {
          name: '完成率',
          current: Math.round(completionRate * 100) + '%',
          normalRange: '≥80%',
          status: completionRate >= 0.8 ? '正常' : completionRate >= 0.6 ? '需关注' : '需干预',
          statusType: completionRate >= 0.8 ? 'success' : completionRate >= 0.6 ? 'warning' : 'danger'
        },
        {
          name: '时间偏差',
          current: (timeDeviation >= 0 ? '+' : '') + Math.round(timeDeviation * 100) + '%',
          normalRange: '±20%',
          status: Math.abs(timeDeviation) <= 0.2 ? '正常' : Math.abs(timeDeviation) <= 0.5 ? '需关注' : '需干预',
          statusType: Math.abs(timeDeviation) <= 0.2 ? 'success' : Math.abs(timeDeviation) <= 0.5 ? 'warning' : 'danger'
        },
        {
          name: '正确率',
          current: Math.round(avgScore) + '%',
          normalRange: '≥70%',
          status: avgScore >= 70 ? '正常' : avgScore >= 50 ? '需关注' : '需干预',
          statusType: avgScore >= 70 ? 'success' : avgScore >= 50 ? 'warning' : 'danger'
        }
      ];

      const improvementSuggestions = [];
      
      if (evaluation.score >= 0.6) {
        improvementSuggestions.push({
          priority: 1,
          category: '综合',
          suggestion: '建议重新评估学习目标，制定详细改进计划',
          reason: '当前风险较高，需要系统性调整'
        });
      }
      
      if (completionRate < 0.6) {
        improvementSuggestions.push({
          priority: 2,
          category: '完成率',
          suggestion: '建议拆分任务，从简单任务开始逐步完成',
          reason: '完成率较低，可能任务难度过大或时间不足'
        });
      }
      
      if (Math.abs(timeDeviation) > 0.3) {
        improvementSuggestions.push({
          priority: 3,
          category: '时间管理',
          suggestion: '建议使用番茄工作法，合理规划学习时间',
          reason: timeDeviation > 0 ? '学习时间超出预期' : '学习时间不足'
        });
      }
      
      if (avgScore < 70) {
        improvementSuggestions.push({
          priority: 4,
          category: '学习质量',
          suggestion: '建议加强基础知识学习，多做练习巩固',
          reason: '正确率偏低，需要巩固知识点'
        });
      }

      if (improvementSuggestions.length === 0) {
        improvementSuggestions.push({
          priority: 1,
          category: '综合',
          suggestion: '继续保持当前学习状态，定期复盘巩固',
          reason: '各项指标正常'
        });
      }

      res.json(success({
        summary: {
          riskScore: evaluation.score,
          riskLevel: evaluation.level,
          riskReason: evaluation.reason
        },
        metricsTable,
        improvementSuggestions,
        dailyStats: dailyStats.map(s => ({
          date: s.date.toISOString().split('T')[0],
          taskCount: s.taskCount,
          totalDuration: s.totalDuration,
          avgScore: Math.round(s.avgScore || 0)
        }))
      }));
    } catch (error) {
      logger.error('获取详细指标失败:', error.message);
      res.status(500).json(fail('获取详细指标失败'));
    }
  }
}

module.exports = EvaluationController;
