const logger = require('../config/logger');

const PHASE_ORDER = {
  foundation: 1,
  advanced: 2,
  application: 3
};

function hasPrerequisites(task) {
  if (!task.prerequisite_ids) return false;
  
  if (Array.isArray(task.prerequisite_ids)) {
    return task.prerequisite_ids.length > 0;
  }
  
  if (typeof task.prerequisite_ids === 'string') {
    try {
      const parsed = JSON.parse(task.prerequisite_ids);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return task.prerequisite_ids.length > 0;
    }
  }
  
  return false;
}

function getPrerequisiteIds(task) {
  if (!task.prerequisite_ids) return [];
  
  if (Array.isArray(task.prerequisite_ids)) {
    return task.prerequisite_ids;
  }
  
  if (typeof task.prerequisite_ids === 'string') {
    try {
      const parsed = JSON.parse(task.prerequisite_ids);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  
  return [];
}

function sortTasksByPriority(tasks) {
  return tasks.sort((a, b) => {
    const aHasPrereq = hasPrerequisites(a);
    const bHasPrereq = hasPrerequisites(b);
    
    if (!aHasPrereq && bHasPrereq) return -1;
    if (aHasPrereq && !bHasPrereq) return 1;
    
    const aPhase = PHASE_ORDER[a.phase] || 99;
    const bPhase = PHASE_ORDER[b.phase] || 99;
    
    if (aPhase !== bPhase) return aPhase - bPhase;
    
    const aPriority = a.priorityScore || a.priority || 0;
    const bPriority = b.priorityScore || b.priority || 0;
    
    return bPriority - aPriority;
  });
}

function topologicalSort(tasks) {
  const taskMap = new Map();
  const taskNameMap = new Map();
  
  tasks.forEach(task => {
    taskMap.set(task.id || task.knowledgePointId, task);
    if (task.name) {
      taskNameMap.set(task.name, task);
    }
  });
  
  const visited = new Set();
  const result = [];
  const visiting = new Set();
  
  function visit(task) {
    const taskId = task.id || task.knowledgePointId;
    
    if (visited.has(taskId)) return;
    if (visiting.has(taskId)) {
      result.push(task);
      return;
    }
    
    visiting.add(taskId);
    
    const prereqIds = getPrerequisiteIds(task);
    for (const prereqId of prereqIds) {
      const prereqTask = taskMap.get(prereqId);
      if (prereqTask && !visited.has(prereqId)) {
        visit(prereqTask);
      }
    }
    
    visited.add(taskId);
    visiting.delete(taskId);
    result.push(task);
  }
  
  const noPrereqTasks = tasks.filter(t => !hasPrerequisites(t));
  const withPrereqTasks = tasks.filter(t => hasPrerequisites(t));
  
  noPrereqTasks.forEach(task => {
    const taskId = task.id || task.knowledgePointId;
    if (!visited.has(taskId)) {
      visited.add(taskId);
      result.push(task);
    }
  });
  
  withPrereqTasks.forEach(task => {
    const taskId = task.id || task.knowledgePointId;
    if (!visited.has(taskId)) {
      visit(task);
    }
  });
  
  return result;
}

function sortTasksWithDependencies(tasks) {
  if (!tasks || tasks.length === 0) return tasks;
  
  const noPrereqTasks = tasks.filter(t => !hasPrerequisites(t));
  const withPrereqTasks = tasks.filter(t => hasPrerequisites(t));
  
  const sortedNoPrereq = sortTasksByPriority(noPrereqTasks);
  const sortedWithPrereq = topologicalSort(withPrereqTasks);
  
  const result = [...sortedNoPrereq, ...sortedWithPrereq];
  
  logger.info(`任务排序完成: 无前置依赖${sortedNoPrereq.length}个, 有前置依赖${sortedWithPrereq.length}个`);
  
  return result;
}

function identifyFoundationTasks(tasks) {
  return tasks.filter(t => 
    t.phase === 'foundation' && !hasPrerequisites(t)
  );
}

function regeneratePlanWithOrder(originalTasks, newTasks) {
  const foundationTasks = identifyFoundationTasks(originalTasks);
  
  const foundationNames = new Set(foundationTasks.map(t => t.name));
  const filteredNewTasks = newTasks.filter(t => !foundationNames.has(t.name));
  
  const sortedNewTasks = sortTasksWithDependencies(filteredNewTasks);
  
  return [...foundationTasks, ...sortedNewTasks];
}

function assignSequenceOrder(tasks) {
  return tasks.map((task, index) => ({
    ...task,
    sequence_order: index + 1
  }));
}

module.exports = {
  hasPrerequisites,
  getPrerequisiteIds,
  sortTasksByPriority,
  topologicalSort,
  sortTasksWithDependencies,
  identifyFoundationTasks,
  regeneratePlanWithOrder,
  assignSequenceOrder,
  PHASE_ORDER
};
