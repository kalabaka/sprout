const LLMService = require('./LLMService');
const NotificationTrigger = require('./NotificationTrigger');
const logger = require('../config/logger');

class EvaluationAgent {
  static async assessPlan(plan, phases, userId = null) {
    try {
      const totalTasks = phases.reduce((sum, phase) => sum + (phase.tasks?.length || 0), 0);
      const completedTasks = phases.reduce((sum, phase) => {
        return sum + (phase.tasks?.filter(t => t.status === 2).length || 0);
      }, 0);

      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      const today = new Date();
      const endDate = plan.end_date ? new Date(plan.end_date) : null;
      const startDate = plan.start_date ? new Date(plan.start_date) : new Date(plan.created_at);

      let riskLevel = 'normal';
      let riskReason = '进度正常';

      if (endDate) {
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const passedDays = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
        const remainingDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

        const expectedProgress = totalDays > 0 ? Math.min((passedDays / totalDays) * 100, 100) : 0;
        const progressDiff = progress - expectedProgress;

        if (remainingDays < 0 && progress < 100) {
          riskLevel = 'critical';
          riskReason = `已逾期 ${Math.abs(remainingDays)} 天，仅完成 ${progress.toFixed(1)}%`;
        } else if (progressDiff < -20) {
          riskLevel = 'warning';
          riskReason = `进度滞后 ${Math.abs(progressDiff).toFixed(1)}%，需加快进度`;
        } else if (progressDiff < -10) {
          riskLevel = 'caution';
          riskReason = `进度略有滞后，建议关注`;
        } else if (progressDiff > 10) {
          riskLevel = 'ahead';
          riskReason = `进度超前 ${progressDiff.toFixed(1)}%，表现优秀`;
        }
      }

      const inProgressTasks = phases.reduce((sum, phase) => {
        return sum + (phase.tasks?.filter(t => t.status === 1).length || 0);
      }, 0);

      const avgTaskDuration = totalTasks > 0 
        ? phases.reduce((sum, phase) => {
            return sum + (phase.tasks?.reduce((s, t) => s + (t.planned_duration || 60), 0) || 0);
          }, 0) / totalTasks
        : 60;

      if (userId && (riskLevel === 'critical' || riskLevel === 'warning')) {
        NotificationTrigger.triggerPlanWarning(
          userId,
          plan.id,
          plan.name,
          riskLevel === 'critical' ? '高风险' : '中风险',
          riskReason
        ).catch(err => {
          logger.error('触发计划预警通知失败:', err.message);
        });
      }

      return {
        riskLevel,
        riskReason,
        metrics: {
          progress: Math.round(progress * 10) / 10,
          totalTasks,
          completedTasks,
          inProgressTasks,
          avgTaskDuration: Math.round(avgTaskDuration),
          expectedProgress: endDate ? Math.round(this.calculateExpectedProgress(startDate, endDate, today) * 10) / 10 : null
        },
        recommendations: this.generateRecommendations(riskLevel, progress, totalTasks - completedTasks)
      };
    } catch (error) {
      logger.error('评估计划风险失败:', error.message);
      return {
        riskLevel: 'unknown',
        riskReason: '无法评估',
        metrics: {},
        recommendations: []
      };
    }
  }

  static calculateExpectedProgress(startDate, endDate, today) {
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const passedDays = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
    
    if (totalDays <= 0) return 100;
    if (passedDays <= 0) return 0;
    if (passedDays >= totalDays) return 100;
    
    return (passedDays / totalDays) * 100;
  }

  static generateRecommendations(riskLevel, progress, remainingTasks) {
    const recommendations = [];

    if (riskLevel === 'critical') {
      recommendations.push('建议重新评估目标完成日期');
      recommendations.push('考虑减少非核心任务');
      recommendations.push('增加每日学习时长');
    } else if (riskLevel === 'warning') {
      recommendations.push('建议增加每日学习时间');
      recommendations.push('优先完成重要任务');
    } else if (riskLevel === 'caution') {
      recommendations.push('保持当前学习节奏');
      recommendations.push('注意不要拖延');
    } else if (riskLevel === 'normal') {
      recommendations.push('继续保持良好状态');
    } else if (riskLevel === 'ahead') {
      recommendations.push('可以适当放松节奏');
      recommendations.push('考虑提前完成更多任务');
    }

    if (remainingTasks > 10) {
      recommendations.push('任务量较大，建议分批完成');
    }

    return recommendations;
  }

  static async getDetailedAnalysis(plan, phases) {
    try {
      const prompt = `你是一个学习进度分析专家。请分析以下学习计划的进度情况：

计划名称：${plan.name}
学习目标：${plan.goal || '未指定'}
开始日期：${plan.start_date || plan.created_at}
目标日期：${plan.end_date || plan.target_date}
总任务数：${phases.reduce((sum, p) => sum + (p.tasks?.length || 0), 0)}
已完成：${phases.reduce((sum, p) => sum + (p.tasks?.filter(t => t.status === 2).length || 0), 0)}

请简要分析（100字以内）当前进度状况，并给出具体建议。`;

      const response = await LLMService.callLLM([
        { role: 'system', content: '你是一个学习进度分析专家，擅长给出简洁实用的建议。' },
        { role: 'user', content: prompt }
      ]);

      return {
        analysis: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('获取详细分析失败:', error.message);
      return {
        analysis: '暂无法获取详细分析',
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = EvaluationAgent;
