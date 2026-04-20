const SKIP_KEYWORDS = [
  '安装', '配置', '搭建', '环境', '注册', '登录',
  '下载', '破解', '激活', '升级', '卸载', '汉化',
  'install', 'setup', 'config', '环境变量', '初始化',
  '部署', '创建账号', '申请', '绑定', '认证', '授权'
];

const COGNITIVE_KEYWORDS = [
  '学习', '理解', '掌握', '练习', '复习', '算法',
  '语法', '概念', '原理', '设计', '分析', '实现',
  '编写', '编程', '调试', '优化', '总结', '笔记'
];

function isOperationalTask(taskName) {
  if (!taskName) return false;
  
  const lowerName = taskName.toLowerCase();
  
  return SKIP_KEYWORDS.some(keyword => 
    lowerName.includes(keyword.toLowerCase())
  );
}

function isCognitiveTask(taskName) {
  if (!taskName) return false;
  
  const lowerName = taskName.toLowerCase();
  
  return COGNITIVE_KEYWORDS.some(keyword => 
    lowerName.includes(keyword.toLowerCase())
  );
}

function determineTaskCategory(task) {
  if (task.category && ['operational', 'cognitive'].includes(task.category)) {
    return task.category;
  }
  
  if (task.needsReview !== undefined) {
    return task.needsReview ? 'cognitive' : 'operational';
  }
  
  if (isOperationalTask(task.name)) {
    return 'operational';
  }
  
  if (isCognitiveTask(task.name)) {
    return 'cognitive';
  }
  
  return 'cognitive';
}

function shouldGenerateReview(task) {
  if (task.needsReview !== undefined) {
    return task.needsReview;
  }
  
  const category = determineTaskCategory(task);
  return category === 'cognitive';
}

function filterTasksForReview(tasks) {
  const tasksForReview = [];
  const operationalTasks = [];
  
  for (const task of tasks) {
    if (shouldGenerateReview(task)) {
      tasksForReview.push({
        ...task,
        needsReview: true,
        category: task.category || 'cognitive'
      });
    } else {
      operationalTasks.push({
        ...task,
        needsReview: false,
        category: task.category || 'operational'
      });
    }
  }
  
  return {
    tasksForReview,
    operationalTasks,
    filteredCount: operationalTasks.length,
    totalCount: tasks.length
  };
}

function applyReviewFilterToTasks(tasks) {
  return tasks.map(task => {
    const category = determineTaskCategory(task);
    const needsReview = category === 'cognitive';
    
    return {
      ...task,
      category,
      needsReview
    };
  });
}

module.exports = {
  SKIP_KEYWORDS,
  COGNITIVE_KEYWORDS,
  isOperationalTask,
  isCognitiveTask,
  determineTaskCategory,
  shouldGenerateReview,
  filterTasksForReview,
  applyReviewFilterToTasks
};
