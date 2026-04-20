/**
 * 学习规划智能体
 * 基于用户画像和知识图谱，动态生成个性化学习计划
 * 支持加权分配法 + 艾宾浩斯遗忘曲线
 * 支持大模型动态生成（LLM 兜底）
 */
const KnowledgeModel = require('../models/KnowledgeModel');
const CourseService = require('./CourseService');
const { ProfileModel, MasteredTopicModel } = require('../models/ProfileModel');
const llmService = require('./LLMService');
const logger = require('../config/logger');
const { filterTasksForReview, applyReviewFilterToTasks } = require('../utils/taskReviewFilter');
const { sortTasksWithDependencies, identifyFoundationTasks, assignSequenceOrder } = require('../utils/taskPriority');

class PlanningAgent {
  /**
   * 难度系数映射
   */
  static getDifficultyCoefficient(difficulty) {
    const coefficients = {
      1: 1.0,
      2: 1.5,
      3: 2.0
    };
    return coefficients[difficulty] || 1.0;
  }

  /**
   * 重要性系数映射（1-5分映射到0.6-1.4）
   */
  static getImportanceCoefficient(importance) {
    if (!importance || importance < 1) return 1.0;
    const normalizedImportance = Math.min(5, Math.max(1, importance));
    return 0.6 + (normalizedImportance - 1) * 0.2;
  }

  /**
   * 掌握度系数映射
   * 已掌握(≥4分) → 0.3
   * 部分掌握(2-3分) → 0.7
   * 未掌握(≤1分) → 1.3
   */
  static getMasteryCoefficient(confidenceLevel) {
    if (confidenceLevel === undefined || confidenceLevel === null) return 1.3;
    if (confidenceLevel >= 4) return 0.3;
    if (confidenceLevel >= 2) return 0.7;
    return 1.3;
  }

  /**
   * 计算加权分配时间
   * 公式：基础时长 × 难度系数 × 重要性系数 × 掌握度系数
   */
  static calculateWeightedDuration(point, masteredInfo) {
    const baseMinutes = point.estimated_minutes || 30;
    const difficultyCoef = this.getDifficultyCoefficient(point.difficulty);
    const importanceCoef = this.getImportanceCoefficient(point.importance || 3);
    
    const mastered = masteredInfo?.get(point.id);
    const masteryCoef = mastered ? this.getMasteryCoefficient(mastered.confidenceLevel) : 1.3;
    
    const weightedMinutes = Math.round(baseMinutes * difficultyCoef * importanceCoef * masteryCoef);
    
    return {
      weightedMinutes,
      calculation: {
        baseMinutes,
        difficultyCoef,
        importanceCoef,
        masteryCoef,
        formula: `${baseMinutes} × ${difficultyCoef} × ${importanceCoef.toFixed(1)} × ${masteryCoef.toFixed(1)} = ${weightedMinutes}分钟`
      }
    };
  }

  /**
   * 遗忘曲线复习节点配置
   */
  static getReviewIntervals() {
    return [
      { day: 0, ratio: 1.0, label: '首次学习', type: 'learn' },
      { day: 2, ratio: 0.3, label: '第2天回顾', type: 'review' },
      { day: 7, ratio: 0.2, label: '第7天回顾', type: 'review' },
      { day: 30, ratio: 0.1, label: '第30天回顾', type: 'review' }
    ];
  }

  /**
   * 生成学习计划
   */
  static async generatePlan(params) {
    const {
      userId = null,
      target,
      goalType,
      subject,
      userLevel = 'beginner',
      masteredTopicIds = [],
      learningPace = 'normal',
      dailyStudyMinutes = 60,
      availableWeekdays = [1, 2, 3, 4, 5, 6, 7],
      deadline = null,
      targetScore = null,
      focusTopicIds = [],
      preferExercise = true,
      enableForgettingCurve = true,
      useAI = false
    } = params;

    const isComplexTarget = (targetStr) => {
      if (!targetStr) return false;
      const complexPatterns = [
        /学习$/,
        /掌握$/,
        /精通$/,
        /深入$/,
        /系统$/,
        /^英语[语]?/,
        /^编程/,
        /^python/,
        /^java/,
        /^算法/,
        /^数据结构/,
      ];
      return complexPatterns.some(pattern => pattern.test(targetStr));
    };

    const shouldUseLLM = (knowledgePoints, useAILocal, targetLocal) => {
      return knowledgePoints.length === 0 || 
             useAILocal === true || 
             isComplexTarget(targetLocal);
    };

    logger.info(`开始生成学习计划: subject=${subject}, level=${userLevel}, pace=${learningPace}`);

    const explanation = {
      phaseDistribution: '',
      bufferDays: '',
      filteredTopics: '',
      timeSource: '',
      adaptiveGranularity: '',
      weightedAllocation: '',
      forgettingCurve: '',
      comparisonWithAverage: ''
    };

    const timeAllocationDetails = [];
    const reviewScheduleDetails = [];
    const adjustments = [];

    const allKnowledgePoints = await this.fetchKnowledgePoints(subject);
    
    if (shouldUseLLM(allKnowledgePoints, useAI, target)) {
      logger.info(`目标「${target}」使用 LLM 生成`);
      const llmResult = await this.generatePlanWithLLM(params);
      if (llmResult && !llmResult.isFallback) {
        return llmResult;
      }
      logger.info('LLM 生成失败，降级到规则生成或兜底计划');
      
      if (allKnowledgePoints.length > 0) {
        logger.info('使用知识图谱规则生成');
      } else {
        return llmResult;
      }
    }

    let filteredPoints = this.filterByUserLevel(allKnowledgePoints, userLevel, adjustments);

    const masteredResult = await this.filterMasteredTopicsWithLevel(
      filteredPoints, 
      userId, 
      subject, 
      masteredTopicIds, 
      adjustments
    );
    filteredPoints = masteredResult.points;
    explanation.filteredTopics = masteredResult.explanation;

    filteredPoints = this.sortByPrerequisites(filteredPoints);

    const userProfile = userId ? await ProfileModel.getProfile(userId) : null;
    const userLearningPace = userProfile?.learning_pace || learningPace;

    const taskDurationMap = {
      slow: { min: 20, max: 30 },
      normal: { min: 40, max: 60 },
      fast: { min: 60, max: 90 }
    };
    const durationConfig = taskDurationMap[userLearningPace] || taskDurationMap.normal;
    explanation.adaptiveGranularity = `根据您的${userLearningPace === 'slow' ? '慢速' : userLearningPace === 'fast' ? '快速' : '正常'}学习节奏，每个任务约${durationConfig.min}-${durationConfig.max}分钟`;

    let tasks = this.createTasksWithWeightedAllocation(
      filteredPoints, 
      userLearningPace, 
      adjustments, 
      durationConfig,
      masteredResult.masteredInfo,
      timeAllocationDetails
    );

    if (enableForgettingCurve) {
      tasks = applyReviewFilterToTasks(tasks);
      
      const { tasksForReview, operationalTasks, filteredCount } = filterTasksForReview(tasks);
      
      if (filteredCount > 0) {
        logger.info(`已自动过滤 ${filteredCount} 个无需复习的操作性任务`);
        adjustments.push(`已过滤 ${filteredCount} 个操作性任务，不生成复习节点`);
      }
      
      const reviewTasks = this.generateForgettingCurveReviews(
        tasksForReview, 
        reviewScheduleDetails
      );
      tasks = [...tasks, ...reviewTasks];
      explanation.forgettingCurve = `已根据艾宾浩斯遗忘曲线生成${reviewTasks.length}个复习节点（第2天、第7天、第30天）`;
    }

    if (focusTopicIds.length > 0) {
      tasks = this.prioritizeFocusTopics(tasks, focusTopicIds, adjustments);
    }

    tasks = this.addTaskDiversity(tasks, adjustments);

    if (preferExercise) {
      tasks = this.addExerciseTasks(tasks, adjustments);
    }

    tasks = this.ensureUniqueTaskNames(tasks);

    tasks = this.assignTaskPriority(tasks, masteredResult.masteredInfo);

    let freeTimeSlots = null;
    let timeSourceExplanation = '';
    if (userId) {
      try {
        freeTimeSlots = await CourseService.getUserFreeTime(userId, dailyStudyMinutes);
        const hasScheduleData = freeTimeSlots.filter(d => d.hasSchedule).length > 0;
        if (hasScheduleData) {
          const timeDetails = freeTimeSlots.slice(0, 7).map(d => {
            const dayName = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][d.dayOfWeek - 1];
            return `${dayName}可用${Math.round(d.availableMinutes / 60)}小时`;
          }).join('，');
          timeSourceExplanation = `已根据课表空余时间安排任务，${timeDetails}`;
          logger.info(`获取课表空余时间成功: ${freeTimeSlots.filter(d => d.hasSchedule).length}天有课表数据`);
        } else {
          timeSourceExplanation = `未检测到课表数据，使用默认每日${dailyStudyMinutes}分钟学习时长`;
        }
        adjustments.push('已根据课表安排优化学习时间');
      } catch (error) {
        logger.warn(`获取课表空余时间失败: ${error.message}，使用默认设置`);
        timeSourceExplanation = `获取课表数据失败，使用默认每日${dailyStudyMinutes}分钟学习时长`;
      }
    } else {
      timeSourceExplanation = `使用默认每日${dailyStudyMinutes}分钟学习时长`;
    }
    explanation.timeSource = timeSourceExplanation;

    const scheduleResult = await this.scheduleTasksWithPriority(
      tasks,
      dailyStudyMinutes,
      availableWeekdays,
      deadline,
      freeTimeSlots
    );

    const daysRemaining = scheduleResult.totalDaysUsed;
    const phaseDistribution = this.getPhaseDistribution(daysRemaining);
    explanation.phaseDistribution = this.getPhaseDistributionExplanation(daysRemaining, phaseDistribution);

    const bufferInfo = this.getBufferDaysInfo(scheduleResult, deadline);
    explanation.bufferDays = bufferInfo.explanation;

    const avgComparison = this.generateComparisonExplanation(
      allKnowledgePoints,
      tasks,
      timeAllocationDetails
    );
    explanation.weightedAllocation = avgComparison.weightedAllocation;
    explanation.comparisonWithAverage = avgComparison.comparison;

    const phases = this.groupByPhase(scheduleResult.tasks);

    const stats = this.calculateStats(scheduleResult.tasks, scheduleResult.startDate, scheduleResult.endDate);

    const summaryExplanation = this.generateExplanation(
      userLevel,
      userLearningPace,
      masteredResult.skippedCount,
      stats,
      adjustments
    );

    logger.info(`计划生成完成: ${stats.totalTasks}个任务, 预计${stats.estimatedDays}天`);

    return {
      plan: {
        phases,
        stats
      },
      explanation: {
        ...explanation,
        summary: summaryExplanation
      },
      adjustments,
      timeAllocationDetails: timeAllocationDetails.slice(0, 10),
      reviewScheduleDetails
    };
  }

  /**
   * 使用加权分配法创建任务
   */
  static createTasksWithWeightedAllocation(points, learningPace, adjustments, durationConfig, masteredInfo, timeAllocationDetails) {
    const tasks = [];
    const defaultDurationConfig = {
      slow: { min: 20, max: 30 },
      normal: { min: 40, max: 60 },
      fast: { min: 60, max: 90 }
    };
    const config = durationConfig || defaultDurationConfig[learningPace] || defaultDurationConfig.normal;

    let i = 0;
    while (i < points.length) {
      const point = points[i];
      
      if (point.isQuickReview) {
        tasks.push({
          id: `task_${Date.now()}_${tasks.length}`,
          name: point.name,
          estimatedMinutes: 15,
          difficulty: point.difficulty,
          phase: point.phase,
          knowledgePointId: point.id,
          description: point.description || '',
          isSplit: false,
          isQuickReview: true,
          isWeakPoint: false,
          confidenceLevel: point.confidenceLevel,
          taskType: '快速回顾',
          originalPointId: point.id,
          prerequisite_ids: point.prerequisiteIds || []
        });
        i++;
        continue;
      }

      const { weightedMinutes, calculation } = this.calculateWeightedDuration(point, masteredInfo);
      
      timeAllocationDetails.push({
        pointName: point.name,
        difficulty: point.difficulty,
        importance: point.importance || 3,
        confidenceLevel: masteredInfo?.get(point.id)?.confidenceLevel || null,
        calculation
      });

      let taskMinutes = weightedMinutes;

      if (learningPace === 'fast' && i < points.length - 1) {
        const nextPoint = points[i + 1];
        if (this.canMerge(point, nextPoint)) {
          const { weightedMinutes: nextMinutes } = this.calculateWeightedDuration(nextPoint, masteredInfo);
          taskMinutes += nextMinutes;
          adjustments.push(`根据快速节奏，将「${point.name}」与「${nextPoint.name}」合并`);
          i++;
        }
      }

      if (learningPace === 'slow' && taskMinutes > config.max * 1.5) {
        const subTasks = this.splitTask(point, config.max);
        subTasks.forEach((subTask, idx) => {
          tasks.push({
            id: `task_${Date.now()}_${tasks.length}`,
            name: idx === 0 ? point.name : `${point.name}（第${idx + 1}部分）`,
            estimatedMinutes: subTask.minutes,
            difficulty: point.difficulty,
            phase: point.phase,
            knowledgePointId: point.id,
            description: point.description || '',
            isSplit: true,
            isQuickReview: false,
            isWeakPoint: point.isWeakPoint || false,
            confidenceLevel: point.confidenceLevel,
            taskType: '学习',
            originalPointId: point.id,
            prerequisite_ids: point.prerequisiteIds || []
          });
        });
        adjustments.push(`根据慢速节奏，将「${point.name}」拆分为${subTasks.length}个任务`);
      } else {
        tasks.push({
          id: `task_${Date.now()}_${tasks.length}`,
          name: point.name,
          estimatedMinutes: Math.min(taskMinutes, config.max * 2),
          difficulty: point.difficulty,
          phase: point.phase,
          knowledgePointId: point.id,
          description: point.description || '',
          isSplit: false,
          isQuickReview: false,
          isWeakPoint: point.isWeakPoint || false,
          confidenceLevel: point.confidenceLevel,
          importance: point.importance || 3,
          taskType: '学习',
          originalPointId: point.id,
          prerequisite_ids: point.prerequisiteIds || []
        });
      }

      i++;
    }

    return tasks;
  }

  /**
   * 生成遗忘曲线复习节点
   */
  static generateForgettingCurveReviews(learnTasks, reviewScheduleDetails) {
    const reviewTasks = [];
    const reviewIntervals = this.getReviewIntervals();
    const processedPoints = new Set();

    for (const task of learnTasks) {
      if (task.isQuickReview || !task.originalPointId) continue;
      if (processedPoints.has(task.originalPointId)) continue;
      
      processedPoints.add(task.originalPointId);

      for (const interval of reviewIntervals) {
        if (interval.day === 0) continue;

        const reviewMinutes = Math.round(task.estimatedMinutes * interval.ratio);
        
        reviewTasks.push({
          id: `task_review_${Date.now()}_${reviewTasks.length}_${interval.day}`,
          name: `${task.name} - ${interval.label}`,
          estimatedMinutes: Math.max(10, reviewMinutes),
          difficulty: task.difficulty,
          phase: task.phase,
          knowledgePointId: task.knowledgePointId,
          description: `遗忘曲线复习：${interval.label}`,
          isReview: true,
          reviewDay: interval.day,
          reviewRatio: interval.ratio,
          taskType: '复习',
          originalPointId: task.originalPointId,
          baseTaskId: task.id
        });

        reviewScheduleDetails.push({
          pointName: task.name,
          reviewDay: interval.day,
          reviewMinutes: Math.max(10, reviewMinutes),
          ratio: interval.ratio,
          label: interval.label
        });
      }
    }

    return reviewTasks;
  }

  /**
   * 带优先级的任务排期
   */
  static async scheduleTasksWithPriority(tasks, dailyMinutes, availableWeekdays, deadline, freeTimeSlots = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedTasks = this.sortTasksByPriority(tasks);

    const scheduledTasks = [];
    let currentDate = new Date(today);
    let totalDaysUsed = 1;

    const availableDays = this.normalizeWeekdays(availableWeekdays);

    const freeTimeMap = new Map();
    if (freeTimeSlots) {
      freeTimeSlots.forEach(slot => {
        freeTimeMap.set(slot.dayOfWeek, slot.availableMinutes);
      });
    }

    const bufferDays = new Set();
    if (deadline) {
      const deadlineDate = new Date(deadline);
      let tempDate = new Date(today);
      
      while (tempDate < deadlineDate) {
        if (tempDate.getDay() === 0) {
          bufferDays.add(this.formatDate(tempDate));
        }
        tempDate.setDate(tempDate.getDate() + 1);
      }
    }

    const preExamReviewDays = new Set();
    if (deadline) {
      const deadlineDate = new Date(deadline);
      for (let i = 1; i <= 3; i++) {
        const reviewDate = new Date(deadlineDate);
        reviewDate.setDate(reviewDate.getDate() - i);
        preExamReviewDays.add(this.formatDate(reviewDate));
      }
    }

    const taskCompletionDates = new Map();

    currentDate = this.findNextAvailableDay(currentDate, availableDays, bufferDays);

    for (const task of sortedTasks) {
      if (task.isReview && task.baseTaskId) {
        const baseCompletionDate = taskCompletionDates.get(task.baseTaskId);
        if (baseCompletionDate) {
          const reviewDate = new Date(baseCompletionDate);
          reviewDate.setDate(reviewDate.getDate() + task.reviewDay);
          
          const dateStr = this.formatDate(reviewDate);
          task.scheduledDate = dateStr;
          task.actualStudyMinutes = task.estimatedMinutes;
          scheduledTasks.push(task);
          continue;
        }
      }

      if (!task.scheduledDate) {
        const dateStr = this.formatDate(currentDate);
        task.scheduledDate = dateStr;
      }

      let taskMinutes = task.estimatedMinutes;

      while (taskMinutes > 0) {
        const dateStr = this.formatDate(currentDate);
        
        if (bufferDays.has(dateStr)) {
          currentDate = this.findNextAvailableDay(
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000),
            availableDays,
            bufferDays
          );
          totalDaysUsed++;
          continue;
        }

        if (preExamReviewDays.has(dateStr) && !task.isQuickReview) {
          task.scheduledDate = dateStr;
          task.actualStudyMinutes = taskMinutes;
          task.isPreExamReview = true;
          task.note = '考前复盘阶段';
          scheduledTasks.push(task);
          taskMinutes = 0;
          taskCompletionDates.set(task.id, currentDate);
          continue;
        }

        const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
        
        let dayMinutesRemaining;
        if (freeTimeMap.has(dayOfWeek)) {
          dayMinutesRemaining = freeTimeMap.get(dayOfWeek);
        } else {
          dayMinutesRemaining = dailyMinutes;
        }

        if (dayMinutesRemaining <= 0) {
          currentDate = this.findNextAvailableDay(
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000),
            availableDays,
            bufferDays
          );
          totalDaysUsed++;
          continue;
        }

        const allocatedMinutes = Math.min(taskMinutes, dayMinutesRemaining);
        taskMinutes -= allocatedMinutes;
        
        const newRemaining = dayMinutesRemaining - allocatedMinutes;
        if (freeTimeMap.has(dayOfWeek)) {
          freeTimeMap.set(dayOfWeek, newRemaining);
        }

        if (!task.scheduledDate) {
          task.scheduledDate = dateStr;
        }
        task.actualStudyMinutes = allocatedMinutes;
        if (!scheduledTasks.includes(task)) {
          scheduledTasks.push(task);
        }
        taskCompletionDates.set(task.id, currentDate);

        if (taskMinutes > 0) {
          currentDate = this.findNextAvailableDay(
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000),
            availableDays,
            bufferDays
          );
          totalDaysUsed++;
        }
      }
    }

    const endDate = new Date(currentDate);

    if (deadline) {
      const deadlineDate = new Date(deadline);
      const daysDiff = Math.ceil((deadlineDate - today) / (24 * 60 * 60 * 1000));
      
      if (totalDaysUsed > daysDiff) {
        scheduledTasks.forEach(task => {
          task.warning = `按当前安排可能无法在截止日期前完成`;
        });
      }
    }

    return {
      tasks: scheduledTasks,
      startDate: today,
      endDate,
      totalDaysUsed
    };
  }

  /**
   * 按优先级排序任务
   * 1. 逾期未完成的任务（最高优先级）
   * 2. 今日到期的复习节点
   * 3. 高重要性 + 低掌握度的任务
   * 4. 普通任务
   */
  static sortTasksByPriority(tasks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const phaseOrder = { foundation: 1, advanced: 2, application: 3 };

    return tasks.sort((a, b) => {
      if (!a.isReview && b.isReview) return -1;
      if (a.isReview && !b.isReview) return 1;

      const aHasPrereq = a.prerequisite_ids && 
        (Array.isArray(a.prerequisite_ids) ? a.prerequisite_ids.length > 0 : 
          (typeof a.prerequisite_ids === 'string' && a.prerequisite_ids !== '[]' && a.prerequisite_ids.length > 0));
      const bHasPrereq = b.prerequisite_ids && 
        (Array.isArray(b.prerequisite_ids) ? b.prerequisite_ids.length > 0 : 
          (typeof b.prerequisite_ids === 'string' && b.prerequisite_ids !== '[]' && b.prerequisite_ids.length > 0));
      
      if (!aHasPrereq && bHasPrereq) return -1;
      if (aHasPrereq && !bHasPrereq) return 1;

      const aPhase = phaseOrder[a.phase] || 99;
      const bPhase = phaseOrder[b.phase] || 99;
      
      if (aPhase !== bPhase) return aPhase - bPhase;

      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;

      const aImportance = a.importance || 3;
      const bImportance = b.importance || 3;
      const aConfidence = a.confidenceLevel || 0;
      const bConfidence = b.confidenceLevel || 0;

      const aPriorityScore = aImportance * 10 + (5 - aConfidence) * 5;
      const bPriorityScore = bImportance * 10 + (5 - bConfidence) * 5;

      if (aPriorityScore !== bPriorityScore) {
        return bPriorityScore - aPriorityScore;
      }

      if (a.isWeakPoint && !b.isWeakPoint) return -1;
      if (!a.isWeakPoint && b.isWeakPoint) return 1;

      return 0;
    });
  }

  /**
   * 生成与均分法的对比说明
   */
  static generateComparisonExplanation(allPoints, tasks, timeAllocationDetails) {
    const totalBaseMinutes = allPoints.reduce((sum, p) => sum + (p.estimated_minutes || 30), 0);
    const totalWeightedMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
    
    const avgMinutesPerPoint = Math.round(totalBaseMinutes / allPoints.length);
    const weightedMinutesPerPoint = Math.round(totalWeightedMinutes / tasks.filter(t => !t.isReview).length);
    
    const difficultPoints = timeAllocationDetails.filter(d => d.difficulty >= 3);
    const easyPoints = timeAllocationDetails.filter(d => d.difficulty === 1);
    
    let comparison = `均分法：每个知识点约${avgMinutesPerPoint}分钟，总计${totalBaseMinutes}分钟。`;
    comparison += `加权分配法：根据难度、重要性、掌握度动态分配，总计${totalWeightedMinutes}分钟。`;
    
    if (difficultPoints.length > 0 && easyPoints.length > 0) {
      const avgDifficult = Math.round(difficultPoints.reduce((s, d) => s + d.calculation.baseMinutes * d.calculation.difficultyCoef, 0) / difficultPoints.length);
      const avgEasy = Math.round(easyPoints.reduce((s, d) => s + d.calculation.baseMinutes * d.calculation.difficultyCoef, 0) / easyPoints.length);
      comparison += `困难知识点平均${avgDifficult}分钟，简单知识点平均${avgEasy}分钟。`;
    }

    const weightedAllocation = `采用加权分配法：基础时长 × 难度系数 × 重要性系数 × 掌握度系数`;

    return { weightedAllocation, comparison };
  }

  /**
   * 根据剩余天数动态计算阶段比例
   */
  static getPhaseDistribution(daysRemaining) {
    if (daysRemaining > 30) {
      return { review: 0.4, strengthen: 0.3, mock: 0.2, sprint: 0.1 };
    } else if (daysRemaining >= 15) {
      return { review: 0.2, strengthen: 0.4, mock: 0.3, sprint: 0.1 };
    } else if (daysRemaining >= 7) {
      return { review: 0.1, strengthen: 0.3, mock: 0.45, sprint: 0.15 };
    } else {
      return { review: 0, strengthen: 0.2, mock: 0.5, sprint: 0.3 };
    }
  }

  /**
   * 生成阶段比例说明
   */
  static getPhaseDistributionExplanation(daysRemaining, distribution) {
    const phaseNames = {
      review: '回顾',
      strengthen: '强化',
      mock: '模拟',
      sprint: '冲刺'
    };
    
    const parts = [];
    for (const [key, value] of Object.entries(distribution)) {
      if (value > 0) {
        parts.push(`${phaseNames[key]}${Math.round(value * 100)}%`);
      }
    }
    
    return `根据剩余${daysRemaining}天，采用${parts.join('、')}的分配策略`;
  }

  /**
   * 获取缓冲日信息
   */
  static getBufferDaysInfo(scheduleResult, deadline) {
    const bufferDays = [];
    const scheduledDates = new Set(scheduleResult.tasks.map(t => t.scheduledDate));
    
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const startDate = scheduleResult.startDate;
      
      let currentDate = new Date(startDate);
      
      while (currentDate < deadlineDate) {
        const dayOfWeek = currentDate.getDay();
        
        if (dayOfWeek === 0) {
          const dateStr = this.formatDate(currentDate);
          if (!scheduledDates.has(dateStr)) {
            bufferDays.push(dateStr);
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      if (bufferDays.length > 0) {
        return {
          bufferDays,
          explanation: `每周日设置为缓冲日，共预留${bufferDays.length}天用于补进度`
        };
      }
    }
    
    return {
      bufferDays: [],
      explanation: '已根据计划周期预留适当缓冲时间'
    };
  }

  /**
   * 步骤1: 获取知识点列表
   */
  static async fetchKnowledgePoints(subject) {
    try {
      const points = await KnowledgeModel.findBySubject(subject);
      logger.info(`获取知识点: ${points.length}个`);
      return points;
    } catch (error) {
      logger.error('获取知识点失败:', error.message);
      return [];
    }
  }

  /**
   * 步骤2: 根据用户水平过滤知识点
   */
  static filterByUserLevel(points, userLevel, adjustments) {
    const phaseFilter = {
      beginner: ['foundation', 'advanced', 'application'],
      intermediate: ['foundation', 'advanced', 'application'],
      advanced: ['advanced', 'application']
    };

    const allowedPhases = phaseFilter[userLevel] || phaseFilter.beginner;
    let filtered = points.filter(p => allowedPhases.includes(p.phase));

    if (userLevel === 'intermediate') {
      const foundationPoints = filtered.filter(p => p.phase === 'foundation');
      const skipCount = Math.floor(foundationPoints.length * 0.5);
      
      if (skipCount > 0) {
        const foundationToKeep = foundationPoints.slice(skipCount);
        const otherPoints = filtered.filter(p => p.phase !== 'foundation');
        filtered = [...foundationToKeep, ...otherPoints];
        adjustments.push(`根据您的中级水平，已跳过${skipCount}个基础知识点`);
      }
    }

    if (userLevel === 'advanced') {
      adjustments.push('根据您的高级水平，已跳过基础阶段');
    }

    return filtered;
  }

  /**
   * 过滤已掌握的知识点（带掌握程度）
   */
  static async filterMasteredTopicsWithLevel(points, userId, subject, providedMasteredIds, adjustments) {
    let masteredInfo = new Map();
    let skippedCount = 0;
    let quickReviewCount = 0;
    let weakPointCount = 0;

    if (userId) {
      try {
        const masteredTopics = await MasteredTopicModel.getUserMasteredTopics(userId);
        masteredTopics.forEach(t => {
          masteredInfo.set(t.knowledge_point_id, {
            confidenceLevel: t.confidence_level || 3,
            masteredAt: t.mastered_at
          });
        });
      } catch (error) {
        logger.warn(`获取用户掌握知识点失败: ${error.message}`);
      }
    }

    if (providedMasteredIds && providedMasteredIds.length > 0) {
      providedMasteredIds.forEach(id => {
        if (!masteredInfo.has(id)) {
          masteredInfo.set(id, { confidenceLevel: 3, masteredAt: null });
        }
      });
    }

    const result = [];
    const quickReviewTasks = [];

    for (const point of points) {
      const mastered = masteredInfo.get(point.id);
      
      if (mastered) {
        if (mastered.confidenceLevel >= 4) {
          quickReviewTasks.push({
            ...point,
            isQuickReview: true,
            estimated_minutes: 15
          });
          quickReviewCount++;
        } else {
          result.push({
            ...point,
            isWeakPoint: true,
            confidenceLevel: mastered.confidenceLevel
          });
          weakPointCount++;
        }
        skippedCount++;
      } else {
        result.push(point);
      }
    }

    const finalResult = [...quickReviewTasks, ...result];

    let explanation = '';
    if (quickReviewCount > 0 || weakPointCount > 0) {
      const parts = [];
      if (quickReviewCount > 0) {
        parts.push(`已跳过${quickReviewCount}个熟练掌握的知识点（仅保留快速回顾）`);
      }
      if (weakPointCount > 0) {
        parts.push(`重点关注${weakPointCount}个薄弱知识点`);
      }
      explanation = parts.join('，');
    } else if (skippedCount > 0) {
      explanation = `已跳过${skippedCount}个已掌握的知识点`;
    }

    return {
      points: finalResult,
      skippedCount,
      quickReviewCount,
      weakPointCount,
      explanation,
      masteredInfo
    };
  }

  /**
   * 按前置依赖排序知识点（拓扑排序）
   */
  static sortByPrerequisites(points) {
    const pointMap = new Map();
    points.forEach(p => pointMap.set(p.id, p));

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

  /**
   * 判断两个知识点是否可以合并
   */
  static canMerge(point1, point2) {
    if (point1.phase !== point2.phase) return false;
    if (point1.isQuickReview || point2.isQuickReview) return false;
    if (Math.abs(point1.difficulty - point2.difficulty) > 1) return false;
    
    if (point2.prerequisiteIds && point2.prerequisiteIds.includes(point1.id)) {
      return true;
    }

    return false;
  }

  /**
   * 拆分任务
   */
  static splitTask(point, maxMinutes) {
    const totalMinutes = point.estimated_minutes || 60;
    const count = Math.ceil(totalMinutes / maxMinutes);
    const subTasks = [];

    for (let i = 0; i < count; i++) {
      const minutes = i === count - 1 
        ? totalMinutes - (maxMinutes * i) 
        : maxMinutes;
      subTasks.push({ minutes });
    }

    return subTasks;
  }

  /**
   * 添加任务多样性
   */
  static addTaskDiversity(tasks, adjustments) {
    const phaseTaskTypes = {
      foundation: [
        { type: '看笔记', weight: 0.4 },
        { type: '看视频', weight: 0.3 },
        { type: '基础题', weight: 0.3 }
      ],
      advanced: [
        { type: '专题练习', weight: 0.5 },
        { type: '错题重做', weight: 0.3 },
        { type: '知识点总结', weight: 0.2 }
      ],
      application: [
        { type: '模拟卷', weight: 0.6 },
        { type: '限时练习', weight: 0.4 }
      ]
    };

    const result = [];
    let addedDiversity = false;

    for (const task of tasks) {
      if (task.isExercise || task.isQuickReview || task.isReview) {
        result.push(task);
        continue;
      }

      const types = phaseTaskTypes[task.phase] || phaseTaskTypes.foundation;
      const random = Math.random();
      let cumulative = 0;
      let selectedType = types[0].type;

      for (const typeConfig of types) {
        cumulative += typeConfig.weight;
        if (random < cumulative) {
          selectedType = typeConfig.type;
          break;
        }
      }

      result.push({
        ...task,
        taskType: selectedType,
        name: this.enhanceTaskName(task.name, selectedType)
      });
      addedDiversity = true;
    }

    if (addedDiversity) {
      adjustments.push('已根据学习阶段添加多样化任务类型');
    }

    return result;
  }

  /**
   * 增强任务名称
   */
  static enhanceTaskName(name, taskType) {
    if (taskType === '看笔记' || taskType === '看视频') {
      return name;
    }
    return `${name} - ${taskType}`;
  }

  /**
   * 确保任务名称唯一
   * 为重复的任务名称添加编号
   */
  static ensureUniqueTaskNames(tasks) {
    const nameCount = new Map();
    const nameIndex = new Map();

    tasks.forEach(task => {
      const count = nameCount.get(task.name) || 0;
      nameCount.set(task.name, count + 1);
    });

    return tasks.map(task => {
      const count = nameCount.get(task.name);
      if (count > 1) {
        const index = (nameIndex.get(task.name) || 0) + 1;
        nameIndex.set(task.name, index);
        return {
          ...task,
          name: `${task.name}(${index})`
        };
      }
      return task;
    });
  }

  /**
   * 为任务分配优先级
   */
  static assignTaskPriority(tasks, masteredInfo) {
    return tasks.map(task => {
      let priority = 'medium';
      let reason = '';

      const mastered = masteredInfo?.get(task.knowledgePointId);
      
      if (task.isWeakPoint || (mastered && mastered.confidenceLevel <= 3)) {
        priority = 'high';
        reason = '薄弱知识点，需要重点复习';
      } else if (task.isQuickReview) {
        priority = 'low';
        reason = '已熟练掌握，快速回顾即可';
      } else if (task.isReview) {
        priority = 'medium';
        reason = '遗忘曲线复习节点';
      } else if (task.difficulty >= 4) {
        priority = 'high';
        reason = '高难度知识点，需要重点关注';
      } else if (task.difficulty >= 3) {
        priority = 'medium';
        reason = '中等难度，按计划学习';
      } else {
        priority = 'low';
        reason = '基础知识点，正常学习';
      }

      return {
        ...task,
        priority,
        reason
      };
    });
  }

  /**
   * 优先安排重点知识点
   */
  static prioritizeFocusTopics(tasks, focusIds, adjustments) {
    const focusSet = new Set(focusIds);
    const focusTasks = [];
    const otherTasks = [];

    tasks.forEach(task => {
      if (focusSet.has(task.knowledgePointId)) {
        focusTasks.push({
          ...task,
          priority: 'high',
          reason: '您指定的重点知识点'
        });
      } else {
        otherTasks.push(task);
      }
    });

    if (focusTasks.length > 0) {
      adjustments.push(`已优先安排${focusTasks.length}个重点知识点`);
    }

    return [...focusTasks, ...otherTasks];
  }

  /**
   * 添加练习任务
   */
  static addExerciseTasks(tasks, adjustments) {
    const exerciseTasks = [];
    let addedCount = 0;

    tasks.forEach((task, index) => {
      if (task.difficulty >= 2 && !task.isSplit && !task.isQuickReview && !task.isExercise && !task.isReview) {
        exerciseTasks.push({
          id: `task_exercise_${Date.now()}_${index}`,
          name: `${task.name} - 练习`,
          estimatedMinutes: Math.round(task.estimatedMinutes * 0.5),
          difficulty: task.difficulty,
          phase: task.phase,
          knowledgePointId: task.knowledgePointId,
          description: `针对「${task.name}」的练习任务`,
          isExercise: true,
          taskType: '练习',
          priority: task.priority,
          reason: '配套练习巩固所学',
          originalPointId: task.originalPointId
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      adjustments.push(`已添加${addedCount}个练习任务`);
    }

    const result = [];
    let taskIdx = 0;
    let exerciseIdx = 0;

    while (taskIdx < tasks.length || exerciseIdx < exerciseTasks.length) {
      if (taskIdx < tasks.length) {
        result.push(tasks[taskIdx]);
        const currentTask = tasks[taskIdx];
        
        const relatedExercise = exerciseTasks.find(
          (e, idx) => idx >= exerciseIdx && e.knowledgePointId === currentTask.knowledgePointId
        );
        
        if (relatedExercise) {
          result.push(relatedExercise);
          exerciseIdx = exerciseTasks.indexOf(relatedExercise) + 1;
        }
        
        taskIdx++;
      } else if (exerciseIdx < exerciseTasks.length) {
        result.push(exerciseTasks[exerciseIdx]);
        exerciseIdx++;
      }
    }

    return result;
  }

  /**
   * 标准化星期数组
   */
  static normalizeWeekdays(weekdays) {
    return weekdays.map(d => {
      if (d === 7) return 0;
      return d;
    });
  }

  /**
   * 查找下一个可用学习日（跳过缓冲日）
   * 简化版：每天都可以安排任务，只跳过缓冲日
   */
  static findNextAvailableDay(date, availableDays, bufferDays = new Set()) {
    const result = new Date(date);
    let attempts = 0;

    while (attempts < 14) {
      const dateStr = this.formatDate(result);
      const isBuffer = bufferDays.has(dateStr);

      if (!isBuffer) {
        return result;
      }

      result.setDate(result.getDate() + 1);
      attempts++;
    }

    return result;
  }

  /**
   * 格式化日期
   */
  static formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 按阶段分组
   */
  static groupByPhase(tasks) {
    const phaseNames = {
      foundation: '基础阶段',
      advanced: '进阶阶段',
      application: '实战阶段'
    };

    const phaseOrder = ['foundation', 'advanced', 'application'];
    const phases = [];

    for (const phaseKey of phaseOrder) {
      const phaseTasks = tasks.filter(t => t.phase === phaseKey);
      
      if (phaseTasks.length > 0) {
        const sortedPhaseTasks = phaseTasks.sort((a, b) => {
          if (!a.isReview && b.isReview) return -1;
          if (a.isReview && !b.isReview) return 1;
          
          const dateA = a.scheduledDate || '9999-99-99';
          const dateB = b.scheduledDate || '9999-99-99';
          return dateA.localeCompare(dateB);
        });
        
        phases.push({
          name: phaseNames[phaseKey] || phaseKey,
          tasks: sortedPhaseTasks.map(t => ({
            name: t.name,
            estimatedMinutes: t.estimatedMinutes,
            difficulty: t.difficulty,
            scheduledDate: t.scheduledDate,
            knowledgePointId: t.knowledgePointId,
            description: t.description,
            isExercise: t.isExercise || false,
            isReview: t.isReview || false,
            reviewDay: t.reviewDay || null,
            taskType: t.taskType || '',
            priority: t.priority || 'medium',
            reason: t.reason || '',
            isQuickReview: t.isQuickReview || false,
            isWeakPoint: t.isWeakPoint || false,
            isBufferDay: t.isBufferDay || false,
            bufferNote: t.bufferNote || '',
            warning: t.warning,
            category: t.category || 'cognitive',
            needsReview: t.needsReview !== false
          }))
        });
      }
    }

    return phases;
  }

  /**
   * 计算统计数据
   */
  static calculateStats(tasks, startDate, endDate) {
    const totalTasks = tasks.length;
    const totalMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
    
    let estimatedDays = 1;
    if (startDate && endDate) {
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      const end = endDate instanceof Date ? endDate : new Date(endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        estimatedDays = Math.ceil((end - start) / (24 * 60 * 60 * 1000)) + 1;
      }
    }

    const highPriorityCount = tasks.filter(t => t.priority === 'high').length;
    const weakPointCount = tasks.filter(t => t.isWeakPoint).length;
    const reviewCount = tasks.filter(t => t.isReview).length;

    return {
      totalTasks,
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      estimatedDays,
      expectedEndDate: this.formatDate(endDate),
      highPriorityCount,
      weakPointCount,
      reviewCount
    };
  }

  /**
   * 生成计划说明
   */
  static generateExplanation(userLevel, learningPace, masteredCount, stats, adjustments) {
    const levelText = {
      beginner: '初级',
      intermediate: '中级',
      advanced: '高级'
    }[userLevel] || '初级';

    const paceText = {
      slow: '慢速',
      normal: '正常',
      fast: '快速'
    }[learningPace] || '正常';

    let explanation = `根据您的${levelText}水平和${paceText}学习节奏，`;
    
    if (masteredCount > 0) {
      explanation += `已过滤${masteredCount}个已掌握知识点，`;
    }
    
    explanation += `共生成${stats.totalTasks}个任务（含${stats.reviewCount}个复习节点），预计${stats.estimatedDays}天完成（约${stats.totalHours}小时）。`;

    if (stats.highPriorityCount > 0) {
      explanation += `其中${stats.highPriorityCount}个高优先级任务需重点关注。`;
    }

    return explanation;
  }

  /**
   * 生成空计划（无知识点时）
   */
  static generateEmptyPlan(target, subject) {
    return this.generateFallbackPlan(target, subject, 60);
  }

  /**
   * 生成兜底计划
   * 当知识图谱和 LLM 都无法生成时使用
   */
  static generateFallbackPlan(target, subject, dailyMinutes = 60) {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 7);

    return {
      plan: {
        phases: [
          {
            name: '基础入门',
            tasks: [
              {
                name: `${target || subject} - 概念理解`,
                estimatedMinutes: 45,
                difficulty: 1,
                scheduledDate: this.formatDate(today),
                knowledgePointId: null,
                priority: 'medium',
                reason: '建立基础认知',
                taskType: '学习',
                description: `了解${target || subject}的基本概念和核心术语`,
              },
              {
                name: `${target || subject} - 核心知识点学习`,
                estimatedMinutes: 60,
                difficulty: 2,
                scheduledDate: this.formatDate(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)),
                knowledgePointId: null,
                priority: 'high',
                reason: '掌握核心内容',
                taskType: '学习',
                description: '深入学习核心知识点',
              },
            ],
          },
          {
            name: '进阶提升',
            tasks: [
              {
                name: `${target || subject} - 实践练习`,
                estimatedMinutes: 60,
                difficulty: 2,
                scheduledDate: this.formatDate(new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000)),
                knowledgePointId: null,
                priority: 'medium',
                reason: '巩固所学知识',
                taskType: '练习',
                description: '通过练习巩固知识',
              },
              {
                name: `${target || subject} - 综合复习`,
                estimatedMinutes: 45,
                difficulty: 2,
                scheduledDate: this.formatDate(new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000)),
                knowledgePointId: null,
                priority: 'medium',
                reason: '系统复习巩固',
                taskType: '复习',
                description: '回顾所学内容',
              },
            ],
          },
        ],
        stats: {
          totalTasks: 4,
          totalMinutes: 210,
          totalHours: 3.5,
          estimatedDays: 7,
          expectedEndDate: this.formatDate(endDate),
          highPriorityCount: 1,
          weakPointCount: 0,
          reviewCount: 1,
        },
      },
      explanation: {
        phaseDistribution: '目标超出预设知识库范围，已生成通用学习路径',
        bufferDays: '已预留 1 天缓冲时间',
        filteredTopics: '暂无知识点过滤',
        timeSource: `每日学习时长${dailyMinutes}分钟`,
        adaptiveGranularity: '使用标准任务粒度',
        weightedAllocation: '暂无知识点数据',
        forgettingCurve: '已安排复习节点',
        comparisonWithAverage: '暂无对比数据',
        summary: `未找到「${target || subject}」的相关知识点，系统生成了基础学习框架。您可手动调整任务，或联系管理员扩充知识库。`,
        note: '建议开启 AI 智能生成以获得更精准的计划',
      },
      adjustments: ['已生成通用学习框架，建议手动调整任务内容'],
      timeAllocationDetails: [],
      reviewScheduleDetails: [],
      isFallback: true,
    };
  }

  /**
   * 兼容旧接口的方法
   */
  static async generatePlanLegacy(plan) {
    const { 
      name, 
      goal, 
      goal_type, 
      target_date, 
      end_date,
      daily_study_minutes,
      target_score 
    } = plan;

    return this.generatePlan({
      target: goal || name,
      goalType: goal_type,
      subject: this.extractSubject(goal || name),
      userLevel: 'beginner',
      masteredTopicIds: [],
      learningPace: 'normal',
      dailyStudyMinutes: daily_study_minutes || 60,
      availableWeekdays: [1, 2, 3, 4, 5],
      deadline: target_date || end_date,
      targetScore: target_score
    });
  }

  /**
   * 生成考试复习计划
   */
  static async generateReviewPlan(params) {
    const { exam, constraints = {} } = params;
    const {
      userId = null,
      dailyStudyMinutes = 60,
      availableWeekdays = [1, 2, 3, 4, 5, 6, 7],
      userLevel = 'intermediate'
    } = constraints;

    logger.info(`开始生成复习计划: 考试=${exam.name}, 日期=${exam.exam_date}`);

    const examDate = new Date(exam.exam_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDays = Math.ceil((examDate - today) / (24 * 60 * 60 * 1000));
    if (totalDays <= 0) {
      return this.generateUrgentReviewPlan(exam, dailyStudyMinutes);
    }

    const scope = this.parseExamScope(exam);
    const phaseAllocation = this.allocateReviewPhases(totalDays);
    const phases = this.generateReviewPhases(scope, phaseAllocation, examDate, dailyStudyMinutes, userLevel);
    
    phases.forEach(phase => {
      phase.tasks = this.ensureUniqueTaskNames(phase.tasks);
    });
    
    const allTasks = phases.flatMap(p => p.tasks);
    const stats = {
      totalTasks: allTasks.length,
      totalMinutes: allTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0),
      reviewDays: totalDays,
      totalHours: Math.round(allTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0) / 60 * 10) / 10,
      highPriorityCount: allTasks.filter(t => t.priority === 'high').length,
      weakPointCount: 0,
      reviewCount: allTasks.filter(t => t.isReview).length
    };

    const phaseDistribution = this.getPhaseDistribution(totalDays);
    const explanation = {
      phaseDistribution: this.getPhaseDistributionExplanation(totalDays, phaseDistribution),
      bufferDays: `考前${Math.min(3, totalDays)}天安排为复盘阶段`,
      filteredTopics: '已根据考试范围筛选知识点',
      timeSource: `每日学习时长${dailyStudyMinutes}分钟`,
      adaptiveGranularity: '根据考试紧迫程度调整任务粒度',
      weightedAllocation: '采用加权分配法优化时间分配',
      forgettingCurve: '已安排遗忘曲线复习节点',
      comparisonWithAverage: '加权分配法比均分法更高效',
      summary: this.generateReviewExplanation(exam, scope, stats, totalDays)
    };

    logger.info(`复习计划生成完成: ${stats.totalTasks}个任务, ${stats.reviewDays}天`);

    return {
      plan: {
        phases,
        stats
      },
      explanation,
      adjustments: [],
      timeAllocationDetails: [],
      reviewScheduleDetails: []
    };
  }

  /**
   * 解析考试范围
   */
  static parseExamScope(exam) {
    const scopeText = exam.scope || exam.notes || '';
    
    const chapterMatch = scopeText.match(/第?(\d+)[\-到至](\d+)[章讲节]/);
    if (chapterMatch) {
      return {
        type: 'chapters',
        start: parseInt(chapterMatch[1]),
        end: parseInt(chapterMatch[2]),
        text: scopeText
      };
    }

    return {
      type: 'general',
      text: scopeText
    };
  }

  /**
   * 分配复习阶段
   */
  static allocateReviewPhases(totalDays) {
    if (totalDays > 30) {
      return {
        review: { days: Math.floor(totalDays * 0.4), name: '回顾阶段' },
        strengthen: { days: Math.floor(totalDays * 0.3), name: '强化阶段' },
        mock: { days: Math.floor(totalDays * 0.2), name: '模拟阶段' },
        sprint: { days: Math.floor(totalDays * 0.1), name: '冲刺阶段' }
      };
    } else if (totalDays >= 15) {
      return {
        review: { days: Math.floor(totalDays * 0.2), name: '回顾阶段' },
        strengthen: { days: Math.floor(totalDays * 0.4), name: '强化阶段' },
        mock: { days: Math.floor(totalDays * 0.3), name: '模拟阶段' },
        sprint: { days: Math.floor(totalDays * 0.1), name: '冲刺阶段' }
      };
    } else if (totalDays >= 7) {
      return {
        review: { days: Math.floor(totalDays * 0.1), name: '回顾阶段' },
        strengthen: { days: Math.floor(totalDays * 0.3), name: '强化阶段' },
        mock: { days: Math.floor(totalDays * 0.45), name: '模拟阶段' },
        sprint: { days: Math.floor(totalDays * 0.15), name: '冲刺阶段' }
      };
    } else {
      return {
        review: { days: 0, name: '回顾阶段' },
        strengthen: { days: Math.floor(totalDays * 0.2), name: '强化阶段' },
        mock: { days: Math.floor(totalDays * 0.5), name: '模拟阶段' },
        sprint: { days: Math.floor(totalDays * 0.3), name: '冲刺阶段' }
      };
    }
  }

  /**
   * 生成复习阶段任务
   */
  static generateReviewPhases(scope, allocation, examDate, dailyMinutes, userLevel) {
    const phases = [];
    let currentDay = 1;

    const phaseConfigs = [
      { key: 'review', taskTypes: ['看笔记', '看视频', '基础题'], weights: [0.4, 0.3, 0.3] },
      { key: 'strengthen', taskTypes: ['专题练习', '错题重做', '知识点总结'], weights: [0.5, 0.3, 0.2] },
      { key: 'mock', taskTypes: ['模拟卷', '限时练习'], weights: [0.6, 0.4] },
      { key: 'sprint', taskTypes: ['错题复盘', '公式默写', '心态调整'], weights: [0.5, 0.3, 0.2] }
    ];

    for (const config of phaseConfigs) {
      const phase = allocation[config.key];
      if (phase.days > 0) {
        const tasks = [];
        for (let i = 0; i < phase.days; i++) {
          const taskTypeIndex = this.weightedRandom(config.weights);
          const taskType = config.taskTypes[taskTypeIndex];
          
          tasks.push({
            name: `${phase.name} - ${taskType}`,
            estimatedMinutes: dailyMinutes,
            difficulty: config.key === 'sprint' ? 3 : config.key === 'mock' ? 4 : 2,
            scheduledDate: this.formatDate(new Date(examDate.getTime() - (allocation.sprint.days + allocation.mock.days + allocation.strengthen.days + allocation.review.days - currentDay) * 24 * 60 * 60 * 1000)),
            taskType,
            priority: config.key === 'sprint' || config.key === 'mock' ? 'high' : 'medium',
            reason: `${phase.name}核心任务`,
            isReview: config.key === 'review'
          });
          currentDay++;
        }
        
        phases.push({
          name: phase.name,
          tasks
        });
      }
    }

    return phases;
  }

  /**
   * 加权随机选择
   */
  static weightedRandom(weights) {
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return i;
      }
    }
    
    return weights.length - 1;
  }

  /**
   * 生成紧急复习计划
   */
  static generateUrgentReviewPlan(exam, dailyMinutes) {
    return {
      plan: {
        phases: [{
          name: '紧急冲刺',
          tasks: [
            {
              name: '核心知识点快速回顾',
              estimatedMinutes: dailyMinutes,
              difficulty: 3,
              scheduledDate: this.formatDate(new Date()),
              taskType: '快速回顾',
              priority: 'high',
              reason: '考试临近，重点复习核心内容',
              isReview: true
            },
            {
              name: '错题集复盘',
              estimatedMinutes: dailyMinutes,
              difficulty: 4,
              scheduledDate: this.formatDate(new Date()),
              taskType: '错题复盘',
              priority: 'high',
              reason: '考前必做，避免重复错误',
              isReview: true
            }
          ]
        }],
        stats: {
          totalTasks: 2,
          totalMinutes: dailyMinutes * 2,
          totalHours: dailyMinutes * 2 / 60,
          reviewDays: 1,
          expectedEndDate: this.formatDate(new Date()),
          highPriorityCount: 2,
          weakPointCount: 0,
          reviewCount: 2
        }
      },
      explanation: {
        phaseDistribution: '考试已过或即将开始，进入紧急冲刺模式',
        bufferDays: '无缓冲日',
        filteredTopics: '聚焦核心知识点',
        timeSource: '最大化利用剩余时间',
        adaptiveGranularity: '紧急模式，高强度任务',
        weightedAllocation: '紧急模式，优先级最高',
        forgettingCurve: '时间紧迫，仅保留核心复习',
        comparisonWithAverage: '紧急模式不适用对比',
        summary: '考试时间紧迫，已生成紧急复习计划，请抓紧时间复习！'
      },
      adjustments: ['考试时间已过或非常紧迫，建议立即开始复习'],
      timeAllocationDetails: [],
      reviewScheduleDetails: []
    };
  }

  /**
   * 生成复习计划说明
   */
  static generateReviewExplanation(exam, scope, stats, totalDays) {
    let explanation = `为「${exam.name}」生成复习计划，`;
    
    if (scope.type === 'chapters') {
      explanation += `覆盖第${scope.start}-${scope.end}章，`;
    }
    
    explanation += `共${stats.totalTasks}个任务，${totalDays}天完成（约${stats.totalHours}小时）。`;
    
    if (totalDays < 7) {
      explanation += '时间紧迫，建议每天增加学习时长。';
    }

    return explanation;
  }

  /**
   * 从目标中提取学科
   */
  static extractSubject(target) {
    if (!target) return '通用';

    const subjectKeywords = {
      '数学': ['数学', '高数', '微积分', '线性代数', '概率论'],
      '英语': ['英语', '四六级', '雅思', '托福', 'GRE'],
      '计算机': ['编程', '算法', '数据结构', 'Java', 'Python', '前端', '后端'],
      '物理': ['物理', '力学', '电磁学'],
      '化学': ['化学', '有机', '无机']
    };

    for (const [subject, keywords] of Object.entries(subjectKeywords)) {
      for (const keyword of keywords) {
        if (target.includes(keyword)) {
          return subject;
        }
      }
    }

    return target || '通用';
  }

  /**
   * 使用 LLM 动态生成学习计划
   * 当知识图谱未命中时调用
   */
  static async generatePlanWithLLM(params) {
    const {
      userId = null,
      target,
      subject,
      userLevel = 'beginner',
      learningPace = 'normal',
      dailyStudyMinutes = 60,
      availableWeekdays = [1, 2, 3, 4, 5],
      deadline = null,
    } = params;

    logger.info(`目标「${target}」使用 LLM 生成`);

    if (!llmService.isAvailable()) {
      logger.warn('LLM 服务不可用，返回通用兜底计划');
      return this.generateFallbackPlan(target, subject, dailyStudyMinutes);
    }

    try {
      const prompt = this.buildPlanningPrompt({
        target,
        subject,
        userLevel,
        learningPace,
        dailyStudyMinutes,
        availableWeekdays,
        deadline,
      });

      const response = await llmService.chatCompletion([
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: prompt.userPrompt },
      ], {
        temperature: 0.7,
        maxTokens: 4096,
        response_format: { type: 'json_object' },
      });

      const validation = llmService.extractAndValidateJSON(response.content);
      
      if (!validation.valid) {
        logger.error(`LLM 返回校验失败: ${validation.error}`);
        logger.info('LLM 生成失败，降级到兜底计划');
        return this.generateFallbackPlan(target, subject, dailyStudyMinutes);
      }

      const llmResult = validation.data;
      const plan = this.parseLLMPlanToStandard(llmResult, target, subject, dailyStudyMinutes);

      if (userId) {
        await this.saveGeneratedKnowledgePoints(llmResult, subject, userId);
      }

      logger.info(`LLM 生成计划成功: ${plan.stats.totalTasks}个任务`);

      return {
        plan,
        explanation: {
          phaseDistribution: llmResult.explanation?.phaseDistribution || '由 AI 智能规划',
          bufferDays: '已预留复习时间',
          filteredTopics: '基于您的学习目标动态生成',
          timeSource: `每日学习时长${dailyStudyMinutes}分钟`,
          adaptiveGranularity: 'AI 根据内容难度自适应调整',
          weightedAllocation: 'AI 智能分配学习时间',
          forgettingCurve: '已安排复习节点',
          comparisonWithAverage: 'AI 个性化定制',
          summary: llmResult.explanation?.summary || `已为您生成「${target}」的个性化学习计划`,
          keyPoints: llmResult.explanation?.keyPoints || [],
        },
        adjustments: ['由 AI 智能生成，已存入知识库供后续使用'],
        timeAllocationDetails: [],
        reviewScheduleDetails: [],
        generatedByLLM: true,
      };
    } catch (error) {
      logger.error(`LLM 生成计划失败: ${error.message}`);
      logger.info('LLM 生成失败，降级到兜底计划');
      return this.generateFallbackPlan(target, subject, dailyStudyMinutes);
    }
  }

  /**
   * 构建结构化 Prompt
   */
  static buildPlanningPrompt(params) {
    const {
      target,
      subject,
      userLevel,
      learningPace,
      dailyStudyMinutes,
      availableWeekdays,
      deadline,
    } = params;

    const levelMap = {
      beginner: '初级',
      intermediate: '中级',
      advanced: '高级',
    };

    const paceMap = {
      slow: '慢速（稳扎稳打）',
      normal: '正常',
      fast: '快速（高效冲刺）',
    };

    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const availableDaysStr = availableWeekdays.map(d => dayNames[d - 1]).join('、');

    const systemPrompt = `你是一位资深的课程规划专家，擅长根据学生的具体水平和时间，设计科学、可执行的个性化学习路径。

你的职责是：
1. 分析学习目标，拆解为合理的知识模块
2. 根据用户水平调整内容深度和进度
3. 设计循序渐进的学习阶段
4. 为每个任务预估合理的学习时间
5. 智能判断任务是否需要后续复习

输出要求：
- 严格按照 JSON 格式输出
- 不要包含任何 Markdown 标记或额外解释
- 确保任务名称具体、可执行
- 时间分配要合理，单个任务不超过120分钟
- 每个任务必须包含 category 和 needs_review 字段`;

    const userPrompt = `请为用户生成一份关于 **${target}** 的学习计划。

# 用户约束
- 学习目标：${target}
- 学科领域：${subject || '通用'}
- 用户当前水平：${levelMap[userLevel] || '初级'}
- 学习节奏：${paceMap[learningPace] || '正常'}
- 每日可用学习时间：${dailyStudyMinutes} 分钟
- 可用学习日期：${availableDaysStr}
${deadline ? `- 目标截止日期：${deadline}` : ''}

# 任务分类与复习策略
请对生成的每一个任务进行智能分类，并遵循以下规则：

1. **category（任务类别）**：
   - \`operational\`：操作性任务（如安装软件、配置环境、注册账号）。特征：一次性操作，不需要深层记忆。
   - \`cognitive\`：认知性任务（如学习语法、理解概念、练习算法）。特征：需要记忆和理解，容易遗忘。

2. **needs_review（是否需要复习）**：
   - 如果是 \`operational\` 类别，**必须设为 false**。
   - 如果是 \`cognitive\` 类别，设为 true。

# 输出格式
请严格按照以下 JSON 格式输出，不要包含任何额外的解释或 Markdown 标记：

{
  "phases": [
    {
      "name": "阶段名称（如：基础入门）",
      "tasks": [
        {
          "name": "具体任务名称",
          "estimatedMinutes": 45,
          "difficulty": 1,
          "category": "operational 或 cognitive",
          "needs_review": true,
          "description": "任务描述",
          "reason": "为什么设置这个任务"
        }
      ]
    }
  ],
  "explanation": {
    "phaseDistribution": "说明为何这样划分阶段",
    "timeAllocation": "时间分配的考量",
    "summary": "整体设计思路总结"
  }
}

# 设计原则
1. 阶段划分：通常分为 2-4 个阶段（基础→进阶→实战）
2. 任务粒度：每个任务 30-90 分钟为宜
3. 难度递进：从易到难，循序渐进
4. 实用导向：注重实际应用，不只是理论

# 任务排序规则（必须严格遵守）
1. 环境搭建、软件安装、配置类任务必须放在最前面（阶段一）
2. 基础语法类任务放在第二阶段
3. 进阶概念类任务放在第三阶段
4. 项目实战类任务放在最后

请确保生成的 phases 数组按照上述顺序排列。

请开始生成：`;

    return { systemPrompt, userPrompt };
  }

  /**
   * 解析 LLM 返回的计划为标准格式
   */
  static parseLLMPlanToStandard(llmResult, target, subject, dailyMinutes) {
    const phases = [];
    let totalTasks = 0;
    let totalMinutes = 0;
    let highPriorityCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentDate = new Date(today);

    if (llmResult.phases && Array.isArray(llmResult.phases)) {
      llmResult.phases.forEach((phase, phaseIndex) => {
        const phaseTasks = [];

        if (phase.tasks && Array.isArray(phase.tasks)) {
          phase.tasks.forEach((task) => {
            const estimatedMinutes = task.estimatedMinutes || 45;
            const difficulty = task.difficulty || 2;

            totalMinutes += estimatedMinutes;
            totalTasks++;

            if (difficulty >= 3) {
              highPriorityCount++;
            }

            const scheduledDate = this.formatDate(currentDate);
            currentDate.setDate(currentDate.getDate() + Math.ceil(estimatedMinutes / dailyMinutes));

            phaseTasks.push({
              name: task.name || `任务${totalTasks}`,
              estimatedMinutes,
              difficulty,
              category: task.category || 'cognitive',
              needsReview: task.needs_review !== false,
              description: task.description || '',
              reason: task.reason || '',
              scheduledDate,
              knowledgePointId: null,
              taskType: '学习',
              priority: difficulty >= 3 ? 'high' : 'medium',
              isLLMGenerated: true,
            });
          });
        }

        phases.push({
          name: phase.name || `阶段${phaseIndex + 1}`,
          tasks: phaseTasks,
        });
      });
    }

    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
    const estimatedDays = Math.ceil(totalMinutes / dailyMinutes);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + estimatedDays);

    return {
      phases,
      stats: {
        totalTasks,
        totalMinutes,
        totalHours,
        estimatedDays,
        expectedEndDate: this.formatDate(endDate),
        highPriorityCount,
        weakPointCount: 0,
        reviewCount: 0,
      },
    };
  }

  /**
   * 保存 LLM 生成的知识点到数据库
   */
  static async saveGeneratedKnowledgePoints(llmResult, subject, userId) {
    if (!llmResult.phases || !Array.isArray(llmResult.phases)) {
      return;
    }

    try {
      const phaseMap = {
        '基础': 'foundation',
        '入门': 'foundation',
        '进阶': 'advanced',
        '提高': 'advanced',
        '实战': 'application',
        '应用': 'application',
        '综合': 'application',
      };

      for (const phase of llmResult.phases) {
        const phaseName = phase.name || '';
        let phaseKey = 'foundation';

        for (const [key, value] of Object.entries(phaseMap)) {
          if (phaseName.includes(key)) {
            phaseKey = value;
            break;
          }
        }

        if (phase.tasks && Array.isArray(phase.tasks)) {
          for (const task of phase.tasks) {
            try {
              await KnowledgeModel.create({
                name: task.name,
                subject: subject,
                description: task.description || task.reason || '',
                difficulty: task.difficulty || 2,
                estimatedMinutes: task.estimatedMinutes || 45,
                prerequisiteIds: null,
                phase: phaseKey,
                tags: ['AI生成'],
                resourceUrl: null,
              });
            } catch (createError) {
              logger.warn(`保存知识点失败: ${task.name}, ${createError.message}`);
            }
          }
        }
      }

      logger.info(`LLM 生成的知识点已保存: subject=${subject}`);
    } catch (error) {
      logger.error(`保存 LLM 知识点失败: ${error.message}`);
    }
  }
}

module.exports = PlanningAgent;
